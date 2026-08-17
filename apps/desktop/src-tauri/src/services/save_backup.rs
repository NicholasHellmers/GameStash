use chrono::Utc;
use core_types::SaveBackupEntry;
use sha2::{Digest, Sha256};
use std::fs::{self, File};
use std::io::{self, Read};
use std::path::{Path, PathBuf};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum SaveBackupError {
    #[error("I/O error during save backup: {0}")]
    Io(#[from] io::Error),
    #[error("Backup with id '{0}' not found")]
    NotFound(String),
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
}

pub struct SaveBackupService {
    backup_root: PathBuf,
}

impl SaveBackupService {
    pub fn new(backup_root: PathBuf) -> Self {
        if !backup_root.exists() {
            let _ = fs::create_dir_all(&backup_root);
        }
        Self { backup_root }
    }

    fn manifest_path(&self) -> PathBuf {
        self.backup_root.join("backup_manifest.json")
    }

    fn read_manifest(&self) -> Vec<SaveBackupEntry> {
        let path = self.manifest_path();
        if !path.exists() {
            return Vec::new();
        }
        fs::read_to_string(&path)
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_default()
    }

    fn write_manifest(&self, entries: &[SaveBackupEntry]) -> Result<(), SaveBackupError> {
        let json = serde_json::to_string_pretty(entries)?;
        fs::write(self.manifest_path(), json)?;
        Ok(())
    }

    /// Archives an existing save file before overwrite, storing it in the recently deleted safety area
    pub fn create_backup(
        &self,
        original_path: &Path,
        game_id: &str,
        reason: &str,
    ) -> Result<Option<SaveBackupEntry>, SaveBackupError> {
        if !original_path.exists() {
            return Ok(None);
        }

        let mut file = File::open(original_path)?;
        let mut hasher = Sha256::new();
        let mut buffer = Vec::new();
        file.read_to_end(&mut buffer)?;
        hasher.update(&buffer);
        let sha256_hash = hex::encode(hasher.finalize());

        let timestamp = Utc::now();
        let backup_id = format!("{}-{}", game_id, timestamp.timestamp_millis());
        let file_name = original_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("save.dat");

        let backup_file_name = format!("{}_{}", backup_id, file_name);
        let target_backup_path = self.backup_root.join(&backup_file_name);

        fs::write(&target_backup_path, &buffer)?;

        let entry = SaveBackupEntry {
            backup_id,
            game_id: game_id.to_string(),
            timestamp,
            original_path: original_path.to_string_lossy().to_string(),
            backup_path: target_backup_path.to_string_lossy().to_string(),
            file_size_bytes: buffer.len() as u64,
            sha256_hash,
            reason: reason.to_string(),
        };

        let mut manifest = self.read_manifest();
        manifest.retain(|e| e.backup_id != entry.backup_id);
        manifest.insert(0, entry.clone());
        self.write_manifest(&manifest)?;

        Ok(Some(entry))
    }

    /// Lists all backup entries, optionally filtered by game ID
    pub fn list_backups(&self, game_id: Option<&str>) -> Vec<SaveBackupEntry> {
        let manifest = self.read_manifest();
        if let Some(gid) = game_id {
            manifest.into_iter().filter(|e| e.game_id == gid).collect()
        } else {
            manifest
        }
    }

    /// Restores an archived save from recently deleted back to its original location
    pub fn restore_backup(&self, backup_id: &str) -> Result<SaveBackupEntry, SaveBackupError> {
        let manifest = self.read_manifest();
        let entry = manifest
            .iter()
            .find(|e| e.backup_id == backup_id)
            .cloned()
            .ok_or_else(|| SaveBackupError::NotFound(backup_id.to_string()))?;

        let backup_file = Path::new(&entry.backup_path);
        let original_file = Path::new(&entry.original_path);

        if !backup_file.exists() {
            return Err(SaveBackupError::NotFound(format!(
                "Physical backup file missing: {}",
                entry.backup_path
            )));
        }

        if let Some(parent) = original_file.parent() {
            fs::create_dir_all(parent)?;
        }

        fs::copy(backup_file, original_file)?;
        Ok(entry)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::tempdir;

    #[test]
    fn test_save_backup_and_restore_undo() {
        let dir = tempdir().unwrap();
        let backup_root = dir.path().join("backups");
        let service = SaveBackupService::new(backup_root);

        let original_save = dir.path().join("save.srm");
        {
            let mut f = File::create(&original_save).unwrap();
            f.write_all(b"ORIGINAL_SAVE_STATE_DATA_V1").unwrap();
        }

        // Create backup
        let backup_entry = service
            .create_backup(&original_save, "game-snes-1", "Cloud overwrite")
            .unwrap()
            .unwrap();

        assert_eq!(backup_entry.game_id, "game-snes-1");
        assert_eq!(service.list_backups(None).len(), 1);

        // Overwrite save with new cloud data
        {
            let mut f = File::create(&original_save).unwrap();
            f.write_all(b"NEW_CLOUD_OVERWRITE_V2").unwrap();
        }

        // Restore / Undo action
        let restored = service.restore_backup(&backup_entry.backup_id).unwrap();
        assert_eq!(restored.backup_id, backup_entry.backup_id);

        let content = fs::read_to_string(&original_save).unwrap();
        assert_eq!(content, "ORIGINAL_SAVE_STATE_DATA_V1");
    }
}
