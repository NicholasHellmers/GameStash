use chrono::{DateTime, Utc};
use core_types::{SaveFileEntry, SaveManifest};
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::{self, Read};
use std::path::Path;

pub struct SaveWatcher;

impl SaveWatcher {
    /// Computes the SHA-256 hash of a file on disk
    pub fn compute_file_hash<P: AsRef<Path>>(path: P) -> io::Result<String> {
        let mut file = File::open(path)?;
        let mut hasher = Sha256::new();
        let mut buffer = [0u8; 8192];

        loop {
            let bytes_read = file.read(&mut buffer)?;
            if bytes_read == 0 {
                break;
            }
            hasher.update(&buffer[..bytes_read]);
        }

        let hash_bytes = hasher.finalize();
        Ok(format!("{:x}", hash_bytes))
    }

    /// Scans a local save file and constructs a SaveManifest entry
    pub fn scan_single_save_file<P: AsRef<Path>>(
        game_id: &str,
        file_path: P,
    ) -> io::Result<SaveManifest> {
        let path = file_path.as_ref();
        let metadata = path.metadata()?;
        let hash = Self::compute_file_hash(path)?;

        let modified_system_time = metadata.modified()?;
        let modified_at: DateTime<Utc> = modified_system_time.into();

        let filename = path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("save.sav")
            .to_string();

        let entry = SaveFileEntry {
            relative_path: filename,
            file_size_bytes: metadata.len(),
            sha256_hash: hash,
            modified_at,
        };

        Ok(SaveManifest {
            game_id: game_id.to_string(),
            entries: vec![entry],
            updated_at: modified_at,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_compute_file_hash_generates_valid_sha256() {
        let mut temp_file = NamedTempFile::new().unwrap();
        writeln!(temp_file, "SUPER_MARIO_WORLD_SAVE_SLOT_1").unwrap();

        let hash = SaveWatcher::compute_file_hash(temp_file.path()).unwrap();
        assert_eq!(hash.len(), 64);
    }
}
