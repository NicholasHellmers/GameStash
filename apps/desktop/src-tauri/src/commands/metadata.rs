use core_types::Platform;
use std::collections::HashMap;
use tauri::State;

use crate::services::{MediaCacheService, ScrapedGameMetadata};
use crate::state::AppState;

#[tauri::command]
pub async fn cache_game_cover(
    platform: String,
    game_id: String,
    image_url: String,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let platform_enum = Platform::from_folder_name(&platform);
    let media_root = {
        let path_lock = state.media_root_path.lock().map_err(|e| e.to_string())?;
        path_lock.clone()
    };

    let cached_path = MediaCacheService::cache_remote_image(
        &state.http_client,
        &media_root,
        &platform_enum,
        &game_id,
        &image_url,
    )
    .await
    .map_err(|e| format!("Failed to cache cover image: {e}"))?;

    Ok(cached_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn get_cached_game_cover(
    platform: String,
    game_id: String,
    state: State<'_, AppState>,
) -> Result<Option<String>, String> {
    let platform_enum = Platform::from_folder_name(&platform);
    let media_root = {
        let path_lock = state.media_root_path.lock().map_err(|e| e.to_string())?;
        path_lock.clone()
    };

    let found_path = MediaCacheService::get_cached_cover_path(&media_root, &platform_enum, &game_id);
    Ok(found_path.map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn get_media_root_path(state: State<'_, AppState>) -> Result<String, String> {
    let path_lock = state.media_root_path.lock().map_err(|e| e.to_string())?;
    Ok(path_lock.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn get_all_stored_metadata(
    state: State<'_, AppState>,
) -> Result<HashMap<String, ScrapedGameMetadata>, String> {
    Ok(state.metadata_store.load_all())
}

#[tauri::command]
pub async fn save_manual_metadata_match(
    metadata: ScrapedGameMetadata,
    state: State<'_, AppState>,
) -> Result<(), String> {
    state.metadata_store.save(metadata)
}

#[tauri::command]
pub async fn scrape_game_metadata(
    platform: String,
    title: String,
    md5: Option<String>,
    sha256: Option<String>,
    state: State<'_, AppState>,
) -> Result<Option<ScrapedGameMetadata>, String> {
    let media_root = {
        let path_lock = state.media_root_path.lock().map_err(|e| e.to_string())?;
        path_lock.clone()
    };

    let scraper = crate::services::ScraperService::default();
    let result = scraper
        .scrape_game(
            &media_root,
            &state.metadata_store,
            &platform,
            &title,
            md5.as_deref(),
            sha256.as_deref(),
        )
        .await;

    Ok(result)
}

#[tauri::command]
pub async fn search_game_candidates(
    query: String,
    platform: Option<String>,
) -> Result<Vec<ScrapedGameMetadata>, String> {
    let scraper = crate::services::ScraperService::default();
    let results = scraper.search_candidates(&query, platform.as_deref()).await;
    Ok(results)
}
