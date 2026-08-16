use serde::Serialize;
use tauri::State;

use crate::state::AppState;

#[derive(Serialize)]
pub struct LaunchResult {
    pub success: bool,
    pub pid: Option<u32>,
    pub message: String,
}

#[tauri::command]
pub async fn launch_game(
    game_id: String,
    _state: State<'_, AppState>,
) -> Result<LaunchResult, String> {
    // In POC, log and simulate process startup
    Ok(LaunchResult {
        success: true,
        pid: Some(4242),
        message: format!("Launched {game_id}"),
    })
}
