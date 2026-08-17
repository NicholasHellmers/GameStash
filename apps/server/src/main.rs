use gamestash_server::create_app;
use std::net::SocketAddr;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "gamestash_server=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let port = std::env::var("PORT").unwrap_or_else(|_| "8080".to_string());
    let storage_endpoint = std::env::var("STORAGE_ENDPOINT")
        .unwrap_or_else(|_| format!("http://127.0.0.1:{port}/storage"));

    let addr: SocketAddr = format!("0.0.0.0:{port}").parse()?;
    let app = create_app(storage_endpoint);

    tracing::info!("🎮 GameStash Server listening on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}
