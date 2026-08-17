use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Supported gaming platforms in GameStash
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Platform {
    Pc,
    Nes,
    Snes,
    Genesis,
    Gb,
    Gbc,
    Gba,
    Ps1,
    Ps2,
    N64,
    Gamecube,
    Custom(String),
}

impl Platform {
    pub fn folder_name(&self) -> &str {
        match self {
            Platform::Pc => "pc",
            Platform::Nes => "nes",
            Platform::Snes => "snes",
            Platform::Genesis => "genesis",
            Platform::Gb => "gb",
            Platform::Gbc => "gbc",
            Platform::Gba => "gba",
            Platform::Ps1 => "ps1",
            Platform::Ps2 => "ps2",
            Platform::N64 => "n64",
            Platform::Gamecube => "gamecube",
            Platform::Custom(name) => name.as_str(),
        }
    }

    pub fn from_folder_name(name: &str) -> Self {
        match name.to_lowercase().as_str() {
            "pc" => Platform::Pc,
            "nes" => Platform::Nes,
            "snes" => Platform::Snes,
            "genesis" | "megadrive" => Platform::Genesis,
            "gb" => Platform::Gb,
            "gbc" => Platform::Gbc,
            "gba" => Platform::Gba,
            "ps1" | "psx" => Platform::Ps1,
            "ps2" => Platform::Ps2,
            "n64" => Platform::N64,
            "gamecube" | "gc" => Platform::Gamecube,
            custom => Platform::Custom(custom.to_string()),
        }
    }

    pub fn from_file_extension(ext: &str) -> Option<Self> {
        match ext.to_lowercase().trim_start_matches('.') {
            "sfc" | "smc" => Some(Platform::Snes),
            "nes" => Some(Platform::Nes),
            "gb" => Some(Platform::Gb),
            "gbc" => Some(Platform::Gbc),
            "gba" => Some(Platform::Gba),
            "z64" | "n64" | "v64" => Some(Platform::N64),
            "md" | "gen" | "smd" => Some(Platform::Genesis),
            "iso" | "cue" | "chd" | "pbp" => Some(Platform::Ps1),
            "gcm" | "gcz" | "ciso" => Some(Platform::Gamecube),
            "exe" => Some(Platform::Pc),
            _ => None,
        }
    }
}

/// Core Game entity representing a storage-backed title in GameStash
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Game {
    pub id: String,
    pub title: String,
    pub platform: Platform,
    pub file_size_bytes: u64,
    pub storage_key: String,
    pub sha256_checksum: String,
    #[serde(default)]
    pub retro_hash: Option<String>,
}

impl Game {
    /// Generates a strict canonical content-addressable ID (<platform>:<hash>)
    pub fn generate_canonical_id(platform: &Platform, retro_hash: Option<&str>, sha256: &str) -> String {
        let hash_identifier = if let Some(rh) = retro_hash {
            if !rh.trim().is_empty() {
                rh.trim().to_lowercase()
            } else {
                sha256[..16.min(sha256.len())].to_lowercase()
            }
        } else {
            sha256[..16.min(sha256.len())].to_lowercase()
        };
        format!("{}:{}", platform.folder_name(), hash_identifier)
    }
}

/// Computed hashes and identifiers for a ROM or game binary
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct RomHash {
    pub headerless_md5: Option<String>,
    pub sha1: Option<String>,
    pub sha256: String,
    pub file_size_bytes: u64,
}

/// Installation status of a game across local storage and remote catalog
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GameInstallStatus {
    Installed,
    RemoteOnly,
    LocalOnly,
    UpdateAvailable,
}

/// Represents a locally detected and scanned game file
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LocalGame {
    pub file_path: String,
    pub relative_path: String,
    pub platform: Platform,
    pub file_size_bytes: u64,
    pub hashes: RomHash,
    pub matched_game_id: Option<String>,
    pub modified_at: DateTime<Utc>,
}

/// Configuration for an emulation engine or native launcher
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct EngineConfig {
    pub platform: Platform,
    pub engine_name: String,
    pub executable_path: String,
    pub default_args: Vec<String>,
    pub is_flatpak: bool,
    pub flatpak_id: Option<String>,
    pub is_detected: bool,
}

/// Entry recording an archived/replaced save file in the safety trash
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SaveBackupEntry {
    pub backup_id: String,
    pub game_id: String,
    pub timestamp: DateTime<Utc>,
    pub original_path: String,
    pub backup_path: String,
    pub file_size_bytes: u64,
    pub sha256_hash: String,
    pub reason: String,
}

/// Event payload emitted during background game downloads
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DownloadProgressPayload {
    pub game_id: String,
    pub bytes_downloaded: u64,
    pub total_bytes: u64,
    pub percentage: f32,
    pub speed_bytes_per_sec: u64,
    pub status: String,
}

/// A single file entry within a game's save manifest
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SaveFileEntry {
    pub relative_path: String,
    pub file_size_bytes: u64,
    pub sha256_hash: String,
    pub modified_at: DateTime<Utc>,
}

/// Manifest tracking all save files and their hashes for a specific game
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SaveManifest {
    pub game_id: String,
    pub entries: Vec<SaveFileEntry>,
    pub updated_at: DateTime<Utc>,
}

/// Synchronization state between local desktop save and cloud save
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(tag = "status", content = "details")]
pub enum SyncStatus {
    InSync,
    CloudNewer,
    LocalNewer,
    Conflict {
        local_hash: String,
        cloud_hash: String,
        local_modified_at: DateTime<Utc>,
        cloud_modified_at: DateTime<Utc>,
    },
}

impl SaveManifest {
    /// Compares a local save manifest against this (remote) cloud manifest
    pub fn compare(&self, local: &SaveManifest) -> SyncStatus {
        if self.entries == local.entries {
            return SyncStatus::InSync;
        }

        // If entries differ, compare modification timestamps to detect direction or conflict
        if self.updated_at > local.updated_at {
            SyncStatus::CloudNewer
        } else if local.updated_at > self.updated_at {
            SyncStatus::LocalNewer
        } else {
            // Same timestamp but different content hash -> conflict
            let cloud_hash = self.entries.first().map(|e| e.sha256_hash.clone()).unwrap_or_default();
            let local_hash = local.entries.first().map(|e| e.sha256_hash.clone()).unwrap_or_default();

            SyncStatus::Conflict {
                local_hash,
                cloud_hash,
                local_modified_at: local.updated_at,
                cloud_modified_at: self.updated_at,
            }
        }
    }
}

/// API Response returning a time-limited pre-signed download URL
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DownloadUrlResponse {
    pub download_url: String,
    pub expires_in_seconds: u64,
    pub file_size_bytes: u64,
    pub sha256_checksum: Option<String>,
}

/// API Response for server health & version verification
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ServerHealth {
    pub status: String,
    pub version: String,
    pub storage_connected: bool,
    pub server_time_utc: DateTime<Utc>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_game_serialization() {
        let game = Game {
            id: "snes:md5_retro_123".to_string(),
            title: "Chrono Trigger".to_string(),
            platform: Platform::Snes,
            file_size_bytes: 4 * 1024 * 1024,
            storage_key: "roms/snes/chrono_trigger.sfc".to_string(),
            sha256_checksum: "abc123sha256".to_string(),
            retro_hash: Some("md5_retro_123".to_string()),
        };

        let json = serde_json::to_string(&game).unwrap();
        let deserialized: Game = serde_json::from_str(&json).unwrap();

        assert_eq!(game, deserialized);
    }

    #[test]
    fn test_canonical_id_generation() {
        let id_with_retro = Game::generate_canonical_id(&Platform::Snes, Some("cdd3c8c373244976900f86dafa969707"), "abc123sha256full");
        assert_eq!(id_with_retro, "snes:cdd3c8c373244976900f86dafa969707");

        let id_without_retro = Game::generate_canonical_id(&Platform::N64, None, "f153a7a9cb5c5f7823b6e8a4a5ebc839fefad5f9");
        assert_eq!(id_without_retro, "n64:f153a7a9cb5c5f78");
    }

    #[test]
    fn test_platform_folder_mapping() {
        assert_eq!(Platform::Snes.folder_name(), "snes");
        assert_eq!(Platform::Nes.folder_name(), "nes");
        assert_eq!(Platform::Gb.folder_name(), "gb");
        assert_eq!(Platform::Genesis.folder_name(), "genesis");
        assert_eq!(Platform::from_folder_name("snes"), Platform::Snes);
        assert_eq!(Platform::from_folder_name("nes"), Platform::Nes);
        assert_eq!(Platform::from_folder_name("gb"), Platform::Gb);
        assert_eq!(Platform::from_folder_name("megadrive"), Platform::Genesis);
        assert_eq!(Platform::from_folder_name("psx"), Platform::Ps1);
        assert_eq!(Platform::from_folder_name("dreamcast"), Platform::Custom("dreamcast".to_string()));
        assert_eq!(Platform::from_file_extension(".sfc"), Some(Platform::Snes));
        assert_eq!(Platform::from_file_extension("z64"), Some(Platform::N64));
        assert_eq!(Platform::from_file_extension("nes"), Some(Platform::Nes));
    }

    #[test]
    fn test_rom_hash_and_local_game_serialization() {
        let rom_hash = RomHash {
            headerless_md5: Some("2d404e12c14041d8e12d4a1cf647321e".to_string()),
            sha1: Some("b1b88e1a61309f06df5ecf465c0fb1efcd92491a".to_string()),
            sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855".to_string(),
            file_size_bytes: 4194304,
        };

        let local_game = LocalGame {
            file_path: "/games/roms/snes/Chrono Trigger.sfc".to_string(),
            relative_path: "snes/Chrono Trigger.sfc".to_string(),
            platform: Platform::Snes,
            file_size_bytes: 4194304,
            hashes: rom_hash,
            matched_game_id: Some("snes-chrono-trigger".to_string()),
            modified_at: Utc::now(),
        };

        let json = serde_json::to_string(&local_game).unwrap();
        let deserialized: LocalGame = serde_json::from_str(&json).unwrap();

        assert_eq!(local_game, deserialized);
    }

    #[test]
    fn test_manifest_in_sync() {
        let now = Utc::now();
        let entry = SaveFileEntry {
            relative_path: "save.srm".to_string(),
            file_size_bytes: 8192,
            sha256_hash: "abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234abcd1234".to_string(),
            modified_at: now,
        };

        let cloud = SaveManifest {
            game_id: "game-1".to_string(),
            entries: vec![entry.clone()],
            updated_at: now,
        };

        let local = SaveManifest {
            game_id: "game-1".to_string(),
            entries: vec![entry],
            updated_at: now,
        };

        assert_eq!(cloud.compare(&local), SyncStatus::InSync);
    }

    #[test]
    fn test_manifest_cloud_newer() {
        let t1 = Utc::now();
        let t2 = t1 + chrono::Duration::hours(2);

        let cloud = SaveManifest {
            game_id: "game-1".to_string(),
            entries: vec![SaveFileEntry {
                relative_path: "save.srm".to_string(),
                file_size_bytes: 8192,
                sha256_hash: "cloud_hash".to_string(),
                modified_at: t2,
            }],
            updated_at: t2,
        };

        let local = SaveManifest {
            game_id: "game-1".to_string(),
            entries: vec![SaveFileEntry {
                relative_path: "save.srm".to_string(),
                file_size_bytes: 8192,
                sha256_hash: "local_hash".to_string(),
                modified_at: t1,
            }],
            updated_at: t1,
        };

        assert_eq!(cloud.compare(&local), SyncStatus::CloudNewer);
    }
}
