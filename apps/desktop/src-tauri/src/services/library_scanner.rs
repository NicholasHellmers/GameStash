use chrono::{DateTime, Utc};
use core_types::{Game, LocalGame, Platform, RomHash};
use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::time::UNIX_EPOCH;
use walkdir::WalkDir;

use super::hashing::RomHasher;

#[derive(Debug, Clone, Default)]
pub struct ScannerCache {
    /// Key: file_path -> (file_size, modified_timestamp_secs, RomHash)
    entries: HashMap<String, (u64, i64, RomHash)>,
}

impl ScannerCache {
    pub fn new() -> Self {
        Self {
            entries: HashMap::new(),
        }
    }

    pub fn get(&self, path: &str, file_size: u64, mtime: i64) -> Option<RomHash> {
        if let Some((cached_size, cached_mtime, hash)) = self.entries.get(path) {
            if *cached_size == file_size && *cached_mtime == mtime {
                return Some(hash.clone());
            }
        }
        None
    }

    pub fn insert(&mut self, path: String, file_size: u64, mtime: i64, hash: RomHash) {
        self.entries.insert(path, (file_size, mtime, hash));
    }
}

pub struct LibraryScanner;

impl LibraryScanner {
    /// Supported file extensions for ROMs and ISOs
    pub fn is_supported_game_file(path: &Path) -> bool {
        let ext = path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or_default()
            .to_lowercase();

        matches!(
            ext.as_str(),
            "sfc"
                | "smc"
                | "md"
                | "gen"
                | "bin"
                | "gba"
                | "gb"
                | "gbc"
                | "iso"
                | "chd"
                | "cue"
                | "z64"
                | "n64"
                | "v64"
                | "gcm"
                | "gcz"
                | "cso"
                | "exe"
                | "sh"
                | "desktop"
        )
    }

    /// Scans a root library directory for games
    pub fn scan_directory(
        root_path: &Path,
        cache: &mut ScannerCache,
        known_catalog: &[Game],
    ) -> Vec<LocalGame> {
        let mut results = Vec::new();

        if !root_path.exists() || !root_path.is_dir() {
            return results;
        }

        // Iterate through platform folders (e.g., roms/snes, roms/gba, etc.)
        for entry in WalkDir::new(root_path)
            .min_depth(1)
            .max_depth(4)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let path = entry.path();
            if !path.is_file() || !Self::is_supported_game_file(path) {
                continue;
            }

            // Determine platform from relative path folder name
            let relative = match path.strip_prefix(root_path) {
                Ok(rel) => rel,
                Err(_) => continue,
            };

            let platform_str = relative
                .components()
                .next()
                .map(|c| c.as_os_str().to_string_lossy().to_string())
                .unwrap_or_else(|| "custom".to_string());

            let platform = Platform::from_folder_name(&platform_str);

            let metadata = match fs::metadata(path) {
                Ok(m) => m,
                Err(_) => continue,
            };

            let file_size = metadata.len();
            let mtime_secs = metadata
                .modified()
                .ok()
                .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                .map(|d| d.as_secs() as i64)
                .unwrap_or(0);

            let path_str = path.to_string_lossy().to_string();

            // Check cache or compute
            let hashes = if let Some(cached) = cache.get(&path_str, file_size, mtime_secs) {
                cached
            } else {
                match RomHasher::compute_hashes(path, &platform) {
                    Ok(computed) => {
                        cache.insert(path_str.clone(), file_size, mtime_secs, computed.clone());
                        computed
                    }
                    Err(_) => continue,
                }
            };

            // Match against known server catalog
            let matched_game_id = known_catalog
                .iter()
                .find(|game| {
                    if game.sha256_checksum.eq_ignore_ascii_case(&hashes.sha256) {
                        return true;
                    }
                    if let (Some(expected_retro), Some(headerless_md5)) =
                        (&game.retro_hash, &hashes.headerless_md5)
                    {
                        if expected_retro.eq_ignore_ascii_case(headerless_md5) {
                            return true;
                        }
                    }
                    false
                })
                .map(|g| g.id.clone());

            let modified_at = DateTime::<Utc>::from(metadata.modified().unwrap_or(UNIX_EPOCH));

            results.push(LocalGame {
                file_path: path_str,
                relative_path: relative.to_string_lossy().replace('\\', "/"),
                platform,
                file_size_bytes: file_size,
                hashes,
                matched_game_id,
                modified_at,
            });
        }

        results
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::tempdir;

    #[test]
    fn test_scan_directory_with_matching() {
        let dir = tempdir().unwrap();
        let snes_dir = dir.path().join("snes");
        fs::create_dir_all(&snes_dir).unwrap();

        let rom_path = snes_dir.join("Super_Mario_World.sfc");
        let mut f = fs::File::create(&rom_path).unwrap();
        f.write_all(b"TEST_ROM_PAYLOAD_FOR_SCANNER").unwrap();
        f.flush().unwrap();

        let hashes = RomHasher::compute_hashes(&rom_path, &Platform::Snes).unwrap();

        let catalog = vec![Game {
            id: "snes:super_mario_world".to_string(),
            title: "Super Mario World".to_string(),
            platform: Platform::Snes,
            file_size_bytes: hashes.file_size_bytes,
            storage_key: "roms/snes/smw.sfc".to_string(),
            sha256_checksum: hashes.sha256.clone(),
            retro_hash: hashes.headerless_md5.clone(),
        }];

        let mut cache = ScannerCache::new();
        let scanned = LibraryScanner::scan_directory(dir.path(), &mut cache, &catalog);

        assert_eq!(scanned.len(), 1);
        assert_eq!(scanned[0].matched_game_id, Some("snes:super_mario_world".to_string()));
        assert_eq!(scanned[0].platform, Platform::Snes);

        // Test cache hit on second scan
        let second_scan = LibraryScanner::scan_directory(dir.path(), &mut cache, &catalog);
        assert_eq!(second_scan.len(), 1);
    }

    #[test]
    fn test_scan_unsupported_extensions_ignored() {
        let dir = tempdir().unwrap();
        let snes_dir = dir.path().join("snes");
        fs::create_dir_all(&snes_dir).unwrap();

        let txt_path = snes_dir.join("readme.txt");
        fs::write(&txt_path, b"SOME_README_TEXT").unwrap();

        let mut cache = ScannerCache::new();
        let scanned = LibraryScanner::scan_directory(dir.path(), &mut cache, &[]);
        assert!(scanned.is_empty());
    }

    #[test]
    fn test_scan_non_existent_directory() {
        let mut cache = ScannerCache::new();
        let non_existent = Path::new("/path/that/does/not/exist");
        let scanned = LibraryScanner::scan_directory(non_existent, &mut cache, &[]);
        assert!(scanned.is_empty());
    }
}
