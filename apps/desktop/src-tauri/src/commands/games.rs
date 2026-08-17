use core_types::{DownloadUrlResponse, Game, LocalGame};
use std::path::PathBuf;
use tauri::{AppHandle, Emitter, State};

use crate::services::{DownloadManager, LibraryScanner, RomHasher};
use crate::state::AppState;

#[tauri::command]
pub async fn fetch_game_catalog(
    server_url: String,
    state: State<'_, AppState>,
) -> Result<Vec<Game>, String> {
    let clean_url = server_url.trim_end_matches('/');
    let endpoint = format!("{clean_url}/api/v1/games");

    let response = state
        .http_client
        .get(&endpoint)
        .send()
        .await
        .map_err(|err| format!("Failed to fetch catalog: {err}"))?;

    let body: serde_json::Value = response
        .json()
        .await
        .map_err(|err| format!("Failed to parse catalog response: {err}"))?;

    let games: Vec<Game> = serde_json::from_value(body["games"].clone())
        .map_err(|err| format!("Invalid games format: {err}"))?;

    Ok(games)
}

#[tauri::command]
pub async fn request_game_download(
    server_url: String,
    game_id: String,
    state: State<'_, AppState>,
) -> Result<DownloadUrlResponse, String> {
    let clean_url = server_url.trim_end_matches('/');
    let endpoint = format!("{clean_url}/api/v1/games/{game_id}/download-url");

    let response = state
        .http_client
        .post(&endpoint)
        .send()
        .await
        .map_err(|err| format!("Failed to request download URL: {err}"))?;

    let download_info: DownloadUrlResponse = response
        .json()
        .await
        .map_err(|err| format!("Failed to parse download info: {err}"))?;

    Ok(download_info)
}

#[tauri::command]
pub async fn get_library_root_path(state: State<'_, AppState>) -> Result<String, String> {
    let path = state.library_root_path.lock().map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn set_library_root_path(
    new_path: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut path = state.library_root_path.lock().map_err(|e| e.to_string())?;
    *path = PathBuf::from(new_path);
    Ok(())
}

#[tauri::command]
pub async fn scan_local_library(
    custom_dir: Option<String>,
    server_url: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<LocalGame>, String> {
    let root_path = match custom_dir {
        Some(dir) => PathBuf::from(dir),
        None => {
            let path_lock = state.library_root_path.lock().map_err(|e| e.to_string())?;
            path_lock.clone()
        }
    };

    // Ensure directory exists
    if !root_path.exists() {
        let _ = std::fs::create_dir_all(&root_path);
    }

    // Optionally fetch remote catalog to cross-match IDs
    let known_catalog = if let Some(url) = server_url {
        fetch_game_catalog(url, state.clone()).await.unwrap_or_default()
    } else {
        Vec::new()
    };

    let mut cache = state.scanner_cache.lock().map_err(|e| e.to_string())?;
    let games = LibraryScanner::scan_directory(&root_path, &mut cache, &known_catalog);
    Ok(games)
}

#[tauri::command]
pub async fn start_game_download(
    app: AppHandle,
    server_url: String,
    game_id: String,
    state: State<'_, AppState>,
) -> Result<LocalGame, String> {
    let clean_url = server_url.trim_end_matches('/');
    
    // 1. Get game details from server
    let game_endpoint = format!("{clean_url}/api/v1/games/{game_id}");
    let game_resp = state
        .http_client
        .get(&game_endpoint)
        .send()
        .await
        .map_err(|e| format!("Failed to get game metadata: {e}"))?;
    let game: Game = game_resp
        .json()
        .await
        .map_err(|e| format!("Invalid game metadata format: {e}"))?;

    // 2. Request pre-signed download URL
    let download_info = request_game_download(server_url, game_id.clone(), state.clone()).await?;

    // 3. Determine destination directory: <library_root>/<platform>/<file_name>
    let library_root = {
        let path_lock = state.library_root_path.lock().map_err(|e| e.to_string())?;
        path_lock.clone()
    };

    let filename = game
        .storage_key
        .split('/')
        .last()
        .unwrap_or("game.bin")
        .to_string();

    let platform_folder = game.platform.folder_name();
    let dest_dir = library_root.join(platform_folder);
    let destination_path = dest_dir.join(&filename);

    let client = state.http_client.clone();
    let game_id_for_event = game_id.clone();
    let app_handle = app.clone();

    // 4. Download file with progress events
    let final_path = DownloadManager::download_file(
        &client,
        &download_info.download_url,
        &destination_path,
        &game_id_for_event,
        download_info.sha256_checksum.as_deref(),
        move |payload| {
            let _ = app_handle.emit("game_download_progress", payload);
        },
    )
    .await
    .map_err(|e| format!("Download error: {e}"))?;

    // 5. Compute hashes and return LocalGame
    let hashes = RomHasher::compute_hashes(&final_path, &game.platform)
        .map_err(|e| format!("Hashing failed: {e}"))?;

    let relative_path = format!("{platform_folder}/{filename}");
    let metadata = std::fs::metadata(&final_path).map_err(|e| e.to_string())?;

    Ok(LocalGame {
        file_path: final_path.to_string_lossy().to_string(),
        relative_path,
        platform: game.platform,
        file_size_bytes: metadata.len(),
        hashes,
        matched_game_id: Some(game_id),
        modified_at: chrono::Utc::now(),
    })
}
