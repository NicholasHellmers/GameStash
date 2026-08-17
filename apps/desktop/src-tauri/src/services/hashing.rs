use core_types::{Platform, RomHash};
use md5::{Digest, Md5};
use sha1::Sha1;
use sha2::Sha256;
use std::fs::File;
use std::io::{self, Read, Seek, SeekFrom};
use std::path::Path;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum HashingError {
    #[error("I/O error while reading file for hashing: {0}")]
    Io(#[from] io::Error),
    #[error("File is empty or invalid")]
    InvalidFile,
}

pub struct RomHasher;

impl RomHasher {
    /// Detects header offset in bytes for platforms with known copier/emulation headers
    pub fn detect_header_offset(platform: &Platform, file_size: u64, header_probe: &[u8]) -> u64 {
        match platform {
            Platform::Snes => {
                // SNES copier header is 512 bytes if file size % 1024 == 512
                if file_size > 512 && file_size % 1024 == 512 {
                    512
                } else {
                    0
                }
            }
            Platform::Genesis => {
                // Check for 512-byte SMD header
                if file_size > 512 && header_probe.len() >= 3 && header_probe[0] == 0xAA && header_probe[1] == 0xBB && header_probe[2] == 0x06 {
                    512
                } else {
                    0
                }
            }
            _ => 0,
        }
    }

    /// Computes RomHash containing headerless MD5 (where applicable), SHA-1, and SHA-256
    pub fn compute_hashes(path: &Path, platform: &Platform) -> Result<RomHash, HashingError> {
        let mut file = File::open(path)?;
        let metadata = file.metadata()?;
        let file_size = metadata.len();

        if file_size == 0 {
            return Err(HashingError::InvalidFile);
        }

        // Read initial 512 bytes to probe header
        let mut probe_buf = [0u8; 512];
        let probe_len = file.read(&mut probe_buf)?;
        let header_offset = Self::detect_header_offset(platform, file_size, &probe_buf[..probe_len]);

        // Reset to compute full file hashes (SHA-256 and SHA-1)
        file.seek(SeekFrom::Start(0))?;

        let mut sha256_hasher = Sha256::new();
        let mut sha1_hasher = Sha1::new();
        let mut md5_hasher = Md5::new();

        // Read and hash in 64 KB chunks
        let mut buffer = [0u8; 65536];
        let mut current_offset: u64 = 0;

        loop {
            let bytes_read = file.read(&mut buffer)?;
            if bytes_read == 0 {
                break;
            }

            let chunk_start = current_offset;
            let chunk_end = current_offset + bytes_read as u64;

            // Full file hashes
            sha256_hasher.update(&buffer[..bytes_read]);
            sha1_hasher.update(&buffer[..bytes_read]);

            // Headerless MD5 hash (RetroAchievements / No-Intro style)
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
        let sha1_result = hex::encode(sha1_hasher.finalize());
        let md5_result = hex::encode(md5_hasher.finalize());

        Ok(RomHash {
            headerless_md5: Some(md5_result),
            sha1: Some(sha1_result),
            sha256: sha256_result,
            file_size_bytes: file_size,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[test]
    fn test_snes_header_stripping_md5() {
        // Create 512 bytes header + 1024 bytes payload
        let mut temp = NamedTempFile::new().unwrap();
        let header = vec![0xFF; 512];
        let payload = b"SUPER_MARIO_WORLD_TEST_PAYLOAD_12345678";
        let mut padding = vec![0x00; 1024 - payload.len()];
        
        temp.write_all(&header).unwrap();
        temp.write_all(payload).unwrap();
        temp.write_all(&mut padding).unwrap();
        temp.flush().unwrap();

        let hashes = RomHasher::compute_hashes(temp.path(), &Platform::Snes).unwrap();
        assert_eq!(hashes.file_size_bytes, 1536); // 512 + 1024
        assert!(hashes.headerless_md5.is_some());
        assert!(hashes.sha1.is_some());
        assert!(!hashes.sha256.is_empty());
    }

    #[test]
    fn test_headerless_file_hashes() {
        let mut temp = NamedTempFile::new().unwrap();
        temp.write_all(b"SAMPLE_GBA_ROM_DATA").unwrap();
        temp.flush().unwrap();

        let hashes = RomHasher::compute_hashes(temp.path(), &Platform::Gba).unwrap();
        assert_eq!(hashes.file_size_bytes, 19);
        assert!(hashes.headerless_md5.is_some());
    }

    #[test]
    fn test_genesis_header_stripping_md5() {
        let mut temp = NamedTempFile::new().unwrap();
        let mut header = vec![0x00; 512];
        header[0] = 0xAA;
        header[1] = 0xBB;
        header[2] = 0x06;

        let payload = b"SONIC_THE_HEDGEHOG_ROM_DATA";
        temp.write_all(&header).unwrap();
        temp.write_all(payload).unwrap();
        temp.flush().unwrap();

        let hashes = RomHasher::compute_hashes(temp.path(), &Platform::Genesis).unwrap();
        assert_eq!(hashes.file_size_bytes, 512 + payload.len() as u64);
        assert!(hashes.headerless_md5.is_some());
    }

    #[test]
    fn test_empty_file_returns_error() {
        let temp = NamedTempFile::new().unwrap();
        let result = RomHasher::compute_hashes(temp.path(), &Platform::Snes);
        assert!(result.is_err());
    }
}
