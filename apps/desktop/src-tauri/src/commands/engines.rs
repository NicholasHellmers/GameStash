use core_types::EngineConfig;
use tauri::State;

use crate::services::EngineDetector;
use crate::state::AppState;

#[tauri::command]
pub async fn get_engine_configs(state: State<'_, AppState>) -> Result<Vec<EngineConfig>, String> {
    let configs = state.engine_configs.lock().map_err(|e| e.to_string())?;
    Ok(configs.clone())
}

#[tauri::command]
pub async fn save_engine_config(
    config: EngineConfig,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let mut configs = state.engine_configs.lock().map_err(|e| e.to_string())?;
    if let Some(existing) = configs.iter_mut().find(|c| c.platform == config.platform) {
        *existing = config;
    } else {
        configs.push(config);
    }
    Ok(())
}

#[tauri::command]
pub async fn detect_installed_engines(
    state: State<'_, AppState>,
) -> Result<Vec<EngineConfig>, String> {
    let detected = EngineDetector::get_default_configs();
    let mut configs = state.engine_configs.lock().map_err(|e| e.to_string())?;
    *configs = detected.clone();
    Ok(detected)
}
