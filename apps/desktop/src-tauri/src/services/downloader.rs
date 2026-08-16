use std::path::Path;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum DownloadError {
    #[error("Network request failed: {0}")]
    Network(#[from] reqwest::Error),

    #[error("Filesystem IO failed: {0}")]
    Io(#[from] std::io::Error),
}

pub struct HttpDownloader {
    client: reqwest::Client,
}

impl Default for HttpDownloader {
    fn default() -> Self {
        Self::new()
    }
}

impl HttpDownloader {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::new(),
        }
    }

    /// Streams a file from a pre-signed URL directly to destination path
    pub async fn download_file<P: AsRef<Path>>(
        &self,
        url: &str,
        dest_path: P,
    ) -> Result<u64, DownloadError> {
        let response = self.client.get(url).send().await?.error_for_status()?;
        let bytes = response.bytes().await?;

        tokio::fs::write(dest_path, &bytes).await?;
        Ok(bytes.len() as u64)
    }
}
