use axum_test::TestServer;
use chrono::Utc;
use core_types::{DownloadUrlResponse, Game, SaveFileEntry, SaveManifest, ServerHealth};
use gamestash_server::create_app;

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
async fn test_list_games_returns_seeded_catalog() {
    let app = create_app("http://mock-storage.local".to_string());
    let server = TestServer::new(app).unwrap();

    let response = server.get("/api/v1/games").await;
    response.assert_status_ok();

    let body: serde_json::Value = response.json();
    assert!(body["total_count"].as_u64().unwrap() >= 3);
    assert!(body["games"].is_array());
}

#[tokio::test]
async fn test_get_game_by_id_found_and_not_found() {
    let app = create_app("http://mock-storage.local".to_string());
    let server = TestServer::new(app).unwrap();

    // Success case
    let response = server.get("/api/v1/games/snes-super-mario-world").await;
    response.assert_status_ok();
    let game: Game = response.json();
    assert_eq!(game.title, "Super Mario World");

    // 404 case
    let not_found = server.get("/api/v1/games/non-existent-game").await;
    not_found.assert_status_not_found();
}

#[tokio::test]
async fn test_generate_download_url() {
    let app = create_app("http://mock-storage.local/bucket".to_string());
    let server = TestServer::new(app).unwrap();

    let response = server
        .post("/api/v1/games/snes-super-mario-world/download-url")
        .await;
    response.assert_status_ok();

    let download: DownloadUrlResponse = response.json();
    assert_eq!(
        download.download_url,
        "http://mock-storage.local/bucket/roms/snes/Super_Mario_World.sfc"
    );
    assert_eq!(download.expires_in_seconds, 900);
}

#[tokio::test]
async fn test_save_sync_lifecycle() {
    let app = create_app("http://mock-storage.local".to_string());
    let server = TestServer::new(app).unwrap();

    let now = Utc::now();
    let client_manifest = SaveManifest {
        game_id: "snes-super-mario-world".to_string(),
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
        .post("/api/v1/saves/snes-super-mario-world/sync")
        .json(&sync_req)
        .await;
    sync_res.assert_status_ok();

    // Verify manifest can now be fetched
    let manifest_res = server
        .get("/api/v1/saves/snes-super-mario-world/manifest")
        .await;
    manifest_res.assert_status_ok();
    let saved_manifest: SaveManifest = manifest_res.json();
    assert_eq!(saved_manifest.game_id, "snes-super-mario-world");
}
