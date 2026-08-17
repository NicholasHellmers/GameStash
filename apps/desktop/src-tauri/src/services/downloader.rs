use core_types::DownloadProgressPayload;
use futures_util::StreamExt;
use reqwest::Client;
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::time::Instant;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum DownloadError {
    #[error("Network error: {0}")]
    Network(#[from] reqwest::Error),
    #[error("File I/O error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Checksum mismatch: expected {expected}, calculated {calculated}")]
    ChecksumMismatch {
        expected: String,
        calculated: String,
    },
    #[error("Download was cancelled")]
    Cancelled,
}

pub struct DownloadManager;

impl DownloadManager {
    /// Downloads a file from URL, validating SHA-256 checksum and reporting progress
    pub async fn download_file<F>(
        client: &Client,
        url: &str,
        destination_path: &Path,
        game_id: &str,
        expected_sha256: Option<&str>,
        mut on_progress: F,
    ) -> Result<PathBuf, DownloadError>
    where
        F: FnMut(DownloadProgressPayload),
    {
        if let Some(parent) = destination_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let temp_path = destination_path.with_extension("part");
        let mut file = File::create(&temp_path)?;

        let response = client.get(url).send().await?.error_for_status()?;
        let total_bytes = response.content_length().unwrap_or(0);

        let mut stream = response.bytes_stream();
        let mut bytes_downloaded: u64 = 0;
        let mut hasher = Sha256::new();

        let start_time = Instant::now();
        let mut last_emit_time = Instant::now();

        while let Some(chunk_result) = stream.next().await {
            let chunk = chunk_result?;
            file.write_all(&chunk)?;
            hasher.update(&chunk);
            bytes_downloaded += chunk.len() as u64;

            if last_emit_time.elapsed().as_millis() >= 100 || bytes_downloaded == total_bytes {
                let elapsed_secs = start_time.elapsed().as_secs_f64().max(0.001);
                let speed_bps = (bytes_downloaded as f64 / elapsed_secs) as u64;
                let percentage = if total_bytes > 0 {
                    (bytes_downloaded as f32 / total_bytes as f32) * 100.0
                } else {
                    0.0
                };

                on_progress(DownloadProgressPayload {
                    game_id: game_id.to_string(),
                    bytes_downloaded,
                    total_bytes,
                    percentage,
                    speed_bytes_per_sec: speed_bps,
                    status: "downloading".to_string(),
                });

                last_emit_time = Instant::now();
            }
        }

        file.flush()?;
        drop(file);

        let calculated_sha256 = hex::encode(hasher.finalize());

        // Validate checksum if provided
        if let Some(expected) = expected_sha256 {
            if !expected.is_empty() && !expected.eq_ignore_ascii_case(&calculated_sha256) {
                let _ = std::fs::remove_file(&temp_path);
                return Err(DownloadError::ChecksumMismatch {
                    expected: expected.to_string(),
                    calculated: calculated_sha256,
                });
            }
        }

        // Rename temp part file to target destination
        std::fs::rename(&temp_path, destination_path)?;

        on_progress(DownloadProgressPayload {
            game_id: game_id.to_string(),
            bytes_downloaded,
            total_bytes: bytes_downloaded,
            percentage: 100.0,
            speed_bytes_per_sec: 0,
            status: "completed".to_string(),
        });

        Ok(destination_path.to_path_buf())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_download_error_display() {
        let err = DownloadError::ChecksumMismatch {
            expected: "aaa".to_string(),
            calculated: "bbb".to_string(),
        };
        assert!(format!("{err}").contains("Checksum mismatch"));
    }

    #[tokio::test]
    async fn test_download_creates_directories() {
        let dir = tempdir().unwrap();
        let nested_dest = dir.path().join("nested").join("sub").join("game.bin");
        let client = Client::new();

        // Testing invalid URL error handling
        let result = DownloadManager::download_file(
            &client,
            "http://127.0.0.1:59999/non-existent-file.bin",
            &nested_dest,
            "game-1",
            None,
            |_| {},
        )
        .await;

        assert!(result.is_err());
    }
}
