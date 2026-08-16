use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use core_types::{SaveManifest, SyncStatus};
use serde::{Deserialize, Serialize};
use serde_json::json;

use crate::{error::AppError, services::SaveSyncService, state::AppState};

#[derive(Debug, Deserialize)]
pub struct SyncSaveRequest {
    pub manifest: SaveManifest,
    pub save_payload_base64: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct SyncSaveResponse {
    pub status: SyncStatus,
    pub manifest: SaveManifest,
}

pub async fn get_save_manifest(
    State(state): State<AppState>,
    Path(game_id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let manifests_lock = state.save_manifests.read().unwrap();
    let manifest = manifests_lock
        .get(&game_id)
        .cloned()
        .ok_or_else(|| AppError::NotFound(format!("No cloud save found for game '{game_id}'")))?;

    Ok(Json(manifest))
}

pub async fn sync_save(
    State(state): State<AppState>,
    Path(game_id): Path<String>,
    Json(payload): Json<SyncSaveRequest>,
) -> Result<impl IntoResponse, AppError> {
    let mut manifests_lock = state.save_manifests.write().unwrap();
    let cloud_manifest = manifests_lock.get(&game_id);

    let status = SaveSyncService::evaluate_sync_status(cloud_manifest, &payload.manifest);

    match status {
        SyncStatus::InSync => Ok(Json(json!({
            "status": "InSync",
            "message": "Local and cloud saves are already identical",
            "manifest": payload.manifest
        }))),
        SyncStatus::LocalNewer => {
            // Update cloud manifest with the newer local version
            manifests_lock.insert(game_id, payload.manifest.clone());
            Ok(Json(json!({
                "status": "LocalNewer",
                "message": "Cloud save successfully updated from local client",
                "manifest": payload.manifest
            })))
        }
        SyncStatus::CloudNewer => {
            let existing_cloud = cloud_manifest.unwrap().clone();
            Ok(Json(json!({
                "status": "CloudNewer",
                "message": "Cloud save is newer than client; client should pull",
                "manifest": existing_cloud
            })))
        }
        SyncStatus::Conflict { .. } => Ok(Json(json!({
            "status": "Conflict",
            "message": "Both local and cloud saves have diverged",
            "manifest": cloud_manifest.cloned()
        }))),
    }
}
