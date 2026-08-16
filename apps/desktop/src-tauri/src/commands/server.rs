use core_types::ServerHealth;
use tauri::State;

use crate::state::AppState;

#[tauri::command]
pub async fn ping_server(
    server_url: String,
    state: State<'_, AppState>,
) -> Result<ServerHealth, String> {
    let clean_url = server_url.trim_end_matches('/');
    let endpoint = format!("{clean_url}/api/v1/health");

    let response = state
        .http_client
        .get(&endpoint)
        .send()
        .await
        .map_err(|err| format!("Failed to reach server: {err}"))?;

    if !response.status().is_success() {
        return Err(format!("Server returned HTTP {}", response.status()));
    }

    let health: ServerHealth = response
        .json()
        .await
        .map_err(|err| format!("Invalid health response: {err}"))?;

    // Update active server URL
    let mut url_lock = state.active_server_url.lock().unwrap();
    *url_lock = Some(clean_url.to_string());

    Ok(health)
}
