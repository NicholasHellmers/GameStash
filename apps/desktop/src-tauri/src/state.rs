use std::sync::{Arc, Mutex};

#[derive(Default)]
pub struct AppState {
    pub active_server_url: Arc<Mutex<Option<String>>>,
    pub http_client: reqwest::Client,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            active_server_url: Arc::new(Mutex::new(Some("http://localhost:8080".to_string()))),
            http_client: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(15))
                .build()
                .unwrap_or_default(),
        }
    }
}
