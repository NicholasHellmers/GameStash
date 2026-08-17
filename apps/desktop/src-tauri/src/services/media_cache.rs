use core_types::Platform;
use reqwest::Client;
use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum MediaCacheError {
    #[error("Network error while downloading media: {0}")]
    Network(#[from] reqwest::Error),
    #[error("File I/O error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Invalid image URL: {0}")]
    InvalidUrl(String),
}

pub struct MediaCacheService;

impl MediaCacheService {
    /// Resolves the base media directory across target OS platforms
    pub fn default_media_dir() -> PathBuf {
        #[cfg(target_os = "windows")]
        {
            if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
                return PathBuf::from(local_app_data).join("GameStash").join("media");
            }
        }

        #[cfg(not(target_os = "windows"))]
        {
            if let Ok(home) = std::env::var("HOME") {
                return PathBuf::from(home)
                    .join(".local")
                    .join("share")
                    .join("GameStash")
                    .join("media");
            }
        }

        PathBuf::from("./media")
    }

    /// Sanitizes canonical game IDs (<platform>:<hash>) for filesystem storage
    pub fn sanitize_game_id(game_id: &str) -> String {
        game_id
            .replace(':', "_")
            .replace('/', "_")
            .replace('\\', "_")
            .replace('*', "_")
            .replace('?', "_")
            .replace('"', "_")
            .replace('<', "_")
            .replace('>', "_")
            .replace('|', "_")
    }

    /// Returns path to cached cover image if it exists
    pub fn get_cached_cover_path(
        media_root: &Path,
        platform: &Platform,
        game_id: &str,
    ) -> Option<PathBuf> {
        let safe_id = Self::sanitize_game_id(game_id);
        let covers_dir = media_root.join(platform.folder_name()).join("covers");

        for ext in &["jpg", "png", "webp", "jpeg"] {
            let candidate = covers_dir.join(format!("{safe_id}.{ext}"));
            if candidate.is_file() {
                return Some(candidate);
            }
        }

        None
    }

    /// Downloads a remote image and caches it in the local media directory
    pub async fn cache_remote_image(
        client: &Client,
        media_root: &Path,
        platform: &Platform,
        game_id: &str,
        image_url: &str,
    ) -> Result<PathBuf, MediaCacheError> {
        if image_url.trim().is_empty() {
            return Err(MediaCacheError::InvalidUrl("Empty URL".to_string()));
        }

        let safe_id = Self::sanitize_game_id(game_id);
        let covers_dir = media_root.join(platform.folder_name()).join("covers");
        fs::create_dir_all(&covers_dir)?;

        // Determine extension
        let ext = if image_url.ends_with(".png") {
            "png"
        } else if image_url.ends_with(".webp") {
            "webp"
        } else {
            "jpg"
        };

        let target_path = covers_dir.join(format!("{safe_id}.{ext}"));

        let response = client
            .get(image_url)
            .send()
            .await?
            .error_for_status()?;

        let bytes = response.bytes().await?;

        let temp_path = target_path.with_extension("tmp");
        let mut file = File::create(&temp_path)?;
        file.write_all(&bytes)?;
        file.flush()?;
        drop(file);

        fs::rename(&temp_path, &target_path)?;

        Ok(target_path)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use wiremock::matchers::{method, path};
    use wiremock::{Mock, MockServer, ResponseTemplate};

    #[test]
    fn test_sanitize_game_id() {
        assert_eq!(
            MediaCacheService::sanitize_game_id("snes:cdd3c8c373244976"),
            "snes_cdd3c8c373244976"
        );
        assert_eq!(
            MediaCacheService::sanitize_game_id("custom/test*game?"),
            "custom_test_game_"
        );
    }

    #[test]
    fn test_default_media_dir() {
        let dir = MediaCacheService::default_media_dir();
        assert!(!dir.as_os_str().is_empty());
    }

    #[tokio::test]
    async fn test_cache_remote_image_success_and_get() {
        let mock_server = MockServer::start().await;
        let image_bytes = b"MOCK_PNG_IMAGE_DATA";

        Mock::given(method("GET"))
            .and(path("/cover.png"))
            .respond_with(ResponseTemplate::new(200).set_body_bytes(image_bytes.to_vec()))
            .mount(&mock_server)
            .await;

        let temp_media = tempdir().unwrap();
        let client = Client::new();
        let image_url = format!("{}/cover.png", mock_server.uri());

        let cached_path = MediaCacheService::cache_remote_image(
            &client,
            temp_media.path(),
            &Platform::Snes,
            "snes:earthbound",
            &image_url,
        )
        .await
        .unwrap();

        assert!(cached_path.is_file());
        assert_eq!(std::fs::read(&cached_path).unwrap(), image_bytes);

        // Test get_cached_cover_path retrieves existing cached file
        let found = MediaCacheService::get_cached_cover_path(
            temp_media.path(),
            &Platform::Snes,
            "snes:earthbound",
        );
        assert_eq!(found, Some(cached_path));

        // Test non-existent game returns None
        let not_found = MediaCacheService::get_cached_cover_path(
            temp_media.path(),
            &Platform::Snes,
            "snes:nonexistent",
        );
        assert!(not_found.is_none());
    }

    #[tokio::test]
    async fn test_cache_remote_image_invalid_url() {
        let temp_media = tempdir().unwrap();
        let client = Client::new();

        let err = MediaCacheService::cache_remote_image(
            &client,
            temp_media.path(),
            &Platform::Snes,
            "snes:test",
            "",
        )
        .await;

        assert!(err.is_err());
    }
}
