// COMPLETE FIXED: src/server.rs - Updated with proper screen sharing integration
use std::sync::Arc;

use crate::message::{ClientMessage, ServerMessage, Position, AvatarInfo, UserInfo};
use crate::room::Room;
use crate::user::User;
use crate::rate_limiter::{RateLimiter, RateLimiterConfig};
use crate::message_history::{MessageHistory, MessageHistoryConfig};
use crate::screen_sharing::{ScreenSharingManager, ScreenSharingConfig};

use dashmap::DashMap;
use tokio::net::{TcpListener, TcpStream};
use tokio::io::AsyncWriteExt;
use tokio_tungstenite::{accept_async, tungstenite::Message};
use futures_util::{SinkExt, StreamExt};
use anyhow::Result;

#[derive(Debug, Clone)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub max_connections: usize,
    pub max_rooms: usize,
    pub max_users_per_room: usize,
    pub rate_limiter: RateLimiterConfig,
    pub message_history: MessageHistoryConfig,
    pub screen_sharing: ScreenSharingConfig,
}

impl Config {
    pub fn address(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }
}

impl Default for Config {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".to_string(),
            port: 9001,
            max_connections: 10000,
            max_rooms: 50,
            max_users_per_room: 100,
            rate_limiter: RateLimiterConfig::default(),
            message_history: MessageHistoryConfig::default(),
            screen_sharing: ScreenSharingConfig::default(),
        }
    }
}

pub struct WebSocketServer {
    pub connections: Arc<DashMap<String, WebSocketConnection>>,
    pub rooms: Arc<DashMap<String, Arc<Room>>>,
    pub config: Config,
    pub rate_limiter: RateLimiter,
    pub message_history: MessageHistory,
    pub screen_sharing_manager: Arc<ScreenSharingManager>,
}

#[derive(Debug)]
pub struct WebSocketConnection {
    pub user_id: String,
    pub room_id: Option<String>,
    pub sender: tokio::sync::mpsc::UnboundedSender<Message>,
}

impl WebSocketServer {
    pub async fn new(config: Config) -> Result<Self> {
        let rate_limiter = RateLimiter::new(config.rate_limiter.clone());
        let message_history = MessageHistory::new(config.message_history.clone());
        let screen_sharing_manager = Arc::new(ScreenSharingManager::new(config.screen_sharing.clone()));

        // Start periodic cleanup tasks
        let cleanup_rate_limiter = rate_limiter.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(300)); // Every 5 minutes
            loop {
                interval.tick().await;
                cleanup_rate_limiter.cleanup_old_users();
            }
        });

        // Screen sharing cleanup task
        let cleanup_screen_sharing = screen_sharing_manager.clone();
        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(60)); // Every minute
            loop {
                interval.tick().await;
                let expired_rooms = cleanup_screen_sharing.cleanup_expired_shares().await;
                if !expired_rooms.is_empty() {
                    tracing::info!("🧹 Cleaned up {} expired screen shares", expired_rooms.len());
                }
            }
        });

        Ok(Self {
            connections: Arc::new(DashMap::new()),
            rooms: Arc::new(DashMap::new()),
            config,
            rate_limiter,
            message_history,
            screen_sharing_manager,
        })
    }

    pub async fn run(&self) -> Result<()> {
        let addr = self.config.address();
        let listener = TcpListener::bind(&addr).await?;
        tracing::info!("🚀 WebSocket server listening on {}", addr);

        while let Ok((mut stream, addr)) = listener.accept().await {
            tracing::debug!("👋 New connection from {}", addr);
            
            // Check connection limits
            if self.connections.len() >= self.config.max_connections {
                tracing::warn!("🚫 Connection limit reached, rejecting connection from {}", addr);
                let _ = stream.shutdown().await;
                continue;
            }
            
            let server = self.clone();
            tokio::spawn(async move {
                if let Err(e) = server.handle_connection(stream).await {
                    tracing::error!("❌ Error handling connection: {}", e);
                }
            });
        }

        Ok(())
    }

    async fn handle_connection(&self, stream: TcpStream) -> Result<()> {
        let ws_stream = accept_async(stream).await?;
        let (mut ws_sender, mut ws_receiver) = ws_stream.split();
        
        let connection_id = uuid::Uuid::new_v4().to_string();
        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();

        let connection = WebSocketConnection {
            user_id: connection_id.clone(),
            room_id: None,
            sender: tx,
        };

        self.connections.insert(connection_id.clone(), connection);

        // Handle outgoing messages
        tokio::spawn(async move {
            while let Some(message) = rx.recv().await {
                if ws_sender.send(message).await.is_err() {
                    break;
                }
            }
        });

        // Handle incoming messages
        while let Some(msg) = ws_receiver.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    if let Err(e) = self.handle_message(&connection_id, &text).await {
                        tracing::error!("❌ Error handling message: {}", e);
                    }
                }
                Ok(Message::Close(_)) => {
                    tracing::debug!("👋 Connection closed for connection {}", connection_id);
                    break;
                }
                Err(e) => {
                    tracing::error!("❌ WebSocket error: {}", e);
                    break;
                }
                _ => {}
            }
        }

        // Cleanup
        self.cleanup_user(&connection_id).await;
        Ok(())
    }

    async fn handle_message(&self, connection_id: &str, text: &str) -> Result<()> {
        // DEBUG: Log all incoming messages for screen sharing debugging
        if text.contains("screen_share") || text.contains("webrtc") {
            tracing::info!("🔍 DEBUG: Received screen sharing message: {}", text);
        }
        
        // Parse as regular message (now includes screen sharing)
        let message: ClientMessage = serde_json::from_str(text)?;
        
        // Apply rate limiting to most message types (except ping/auth)
        let should_rate_limit = matches!(message, 
            ClientMessage::ChatMessage { .. } |
            ClientMessage::PositionUpdate { .. } |
            ClientMessage::Emotion { .. } |
            ClientMessage::Interaction { .. } |
            ClientMessage::Typing { .. } |
            ClientMessage::SceneChange { .. } |
            ClientMessage::WeatherChange { .. } |
            ClientMessage::TimeChange { .. }
            // Note: Don't rate limit screen sharing messages for responsiveness
        );

        if should_rate_limit && !self.rate_limiter.check_rate_limit(connection_id) {
            let error_response = ServerMessage::Error {
                error: "Rate limit exceeded. Please slow down.".to_string(),
            };
            self.send_to_connection(connection_id, &error_response).await?;
            return Ok(());
        }
        
        match message {
            ClientMessage::Auth { user_id: auth_user_id, room_id, username, nationality, .. } => {
                // Handle authenticated vs guest users with nationality support
                let (final_user_id, final_username) = match (auth_user_id, username) {
                    // Authenticated user with proper ID and username
                    (Some(user_id), Some(username)) if !user_id.is_empty() && !username.is_empty() => {
                        (user_id, username)
                    },
                    
                    // Guest user - generate guest ID
                    _ => {
                        let guest_id = format!("guest_{}", 
                            uuid::Uuid::new_v4().to_string()
                                .split('-')
                                .next()
                                .unwrap_or("unknown")
                        );
                        (guest_id, "Guest".to_string())
                    }
                };

                let room = self.get_or_create_room(&room_id).await?;

                let user = User {
                    id: final_user_id.clone(),
                    username: final_username.clone(),
                    position: Position { x: 0.0, y: 0.0, z: 0.0 },
                    room_id: Some(room_id.clone()),
                    nationality: nationality.clone(),
                    connected_at: chrono::Utc::now(),
                };

                if room.add_user(user).await {
                    // Update connection with the actual user ID
                    if let Some(mut conn) = self.connections.get_mut(connection_id) {
                        conn.user_id = final_user_id.clone();
                        conn.room_id = Some(room_id.clone());
                    }

                    let response = ServerMessage::AuthSuccess {
                        user_id: final_user_id.clone(),
                        room_id: room_id.clone(),
                        room_info: room.to_room_info().await,
                    };
                    self.send_to_connection(connection_id, &response).await?;

                    // Send recent message history to the user
                    let recent_messages = self.message_history.get_recent_messages(&room_id, Some(20)).await;
                    for stored_message in recent_messages {
                        self.send_to_connection(connection_id, &stored_message.message).await?;
                    }

                    let user_joined = ServerMessage::UserJoined {
                        user_id: final_user_id.clone(),
                        username: final_username,
                        avatar: Some(AvatarInfo::default()),
                        nationality: nationality,
                    };
                    
                    // Store and broadcast user joined message
                    self.message_history.add_message(&room_id, user_joined.clone()).await;
                    self.broadcast_to_room(&room_id, &user_joined, Some(&final_user_id)).await?;
                } else {
                    let response = ServerMessage::AuthError {
                        error: "Room is full".to_string(),
                    };
                    self.send_to_connection(connection_id, &response).await?;
                }
            }

            ClientMessage::ChatMessage { message: msg, user_id: msg_user_id, room_id, nationality, .. } => {
                if let Some(conn) = self.connections.get(connection_id) {
                    if let Some(ref conn_room_id) = conn.room_id {
                        if conn_room_id == &room_id {
                            let final_user_id = msg_user_id.unwrap_or_else(|| conn.user_id.clone());
                            
                            // Get username from room data
                            let username = if let Some(room) = self.rooms.get(&room_id) {
                                if let Some(room_user) = room.get_user(&final_user_id).await {
                                    room_user.username
                                } else {
                                    "User".to_string()
                                }
                            } else {
                                "User".to_string()
                            };

                            let response = ServerMessage::ChatMessage {
                                user_id: final_user_id,
                                username,
                                message: msg,
                                nationality,
                                timestamp: chrono::Utc::now().timestamp_millis(),
                            };
                            
                            // Store message in history
                            self.message_history.add_message(&room_id, response.clone()).await;
                            
                            // Broadcast to room
                            self.broadcast_to_room(&room_id, &response, None).await?;
                        }
                    }
                }
            }

            ClientMessage::PositionUpdate { user_id: pos_user_id, room_id, position, nationality, .. } => {
                if let Some(conn) = self.connections.get(connection_id) {
                    let final_user_id = pos_user_id.unwrap_or_else(|| conn.user_id.clone());
                    if let Some(room) = self.rooms.get(&room_id) {
                        if room.update_user_position(&final_user_id, position.clone()).await {
                            let response = ServerMessage::UserPositionUpdate {
                                user_id: final_user_id,
                                position,
                                nationality,
                                timestamp: chrono::Utc::now().timestamp_millis(),
                            };
                            self.broadcast_to_room(&room_id, &response, Some(&conn.user_id)).await?;
                        }
                    }
                }
            }

            ClientMessage::Emotion { user_id: emotion_user_id, room_id, emotion, nationality, .. } => {
                if let Some(conn) = self.connections.get(connection_id) {
                    let final_user_id = emotion_user_id.unwrap_or_else(|| conn.user_id.clone());
                    
                    let username = if let Some(room) = self.rooms.get(&room_id) {
                        if let Some(room_user) = room.get_user(&final_user_id).await {
                            room_user.username
                        } else {
                            "User".to_string()
                        }
                    } else {
                        "User".to_string()
                    };

                    let response = ServerMessage::Emotion {
                        user_id: final_user_id,
                        username,
                        emotion,
                        nationality,
                        timestamp: chrono::Utc::now().timestamp_millis(),
                    };
                    
                    self.message_history.add_message(&room_id, response.clone()).await;
                    self.broadcast_to_room(&room_id, &response, Some(&conn.user_id)).await?;
                }
            }

            ClientMessage::Interaction { user_id: int_user_id, room_id, target_user_id, interaction_type, data, nationality, .. } => {
                if let Some(conn) = self.connections.get(connection_id) {
                    let final_user_id = int_user_id.unwrap_or_else(|| conn.user_id.clone());
                    
                    let username = if let Some(room) = self.rooms.get(&room_id) {
                        if let Some(room_user) = room.get_user(&final_user_id).await {
                            room_user.username
                        } else {
                            "User".to_string()
                        }
                    } else {
                        "User".to_string()
                    };

                    let response = ServerMessage::Interaction {
                        user_id: final_user_id,
                        username,
                        target_user_id,
                        interaction_type,
                        data,
                        nationality,
                        timestamp: chrono::Utc::now().timestamp_millis(),
                    };
                    
                    self.message_history.add_message(&room_id, response.clone()).await;
                    self.broadcast_to_room(&room_id, &response, Some(&conn.user_id)).await?;
                }
            }

            ClientMessage::Typing { user_id: typing_user_id, room_id, is_typing } => {
                if let Some(conn) = self.connections.get(connection_id) {
                    let final_user_id = typing_user_id.unwrap_or_else(|| conn.user_id.clone());
                    
                    let username = if let Some(room) = self.rooms.get(&room_id) {
                        if let Some(room_user) = room.get_user(&final_user_id).await {
                            room_user.username
                        } else {
                            "User".to_string()
                        }
                    } else {
                        "User".to_string()
                    };

                    let response = ServerMessage::Typing {
                        user_id: final_user_id,
                        username,
                        is_typing,
                    };
                    
                    self.broadcast_to_room(&room_id, &response, Some(&conn.user_id)).await?;
                }
            }

            ClientMessage::GetRoomState { room_id } => {
                if let Some(room) = self.rooms.get(&room_id) {
                    let users: Vec<UserInfo> = room.get_all_users().await.into_iter().map(|u| UserInfo {
                        user_id: u.user_id,
                        username: u.username,
                        position: Some(u.position),
                        avatar: Some(AvatarInfo::default()),
                        is_typing: false,
                        nationality: u.nationality,
                        last_seen: chrono::Utc::now().timestamp_millis(),
                    }).collect();

                    let response = ServerMessage::RoomState {
                        room_id,
                        users,
                    };
                    self.send_to_connection(connection_id, &response).await?;
                }
            }

            ClientMessage::Ping { timestamp } => {
                let response = ServerMessage::Pong { timestamp };
                self.send_to_connection(connection_id, &response).await?;
            }

            ClientMessage::SceneChange { user_id: scene_user_id, room_id, username, scene_preset, scene_name, change_data, nationality, .. } => {
                if let Some(conn) = self.connections.get(connection_id) {
                    let final_user_id = scene_user_id.unwrap_or_else(|| conn.user_id.clone());
                    
                    let final_username = if let Some(username) = username {
                        username
                    } else if let Some(room) = self.rooms.get(&room_id) {
                        if let Some(room_user) = room.get_user(&final_user_id).await {
                            room_user.username
                        } else {
                            "User".to_string()
                        }
                    } else {
                        "User".to_string()
                    };

                    if let Some(room) = self.rooms.get(&room_id) {
                        room.update_scene_preset(scene_preset.clone()).await;
                    }

                    let response = ServerMessage::SceneChange {
                        user_id: final_user_id,
                        username: final_username.clone(),
                        scene_preset: scene_preset.clone(),
                        scene_name,
                        change_data,
                        nationality,
                        timestamp: chrono::Utc::now().timestamp_millis(),
                    };
                    
                    tracing::info!("🏠 Scene change: {} -> {}", final_username, scene_preset);
                    self.message_history.add_message(&room_id, response.clone()).await;
                    self.broadcast_to_room(&room_id, &response, None).await?;
                }
            }

            ClientMessage::WeatherChange { user_id: weather_user_id, room_id, username, weather_type, intensity, nationality, .. } => {
                if let Some(conn) = self.connections.get(connection_id) {
                    let final_user_id = weather_user_id.unwrap_or_else(|| conn.user_id.clone());
                    
                    let final_username = if let Some(username) = username {
                        username
                    } else if let Some(room) = self.rooms.get(&room_id) {
                        if let Some(room_user) = room.get_user(&final_user_id).await {
                            room_user.username
                        } else {
                            "User".to_string()
                        }
                    } else {
                        "User".to_string()
                    };

                    let response = ServerMessage::WeatherChange {
                        user_id: final_user_id,
                        username: final_username.clone(),
                        weather_type: weather_type.clone(),
                        intensity: intensity.unwrap_or(1.0),
                        nationality,
                        timestamp: chrono::Utc::now().timestamp_millis(),
                    };
                    
                    tracing::info!("🌦️ Weather change: {} -> {}", final_username, weather_type);
                    self.message_history.add_message(&room_id, response.clone()).await;
                    self.broadcast_to_room(&room_id, &response, None).await?;
                }
            }

            ClientMessage::TimeChange { user_id: time_user_id, room_id, username, time_of_day, hour, nationality, .. } => {
                if let Some(conn) = self.connections.get(connection_id) {
                    let final_user_id = time_user_id.unwrap_or_else(|| conn.user_id.clone());
                    
                    let final_username = if let Some(username) = username {
                        username
                    } else if let Some(room) = self.rooms.get(&room_id) {
                        if let Some(room_user) = room.get_user(&final_user_id).await {
                            room_user.username
                        } else {
                            "User".to_string()
                        }
                    } else {
                        "User".to_string()
                    };

                    let response = ServerMessage::TimeChange {
                        user_id: final_user_id,
                        username: final_username.clone(),
                        time_of_day: time_of_day.clone(),
                        hour,
                        nationality,
                        timestamp: chrono::Utc::now().timestamp_millis(),
                    };
                    
                    tracing::info!("🌅 Time change: {} -> {}", final_username, time_of_day);
                    self.message_history.add_message(&room_id, response.clone()).await;
                    self.broadcast_to_room(&room_id, &response, None).await?;
                }
            }

            // FIXED: Screen Sharing Message Handling
            ClientMessage::ScreenShareStarted { user_id, room_id, username, nationality, share_data, .. } => {
                tracing::info!("🖥️ Screen share start request from: {} in room: {}", username, room_id);
                
                // Convert message::ScreenShareData to screen_sharing::ScreenShareData
                let screen_share_data = crate::screen_sharing::ScreenShareData {
                    projection_mode: share_data.projection_mode.clone(),
                    quality: share_data.quality.clone(),
                    session_id: share_data.session_id.clone(),
                };
                
                match self.screen_sharing_manager.start_screen_share(
                    user_id.clone(),
                    room_id.clone(),
                    username.clone(),
                    nationality.clone(),
                    screen_share_data,
                ).await {
                    Ok(session_id) => {
                        let response = ServerMessage::ScreenShareStarted {
                            user_id: user_id.clone(),
                            room_id: room_id.clone(),
                            username: username.clone(),
                            nationality: nationality.clone(),
                            share_data: share_data.clone(),
                            timestamp: chrono::Utc::now().timestamp_millis(),
                        };
                        
                        // Broadcast to ALL users in room (including sender for confirmation)
                        self.broadcast_to_room(&room_id, &response, None).await?;
                        tracing::info!("✅ Screen share started: {} in room: {} (session: {})", username, room_id, session_id);
                    }
                    Err(e) => {
                        tracing::warn!("❌ Screen share start failed: {}", e);
                        let error_response = ServerMessage::Error {
                            error: format!("Screen share failed: {}", e),
                        };
                        self.send_to_connection(connection_id, &error_response).await?;
                    }
                }
            }

            ClientMessage::ScreenShareStopped { user_id, room_id, username, nationality, .. } => {
                tracing::info!("🖥️ Screen share stop request from: {} in room: {}", username, room_id);
                
                if let Some(_stopped_share) = self.screen_sharing_manager.stop_screen_share(&user_id).await {
                    let response = ServerMessage::ScreenShareStopped {
                        user_id: user_id.clone(),
                        room_id: room_id.clone(),
                        username: username.clone(),
                        nationality: nationality.clone(),
                        timestamp: chrono::Utc::now().timestamp_millis(),
                    };
                    
                    // Broadcast to ALL users in room
                    self.broadcast_to_room(&room_id, &response, None).await?;
                    tracing::info!("✅ Screen share stopped: {} in room: {}", username, room_id);
                }
            }

            // NEW: WebRTC Signaling Message Handlers
            ClientMessage::ScreenShareWebRTCOffer { user_id, room_id, target_user_id, data, .. } => {
                tracing::debug!("📡 WebRTC offer: {} -> {} in room: {}", user_id, target_user_id, room_id);
                
                match self.screen_sharing_manager.handle_webrtc_offer(
                    &user_id, &room_id, &target_user_id, data, chrono::Utc::now().timestamp_millis()
                ).await {
                    Ok(response) => {
                        // Send directly to target user
                        self.send_to_user(&target_user_id, &response).await?;
                        tracing::info!("✅ WebRTC offer relayed from {} to {}", user_id, target_user_id);
                    }
                    Err(e) => {
                        tracing::warn!("❌ Failed to relay WebRTC offer: {}", e);
                        let error_response = ServerMessage::Error {
                            error: format!("WebRTC offer failed: {}", e),
                        };
                        self.send_to_connection(connection_id, &error_response).await?;
                    }
                }
            }

            ClientMessage::ScreenShareWebRTCAnswer { user_id, room_id, target_user_id, data, .. } => {
                tracing::debug!("📡 WebRTC answer: {} -> {} in room: {}", user_id, target_user_id, room_id);
                
                match self.screen_sharing_manager.handle_webrtc_answer(
                    &user_id, &room_id, &target_user_id, data, chrono::Utc::now().timestamp_millis()
                ).await {
                    Ok(response) => {
                        // Send directly to target user
                        self.send_to_user(&target_user_id, &response).await?;
                        tracing::info!("✅ WebRTC answer relayed from {} to {}", user_id, target_user_id);
                    }
                    Err(e) => {
                        tracing::warn!("❌ Failed to relay WebRTC answer: {}", e);
                        let error_response = ServerMessage::Error {
                            error: format!("WebRTC answer failed: {}", e),
                        };
                        self.send_to_connection(connection_id, &error_response).await?;
                    }
                }
            }

            ClientMessage::ScreenShareWebRTCCandidate { user_id, room_id, target_user_id, data, .. } => {
                tracing::debug!("📡 WebRTC candidate: {} -> {} in room: {}", user_id, target_user_id, room_id);
                
                match self.screen_sharing_manager.handle_webrtc_candidate(
                    &user_id, &room_id, &target_user_id, data, chrono::Utc::now().timestamp_millis()
                ).await {
                    Ok(response) => {
                        // Send directly to target user
                        self.send_to_user(&target_user_id, &response).await?;
                        tracing::debug!("✅ WebRTC candidate relayed from {} to {}", user_id, target_user_id);
                    }
                    Err(e) => {
                        tracing::warn!("❌ Failed to relay WebRTC candidate: {}", e);
                    }
                }
            }

            ClientMessage::ScreenShareWebRTCReady { user_id, room_id, username, share_data, .. } => {
                tracing::info!("📡 WebRTC ready from: {} in room: {}", username, room_id);
                
                // Convert message::ScreenShareData to screen_sharing::ScreenShareData
                let screen_share_data = crate::screen_sharing::ScreenShareData {
                    projection_mode: share_data.projection_mode.clone(),
                    quality: share_data.quality.clone(),
                    session_id: share_data.session_id.clone(),
                };
                
                match self.screen_sharing_manager.handle_webrtc_ready(
                    &user_id, &room_id, &username, screen_share_data, chrono::Utc::now().timestamp_millis()
                ).await {
                    Ok(response) => {
                        // Broadcast to all users in room except sender
                        self.broadcast_to_room(&room_id, &response, Some(&user_id)).await?;
                        tracing::info!("✅ WebRTC ready broadcasted from {} in room {}", username, room_id);
                    }
                    Err(e) => {
                        tracing::warn!("❌ Failed to handle WebRTC ready: {}", e);
                    }
                }
            }

            // NEW: Handle broadcast offer message (ignore or log for now)
            ClientMessage::ScreenShareBroadcastOffer { user_id, room_id, username, .. } => {
                tracing::info!("📡 Broadcast offer from: {} in room: {} (ignoring for now)", username, room_id);
                // For now, we'll just acknowledge it - the important messages are the WebRTC ones
            }

            // NEW: Handle screen share ready message
            ClientMessage::ScreenShareReady { user_id, room_id, username, share_data, .. } => {
                tracing::info!("📡 Screen share ready from: {} in room: {}", username, room_id);
                
                // Convert message::ScreenShareData to screen_sharing::ScreenShareData
                let screen_share_data = crate::screen_sharing::ScreenShareData {
                    projection_mode: share_data.projection_mode.clone(),
                    quality: share_data.quality.clone(),
                    session_id: share_data.session_id.clone(),
                };
                
                match self.screen_sharing_manager.handle_webrtc_ready(
                    &user_id, &room_id, &username, screen_share_data, chrono::Utc::now().timestamp_millis()
                ).await {
                    Ok(response) => {
                        // Broadcast to all users in room except sender
                        self.broadcast_to_room(&room_id, &response, Some(&user_id)).await?;
                        tracing::info!("✅ Screen share ready broadcasted from {} in room {}", username, room_id);
                    }
                    Err(e) => {
                        tracing::warn!("❌ Failed to handle screen share ready: {}", e);
                    }
                }
            }
        }

        Ok(())
    }

    async fn get_or_create_room(&self, room_id: &str) -> Result<Arc<Room>> {
        if let Some(room) = self.rooms.get(room_id) {
            Ok(room.value().clone())
        } else {
            if self.rooms.len() >= self.config.max_rooms {
                return Err(anyhow::anyhow!("Maximum number of rooms reached"));
            }
            
            let room = Arc::new(Room::new(
                room_id.to_string(),
                format!("Room {}", room_id),
                self.config.max_users_per_room,
            ));
            self.rooms.insert(room_id.to_string(), room.clone());
            Ok(room)
        }
    }

    async fn send_to_connection(&self, connection_id: &str, message: &ServerMessage) -> Result<()> {
        if let Some(conn) = self.connections.get(connection_id) {
            let json = serde_json::to_string(message)?;
            let _ = conn.sender.send(Message::Text(json));
        }
        Ok(())
    }

    // FIXED: Helper method to send messages to specific users
    async fn send_to_user(&self, user_id: &str, message: &ServerMessage) -> Result<()> {
        let json = serde_json::to_string(message)?;
        
        for conn in self.connections.iter() {
            if conn.user_id == user_id {
                let _ = conn.sender.send(Message::Text(json));
                break;
            }
        }
        Ok(())
    }

    async fn broadcast_to_room(&self, room_id: &str, message: &ServerMessage, exclude_user: Option<&str>) -> Result<()> {
        let json = serde_json::to_string(message)?;
        for conn in self.connections.iter() {
            if let Some(ref conn_room_id) = conn.room_id {
                if conn_room_id == room_id {
                    if exclude_user.map_or(false, |exclude| conn.user_id == exclude) {
                        continue;
                    }
                    let _ = conn.sender.send(Message::Text(json.clone()));
                }
            }
        }
        Ok(())
    }

    async fn cleanup_user(&self, connection_id: &str) {
        if let Some((_, conn)) = self.connections.remove(connection_id) {
            // Handle screen sharing cleanup
            if let Some(room_id) = self.screen_sharing_manager.user_disconnected(&conn.user_id).await {
                let broadcast_message = ServerMessage::ScreenShareStopped {
                    user_id: conn.user_id.clone(),
                    room_id: room_id.clone(),
                    username: "Unknown".to_string(),
                    nationality: None,
                    timestamp: chrono::Utc::now().timestamp_millis(),
                };
                
                let _ = self.broadcast_to_room(&room_id, &broadcast_message, None).await;
                tracing::info!("🖥️ Cleaned up screen share for disconnected user: {}", conn.user_id);
            }

            if let Some(room_id) = conn.room_id {
                if let Some(room) = self.rooms.get(&room_id) {
                    if let Some(removed_user) = room.remove_user(&conn.user_id).await {
                        let response = ServerMessage::UserLeft {
                            user_id: removed_user.user_id.clone(),
                            username: removed_user.username.clone(),
                            nationality: removed_user.nationality.clone(),
                        };
                        
                        self.message_history.add_message(&room_id, response.clone()).await;
                        let _ = self.broadcast_to_room(&room_id, &response, None).await;
                    }
                }
            }
        }
    }
}

impl Clone for WebSocketServer {
    fn clone(&self) -> Self {
        Self {
            connections: self.connections.clone(),
            rooms: self.rooms.clone(),
            config: self.config.clone(),
            rate_limiter: self.rate_limiter.clone(),
            message_history: self.message_history.clone(),
            screen_sharing_manager: self.screen_sharing_manager.clone(),
        }
    }
}