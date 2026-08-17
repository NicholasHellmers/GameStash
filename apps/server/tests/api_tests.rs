use axum_test::TestServer;
use chrono::Utc;
use core_types::{DownloadUrlResponse, Game, Platform, SaveFileEntry, SaveManifest, ServerHealth};
use gamestash_server::{create_app, create_app_with_state, AppState};
use std::collections::HashMap;
use std::sync::{Arc, RwLock};

#[tokio::test]
async fn test_health_endpoint_returns_ok() {
    let app = create_app("http://mock-storage.local".to_string());
    let server = TestServer::new(app).unwrap();

    let response = server.get("/api/v1/health").await;
    response.assert_status_ok();

    let health: ServerHealth = response.json();
    assert_eq!(health.status, "ok");
    assert!(health.storage_connected);
}

#[tokio::test]
async fn test_list_games_returns_scanned_catalog() {
    let app = create_app("http://mock-storage.local".to_string());
    let server = TestServer::new(app).unwrap();

    let response = server.get("/api/v1/games").await;
    response.assert_status_ok();

    let body: serde_json::Value = response.json();
    assert!(body["games"].is_array());
    assert!(body["total_count"].is_number());
}

#[tokio::test]
async fn test_get_game_by_id_found_and_not_found() {
    let mut games = HashMap::new();
    let test_game = Game {
        id: "snes:cdd3c8c373244976".to_string(),
        title: "Super Mario World".to_string(),
        platform: Platform::Snes,
        file_size_bytes: 524288,
        storage_key: "roms/snes/Super_Mario_World.sfc".to_string(),
        sha256_checksum: "cdd3c8c373244976900f86dafa969707abb87871e89cf6d9299202142d2fc559".to_string(),
        retro_hash: Some("cdd3c8c373244976".to_string()),
    };
    games.insert(test_game.id.clone(), test_game.clone());

    let state = AppState {
        storage_endpoint: "http://mock-storage.local".to_string(),
        storage_root_dir: None,
        games: Arc::new(RwLock::new(games)),
        save_manifests: Arc::new(RwLock::new(HashMap::new())),
    };

    let app = create_app_with_state(state);
    let server = TestServer::new(app).unwrap();

    // Success case
    let response = server.get("/api/v1/games/snes:cdd3c8c373244976").await;
    response.assert_status_ok();
    let game: Game = response.json();
    assert_eq!(game.title, "Super Mario World");
    assert_eq!(game.id, "snes:cdd3c8c373244976");

    // 404 case
    let not_found = server.get("/api/v1/games/non-existent-game").await;
    not_found.assert_status_not_found();
}

#[tokio::test]
async fn test_generate_download_url() {
    let mut games = HashMap::new();
    let test_game = Game {
        id: "snes:cdd3c8c373244976".to_string(),
        title: "Super Mario World".to_string(),
        platform: Platform::Snes,
        file_size_bytes: 524288,
        storage_key: "roms/snes/Super_Mario_World.sfc".to_string(),
        sha256_checksum: "cdd3c8c373244976900f86dafa969707abb87871e89cf6d9299202142d2fc559".to_string(),
        retro_hash: Some("cdd3c8c373244976".to_string()),
    };
    games.insert(test_game.id.clone(), test_game.clone());

    let state = AppState {
        storage_endpoint: "http://mock-storage.local/bucket".to_string(),
        storage_root_dir: None,
        games: Arc::new(RwLock::new(games)),
        save_manifests: Arc::new(RwLock::new(HashMap::new())),
    };

    let app = create_app_with_state(state);
    let server = TestServer::new(app).unwrap();

    let response = server
        .post("/api/v1/games/snes:cdd3c8c373244976/download-url")
        .await;
    response.assert_status_ok();

    let download: DownloadUrlResponse = response.json();
    assert_eq!(
        download.download_url,
        "http://mock-storage.local/bucket/roms/snes/Super_Mario_World.sfc"
    );
    assert_eq!(download.expires_in_seconds, 900);
    assert_eq!(download.sha256_checksum, Some("cdd3c8c373244976900f86dafa969707abb87871e89cf6d9299202142d2fc559".to_string()));
}

#[tokio::test]
async fn test_save_sync_lifecycle() {
    let app = create_app("http://mock-storage.local".to_string());
    let server = TestServer::new(app).unwrap();

    let now = Utc::now();
    let client_manifest = SaveManifest {
        game_id: "snes:cdd3c8c373244976".to_string(),
        entries: vec![SaveFileEntry {
            relative_path: "Super_Mario_World.srm".to_string(),
            file_size_bytes: 2048,
            sha256_hash: "abcd1234abcd1234".to_string(),
            modified_at: now,
        }],
        updated_at: now,
    };

    // First sync -> LocalNewer -> Saved to Cloud
    let sync_req = serde_json::json!({
        "manifest": client_manifest,
        "save_payload_base64": null
    });

    let sync_res = server
        .post("/api/v1/saves/snes:cdd3c8c373244976/sync")
        .json(&sync_req)
        .await;
    sync_res.assert_status_ok();

    // Verify manifest can now be fetched
    let manifest_res = server
        .get("/api/v1/saves/snes:cdd3c8c373244976/manifest")
        .await;
    manifest_res.assert_status_ok();
    let saved_manifest: SaveManifest = manifest_res.json();
    assert_eq!(saved_manifest.game_id, "snes:cdd3c8c373244976");
}

#[tokio::test]
async fn test_storage_stream_existing_file() {
    use std::io::Write;
    use tempfile::tempdir;

    let dir = tempdir().unwrap();
    let test_rom_path = dir.path().join("EarthBound (USA).sfc");
    let mut file = std::fs::File::create(&test_rom_path).unwrap();
    file.write_all(b"RAW_BINARY_EARTHBOUND_PAYLOAD").unwrap();

    let state = AppState {
        storage_endpoint: "http://127.0.0.1:8080/storage".to_string(),
        storage_root_dir: Some(dir.path().to_path_buf()),
        games: Arc::new(RwLock::new(HashMap::new())),
        save_manifests: Arc::new(RwLock::new(HashMap::new())),
    };

    let app = create_app_with_state(state);
    let server = TestServer::new(app).unwrap();

    let response = server.get("/storage/roms/snes/EarthBound%20(USA).sfc").await;
    response.assert_status_ok();
    assert_eq!(response.as_bytes().as_ref(), b"RAW_BINARY_EARTHBOUND_PAYLOAD");
    assert_eq!(
        response.header("content-type").to_str().unwrap(),
        "application/octet-stream"
    );
}

#[tokio::test]
async fn test_storage_stream_not_found() {
    use tempfile::tempdir;
    let dir = tempdir().unwrap();

    let state = AppState {
        storage_endpoint: "http://127.0.0.1:8080/storage".to_string(),
        storage_root_dir: Some(dir.path().to_path_buf()),
        games: Arc::new(RwLock::new(HashMap::new())),
        save_manifests: Arc::new(RwLock::new(HashMap::new())),
    };

    let app = create_app_with_state(state);
    let server = TestServer::new(app).unwrap();

    let response = server.get("/storage/roms/snes/NonExistent.sfc").await;
    response.assert_status_not_found();
}

#[tokio::test]
async fn test_storage_stream_unconfigured_directory() {
    let state = AppState {
        storage_endpoint: "http://127.0.0.1:8080/storage".to_string(),
        storage_root_dir: None,
        games: Arc::new(RwLock::new(HashMap::new())),
        save_manifests: Arc::new(RwLock::new(HashMap::new())),
    };

    let app = create_app_with_state(state);
    let server = TestServer::new(app).unwrap();

    let response = server.get("/storage/roms/snes/EarthBound%20(USA).sfc").await;
    response.assert_status_not_found();
}
