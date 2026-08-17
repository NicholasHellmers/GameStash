use core_types::Platform;
use serde::Serialize;
use std::sync::Arc;
use tauri::State;

use crate::services::{ProcessLauncher, SaveManager};
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
    platform: Option<String>,
    rom_path: Option<String>,
    server_url: Option<String>,
    state: State<'_, AppState>,
) -> Result<LaunchResult, String> {
    let platform_enum = platform
        .as_deref()
        .map(Platform::from_folder_name)
        .unwrap_or(Platform::Pc);

    let engine_configs = state
        .engine_configs
        .lock()
        .map_err(|e| e.to_string())?
        .clone();

    let target_engine = engine_configs
        .iter()
        .find(|c| c.platform == platform_enum)
        .cloned();

    let (executable, args) = match target_engine {
        Some(engine) if engine.is_flatpak => {
            let mut final_args = vec!["run".to_string()];
            if let Some(flatpak_id) = &engine.flatpak_id {
                final_args.push(flatpak_id.clone());
            } else {
                final_args.push(engine.executable_path.clone());
            }
            final_args.extend(engine.default_args.clone());
            if let Some(path) = &rom_path {
                final_args.push(path.clone());
            }
            ("flatpak".to_string(), final_args)
        }
        Some(engine) if !engine.executable_path.is_empty() => {
            let mut final_args = engine.default_args.clone();
            if let Some(path) = &rom_path {
                final_args.push(path.clone());
            }
            (engine.executable_path, final_args)
        }
        _ => {
            // Native executable or fallback
            if let Some(path) = &rom_path {
                (path.clone(), Vec::new())
            } else {
                return Err("No executable or ROM path provided for launch".to_string());
            }
        }
    };

    // Launch process
    let pid = ProcessLauncher::launch(&executable, &args).map_err(|e| e.to_string())?;

    // Asynchronously monitor process exit for save sync hook
    let app_state = state.inner().clone_state();
    let gid = game_id.clone();
    let plat = platform_enum.clone();
    let surl = server_url.clone();

    tokio::spawn(async move {
        // In real execution, tokio / subprocess watcher waits for PID exit.
        // For demonstration & testing, simulate post-game save check after delay.
        tokio::time::sleep(tokio::time::Duration::from_secs(3)).await;

        if let Some(url) = surl {
            let library_root = match app_state.library_root_path.lock() {
                Ok(guard) => guard.clone(),
                Err(_) => return,
            };

            let local_manifest = SaveManager::generate_local_manifest(&library_root, &plat, &gid);
            if !local_manifest.entries.is_empty() {
                let clean_url = url.trim_end_matches('/');
                let endpoint = format!("{clean_url}/api/v1/saves/{gid}/sync");
                let payload = serde_json::json!({
                    "manifest": local_manifest,
                    "save_payload_base64": null
                });

                let _ = app_state.http_client.post(&endpoint).json(&payload).send().await;
            }
        }
    });

    Ok(LaunchResult {
        success: true,
        pid: Some(pid),
        message: format!("Successfully launched {game_id} (PID: {pid})"),
    })
}

impl AppState {
    pub fn clone_state(&self) -> Self {
        Self {
            active_server_url: Arc::clone(&self.active_server_url),
            http_client: self.http_client.clone(),
            library_root_path: Arc::clone(&self.library_root_path),
            media_root_path: Arc::clone(&self.media_root_path),
            metadata_store: Arc::clone(&self.metadata_store),
            scanner_cache: Arc::clone(&self.scanner_cache),
            engine_configs: Arc::clone(&self.engine_configs),
            save_backup_service: Arc::clone(&self.save_backup_service),
        }
    }
}
