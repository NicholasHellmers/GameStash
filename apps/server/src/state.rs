use core_types::{Game, Platform, SaveManifest};
use md5::Md5;
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::Path;
use std::sync::{Arc, RwLock};
use walkdir::WalkDir;

#[derive(Clone)]
pub struct AppState {
    pub storage_endpoint: String,
    pub storage_root_dir: Option<std::path::PathBuf>,
    pub games: Arc<RwLock<HashMap<String, Game>>>,
    pub save_manifests: Arc<RwLock<HashMap<String, SaveManifest>>>,
}

impl AppState {
    pub fn new(storage_endpoint: String) -> Self {
        let mut games = HashMap::new();

        // Check common relative paths for bootstrap_games directory
        let possible_dirs = ["./bootstrap_games", "../bootstrap_games", "../../bootstrap_games"];
        let mut bootstrap_dir_opt = None;

        for dir in possible_dirs {
            let path = Path::new(dir);
            if path.is_dir() {
                bootstrap_dir_opt = Some(path.to_path_buf());
                break;
            }
        }

        if let Some(ref bootstrap_dir) = bootstrap_dir_opt {
            let scanned_games = Self::scan_bootstrap_directory(bootstrap_dir);
            for game in scanned_games {
                // Strict deduplication by canonical ID (<platform>:<hash>)
                games.insert(game.id.clone(), game);
            }
        } else {
            eprintln!("[WARN] No bootstrap games directory found. Starting with empty catalog.");
        }

        Self {
            storage_endpoint,
            storage_root_dir: bootstrap_dir_opt,
            games: Arc::new(RwLock::new(games)),
            save_manifests: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// Scans a directory of ROMs, computing hashes and generating canonical Game entries
    pub fn scan_bootstrap_directory(dir: &Path) -> Vec<Game> {
        let mut games = Vec::new();

        for entry in WalkDir::new(dir).into_iter().filter_map(|e| e.ok()) {
            let path = entry.path();
            if !path.is_file() {
                continue;
            }

            let ext = path.extension().and_then(|s| s.to_str()).unwrap_or_default();
            let platform = match Platform::from_file_extension(ext) {
                Some(p) => p,
                None => continue,
            };

            if let Ok((sha256, retro_hash, file_size)) = Self::compute_file_hashes(path, &platform) {
                let file_name = path.file_name().and_then(|s| s.to_str()).unwrap_or("unknown");
                let title = path.file_stem().and_then(|s| s.to_str()).unwrap_or("Unknown Game").to_string();

                let canonical_id = Game::generate_canonical_id(&platform, retro_hash.as_deref(), &sha256);
                let storage_key = format!("roms/{}/{}", platform.folder_name(), file_name);

                games.push(Game {
                    id: canonical_id,
                    title,
                    platform,
                    file_size_bytes: file_size,
                    storage_key,
                    sha256_checksum: sha256,
                    retro_hash,
                });
            }
        }

        if games.is_empty() {
            eprintln!("[WARN] No valid ROM files found in {}. Starting with empty catalog.", dir.display());
        }

        games
    }

    /// Computes full SHA-256 and headerless MD5 for retro matching
    fn compute_file_hashes(path: &Path, platform: &Platform) -> std::io::Result<(String, Option<String>, u64)> {
        let mut file = File::open(path)?;
        let metadata = file.metadata()?;
        let file_size = metadata.len();

        let mut probe_buf = [0u8; 512];
        let probe_len = file.read(&mut probe_buf)?;

        let header_offset: u64 = match platform {
            Platform::Snes => {
                if file_size > 512 && file_size % 1024 == 512 {
                    512
                } else {
                    0
                }
            }
            Platform::Nes => {
                if probe_len >= 16 && &probe_buf[..4] == b"NES\x1a" {
                    16
                } else {
                    0
                }
            }
            Platform::Genesis => {
                if file_size > 512 && probe_len >= 3 && probe_buf[0] == 0xAA && probe_buf[1] == 0xBB && probe_buf[2] == 0x06 {
                    512
                } else {
                    0
                }
            }
            _ => 0,
        };

        file.seek(SeekFrom::Start(0))?;

        let mut sha256_hasher = Sha256::new();
        let mut md5_hasher = Md5::new();

        let mut buffer = [0u8; 65536];
        let mut current_offset: u64 = 0;

        loop {
            let bytes_read = file.read(&mut buffer)?;
            if bytes_read == 0 {
                break;
            }

            let chunk_start = current_offset;
            let chunk_end = current_offset + bytes_read as u64;

            sha256_hasher.update(&buffer[..bytes_read]);

            if chunk_end > header_offset {
                let slice_start = if chunk_start < header_offset {
                    (header_offset - chunk_start) as usize
                } else {
                    0
                };
                md5_hasher.update(&buffer[slice_start..bytes_read]);
            }

            current_offset = chunk_end;
        }

        let sha256_result = hex::encode(sha256_hasher.finalize());
        let md5_result = hex::encode(md5_hasher.finalize());

        Ok((sha256_result, Some(md5_result), file_size))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::tempdir;

    #[test]
    fn test_scan_bootstrap_empty_directory_warns_and_returns_empty() {
        let dir = tempdir().unwrap();
        let games = AppState::scan_bootstrap_directory(dir.path());
        assert!(games.is_empty());
    }

    #[test]
    fn test_scan_bootstrap_with_rom_files() {
        let dir = tempdir().unwrap();
        let rom_path = dir.path().join("EarthBound (USA).sfc");
        let mut f = File::create(&rom_path).unwrap();
        f.write_all(b"SAMPLE_EARTHBOUND_SNES_ROM_DATA").unwrap();

        let games = AppState::scan_bootstrap_directory(dir.path());
        assert_eq!(games.len(), 1);
        assert_eq!(games[0].title, "EarthBound (USA)");
        assert_eq!(games[0].platform, Platform::Snes);
        assert!(games[0].id.starts_with("snes:"));
        assert!(!games[0].sha256_checksum.is_empty());
        assert!(games[0].retro_hash.is_some());
    }
}
