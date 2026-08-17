pub mod error;
pub mod routes;
pub mod services;
pub mod state;

pub use error::AppError;
pub use routes::create_router;
pub use state::AppState;

use axum::Router;

/// Helper to create a fully configured router for tests and server binary
pub fn create_app(storage_endpoint: String) -> Router {
    let state = AppState::new(storage_endpoint);
    create_router(state)
}

pub fn create_app_with_state(state: AppState) -> Router {
    create_router(state)
}
