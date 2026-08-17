use core_types::EngineConfig;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use crate::services::{EngineDetector, MediaCacheService, MetadataStore, SaveBackupService, ScannerCache};

pub struct AppState {
    pub active_server_url: Arc<Mutex<Option<String>>>,
    pub http_client: reqwest::Client,
    pub library_root_path: Arc<Mutex<PathBuf>>,
    pub media_root_path: Arc<Mutex<PathBuf>>,
    pub metadata_store: Arc<MetadataStore>,
    pub scanner_cache: Arc<Mutex<ScannerCache>>,
    pub engine_configs: Arc<Mutex<Vec<EngineConfig>>>,
    pub save_backup_service: Arc<SaveBackupService>,
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}

impl AppState {
    pub fn new() -> Self {
        let base_data_dir = if let Some(local_appdata) = std::env::var_os("LOCALAPPDATA") {
            PathBuf::from(local_appdata).join("GameStash")
        } else if let Some(home) = std::env::var_os("HOME") {
            PathBuf::from(home).join("Games").join("GameStash")
        } else {
            PathBuf::from(".gamestash")
        };

        let library_root = base_data_dir.join("roms");
        let backup_root = base_data_dir.join("backups").join("recently_deleted");
        let media_root = MediaCacheService::default_media_dir();
        let metadata_path = MetadataStore::default_metadata_path();

        Self {
            active_server_url: Arc::new(Mutex::new(Some("http://localhost:8080".to_string()))),
            http_client: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(15))
                .build()
                .unwrap_or_default(),
            library_root_path: Arc::new(Mutex::new(library_root)),
            media_root_path: Arc::new(Mutex::new(media_root)),
            metadata_store: Arc::new(MetadataStore::new(metadata_path)),
            scanner_cache: Arc::new(Mutex::new(ScannerCache::new())),
            engine_configs: Arc::new(Mutex::new(EngineDetector::get_default_configs())),
            save_backup_service: Arc::new(SaveBackupService::new(backup_root)),
        }
    }
}
