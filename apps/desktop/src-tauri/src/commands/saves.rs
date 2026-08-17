use core_types::{Platform, SaveBackupEntry, SaveManifest, SyncStatus};
use tauri::State;

use crate::services::SaveManager;
use crate::state::AppState;

#[tauri::command]
pub async fn check_save_sync_status(
    server_url: String,
    game_id: String,
    platform: Option<String>,
    state: State<'_, AppState>,
) -> Result<SyncStatus, String> {
    let clean_url = server_url.trim_end_matches('/');
    let endpoint = format!("{clean_url}/api/v1/saves/{game_id}/manifest");

    let platform_enum = platform
        .map(|p| Platform::from_folder_name(&p))
        .unwrap_or(Platform::Pc);

    let library_root = state
        .library_root_path
        .lock()
        .map_err(|e| e.to_string())?
        .clone();

    let local_manifest = SaveManager::generate_local_manifest(&library_root, &platform_enum, &game_id);

    let response = state.http_client.get(&endpoint).send().await;

    match response {
        Ok(res) if res.status().is_success() => {
            let cloud_manifest: SaveManifest = res
                .json()
                .await
                .map_err(|err| format!("Failed to parse cloud manifest: {err}"))?;

            Ok(cloud_manifest.compare(&local_manifest))
        }
        _ => {
            if !local_manifest.entries.is_empty() {
                Ok(SyncStatus::LocalNewer)
            } else {
                Ok(SyncStatus::InSync)
            }
        }
    }
}

#[tauri::command]
pub async fn trigger_cloud_save_sync(
    server_url: String,
    game_id: String,
    platform: Option<String>,
    state: State<'_, AppState>,
) -> Result<SaveManifest, String> {
    let clean_url = server_url.trim_end_matches('/');
    let endpoint = format!("{clean_url}/api/v1/saves/{game_id}/sync");

    let platform_enum = platform
        .map(|p| Platform::from_folder_name(&p))
        .unwrap_or(Platform::Pc);

    let library_root = state
        .library_root_path
        .lock()
        .map_err(|e| e.to_string())?
        .clone();

    let local_manifest = SaveManager::generate_local_manifest(&library_root, &platform_enum, &game_id);

    let payload = serde_json::json!({
        "manifest": local_manifest,
        "save_payload_base64": null
    });

    let response = state
        .http_client
        .post(&endpoint)
        .json(&payload)
        .send()
        .await
        .map_err(|err| format!("Save sync network error: {err}"))?;

    let body: serde_json::Value = response
        .json()
        .await
        .map_err(|err| format!("Invalid save sync response: {err}"))?;

    let updated_manifest: SaveManifest = serde_json::from_value(body["manifest"].clone())
        .map_err(|err| format!("Invalid manifest format: {err}"))?;

    Ok(updated_manifest)
}

#[tauri::command]
pub async fn pull_cloud_save(
    server_url: String,
    game_id: String,
    platform: Option<String>,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let platform_enum = platform
        .map(|p| Platform::from_folder_name(&p))
        .unwrap_or(Platform::Pc);

    let library_root = state
        .library_root_path
        .lock()
        .map_err(|e| e.to_string())?
        .clone();

    let save_dir = SaveManager::get_save_dir(&library_root, &platform_enum, &game_id);

    // Auto-backup existing local save before overwrite
    if save_dir.exists() {
        for entry in std::fs::read_dir(&save_dir).map_err(|e| e.to_string())?.flatten() {
            let path = entry.path();
            if path.is_file() {
                let _ = state.save_backup_service.create_backup(
                    &path,
                    &game_id,
                    "Cloud save pull overwrite",
                );
            }
        }
    }

    let clean_url = server_url.trim_end_matches('/');
    let endpoint = format!("{clean_url}/api/v1/saves/{game_id}/manifest");

    let res = state
        .http_client
        .get(&endpoint)
        .send()
        .await
        .map_err(|e| format!("Failed to fetch cloud manifest: {e}"))?;

    if res.status().is_success() {
        let _cloud_manifest: SaveManifest = res
            .json()
            .await
            .map_err(|e| format!("Invalid cloud manifest format: {e}"))?;

        // Create local save directory
        std::fs::create_dir_all(&save_dir).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
pub async fn list_save_backups(
    game_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<Vec<SaveBackupEntry>, String> {
    Ok(state.save_backup_service.list_backups(game_id.as_deref()))
}

#[tauri::command]
pub async fn restore_save_backup(
    backup_id: String,
    state: State<'_, AppState>,
) -> Result<SaveBackupEntry, String> {
    state
        .save_backup_service
        .restore_backup(&backup_id)
        .map_err(|e| e.to_string())
}
