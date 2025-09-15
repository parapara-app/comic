mod config;
mod db;
mod handlers;
mod models;

use axum::{
    routing::{delete, get, post, put},
    Router,
};
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use config::Config;
use db::create_pool;
use handlers::test::{create_test, delete_test, get_test, list_tests, update_test};

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "api=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    let config = Config::from_env();
    tracing::info!("Starting server with config: {:?}", config);

    // Create database connection pool
    let pool = create_pool(&config.database_url)
        .await
        .expect("Failed to create database pool");

    tracing::info!("Database connection established");

    // Configure CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Build application with routes
    let app = Router::new()
        // Health check
        .route("/health", get(health))
        // Test CRUD endpoints
        .route("/api/tests", get(list_tests).post(create_test))
        .route(
            "/api/tests/:id",
            get(get_test).put(update_test).delete(delete_test),
        )
        // Add database pool to state
        .with_state(pool)
        .layer(cors);

    // Create listener
    let addr = format!("{}:{}", config.server_host, config.server_port);
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("Failed to bind to address");

    tracing::info!("🚀 Server running on http://{}", addr);
    tracing::info!("📍 Health check: http://{}:{}/health", config.server_host, config.server_port);
    tracing::info!("📍 Test API: http://{}:{}/api/tests", config.server_host, config.server_port);

    // Run server
    axum::serve(listener, app)
        .await
        .expect("Failed to start server");
}

// Health check endpoint
async fn health() -> &'static str {
    "OK"
}