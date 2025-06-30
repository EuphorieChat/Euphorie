use crate::config::Config;
use crate::message::{ClientMessage, ServerMessage};
use anyhow::Result;
use dashmap::DashMap;
use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use tokio::net::{TcpListener, TcpStream};
use tokio_tungstenite::{accept_async, tungstenite::Message};
use tracing::{debug, error, info, warn};
use uuid::Uuid;

#[derive(Debug)]
pub struct WebSocketServer {
    config: Config,
    connections: Arc<DashMap<Uuid, String>>,
}

impl WebSocketServer {
    pub async fn new(config: Config) -> Result<Self> {
        Ok(Self {
            config,
            connections: Arc::new(DashMap::new()),
        })
    }
    
    pub async fn run(self) -> Result<()> {
        let addr = format!("{}:{}", self.config.host, self.config.port);
        let listener = TcpListener::bind(&addr).await?;
        
        info!("🚀 Euphorie WebSocket Server listening on {}", addr);
        
        loop {
            match listener.accept().await {
                Ok((stream, addr)) => {
                    let connections = self.connections.clone();
                    tokio::spawn(async move {
                        if let Err(e) = Self::handle_connection(stream, addr, connections).await {
                            error!("Connection error from {}: {}", addr, e);
                        }
                    });
                }
                Err(e) => {
                    error!("Failed to accept connection: {}", e);
                }
            }
        }
    }
    
    async fn handle_connection(
        stream: TcpStream,
        addr: std::net::SocketAddr,
        connections: Arc<DashMap<Uuid, String>>,
    ) -> Result<()> {
        info!("📡 New TCP connection from {}", addr);
        
        // Set TCP socket options for better performance
        if let Err(e) = stream.set_nodelay(true) {
            warn!("Failed to set TCP_NODELAY: {}", e);
        }
        
        // Accept WebSocket connection
        let ws_stream = match accept_async(stream).await {
            Ok(ws) => {
                info!("✅ WebSocket handshake successful for {}", addr);
                ws
            },
            Err(e) => {
                error!("❌ WebSocket handshake failed for {}: {}", addr, e);
                return Err(e.into());
            }
        };
        
        let connection_id = Uuid::new_v4();
        connections.insert(connection_id, addr.to_string());
        
        info!("🔌 WebSocket connection established: {} from {}", connection_id, addr);
        
        let (mut ws_sender, mut ws_receiver) = ws_stream.split();
        
        // Send welcome message
        let welcome = ServerMessage::System {
            message: "Welcome to Euphorie WebSocket Server! 🚀".to_string(),
            level: "info".to_string(),
        };
        
        if let Ok(json) = serde_json::to_string(&welcome) {
            if let Err(e) = ws_sender.send(Message::Text(json)).await {
                warn!("Failed to send welcome message to {}: {}", connection_id, e);
                connections.remove(&connection_id);
                return Ok(());
            } else {
                info!("📤 Welcome message sent to {}", connection_id);
            }
        }
        
        // Handle incoming messages
        while let Some(msg) = ws_receiver.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    debug!("📨 Received text from {}: {}", connection_id, text);
                    
                    match serde_json::from_str::<ClientMessage>(&text) {
                        Ok(client_message) => {
                            let response = Self::handle_client_message(client_message, &connection_id).await;
                            
                            if let Ok(json) = serde_json::to_string(&response) {
                                if let Err(e) = ws_sender.send(Message::Text(json)).await {
                                    warn!("Failed to send response to {}: {}", connection_id, e);
                                    break;
                                }
                            }
                        }
                        Err(e) => {
                            warn!("Invalid message format from {}: {}, error: {}", connection_id, text, e);
                            let error_response = ServerMessage::Error {
                                error: "Invalid message format".to_string(),
                                code: Some(400),
                            };
                            
                            if let Ok(json) = serde_json::to_string(&error_response) {
                                if let Err(e) = ws_sender.send(Message::Text(json)).await {
                                    warn!("Failed to send error message to {}: {}", connection_id, e);
                                }
                            }
                        }
                    }
                }
                Ok(Message::Binary(data)) => {
                    debug!("📨 Received binary data from {}: {} bytes", connection_id, data.len());
                    // Handle binary data if needed
                }
                Ok(Message::Close(close_frame)) => {
                    info!("🔌 WebSocket close frame from {}: {:?}", connection_id, close_frame);
                    break;
                }
                Ok(Message::Ping(data)) => {
                    debug!("🏓 Ping from {}", connection_id);
                    if let Err(e) = ws_sender.send(Message::Pong(data)).await {
                        warn!("Failed to send pong to {}: {}", connection_id, e);
                        break;
                    }
                }
                Ok(Message::Pong(_)) => {
                    debug!("🏓 Pong from {}", connection_id);
                }
                Ok(Message::Frame(_)) => {
                    debug!("📨 Raw frame from {}", connection_id);
                }
                Err(e) => {
                    match e {
                        tokio_tungstenite::tungstenite::Error::ConnectionClosed => {
                            info!("🔌 Connection closed normally by {}", connection_id);
                        }
                        tokio_tungstenite::tungstenite::Error::Protocol(ref protocol_error) => {
                            warn!("⚠️ Protocol error from {}: {}", connection_id, protocol_error);
                        }
                        _ => {
                            warn!("❌ WebSocket error from {}: {}", connection_id, e);
                        }
                    }
                    break;
                }
            }
        }
        
        connections.remove(&connection_id);
        info!("🔌 WebSocket connection cleanup completed: {}", connection_id);
        Ok(())
    }
    
    async fn handle_client_message(message: ClientMessage, connection_id: &Uuid) -> ServerMessage {
        match message {
            ClientMessage::Auth { user_id, room_id, username: _username, .. } => {
                info!("🔐 Authentication from {}: user {} joining room {}", connection_id, user_id, room_id);
                
                let room_info = crate::message::RoomInfo {
                    room_id: room_id.clone(),
                    name: format!("Room {}", room_id),
                    user_count: 1,
                    max_users: 100,
                    scene_preset: "modern_office".to_string(),
                    active_users: vec![],
                };
                
                ServerMessage::AuthSuccess {
                    user_id,
                    room_id,
                    room_info,
                }
            }
            ClientMessage::ChatMessage { message, user_id, .. } => {
                info!("💬 Chat from {}: {}: {}", connection_id, user_id, message);
                
                ServerMessage::ChatMessage {
                    user_id: user_id.clone(),
                    username: user_id, // For now, use user_id as username
                    message,
                    timestamp: std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_millis() as u64,
                }
            }
            ClientMessage::Ping { timestamp } => {
                debug!("🏓 Ping from {}", connection_id);
                ServerMessage::Pong { timestamp }
            }
            ClientMessage::Emotion { user_id, emotion, .. } => {
                info!("🎭 Emotion from {}: {}: {}", connection_id, user_id, emotion);
                ServerMessage::Emotion {
                    user_id,
                    emotion,
                    timestamp: std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_millis() as u64,
                }
            }
            ClientMessage::Interaction { user_id, interaction_type, target_user_id, data, .. } => {
                info!("🤝 Interaction from {}: {}: {}", connection_id, user_id, interaction_type);
                ServerMessage::Interaction {
                    user_id,
                    target_user_id,
                    interaction_type,
                    data,
                    timestamp: std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_millis() as u64,
                }
            }
            ClientMessage::Typing { user_id, is_typing, .. } => {
                debug!("⌨️ Typing from {}: {}: {}", connection_id, user_id, is_typing);
                ServerMessage::Typing {
                    user_id: user_id.clone(),
                    username: user_id, // Use user_id as username for now
                    is_typing,
                }
            }
            ClientMessage::AvatarUpdate { user_id, position, rotation, animation, .. } => {
                debug!("🎮 Avatar update from {}: {}", connection_id, user_id);
                ServerMessage::AvatarUpdate {
                    user_id,
                    position,
                    rotation,
                    animation,
                    timestamp: std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_millis() as u64,
                }
            }
        }
    }
}
