use core_types::{DownloadUrlResponse, Game};

pub struct StorageService;

impl StorageService {
    /// Generates a pre-signed download URL pointing directly to the object store
    pub fn generate_download_url(
        storage_endpoint: &str,
        game: &Game,
        expires_in_seconds: u64,
    ) -> DownloadUrlResponse {
        let clean_endpoint = storage_endpoint.trim_end_matches('/');
        let download_url = format!("{}/{}", clean_endpoint, game.storage_key);

        DownloadUrlResponse {
            download_url,
            expires_in_seconds,
            file_size_bytes: game.file_size_bytes,
            sha256_checksum: None,
        }
    }
}
