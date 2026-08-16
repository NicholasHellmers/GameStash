use axum::{extract::State, response::IntoResponse, Json};
use chrono::Utc;
use core_types::ServerHealth;

use crate::state::AppState;

pub async fn get_health(State(_state): State<AppState>) -> impl IntoResponse {
    let health = ServerHealth {
        status: "ok".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        storage_connected: true,
        server_time_utc: Utc::now(),
    };

    Json(health)
}
