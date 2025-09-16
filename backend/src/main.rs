use axum::{
    extract::Json,
    response::IntoResponse,
    routing::{get, post},
    Router,
};
use base64::{Engine as _, engine::general_purpose};
use rand::prelude::*;
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tracing::{info, warn, error, Level};
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
    #[serde(default)]
    image: Option<String>,
    #[serde(default)]
    context: Option<String>,
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

// Helper function to get current timestamp
fn get_timestamp() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
}

// Helper function to analyze image data (placeholder for real ML integration)
async fn analyze_image_content(image_data: &str) -> (String, Vec<String>, f64) {
    // In a real implementation, this would:
    // 1. Send to OpenAI Vision API, or
    // 2. Use Google Cloud Vision API, or
    // 3. Use a local ONNX/TensorFlow model
    
    // For now, return context-aware mock responses
    let mut rng = rand::thread_rng();
    let confidence = 0.75 + rng.gen::<f64>() * 0.2;
    
    let scenarios = vec![
        (
            "I can see code on your screen. The syntax highlighting suggests you're working with web technologies.",
            vec!["computer screen", "code editor", "syntax highlighting", "terminal"],
        ),
        (
            "I notice you have documentation open. I can help explain any concepts you're reading about.",
            vec!["browser", "documentation", "text content", "webpage"],
        ),
        (
            "I see you're working on a design. The layout looks clean and well-structured.",
            vec!["design software", "user interface", "graphics", "color palette"],
        ),
        (
            "Your development environment is set up nicely. I can see multiple panels and tools.",
            vec!["IDE", "file explorer", "console", "debugger panel"],
        ),
        (
            "I can see you're reviewing some data or charts. Would you like help analyzing the patterns?",
            vec!["data visualization", "charts", "graphs", "analytics dashboard"],
        ),
    ];
    
    let (description, objects) = scenarios.choose(&mut rng).unwrap();
    (
        description.to_string(),
        objects.iter().map(|s| s.to_string()).collect(),
        confidence,
    )
}

async fn health() -> impl IntoResponse {
    Json(HealthResponse {
        status: "healthy".to_string(),
        service: "euphorie-ai".to_string(),
        jarvis_status: "active".to_string(),
        timestamp: get_timestamp(),
    })
}

async fn chat(Json(request): Json<serde_json::Value>) -> impl IntoResponse {
    let message = request["message"].as_str().unwrap_or("");
    let user_name = request["user_name"].as_str().unwrap_or("User");
    
    info!("💬 Chat from {}: {}", user_name, message);
    
    let message_lower = message.to_lowercase();
    
    // Enhanced chat responses with more context awareness
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
        // Default contextual response
        format!("Interesting point, {}! I'm analyzing that now. Feel free to show me what you're working on through the camera for more specific assistance. I can help with code, documents, designs, or any visual content!", user_name)
    };
    
    Json(ChatResponse {
        response,
        agent_name: "Jarvis".to_string(),
        confidence: 0.95,
        timestamp: get_timestamp(),
    })
}

async fn vision_analyze(Json(request): Json<serde_json::Value>) -> impl IntoResponse {
    let user_id = request["user_id"].as_str().unwrap_or("unknown");
    let image_data = request["image"].as_str();
    let context = request["context"].as_str();
    
    info!("👁️ Vision analysis request from user: {}", user_id);
    
    // Handle image data if provided
    if let Some(image_str) = image_data {
        // Check if image data is valid base64
        if image_str.starts_with("data:image") {
            // Extract base64 portion after the data URL prefix
            let base64_data = image_str.split(',').nth(1);
            
            if let Some(data) = base64_data {
                // Attempt to decode to verify it's valid
                match general_purpose::STANDARD.decode(data) {
                    Ok(bytes) => {
                        info!("✅ Valid image received, size: {} bytes", bytes.len());
                        
                        // Analyze the image (this would connect to real ML service)
                        let (scene_desc, objects, confidence) = analyze_image_content(image_str).await;
                        
                        // Generate contextual insights based on detected objects
                        let mut rng = rand::thread_rng();
                        let insights = generate_insights(&objects, context);
                        let insight = insights.choose(&mut rng).cloned();
                        
                        // Generate helpful suggestions
                        let suggestions = generate_suggestions(&objects);
                        
                        return Json(VisionResponse {
                            insight,
                            scene_description: scene_desc,
                            objects_detected: objects,
                            should_respond: insight.is_some(),
                            confidence,
                            timestamp: get_timestamp(),
                            suggestions: Some(suggestions),
                        });
                    }
                    Err(e) => {
                        warn!("Failed to decode image data: {}", e);
                    }
                }
            }
        }
    }
    
    // Fallback response when no image or invalid image
    info!("No valid image data, returning periodic insight");
    
    let periodic_insights = vec![
        Some("I'm ready to analyze whatever you show me! Point your camera at code, documents, or any visual content.".to_string()),
        Some("Vision system active! I can help with code review, document analysis, or visual problem-solving.".to_string()),
        Some("Show me what you're working on - I can provide real-time insights and suggestions!".to_string()),
        None, // Sometimes don't respond to reduce noise
        None,
    ];
    
    let mut rng = rand::thread_rng();
    let insight = periodic_insights.choose(&mut rng).unwrap().clone();
    
    Json(VisionResponse {
        insight,
        scene_description: "Waiting for visual input".to_string(),
        objects_detected: vec![],
        should_respond: insight.is_some(),
        confidence: 0.0,
        timestamp: get_timestamp(),
        suggestions: None,
    })
}

// Helper function to generate contextual insights
fn generate_insights(objects: &[String], context: Option<&str>) -> Vec<Option<String>> {
    let mut insights = vec![];
    
    if objects.iter().any(|o| o.contains("code") || o.contains("editor")) {
        insights.push(Some("I can see you're coding! I notice the syntax and structure. Need help with any specific part?".to_string()));
        insights.push(Some("Your code editor is open. I can help debug, optimize, or explain any section you're working on.".to_string()));
        insights.push(Some("I see programming work in progress. Show me any errors or tricky parts you'd like help with!".to_string()));
    }
    
    if objects.iter().any(|o| o.contains("documentation") || o.contains("text")) {
        insights.push(Some("I can see documentation or text content. Would you like me to summarize or explain any concepts?".to_string()));
        insights.push(Some("Reading technical docs? I can help clarify complex sections or provide examples.".to_string()));
    }
    
    if objects.iter().any(|o| o.contains("chart") || o.contains("graph") || o.contains("data")) {
        insights.push(Some("I notice data visualizations. I can help interpret trends or suggest improvements to the presentation.".to_string()));
        insights.push(Some("Your data looks interesting! Need help with analysis or creating insights from these patterns?".to_string()));
    }
    
    if objects.iter().any(|o| o.contains("design") || o.contains("interface")) {
        insights.push(Some("Nice design work! I can provide UX feedback or suggest accessibility improvements.".to_string()));
        insights.push(Some("I see UI elements. Would you like feedback on layout, color choices, or user flow?".to_string()));
    }
    
    // Add context-aware insights if context is provided
    if let Some(ctx) = context {
        if ctx.to_lowercase().contains("error") {
            insights.push(Some("I see you're dealing with an error. Let me analyze the error message and suggest solutions.".to_string()));
        }
        if ctx.to_lowercase().contains("help") {
            insights.push(Some("I'm here to help! Show me the specific area you're working on and I'll provide targeted assistance.".to_string()));
        }
    }
    
    // Add some variety with None options to not always respond
    insights.push(None);
    insights.push(None);
    
    insights
}

// Helper function to generate suggestions based on detected objects
fn generate_suggestions(objects: &[String]) -> Vec<String> {
    let mut suggestions = vec![];
    
    if objects.iter().any(|o| o.contains("code") || o.contains("editor")) {
        suggestions.push("Try using keyboard shortcuts for faster coding".to_string());
        suggestions.push("Consider adding comments to complex sections".to_string());
        suggestions.push("Check for consistent indentation and formatting".to_string());
    }
    
    if objects.iter().any(|o| o.contains("terminal") || o.contains("console")) {
        suggestions.push("Use tab completion to speed up command entry".to_string());
        suggestions.push("Check the terminal history with arrow keys".to_string());
    }
    
    if objects.iter().any(|o| o.contains("browser")) {
        suggestions.push("Use developer tools (F12) for debugging".to_string());
        suggestions.push("Check the console for any JavaScript errors".to_string());
    }
    
    if suggestions.is_empty() {
        suggestions.push("Keep up the great work!".to_string());
        suggestions.push("Feel free to ask me anything about what you're seeing".to_string());
    }
    
    suggestions
}

// News fetching endpoint with better error handling
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

#[tokio::main]
async fn main() {
    // Initialize tracing with more detailed formatting
    tracing_subscriber::fmt()
        .with_max_level(Level::INFO)
        .with_target(false)
        .with_thread_ids(false)
        .with_file(false)
        .with_line_number(false)
        .init();
    
    println!("╔══════════════════════════════════════════╗");
    println!("║       🚀 Euphorie AI Service v2.0        ║");
    println!("╠══════════════════════════════════════════╣");
    println!("║  🤖 Jarvis AI Assistant: ONLINE          ║");
    println!("║  👁️  Vision Analysis: READY               ║");
    println!("║  💬 Chat Interface: ACTIVE               ║");
    println!("║  📰 News Service: CONNECTED              ║");
    println!("╚══════════════════════════════════════════╝");
    println!();
    
    // Enhanced CORS configuration
    let cors = CorsLayer::new()
        .allow_origin([
            "https://euphorie.com".parse().unwrap(),
            "http://euphorie.com".parse().unwrap(),
            "https://www.euphorie.com".parse().unwrap(),
            "http://www.euphorie.com".parse().unwrap(),
            "https://localhost:5173".parse().unwrap(),
            "https://127.0.0.1:5173".parse().unwrap(),
            "http://localhost:5173".parse().unwrap(),
            "http://localhost:3000".parse().unwrap(),  // Common dev port
        ])
        .allow_methods(Any)
        .allow_headers(Any);
    
    // Build the router with all endpoints
    let app = Router::new()
        .route("/", get(health))
        .route("/health", get(health))
        .route("/api/chat", post(chat))
        .route("/api/vision/analyze", post(vision_analyze))
        .route("/api/news/feed", get(get_news))
        .layer(cors);
    
    let addr = SocketAddr::from(([0, 0, 0, 0], 8001));
    
    info!("🌐 Server starting on http://{}", addr);
    info!("📡 Ready to receive connections...");
    
    // Start the server
    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    
    info!("✅ Server successfully started!");
    info!("🔧 CORS enabled for euphorie.com and localhost");
    println!();
    
    axum::serve(listener, app).await.unwrap();
}