use chrono::{DateTime, Utc};
use core_types::{Platform, SaveFileEntry, SaveManifest};
use sha2::{Digest, Sha256};
use std::fs::{self, File};
use std::io::Read;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;
use walkdir::WalkDir;

pub struct SaveManager;

impl SaveManager {
    /// Resolves the dedicated local save directory for a platform and game
    pub fn get_save_dir(library_root: &Path, platform: &Platform, game_id: &str) -> PathBuf {
        library_root
            .join("saves")
            .join(platform.folder_name())
            .join(game_id)
    }

    /// Generates a SaveManifest by scanning all save files for the game
    pub fn generate_local_manifest(
        library_root: &Path,
        platform: &Platform,
        game_id: &str,
    ) -> SaveManifest {
        let save_dir = Self::get_save_dir(library_root, platform, game_id);
        let mut entries = Vec::new();
        let mut latest_updated = Utc::now();

        if save_dir.exists() && save_dir.is_dir() {
            let mut found_mtimes = Vec::new();

            for entry in WalkDir::new(&save_dir)
                .min_depth(1)
                .into_iter()
                .filter_map(|e| e.ok())
            {
                let path = entry.path();
                if !path.is_file() {
                    continue;
                }

                let relative = match path.strip_prefix(&save_dir) {
                    Ok(r) => r.to_string_lossy().replace('\\', "/"),
                    Err(_) => continue,
                };

                let metadata = match fs::metadata(path) {
                    Ok(m) => m,
                    Err(_) => continue,
                };

                let file_size = metadata.len();
                let mtime = DateTime::<Utc>::from(metadata.modified().unwrap_or(UNIX_EPOCH));
                found_mtimes.push(mtime);

                // Calculate file SHA-256
                let hash = if let Ok(mut f) = File::open(path) {
                    let mut hasher = Sha256::new();
                    let mut buf = Vec::new();
                    if f.read_to_end(&mut buf).is_ok() {
                        hasher.update(&buf);
                        hex::encode(hasher.finalize())
                    } else {
                        String::new()
                    }
                } else {
                    String::new()
                };

                entries.push(SaveFileEntry {
                    relative_path: relative,
                    file_size_bytes: file_size,
                    sha256_hash: hash,
                    modified_at: mtime,
                });
            }

            if let Some(max_mtime) = found_mtimes.into_iter().max() {
                latest_updated = max_mtime;
            }
        }

        SaveManifest {
            game_id: game_id.to_string(),
            entries,
            updated_at: latest_updated,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::tempdir;

    #[test]
    fn test_generate_manifest_empty() {
        let dir = tempdir().unwrap();
        let manifest = SaveManager::generate_local_manifest(dir.path(), &Platform::Snes, "game-1");
        assert_eq!(manifest.game_id, "game-1");
        assert!(manifest.entries.is_empty());
    }

    #[test]
    fn test_generate_manifest_with_save_files() {
        let dir = tempdir().unwrap();
        let save_dir = SaveManager::get_save_dir(dir.path(), &Platform::Snes, "smw");
        fs::create_dir_all(&save_dir).unwrap();

        let save_file = save_dir.join("smw.srm");
        let mut f = File::create(&save_file).unwrap();
        f.write_all(b"SAMPLE_SAVE_RAM_DATA").unwrap();
        f.flush().unwrap();

        let manifest = SaveManager::generate_local_manifest(dir.path(), &Platform::Snes, "smw");
        assert_eq!(manifest.entries.len(), 1);
        assert_eq!(manifest.entries[0].relative_path, "smw.srm");
        assert_eq!(manifest.entries[0].file_size_bytes, 20);
        assert!(!manifest.entries[0].sha256_hash.is_empty());
    }
}
