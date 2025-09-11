use axum::{
    extract::Json,
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use rand::seq::SliceRandom;
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tracing::{info, Level};
use tracing_subscriber;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Deserialize)]
struct ChatRequest {
    message: String,
    user_name: String,
    user_id: String,
    room_id: String,
    timestamp: i64,
}

#[derive(Serialize)]
struct ChatResponse {
    response: String,
    agent_name: String,
    confidence: f64,
    timestamp: i64,
}

#[derive(Serialize)]
struct HealthResponse {
    status: String,
    service: String,
    jarvis_status: String,
    timestamp: i64,
}

#[derive(Deserialize)]
struct VisionRequest {
    user_id: String,
}

#[derive(Serialize)]
struct VisionResponse {
    insight: Option<String>,
    scene_description: String,
    objects_detected: Vec<String>,
    should_respond: bool,
    confidence: f64,
    timestamp: i64,
}

async fn health() -> impl IntoResponse {
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    
    Json(HealthResponse {
        status: "healthy".to_string(),
        service: "euphorie-ai".to_string(),
        jarvis_status: "active".to_string(),
        timestamp,
    })
}

async fn chat(Json(request): Json<serde_json::Value>) -> impl IntoResponse {
    let message = request["message"].as_str().unwrap_or("");
    let user_name = request["user_name"].as_str().unwrap_or("User");
    
    info!("💬 Chat from {}: {}", user_name, message);
    
    let message_lower = message.to_lowercase();
    
    let response = if ["hello", "hi", "hey"].iter().any(|&word| message_lower.contains(word)) {
        format!("Hello {}! I'm Jarvis, your magical AI assistant in Euphorie. I can help with coding, learning, creative projects and more!", user_name)
    } else if ["camera", "vision", "see"].iter().any(|&word| message_lower.contains(word)) {
        "With AI Vision enabled, I can see what you're working on and provide contextual help - perfect for debugging code or explaining documents!".to_string()
    } else if ["code", "debug", "programming", "error"].iter().any(|&word| message_lower.contains(word)) {
        "I'd love to help with coding! Enable camera vision so I can see your screen and help debug issues, explain code, or suggest improvements.".to_string()
    } else if ["learn", "study", "explain", "help"].iter().any(|&word| message_lower.contains(word)) {
        "I'm here to help you learn! Enable camera vision and I can even assist with textbooks, documents, or any learning materials you're reading.".to_string()
    } else if message_lower.contains("thank") {
        format!("You're very welcome, {}! I'm always here to help however I can.", user_name)
    } else if ["genie", "magic", "wizard"].iter().any(|&word| message_lower.contains(word)) {
        format!("Indeed, {}! I am your digital genie, floating here with magical powers to assist you. My crown and energy rings aren't just for show - they represent my readiness to grant your wishes for knowledge and help!", user_name)
    } else if ["beautiful", "cool", "awesome", "amazing"].iter().any(|&word| message_lower.contains(word)) {
        format!("Thank you, {}! I do try to look my best with my ethereal form and swirling energy. Beauty and function combined - that's the Euphorie way!", user_name)
    } else {
        format!("I'm here to assist, {}! I can help with coding, learning, creative work, and more. Enable AI Vision for contextual help based on what you show me!", user_name)
    };
    
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    
    Json(ChatResponse {
        response,
        agent_name: "Jarvis".to_string(),
        confidence: 0.9,
        timestamp,
    })
}

async fn vision_analyze(Json(request): Json<serde_json::Value>) -> impl IntoResponse {
    let user_id = request["user_id"].as_str().unwrap_or("unknown");
    info!("👁️ Vision analysis from user {}", user_id);
    
    let insights = vec![
        Some("I can see you're at your workspace! I'm ready to help with any coding or learning questions.".to_string()),
        Some("I notice you're working on something interesting. Feel free to ask me about what you're doing!".to_string()),
        Some("I see your computer setup. I can help with debugging, explanations, or project guidance!".to_string()),
        Some("Looks like you're working hard! Let me know if you need assistance with anything on your screen.".to_string()),
        Some("I can see some text and graphics. If you need help understanding or working with any content, just ask!".to_string()),
        Some("Your workspace looks productive! I'm here whenever you need help with what you're working on.".to_string()),
        None,
        None,
    ];
    
    let mut rng = rand::thread_rng();
    let insight = insights.choose(&mut rng).unwrap().clone();
    let should_respond = insight.is_some();
    
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;
    
    Json(VisionResponse {
        insight,
        scene_description: "I can see a workspace with computer and person".to_string(),
        objects_detected: vec!["computer".to_string(), "desk".to_string(), "person".to_string(), "screen".to_string()],
        should_respond,
        confidence: 0.8,
        timestamp,
    })
}

// Optional: Add news fetching endpoint
async fn get_news() -> impl IntoResponse {
    match reqwest::get("https://crene.com/api/news/feed").await {
        Ok(response) => match response.json::<serde_json::Value>().await {
            Ok(json) => Json(json),
            Err(_) => Json(serde_json::json!({"error": "Failed to parse news"})),
        },
        Err(_) => Json(serde_json::json!({"error": "Failed to fetch news"})),
    }
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_max_level(Level::INFO)
        .init();
    
    println!("🚀 Starting Euphorie AI Service...");
    println!("🤖 Jarvis is coming online...");
    println!("🔧 CORS enabled for HTTPS frontend...");
    
    let cors = CorsLayer::new()
        .allow_origin([
            "https://localhost:5173".parse().unwrap(),
            "https://127.0.0.1:5173".parse().unwrap(),
            "http://localhost:5173".parse().unwrap(),
        ])
        .allow_methods(Any)
        .allow_headers(Any);
    
    let app = Router::new()
        .route("/", get(health))
        .route("/health", get(health))
        .route("/api/chat", post(chat))
        .route("/api/vision/analyze", post(vision_analyze))
        .route("/api/news", get(get_news))  // Added news endpoint
        .layer(cors);
    
    let addr = SocketAddr::from(([0, 0, 0, 0], 8001));
    info!("Server running on http://{}", addr);
    
    // Fixed for axum 0.7
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}