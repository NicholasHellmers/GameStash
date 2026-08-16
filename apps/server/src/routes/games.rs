use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
};
use core_types::Game;
use serde_json::json;

use crate::{error::AppError, services::StorageService, state::AppState};

pub async fn list_games(State(state): State<AppState>) -> impl IntoResponse {
    let games_lock = state.games.read().unwrap();
    let games: Vec<Game> = games_lock.values().cloned().collect();

    Json(json!({
        "games": games,
        "total_count": games.len(),
    }))
}

pub async fn get_game_by_id(
    State(state): State<AppState>,
    Path(game_id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let games_lock = state.games.read().unwrap();
    let game = games_lock
        .get(&game_id)
        .cloned()
        .ok_or_else(|| AppError::NotFound(format!("Game with id '{game_id}' not found")))?;

    Ok(Json(game))
}

pub async fn generate_download_url(
    State(state): State<AppState>,
    Path(game_id): Path<String>,
) -> Result<impl IntoResponse, AppError> {
    let games_lock = state.games.read().unwrap();
    let game = games_lock
        .get(&game_id)
        .ok_or_else(|| AppError::NotFound(format!("Game with id '{game_id}' not found")))?;

    let download_info = StorageService::generate_download_url(&state.storage_endpoint, game, 900); // 15 mins expiry

    Ok(Json(download_info))
}
