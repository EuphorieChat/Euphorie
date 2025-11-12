use axum::{
    extract::{Json, Multipart},
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use base64::{Engine as _, engine::general_purpose};
use rand::prelude::*;
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};
use tracing::{info, warn, error, Level};
use tracing_subscriber;
use std::time::{SystemTime, UNIX_EPOCH};

// ============================================================================
// CONFIGURATION
// ============================================================================

#[derive(Clone)]
struct AppConfig {
    vision_api_url: String,
    backend_port: u16,
    backend_host: String,
}

impl AppConfig {
    fn load() -> Self {
        let env = std::env::var("EUPHORIE_ENV")
            .unwrap_or_else(|_| "development".to_string());
        
        info!("🔧 Loading configuration for environment: {}", env);
        
        match env.as_str() {
            "production" => Self {
                vision_api_url: std::env::var("VISION_API_URL")
                    .unwrap_or_else(|_| "http://YOUR_HOME_IP:5000".to_string()),
                backend_port: std::env::var("PORT")
                    .unwrap_or_else(|_| "8001".to_string())
                    .parse()
                    .unwrap_or(8001),
                backend_host: "0.0.0.0".to_string(),
            },
            _ => Self {
                vision_api_url: "http://localhost:5000".to_string(),
                backend_port: 8001,
                backend_host: "127.0.0.1".to_string(),
            },
        }
    }
}

// ============================================================================
// DATA STRUCTURES
// ============================================================================

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
    vision_api_url: String,
    timestamp: i64,
}

#[derive(Serialize)]
struct VisionResponse {
    insight: Option<String>,
    scene_description: String,
    objects_detected: Vec<String>,
    should_respond: bool,
    confidence: f64,
    timestamp: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    suggestions: Option<Vec<String>>,
}

#[derive(Deserialize, Debug)]
struct PythonVisionResponse {
    success: bool,
    response: String,
    prompt: String,
    #[serde(default)]
    image_size: Option<(u32, u32)>,
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

fn get_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
}

async fn call_python_vision_api(
    image_base64: &str, 
    vision_api_url: &str
) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| format!("Failed to create HTTP client: {}", e))?;
    
    info!("📡 Calling Python vision API at {}...", vision_api_url);
    
    let api_url = format!("{}/analyze_base64", vision_api_url);
    
    let response = client
        .post(&api_url)
        .form(&[
            ("image_base64", image_base64),
            ("prompt", "Describe what you see in this image. If it's code, identify the language and any issues. If it's a document, summarize the content. If it's a design or interface, provide feedback. Be helpful and specific."),
            ("max_tokens", "250"),
        ])
        .send()
        .await
        .map_err(|e| format!("Failed to connect to Python API at {}: {}", vision_api_url, e))?;
    
    if !response.status().is_success() {
        return Err(format!("Python API returned error: {}", response.status()));
    }
    
    let json: PythonVisionResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse vision response: {}", e))?;
    
    if json.success {
        info!("✅ Python API response received: {}...", 
              &json.response[..json.response.len().min(50)]);
        Ok(json.response)
    } else {
        Err("Python API returned unsuccessful response".to_string())
    }
}

fn extract_objects(description: &str) -> Vec<String> {
    let mut objects = Vec::new();
    let desc_lower = description.to_lowercase();
    
    let keywords = vec![
        "code", "function", "variable", "class", "error", "bug",
        "terminal", "console", "editor", "syntax", "document",
        "chart", "graph", "data", "table", "image", "text",
        "browser", "webpage", "button", "interface", "design",
        "python", "javascript", "rust", "java", "html", "css",
        "database", "api", "server", "network", "file", "folder",
    ];
    
    for keyword in keywords {
        if desc_lower.contains(keyword) {
            objects.push(keyword.to_string());
        }
    }
    
    if objects.is_empty() {
        objects.push("general content".to_string());
    }
    
    objects.truncate(5);
    objects
}

fn generate_suggestions(objects: &[String]) -> Vec<String> {
    let mut suggestions = vec![];
    
    if objects.iter().any(|o| 
        o.contains("code") || o.contains("editor") || 
        o.contains("python") || o.contains("javascript") || o.contains("rust")
    ) {
        suggestions.push("💡 Consider adding error handling for edge cases".to_string());
        suggestions.push("📝 Add comments to explain complex logic".to_string());
        suggestions.push("🔍 Check for consistent naming conventions".to_string());
    }
    
    if objects.iter().any(|o| o.contains("error") || o.contains("bug")) {
        suggestions.push("🐛 Check the stack trace for the error source".to_string());
        suggestions.push("🔧 Try debugging with print statements or breakpoints".to_string());
    }
    
    if objects.iter().any(|o| o.contains("terminal") || o.contains("console")) {
        suggestions.push("⚡ Use tab completion to speed up commands".to_string());
        suggestions.push("📜 Review command history with arrow keys".to_string());
    }
    
    if objects.iter().any(|o| o.contains("browser") || o.contains("webpage")) {
        suggestions.push("🔧 Open DevTools (F12) for debugging".to_string());
        suggestions.push("🖥️ Check the console for JavaScript errors".to_string());
    }
    
    if objects.iter().any(|o| o.contains("design") || o.contains("interface")) {
        suggestions.push("🎨 Ensure adequate color contrast for accessibility".to_string());
        suggestions.push("📱 Test responsive design on multiple screen sizes".to_string());
    }
    
    if suggestions.is_empty() {
        suggestions.push("👍 Keep up the great work!".to_string());
        suggestions.push("💬 Ask me anything about what you're seeing".to_string());
    }
    
    suggestions.truncate(3);
    suggestions
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

async fn health(config: axum::extract::State<Arc<AppConfig>>) -> impl IntoResponse {
    Json(HealthResponse {
        status: "healthy".to_string(),
        service: "euphorie-ai".to_string(),
        jarvis_status: "active".to_string(),
        vision_api_url: config.vision_api_url.clone(),
        timestamp: get_timestamp(),
    })
}

async fn chat(Json(request): Json<serde_json::Value>) -> impl IntoResponse {
    let message = request["message"].as_str().unwrap_or("");
    let user_name = request["user_name"].as_str().unwrap_or("User");
    
    info!("💬 Chat from {}: {}", user_name, message);
    
    let message_lower = message.to_lowercase();
    
    let response = if ["hello", "hi", "hey", "greetings"].iter().any(|&word| message_lower.contains(word)) {
        format!("Hello {}! I'm Jarvis, your AI assistant in Euphorie. I can help with coding, debugging, learning, and creative projects. With vision enabled, I can even see what you're working on!", user_name)
    } else if ["how are you", "how's it going", "what's up"].iter().any(|&phrase| message_lower.contains(phrase)) {
        format!("I'm functioning optimally, {}! My systems are running smoothly and I'm ready to assist. What are you working on today?", user_name)
    } else if ["camera", "vision", "see", "look"].iter().any(|&word| message_lower.contains(word)) {
        "With AI Vision enabled, I can analyze what's on your screen in real-time. Show me code, documents, designs, or anything else - I'll provide contextual insights and suggestions!".to_string()
    } else if ["code", "debug", "programming", "error", "bug"].iter().any(|&word| message_lower.contains(word)) {
        "I excel at code analysis! Show me your code through the camera, and I can help identify issues, explain concepts, suggest optimizations, or even spot potential bugs before they cause problems.".to_string()
    } else if ["learn", "study", "explain", "understand", "teach"].iter().any(|&word| message_lower.contains(word)) {
        "Learning is my specialty! Point your camera at textbooks, articles, or any educational material. I can break down complex concepts, provide examples, and answer your questions in real-time.".to_string()
    } else if ["design", "ui", "ux", "interface", "layout"].iter().any(|&word| message_lower.contains(word)) {
        "I can provide design feedback! Show me your interfaces, mockups, or designs through the camera. I'll analyze layout, color schemes, accessibility, and user experience principles.".to_string()
    } else if ["data", "analyze", "chart", "graph", "statistics"].iter().any(|&word| message_lower.contains(word)) {
        "Data analysis is one of my strengths! Show me your charts, spreadsheets, or datasets. I can help identify patterns, explain trends, and suggest visualizations.".to_string()
    } else if message_lower.contains("thank") {
        format!("You're very welcome, {}! It's my pleasure to assist. Let me know if you need anything else!", user_name)
    } else if ["genie", "magic", "wizard", "power"].iter().any(|&word| message_lower.contains(word)) {
        format!("Indeed, {}! I am your digital genie with the power of advanced AI. My ethereal form and energy rings represent my readiness to grant your wishes for knowledge and assistance!", user_name)
    } else if ["news", "updates", "happening"].iter().any(|&word| message_lower.contains(word)) {
        "The news feed keeps you updated with the latest in tech, AI, and world events. It auto-scrolls but pauses when you hover (desktop) or touch (mobile). You can filter by category too!".to_string()
    } else if ["help", "assist", "support"].iter().any(|&word| message_lower.contains(word)) {
        format!("I'm here to help, {}! I can assist with:\n• Code debugging and optimization\n• Learning and explanations\n• Design feedback\n• Data analysis\n• Creative brainstorming\n• Document review\nJust show me what you're working on!", user_name)
    } else if ["beautiful", "cool", "awesome", "amazing", "impressive"].iter().any(|&word| message_lower.contains(word)) {
        format!("Thank you, {}! The Euphorie interface combines aesthetics with functionality. The ethereal design isn't just for show - it represents the seamless blend of human creativity and AI assistance!", user_name)
    } else {
        format!("Interesting point, {}! I'm analyzing that now. Feel free to show me what you're working on through the camera for more specific assistance. I can help with code, documents, designs, or any visual content!", user_name)
    };
    
    Json(ChatResponse {
        response,
        agent_name: "Jarvis".to_string(),
        confidence: 0.95,
        timestamp: get_timestamp(),
    })
}

async fn vision_analyze_multipart(
    config: axum::extract::State<Arc<AppConfig>>,
    mut multipart: Multipart,
) -> impl IntoResponse {
    info!("👁️ Vision analysis request (multipart file upload)");
    
    let mut image_data: Option<Vec<u8>> = None;
    let mut user_id = String::from("unknown");
    
    while let Some(field) = multipart.next_field().await.unwrap_or(None) {
        let name = field.name().unwrap_or("").to_string();
        
        match name.as_str() {
            "image" => {
                if let Ok(data) = field.bytes().await {
                    image_data = Some(data.to_vec());
                    info!("✅ Received image, size: {} bytes", data.len());
                }
            }
            "user_id" => {
                if let Ok(id) = field.text().await {
                    user_id = id;
                }
            }
            _ => {}
        }
    }
    
    if let Some(img_bytes) = image_data {
        let base64_image = general_purpose::STANDARD.encode(&img_bytes);
        info!("📸 Image converted to base64, length: {} chars", base64_image.len());
        
        match call_python_vision_api(&base64_image, &config.vision_api_url).await {
            Ok(description) => {
                info!("✅ Vision analysis successful");
                
                let objects = extract_objects(&description);
                let should_respond = !description.is_empty();
                let suggestions = generate_suggestions(&objects);
                
                Json(VisionResponse {
                    insight: Some(description.clone()),
                    scene_description: description,
                    objects_detected: objects,
                    should_respond,
                    confidence: 0.85,
                    timestamp: get_timestamp(),
                    suggestions: Some(suggestions),
                })
            }
            Err(e) => {
                error!("❌ Vision API error: {}", e);
                
                Json(VisionResponse {
                    insight: Some("Vision AI is starting up... Please wait a moment and try again.".to_string()),
                    scene_description: "Python vision service unavailable".to_string(),
                    objects_detected: vec![],
                    should_respond: true,
                    confidence: 0.0,
                    timestamp: get_timestamp(),
                    suggestions: Some(vec![
                        "Make sure the Python vision API is running on port 5000".to_string(),
                        "Check that your trained model is loaded".to_string(),
                    ]),
                })
            }
        }
    } else {
        warn!("⚠️ No image data received in multipart request");
        
        Json(VisionResponse {
            insight: None,
            scene_description: "No image provided".to_string(),
            objects_detected: vec![],
            should_respond: false,
            confidence: 0.0,
            timestamp: get_timestamp(),
            suggestions: None,
        })
    }
}

async fn get_news() -> impl IntoResponse {
    info!("📰 Fetching news from Crene API...");
    
    match reqwest::get("https://crene.com/api/news/feed").await {
        Ok(response) => {
            let status = response.status();
            
            if status.is_success() {
                match response.json::<serde_json::Value>().await {
                    Ok(json) => {
                        info!("✅ Successfully fetched news from Crene");
                        Json(json)
                    },
                    Err(e) => {
                        error!("❌ Failed to parse news JSON: {}", e);
                        Json(serde_json::json!({
                            "articles": [],
                            "count": 0,
                            "has_more": false,
                            "total": 0,
                            "error": format!("Failed to parse news data: {}", e)
                        }))
                    }
                }
            } else {
                warn!("⚠️ Crene API returned status: {}", status);
                Json(serde_json::json!({
                    "articles": [],
                    "count": 0,
                    "has_more": false,
                    "total": 0,
                    "error": format!("News service returned status: {}", status)
                }))
            }
        },
        Err(e) => {
            error!("❌ Failed to connect to Crene: {}", e);
            Json(serde_json::json!({
                "articles": [],
                "count": 0,
                "has_more": false,
                "total": 0,
                "error": format!("Could not reach news service: {}", e)
            }))
        }
    }
}

// ============================================================================
// MAIN APPLICATION
// ============================================================================

#[tokio::main]
async fn main() {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_max_level(Level::INFO)
        .with_target(false)
        .with_thread_ids(false)
        .with_file(false)
        .with_line_number(false)
        .init();
    
    // Load configuration
    let config = Arc::new(AppConfig::load());
    
    // Print banner
    println!("╔══════════════════════════════════════════╗");
    println!("║       🚀 Euphorie AI Service v2.0        ║");
    println!("╠══════════════════════════════════════════╣");
    println!("║  🤖 Jarvis AI Assistant: ONLINE          ║");
    println!("║  👁️  Vision Analysis: READY               ║");
    println!("║  💬 Chat Interface: ACTIVE               ║");
    println!("║  📰 News Service: CONNECTED              ║");
    println!("╚══════════════════════════════════════════╝");
    println!();
    println!("🔗 Vision API URL: {}", config.vision_api_url);
    println!("🌐 Backend Host: {}:{}", config.backend_host, config.backend_port);
    println!();
    
    // CORS configuration
    let cors = CorsLayer::new()
        .allow_origin([
            "https://euphorie.com".parse().unwrap(),
            "http://euphorie.com".parse().unwrap(),
            "https://www.euphorie.com".parse().unwrap(),
            "http://www.euphorie.com".parse().unwrap(),
            "https://localhost:5173".parse().unwrap(),
            "http://localhost:5173".parse().unwrap(),
            "http://localhost:3000".parse().unwrap(),
            "capacitor://localhost".parse().unwrap(),
        ])
        .allow_methods(Any)
        .allow_headers(Any);
    
    // Build router
    let app = Router::new()
        .route("/", get(health))
        .route("/health", get(health))
        .route("/api/chat", post(chat))
        .route("/api/vision/analyze", post(vision_analyze_multipart))
        .route("/api/news/feed", get(get_news))
        .with_state(config.clone())
        .layer(cors);
    
    // Bind server
    let addr = SocketAddr::from((
        config.backend_host.parse::<std::net::IpAddr>()
            .unwrap_or_else(|_| "127.0.0.1".parse().unwrap()),
        config.backend_port,
    ));
    
    info!("🌐 Server starting on http://{}", addr);
    info!("📡 Ready to receive connections...");
    
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    
    info!("✅ Server successfully started!");
    info!("🔧 CORS enabled for euphorie.com and localhost");
    info!("🐍 Forwarding vision requests to: {}", config.vision_api_url);
    println!();
    
    axum::serve(listener, app).await.unwrap();
}