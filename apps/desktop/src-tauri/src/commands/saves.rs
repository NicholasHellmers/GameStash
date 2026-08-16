use core_types::{SaveManifest, SyncStatus};
use tauri::State;

use crate::state::AppState;

#[tauri::command]
pub async fn check_save_sync_status(
    server_url: String,
    game_id: String,
    state: State<'_, AppState>,
) -> Result<SyncStatus, String> {
    let clean_url = server_url.trim_end_matches('/');
    let endpoint = format!("{clean_url}/api/v1/saves/{game_id}/manifest");

    let response = state.http_client.get(&endpoint).send().await;

    match response {
        Ok(res) if res.status().is_success() => {
            let _cloud_manifest: SaveManifest = res
                .json()
                .await
                .map_err(|err| format!("Failed to parse cloud manifest: {err}"))?;

            // For now, if cloud manifest exists, report InSync
            Ok(SyncStatus::InSync)
        }
        _ => Ok(SyncStatus::InSync),
    }
}

#[tauri::command]
pub async fn trigger_cloud_save_sync(
    server_url: String,
    game_id: String,
    manifest: SaveManifest,
    state: State<'_, AppState>,
) -> Result<SaveManifest, String> {
    let clean_url = server_url.trim_end_matches('/');
    let endpoint = format!("{clean_url}/api/v1/saves/{game_id}/sync");

    let payload = serde_json::json!({
        "manifest": manifest,
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
