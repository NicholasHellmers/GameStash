pub mod games;
pub mod health;
pub mod saves;

use axum::{
    routing::{get, post},
    Router,
};
use tower_http::cors::{Any, CorsLayer};

use crate::state::AppState;

pub fn create_router(state: AppState) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .route("/api/v1/health", get(health::get_health))
        .route("/api/v1/games", get(games::list_games))
        .route("/api/v1/games/:id", get(games::get_game_by_id))
        .route("/api/v1/games/:id/download-url", post(games::generate_download_url))
        .route("/api/v1/saves/:id/manifest", get(saves::get_save_manifest))
        .route("/api/v1/saves/:id/sync", post(saves::sync_save))
        .layer(cors)
        .with_state(state)
}
