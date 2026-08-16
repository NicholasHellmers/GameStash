use core_types::{DownloadUrlResponse, Game};
use tauri::State;

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
