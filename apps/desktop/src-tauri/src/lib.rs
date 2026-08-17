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
            commands::scan_local_library,
            commands::get_library_root_path,
            commands::set_library_root_path,
            commands::start_game_download,
            commands::get_engine_configs,
            commands::save_engine_config,
            commands::detect_installed_engines,
            commands::check_save_sync_status,
            commands::trigger_cloud_save_sync,
            commands::pull_cloud_save,
            commands::list_save_backups,
            commands::restore_save_backup,
            commands::launch_game,
            commands::cache_game_cover,
            commands::get_cached_game_cover,
            commands::get_media_root_path,
            commands::get_all_stored_metadata,
            commands::save_manual_metadata_match,
            commands::scrape_game_metadata,
            commands::search_game_candidates,
        ])
        .run(tauri::generate_context!())
        .expect("error while running GameStash desktop application");
}
