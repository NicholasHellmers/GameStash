use axum::{
    body::Body,
    extract::{Path, State},
    http::{header, HeaderMap, StatusCode},
    response::{IntoResponse, Response},
};
use tokio::fs::File;
use tokio_util::io::ReaderStream;

use crate::{error::AppError, state::AppState};

pub async fn stream_storage_file(
    State(state): State<AppState>,
    Path(key): Path<String>,
) -> Result<Response, AppError> {
    let storage_dir = state
        .storage_root_dir
        .as_ref()
        .ok_or_else(|| AppError::NotFound("Storage directory not configured".to_string()))?;

    let decoded_key = urlencoding::decode(&key).unwrap_or_else(|_| std::borrow::Cow::Borrowed(&key)).to_string();
    let clean_key = decoded_key.trim_start_matches('/');
    let filename = clean_key.split('/').last().unwrap_or(clean_key);

    let direct_path = storage_dir.join(clean_key);
    let filename_path = storage_dir.join(filename);

    let target_path = if direct_path.is_file() {
        direct_path
    } else if filename_path.is_file() {
        filename_path
    } else {
        return Err(AppError::NotFound(format!("File '{clean_key}' not found in storage")));
    };

    let file = File::open(&target_path)
        .await
        .map_err(|e| AppError::Internal(format!("Failed to open storage file: {e}")))?;

    let metadata = file
        .metadata()
        .await
        .map_err(|e| AppError::Internal(format!("Failed to read metadata: {e}")))?;
    let file_size = metadata.len();

    let stream = ReaderStream::new(file);
    let body = Body::from_stream(stream);

    let mut headers = HeaderMap::new();
    headers.insert(header::CONTENT_TYPE, "application/octet-stream".parse().unwrap());
    headers.insert(header::CONTENT_LENGTH, file_size.to_string().parse().unwrap());
    headers.insert(
        header::CONTENT_DISPOSITION,
        format!("attachment; filename=\"{filename}\"").parse().unwrap(),
    );

    Ok((StatusCode::OK, headers, body).into_response())
}
