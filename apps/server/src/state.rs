use core_types::{Game, Platform, SaveManifest};
use std::collections::HashMap;
use std::sync::{Arc, RwLock};

#[derive(Clone)]
pub struct AppState {
    pub storage_endpoint: String,
    pub games: Arc<RwLock<HashMap<String, Game>>>,
    pub save_manifests: Arc<RwLock<HashMap<String, SaveManifest>>>,
}

impl AppState {
    pub fn new(storage_endpoint: String) -> Self {
        let mut games = HashMap::new();

        // Seed demo games for bootstrapping
        let demo_games = vec![
            Game {
                id: "snes-super-mario-world".to_string(),
                title: "Super Mario World".to_string(),
                platform: Platform::Snes,
                release_year: Some(1990),
                cover_url: Some("https://images.igdb.com/igdb/image/upload/t_cover_big/co1x7d.png".to_string()),
                file_size_bytes: 524_288, // 512 KB
                storage_key: "roms/snes/Super_Mario_World.sfc".to_string(),
                description: Some("Iconic SNES launch platformer featuring Mario and Yoshi.".to_string()),
            },
            Game {
                id: "n64-zelda-ocarina-of-time".to_string(),
                title: "The Legend of Zelda: Ocarina of Time".to_string(),
                platform: Platform::N64,
                release_year: Some(1998),
                cover_url: Some("https://images.igdb.com/igdb/image/upload/t_cover_big/co1x7e.png".to_string()),
                file_size_bytes: 33_554_432, // 32 MB
                storage_key: "roms/n64/Zelda_Ocarina_of_Time.z64".to_string(),
                description: Some("Hero of Time adventures across Hyrule in revolutionary 3D.".to_string()),
            },
            Game {
                id: "ps1-castlevania-sotn".to_string(),
                title: "Castlevania: Symphony of the Night".to_string(),
                platform: Platform::Ps1,
                release_year: Some(1997),
                cover_url: Some("https://images.igdb.com/igdb/image/upload/t_cover_big/co1x7f.png".to_string()),
                file_size_bytes: 524_288_000, // 500 MB
                storage_key: "roms/ps1/Castlevania_SotN.bin".to_string(),
                description: Some("The definitive gothic action-adventure platformer.".to_string()),
            },
        ];

        for game in demo_games {
            games.insert(game.id.clone(), game);
        }

        Self {
            storage_endpoint,
            games: Arc::new(RwLock::new(games)),
            save_manifests: Arc::new(RwLock::new(HashMap::new())),
        }
    }
}
