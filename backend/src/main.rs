use axum::{
    response::Json,
    routing::{get, post},
    Router,
};
use serde::{Deserialize, Serialize};
use tower_http::cors::{Any, CorsLayer};

#[derive(Serialize, Deserialize)]
struct Message {
    text: String,
}

#[derive(Serialize)]
struct HealthCheck {
    status: String,
    timestamp: u64,
}

// GET /health
// Returns a simple health payload with a UNIX timestamp.
async fn health() -> Json<HealthCheck> {
    Json(HealthCheck {
        status: "healthy".to_string(),
        timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs(),
    })
}

// GET /api/hello
// Returns a friendly greeting.
async fn hello() -> Json<Message> {
    Json(Message {
        text: "Hello from Rust API!".to_string(),
    })
}

// POST /api/echo
// Extracts JSON body into Message (via axum's Json extractor) and echoes it back.
async fn echo(Json(payload): Json<Message>) -> Json<Message> {
    Json(Message {
        text: format!("Echo: {}", payload.text),
    })
}

#[tokio::main]
async fn main() {
    // Configure CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Build our application with routes
    let app = Router::new()
        .route("/health", get(health))
        .route("/api/hello", get(hello))
        .route("/api/echo", post(echo))
        .layer(cors);

    // Run it
    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080")
        .await
        .unwrap();

    println!("🚀 Server running on http://0.0.0.0:8080");
    println!("📍 Health check: http://localhost:8080/health");
    println!("📍 Hello endpoint: http://localhost:8080/api/hello");

    axum::serve(listener, app).await.unwrap();
}