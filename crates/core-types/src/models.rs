use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// Supported gaming platforms in GameStash
#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Platform {
    Pc,
    Snes,
    Genesis,
    Gba,
    Ps1,
    Ps2,
    N64,
    Gamecube,
    Custom(String),
}

/// Core Game entity representing a downloadable/playable title
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Game {
    pub id: String,
    pub title: String,
    pub platform: Platform,
    pub release_year: Option<u16>,
    pub cover_url: Option<String>,
    pub file_size_bytes: u64,
    pub storage_key: String,
    pub description: Option<String>,
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
            id: "snes-chrono-trigger".to_string(),
            title: "Chrono Trigger".to_string(),
            platform: Platform::Snes,
            release_year: Some(1995),
            cover_url: Some("https://example.com/chrono.jpg".to_string()),
            file_size_bytes: 4 * 1024 * 1024,
            storage_key: "roms/snes/chrono_trigger.sfc".to_string(),
            description: Some("Classic RPG masterpiece".to_string()),
        };

        let json = serde_json::to_string(&game).unwrap();
        let deserialized: Game = serde_json::from_str(&json).unwrap();

        assert_eq!(game, deserialized);
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
