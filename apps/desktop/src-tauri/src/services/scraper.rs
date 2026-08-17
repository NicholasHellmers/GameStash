use crate::services::media_cache::MediaCacheService;
use crate::services::metadata_store::MetadataStore;
use core_types::Platform;
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ScrapedGameMetadata {
    pub game_id: String,
    pub matched_title: String,
    pub cover_url: Option<String>,
    pub local_cover_path: Option<String>,
    pub release_year: Option<u32>,
    pub developer: Option<String>,
    pub publisher: Option<String>,
    pub genres: Option<Vec<String>>,
    pub description: Option<String>,
    pub provider_source: String,
}

pub struct ScraperService {
    client: reqwest::Client,
    dev_id: Option<String>,
    dev_password: Option<String>,
    screenscraper_base_url: String,
    wikipedia_base_url: String,
    libretro_base_url: String,
}

impl Default for ScraperService {
    fn default() -> Self {
        Self::new(
            None,
            None,
            "https://api.screenscraper.fr/api2".to_string(),
            "https://en.wikipedia.org/w/api.php".to_string(),
            "https://raw.githubusercontent.com/libretro/libretro-thumbnails/master".to_string(),
        )
    }
}

impl ScraperService {
    pub fn new(
        dev_id: Option<String>,
        dev_password: Option<String>,
        screenscraper_base_url: String,
        wikipedia_base_url: String,
        libretro_base_url: String,
    ) -> Self {
        let client = reqwest::Client::builder()
            .user_agent("GameStash/0.1.0 (https://github.com/NicholasHellmers/GameStash)")
            .timeout(std::time::Duration::from_secs(8))
            .build()
            .unwrap_or_default();

        Self {
            client,
            dev_id,
            dev_password,
            screenscraper_base_url,
            wikipedia_base_url,
            libretro_base_url,
        }
    }

    pub fn get_system_id(platform: &str) -> Option<u32> {
        match platform.to_lowercase().as_str() {
            "snes" => Some(4),
            "nes" => Some(3),
            "n64" => Some(14),
            "gb" => Some(9),
            "gbc" => Some(10),
            "gba" => Some(12),
            "genesis" => Some(1),
            "ps1" => Some(57),
            "psp" => Some(61),
            "pc" => Some(135),
            _ => None,
        }
    }

    pub fn get_libretro_system_name(platform: &str) -> Option<&'static str> {
        match platform.to_lowercase().as_str() {
            "snes" => Some("Nintendo - Super Nintendo Entertainment System"),
            "nes" => Some("Nintendo - Nintendo Entertainment System"),
            "n64" => Some("Nintendo - Nintendo 64"),
            "gb" => Some("Nintendo - Game Boy"),
            "gbc" => Some("Nintendo - Game Boy Color"),
            "gba" => Some("Nintendo - Game Boy Advance"),
            "genesis" => Some("Sega - Mega Drive - Genesis"),
            "ps1" => Some("Sony - PlayStation"),
            "psp" => Some("Sony - PlayStation Portable"),
            _ => None,
        }
    }

    pub fn clean_rom_title(raw_title: &str) -> String {
        let mut cleaned = raw_title.to_string();

        // Strip parenthesized tags e.g. (USA), (Rev 1)
        while let Some(start) = cleaned.find('(') {
            if let Some(end) = cleaned[start..].find(')') {
                cleaned.replace_range(start..=start + end, "");
            } else {
                break;
            }
        }

        // Strip bracketed tags e.g. [!], [b1]
        while let Some(start) = cleaned.find('[') {
            if let Some(end) = cleaned[start..].find(']') {
                cleaned.replace_range(start..=start + end, "");
            } else {
                break;
            }
        }

        // Normalize underscores and whitespace
        let normalized = cleaned.replace('_', " ");
        normalized.split_whitespace().collect::<Vec<_>>().join(" ")
    }

    /// Primary atomic game scraper: Checks Libretro CDN & Wikipedia API out-of-the-box,
    /// with ScreenScraper fallback if user credentials configured.
    pub async fn scrape_game(
        &self,
        media_root: &Path,
        store: &MetadataStore,
        platform: &str,
        title: &str,
        md5: Option<&str>,
        _sha256: Option<&str>,
    ) -> Option<ScrapedGameMetadata> {
        let canonical_id = if let Some(hash) = md5 {
            format!("{platform}:{hash}")
        } else {
            let clean = Self::clean_rom_title(title);
            format!("{platform}:{}", clean.to_lowercase().replace(' ', "-"))
        };

        // 1. Check local persistent store first
        if let Some(cached) = store.get(&canonical_id) {
            return Some(cached);
        }

        // 2. Try Tier 1: Canonical Libretro No-Intro Box Art CDN
        if let Some(libretro_meta) = self.query_libretro_cdn(platform, title, &canonical_id).await {
            let mut final_meta = libretro_meta;
            // Enrich with Wikipedia description/year if possible
            if let Some(wiki_meta) = self.query_wikipedia_summary(&final_meta.matched_title).await {
                if final_meta.description.is_none() {
                    final_meta.description = wiki_meta.description;
                }
                if final_meta.release_year.is_none() {
                    final_meta.release_year = wiki_meta.release_year;
                }
                if final_meta.developer.is_none() {
                    final_meta.developer = wiki_meta.developer;
                }
            }

            self.atomically_cache_and_persist(media_root, store, platform, &mut final_meta).await;
            return Some(final_meta);
        }

        // 3. Try Tier 2: Wikipedia MediaWiki API (Search & Extract)
        let clean_title = Self::clean_rom_title(title);
        if !clean_title.is_empty() {
            if let Some(mut wiki_meta) = self.query_wikipedia_summary(&clean_title).await {
                wiki_meta.game_id = canonical_id.clone();
                self.atomically_cache_and_persist(media_root, store, platform, &mut wiki_meta).await;
                return Some(wiki_meta);
            }
        }

        // 4. Try Tier 3: ScreenScraper API (if user dev credentials provided)
        if let Some(ref dev_id) = self.dev_id {
            if let Some(sys_id) = Self::get_system_id(platform) {
                if let Some(mut ss_meta) = self.query_screenscraper(dev_id, sys_id, &clean_title, md5, platform).await {
                    ss_meta.game_id = canonical_id.clone();
                    self.atomically_cache_and_persist(media_root, store, platform, &mut ss_meta).await;
                    return Some(ss_meta);
                }
            }
        }

        None
    }

    /// Search candidate titles for manual match modal
    pub async fn search_candidates(
        &self,
        query: &str,
        platform: Option<&str>,
    ) -> Vec<ScrapedGameMetadata> {
        let clean_query = Self::clean_rom_title(query);
        if clean_query.is_empty() {
            return Vec::new();
        }

        let mut results = Vec::new();
        let plat = platform.unwrap_or("retro");

        // 1. Libretro direct match check
        if let Some(p) = platform {
            if let Some(meta) = self.query_libretro_cdn(p, query, &format!("{p}:{clean_query}")).await {
                results.push(meta);
            }
        }

        // 2. Wikipedia Search API
        let wiki_search_url = format!(
            "{}?action=query&format=json&list=search&srsearch={}%20video%20game&srlimit=5",
            self.wikipedia_base_url,
            urlencoding::encode(&clean_query)
        );

        if let Ok(res) = self.client.get(&wiki_search_url).send().await {
            if res.status().is_success() {
                if let Ok(json) = res.json::<serde_json::Value>().await {
                    if let Some(items) = json.get("query").and_then(|q| q.get("search")).and_then(|s| s.as_array()) {
                        for item in items {
                            let page_title = item.get("title").and_then(|t| t.as_str()).unwrap_or("");
                            if !page_title.is_empty() {
                                if let Some(mut summary) = self.query_wikipedia_summary(page_title).await {
                                    summary.game_id = format!("{plat}:{}", page_title.to_lowercase().replace(' ', "-"));
                                    if !results.iter().any(|r| r.matched_title.eq_ignore_ascii_case(&summary.matched_title)) {
                                        results.push(summary);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        results
    }

    /// Queries Libretro No-Intro CDN for 1:1 box art matching
    async fn query_libretro_cdn(
        &self,
        platform: &str,
        title: &str,
        game_id: &str,
    ) -> Option<ScrapedGameMetadata> {
        let sys_name = Self::get_libretro_system_name(platform)?;
        let raw_clean = title.trim();

        // Candidates to test: exact raw title, cleaned title
        let candidates = vec![
            raw_clean.to_string(),
            Self::clean_rom_title(raw_clean),
        ];

        for cand in candidates {
            if cand.is_empty() {
                continue;
            }
            let url = format!(
                "{}/{}/Named_Boxarts/{}.png",
                self.libretro_base_url,
                urlencoding::encode(sys_name),
                urlencoding::encode(&cand)
            );

            if let Ok(res) = self.client.head(&url).send().await {
                if res.status().is_success() {
                    let clean_title = Self::clean_rom_title(&cand);
                    return Some(ScrapedGameMetadata {
                        game_id: game_id.to_string(),
                        matched_title: if clean_title.is_empty() { cand } else { clean_title },
                        cover_url: Some(url),
                        local_cover_path: None,
                        release_year: None,
                        developer: None,
                        publisher: None,
                        genres: None,
                        description: None,
                        provider_source: "libretro".to_string(),
                    });
                }
            }
        }

        None
    }

    /// Queries Wikipedia API for page synopsis and high-res thumbnail
    async fn query_wikipedia_summary(&self, title: &str) -> Option<ScrapedGameMetadata> {
        let clean_title = Self::clean_rom_title(title);
        let url = format!(
            "{}?action=query&format=json&prop=pageimages|extracts&titles={}&exintro=1&explaintext=1&pithumbsize=600",
            self.wikipedia_base_url,
            urlencoding::encode(&clean_title)
        );

        let res = self.client.get(&url).send().await.ok()?;
        if !res.status().is_success() {
            return None;
        }

        let json: serde_json::Value = res.json().await.ok()?;
        let pages = json.get("query")?.get("pages")?.as_object()?;
        let (_page_id, page_val) = pages.iter().next()?;

        // If page missing
        if page_val.get("missing").is_some() {
            return None;
        }

        let page_title = page_val.get("title").and_then(|t| t.as_str()).unwrap_or(&clean_title);
        let extract = page_val.get("extract").and_then(|e| e.as_str()).map(|s| s.trim().to_string());
        let cover_url = page_val.get("thumbnail").and_then(|t| t.get("source")).and_then(|s| s.as_str()).map(|s| s.to_string());

        // Extract year from introductory paragraph (e.g. "is a 1996 racing game")
        let release_year = extract.as_ref().and_then(|text| {
            for word in text.split_whitespace() {
                let trimmed = word.trim_matches(|c: char| !c.is_ascii_digit());
                if trimmed.len() == 4 {
                    if let Ok(year) = trimmed.parse::<u32>() {
                        if (1970..=2030).contains(&year) {
                            return Some(year);
                        }
                    }
                }
            }
            None
        });

        Some(ScrapedGameMetadata {
            game_id: format!("retro:{}", page_title.to_lowercase().replace(' ', "-")),
            matched_title: page_title.to_string(),
            cover_url,
            local_cover_path: None,
            release_year,
            developer: None,
            publisher: None,
            genres: None,
            description: extract,
            provider_source: "wikipedia".to_string(),
        })
    }

    /// Queries ScreenScraper API (when user credentials provided)
    async fn query_screenscraper(
        &self,
        dev_id: &str,
        system_id: u32,
        clean_title: &str,
        md5: Option<&str>,
        platform: &str,
    ) -> Option<ScrapedGameMetadata> {
        let mut url = format!(
            "{}/jeuRecherche.php?devid={}&softname=GameStash&output=json&systemeid={}&recherche={}",
            self.screenscraper_base_url,
            urlencoding::encode(dev_id),
            system_id,
            urlencoding::encode(clean_title)
        );

        if let Some(ref pass) = self.dev_password {
            url.push_str(&format!("&devpassword={}", urlencoding::encode(pass)));
        }

        let res = self.client.get(&url).send().await.ok()?;
        if !res.status().is_success() {
            return None;
        }

        let json: serde_json::Value = res.json().await.ok()?;
        let jeux = json.get("response")?.get("jeux")?.as_array()?;
        let jeu = jeux.first()?;

        let matched_title = jeu.get("nom").and_then(|v| v.as_str()).unwrap_or(clean_title).to_string();
        let cover_url = jeu.get("medias").and_then(|m| m.as_array()).and_then(|arr| {
            arr.iter().find(|item| {
                let t = item.get("type").and_then(|v| v.as_str()).unwrap_or("");
                t == "box-2D" || t == "box-3D"
            }).and_then(|item| item.get("url").and_then(|v| v.as_str()).map(|s| s.to_string()))
        });

        let release_year = jeu.get("dates").and_then(|d| d.as_array()).and_then(|arr| {
            arr.first().and_then(|d| d.get("text").and_then(|v| v.as_str())).and_then(|s| {
                if s.len() >= 4 { s[..4].parse::<u32>().ok() } else { None }
            })
        });

        let developer = jeu.get("developpeur").and_then(|d| d.get("nom")).and_then(|v| v.as_str()).map(|s| s.to_string());
        let publisher = jeu.get("editeur").and_then(|e| e.get("nom")).and_then(|v| v.as_str()).map(|s| s.to_string());

        let id = md5.unwrap_or(clean_title);
        Some(ScrapedGameMetadata {
            game_id: format!("{platform}:{id}"),
            matched_title,
            cover_url,
            local_cover_path: None,
            release_year,
            developer,
            publisher,
            genres: None,
            description: None,
            provider_source: "screenscraper".to_string(),
        })
    }

    /// Atomically downloads cover art to disk and commits metadata entry to MetadataStore
    async fn atomically_cache_and_persist(
        &self,
        media_root: &Path,
        store: &MetadataStore,
        platform: &str,
        meta: &mut ScrapedGameMetadata,
    ) {
        if let Some(ref cover_url) = meta.cover_url {
            let platform_enum = Platform::from_folder_name(platform);
            if let Ok(cached_path) = MediaCacheService::cache_remote_image(
                &self.client,
                media_root,
                &platform_enum,
                &meta.game_id,
                cover_url,
            ).await {
                meta.local_cover_path = Some(cached_path.to_string_lossy().to_string());
            }
        }

        // Commit to persistent disk store
        let _ = store.save(meta.clone());
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use wiremock::matchers::{method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    #[test]
    fn test_system_mappings() {
        assert_eq!(ScraperService::get_system_id("snes"), Some(4));
        assert_eq!(ScraperService::get_system_id("n64"), Some(14));
        assert_eq!(ScraperService::get_libretro_system_name("snes"), Some("Nintendo - Super Nintendo Entertainment System"));
        assert_eq!(ScraperService::get_libretro_system_name("unknown"), None);
    }

    #[test]
    fn test_clean_rom_title() {
        assert_eq!(
            ScraperService::clean_rom_title("Mario Kart 64 (USA) (Rev 1) [!]"),
            "Mario Kart 64"
        );
        assert_eq!(
            ScraperService::clean_rom_title("Super_Mario_Bros._(World)"),
            "Super Mario Bros."
        );
    }

    #[tokio::test]
    async fn test_libretro_cdn_and_wikipedia_scrape_flow() {
        let mock_server = MockServer::start().await;

        // Mock Libretro HEAD and GET check
        Mock::given(method("HEAD"))
            .respond_with(ResponseTemplate::new(200))
            .mount(&mock_server)
            .await;

        Mock::given(method("GET"))
            .and(wiremock::matchers::path_regex(r"^/libretro/.*"))
            .respond_with(ResponseTemplate::new(200).set_body_bytes(vec![137, 80, 78, 71]))
            .mount(&mock_server)
            .await;

        // Mock Wikipedia summary response
        let wiki_json = serde_json::json!({
            "query": {
                "pages": {
                    "12345": {
                        "pageid": 12345,
                        "title": "EarthBound",
                        "extract": "EarthBound is a 1994 role-playing video game developed by Ape and HAL Laboratory.",
                        "thumbnail": {
                            "source": format!("{}/earthbound_cover.png", mock_server.uri())
                        }
                    }
                }
            }
        });

        Mock::given(method("GET"))
            .and(path("/wiki"))
            .respond_with(ResponseTemplate::new(200).set_body_json(&wiki_json))
            .mount(&mock_server)
            .await;

        Mock::given(method("GET"))
            .and(path("/earthbound_cover.png"))
            .respond_with(ResponseTemplate::new(200).set_body_bytes(vec![137, 80, 78, 71]))
            .mount(&mock_server)
            .await;

        let scraper = ScraperService::new(
            None,
            None,
            format!("{}/screenscraper", mock_server.uri()),
            format!("{}/wiki", mock_server.uri()),
            format!("{}/libretro", mock_server.uri()),
        );

        let temp_dir = tempdir().unwrap();
        let media_root = temp_dir.path().join("media");
        let store = MetadataStore::new(temp_dir.path().join("gamelist.json"));

        let meta = scraper
            .scrape_game(
                &media_root,
                &store,
                "snes",
                "EarthBound (USA)",
                Some("cdd3c8c37324"),
                None,
            )
            .await
            .expect("Expected successful scrape");

        assert_eq!(meta.matched_title, "EarthBound");
        assert_eq!(meta.release_year, Some(1994));
        assert!(meta.description.is_some());
        assert!(meta.local_cover_path.is_some());

        // Verify it was persisted to MetadataStore
        assert!(store.get(&meta.game_id).is_some());
    }

    #[tokio::test]
    async fn test_search_candidates_flow() {
        let mock_server = MockServer::start().await;

        let search_json = serde_json::json!({
            "query": {
                "search": [
                    { "title": "Mario Kart 64" }
                ]
            }
        });

        Mock::given(method("GET"))
            .and(path("/wiki"))
            .respond_with(ResponseTemplate::new(200).set_body_json(&search_json))
            .mount(&mock_server)
            .await;

        let scraper = ScraperService::new(
            None,
            None,
            format!("{}/screenscraper", mock_server.uri()),
            format!("{}/wiki", mock_server.uri()),
            format!("{}/libretro", mock_server.uri()),
        );

        let candidates = scraper.search_candidates("Mario Kart 64", Some("n64")).await;
        // Search candidates executes cleanly
        let _ = candidates;
    }
}
