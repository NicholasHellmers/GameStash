use crate::services::scraper::ScrapedGameMetadata;
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::RwLock;

pub struct MetadataStore {
    storage_path: PathBuf,
    cache: RwLock<HashMap<String, ScrapedGameMetadata>>,
}

impl MetadataStore {
    /// Resolves standard metadata directory across platforms
    pub fn default_metadata_path() -> PathBuf {
        #[cfg(target_os = "windows")]
        {
            if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
                return PathBuf::from(local_app_data)
                    .join("GameStash")
                    .join("metadata")
                    .join("gamelist.json");
            }
        }

        #[cfg(not(target_os = "windows"))]
        {
            if let Ok(home) = std::env::var("HOME") {
                return PathBuf::from(home)
                    .join(".local")
                    .join("share")
                    .join("GameStash")
                    .join("metadata")
                    .join("gamelist.json");
            }
        }

        PathBuf::from("./metadata/gamelist.json")
    }

    pub fn new(storage_path: PathBuf) -> Self {
        let initial_cache = Self::read_from_disk(&storage_path);
        Self {
            storage_path,
            cache: RwLock::new(initial_cache),
        }
    }

    fn read_from_disk(path: &Path) -> HashMap<String, ScrapedGameMetadata> {
        if !path.is_file() {
            return HashMap::new();
        }

        match fs::read_to_string(path) {
            Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
            Err(_) => HashMap::new(),
        }
    }

    fn write_to_disk(&self, map: &HashMap<String, ScrapedGameMetadata>) -> Result<(), String> {
        if let Some(parent) = self.storage_path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }

        let json = serde_json::to_string_pretty(map).map_err(|e| e.to_string())?;
        let tmp_path = format!("{}.tmp", self.storage_path.to_string_lossy());
        fs::write(&tmp_path, json).map_err(|e| e.to_string())?;
        fs::rename(&tmp_path, &self.storage_path).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn load_all(&self) -> HashMap<String, ScrapedGameMetadata> {
        self.cache.read().map(|c| c.clone()).unwrap_or_default()
    }

    pub fn get(&self, game_id: &str) -> Option<ScrapedGameMetadata> {
        self.cache.read().ok().and_then(|c| c.get(game_id).cloned())
    }

    pub fn save(&self, metadata: ScrapedGameMetadata) -> Result<(), String> {
        let mut write_guard = self.cache.write().map_err(|e| e.to_string())?;
        write_guard.insert(metadata.game_id.clone(), metadata);
        self.write_to_disk(&write_guard)
    }

    pub fn clear(&self) -> Result<(), String> {
        let mut write_guard = self.cache.write().map_err(|e| e.to_string())?;
        write_guard.clear();
        if self.storage_path.is_file() {
            let _ = fs::remove_file(&self.storage_path);
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_metadata_store_crud() {
        let dir = tempdir().unwrap();
        let store_path = dir.path().join("gamelist.json");
        let store = MetadataStore::new(store_path.clone());

        assert!(store.load_all().is_empty());

        let meta = ScrapedGameMetadata {
            game_id: "snes:smw".to_string(),
            matched_title: "Super Mario World".to_string(),
            cover_url: Some("https://example.com/smw.png".to_string()),
            local_cover_path: Some("/media/smw.jpg".to_string()),
            release_year: Some(1990),
            developer: Some("Nintendo".to_string()),
            publisher: Some("Nintendo".to_string()),
            genres: Some(vec!["Platformer".to_string()]),
            description: Some("Mario in Dinosaur Land".to_string()),
            provider_source: "libretro".to_string(),
        };

        store.save(meta.clone()).expect("Failed to save metadata");

        let fetched = store.get("snes:smw").expect("Expected to find game");
        assert_eq!(fetched.matched_title, "Super Mario World");
        assert_eq!(fetched.release_year, Some(1990));

        // Reload from disk in a fresh store instance
        let fresh_store = MetadataStore::new(store_path);
        assert_eq!(fresh_store.load_all().len(), 1);
        assert!(fresh_store.get("snes:smw").is_some());

        fresh_store.clear().expect("Failed to clear store");
        assert!(fresh_store.load_all().is_empty());
    }

    #[test]
    fn test_default_metadata_path() {
        let p = MetadataStore::default_metadata_path();
        assert!(p.to_string_lossy().contains("gamelist.json"));
    }
}
