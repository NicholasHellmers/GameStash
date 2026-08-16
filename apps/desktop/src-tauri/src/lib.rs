pub mod commands;
pub mod services;
pub mod state;

use state::AppState;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            commands::ping_server,
            commands::fetch_game_catalog,
            commands::request_game_download,
            commands::check_save_sync_status,
            commands::trigger_cloud_save_sync,
            commands::launch_game,
        ])
        .run(tauri::generate_context!())
        .expect("error while running GameStash desktop application");
}
