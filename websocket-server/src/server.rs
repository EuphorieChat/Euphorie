// src/server.rs - FIXED for Multi-User Support
use crate::config::Config;
use crate::message::{ClientMessage, ServerMessage, UserInfo, RoomInfo, Position};
use crate::room::Room;
use crate::user::User;
use anyhow::Result;
use dashmap::DashMap;
use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::mpsc;
use tokio_tungstenite::{accept_async, tungstenite::Message, WebSocketStream};
use tracing::{debug, error, info, warn};
use uuid::Uuid;

type WsStream = WebSocketStream<TcpStream>;
type WsSender = futures_util::stream::SplitSink<WsStream, Message>;

#[derive(Debug)]
pub struct WebSocketServer {
    config: Config,
    rooms: Arc<DashMap<String, Room>>,
    connections: Arc<DashMap<Uuid, ConnectionInfo>>,
    user_to_connection: Arc<DashMap<String, Uuid>>,
}

#[derive(Debug, Clone)]
struct ConnectionInfo {
    user_id: Option<String>,
    room_id: Option<String>,
    sender: mpsc::UnboundedSender<Message>,
    addr: String,
}

impl WebSocketServer {
    pub async fn new(config: Config) -> Result<Self> {
        Ok(Self {
            config,
            rooms: Arc::new(DashMap::new()),
            connections: Arc::new(DashMap::new()),
            user_to_connection: Arc::new(DashMap::new()),
        })
    }
    
    pub async fn run(self) -> Result<()> {
        let addr = format!("{}:{}", self.config.host, self.config.port);
        let listener = TcpListener::bind(&addr).await?;
        
        info!("🚀 Euphorie WebSocket Server listening on {}", addr);
        
        loop {
            match listener.accept().await {
                Ok((stream, addr)) => {
                    let server = self.clone();
                    tokio::spawn(async move {
                        if let Err(e) = server.handle_connection(stream, addr).await {
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
        &self,
        stream: TcpStream,
        addr: std::net::SocketAddr,
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
        let (ws_sender, mut ws_receiver) = ws_stream.split();
        
        // Create message channel for this connection
        let (tx, mut rx) = mpsc::unbounded_channel();
        
        // Store connection info
        let connection_info = ConnectionInfo {
            user_id: None,
            room_id: None,
            sender: tx.clone(),
            addr: addr.to_string(),
        };
        
        self.connections.insert(connection_id, connection_info);
        
        info!("🔌 WebSocket connection established: {} from {}", connection_id, addr);
        
        // Clone for tasks
        let server_clone = self.clone();
        let connections_clone = self.connections.clone();
        
        // Spawn sender task
        let sender_task = {
            let mut ws_sender = ws_sender;
            tokio::spawn(async move {
                while let Some(message) = rx.recv().await {
                    if let Err(e) = ws_sender.send(message).await {
                        warn!("Failed to send message to {}: {}", connection_id, e);
                        break;
                    }
                }
                debug!("Sender task ended for {}", connection_id);
            })
        };
        
        // Send welcome message
        let welcome = ServerMessage::System {
            message: "Welcome to Euphorie WebSocket Server! 🚀".to_string(),
            level: "info".to_string(),
        };
        
        if let Ok(json) = serde_json::to_string(&welcome) {
            let _ = tx.send(Message::Text(json));
        }
        
        // Handle incoming messages
        while let Some(msg) = ws_receiver.next().await {
            match msg {
                Ok(Message::Text(text)) => {
                    debug!("📨 Received text from {}: {}", connection_id, text);
                    
                    match serde_json::from_str::<ClientMessage>(&text) {
                        Ok(client_message) => {
                            server_clone.handle_client_message(client_message, &connection_id).await;
                        }
                        Err(e) => {
                            warn!("Invalid message format from {}: {}, error: {}", connection_id, text, e);
                            let error_response = ServerMessage::Error {
                                error: "Invalid message format".to_string(),
                                code: Some(400),
                            };
                            
                            if let Ok(json) = serde_json::to_string(&error_response) {
                                let _ = tx.send(Message::Text(json));
                            }
                        }
                    }
                }
                Ok(Message::Binary(data)) => {
                    debug!("📨 Received binary data from {}: {} bytes", connection_id, data.len());
                }
                Ok(Message::Close(close_frame)) => {
                    info!("🔌 WebSocket close frame from {}: {:?}", connection_id, close_frame);
                    break;
                }
                Ok(Message::Ping(data)) => {
                    debug!("🏓 Ping from {}", connection_id);
                    let _ = tx.send(Message::Pong(data));
                }
                Ok(Message::Pong(_)) => {
                    debug!("🏓 Pong from {}", connection_id);
                }
                _ => {}
            }
        }
        
        // Cleanup
        self.cleanup_connection(&connection_id).await;
        sender_task.abort();
        
        info!("🔌 WebSocket connection cleanup completed: {}", connection_id);
        Ok(())
    }
    
    async fn handle_client_message(&self, message: ClientMessage, connection_id: &Uuid) {
        match message {
            ClientMessage::Auth { user_id, room_id, username, .. } => {
                info!("🔐 Authentication from {}: user {} joining room {}", connection_id, user_id, room_id);
                
                // Update connection info
                if let Some(mut conn_info) = self.connections.get_mut(connection_id) {
                    conn_info.user_id = Some(user_id.clone());
                    conn_info.room_id = Some(room_id.clone());
                }
                
                // Map user to connection
                self.user_to_connection.insert(user_id.clone(), *connection_id);
                
                // Get or create room
                let room = self.get_or_create_room(&room_id);
                
                // Create user
                let user = User {
                    user_id: user_id.clone(),
                    username: username.unwrap_or_else(|| user_id.clone()),
                    connection_id: *connection_id,
                    position: Position { x: 0.0, y: 0.0, z: 0.0 },
                    is_typing: false,
                    joined_at: std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_secs(),
                };
                
                // Add user to room
                room.add_user(user.clone()).await;
                
                // Send auth success with current room state
                let room_info = room.get_room_info().await;
                let auth_success = ServerMessage::AuthSuccess {
                    user_id: user_id.clone(),
                    room_id: room_id.clone(),
                    room_info,
                };
                
                self.send_to_connection(connection_id, &auth_success).await;
                
                // Send current room state to new user
                let users = room.get_users().await;
                let room_state = ServerMessage::RoomState {
                    room_id: room_id.clone(),
                    users: users.into_iter().map(|u| u.into()).collect(),
                };
                
                self.send_to_connection(connection_id, &room_state).await;
                
                // Notify other users in room
                let user_joined = ServerMessage::UserJoined {
                    user_id: user.user_id.clone(),
                    username: user.username.clone(),
                    avatar: None,
                };
                
                self.broadcast_to_room(&room_id, &user_joined, Some(&user_id)).await;
            }
            
            ClientMessage::ChatMessage { message, user_id, room_id, .. } => {
                info!("💬 Chat from {}: {}: {}", connection_id, user_id, message);
                
                let username = self.get_username_for_user(&user_id).await;
                let chat_message = ServerMessage::ChatMessage {
                    user_id: user_id.clone(),
                    username,
                    message,
                    timestamp: std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_millis() as u64,
                };
                
                // Broadcast to all users in room (including sender)
                self.broadcast_to_room(&room_id, &chat_message, None).await;
            }
            
            ClientMessage::AvatarUpdate { user_id, room_id, position, rotation, animation, .. } => {
                debug!("🎮 Avatar update from {}: {}", connection_id, user_id);
                
                // Update user position in room
                if let Some(room) = self.rooms.get(&room_id) {
                    room.update_user_position(&user_id, position.clone()).await;
                }
                
                let avatar_update = ServerMessage::UserPositionUpdate {
                    user_id: user_id.clone(),
                    position,
                    timestamp: std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_millis() as u64,
                };
                
                // Broadcast to other users in room (exclude sender)
                self.broadcast_to_room(&room_id, &avatar_update, Some(&user_id)).await;
            }
            
            ClientMessage::Interaction { user_id, room_id, target_user_id, interaction_type, data, .. } => {
                info!("🤝 Interaction from {}: {}: {}", connection_id, user_id, interaction_type);
                
                let username = self.get_username_for_user(&user_id).await;
                let interaction = ServerMessage::Interaction {
                    user_id: user_id.clone(),
                    username,
                    target_user_id,
                    interaction_type,
                    data,
                    timestamp: std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_millis() as u64,
                };
                
                // Broadcast to all users in room
                self.broadcast_to_room(&room_id, &interaction, None).await;
            }
            
            ClientMessage::Emotion { user_id, room_id, emotion, .. } => {
                info!("🎭 Emotion from {}: {}: {}", connection_id, user_id, emotion);
                
                let username = self.get_username_for_user(&user_id).await;
                let emotion_msg = ServerMessage::Emotion {
                    user_id: user_id.clone(),
                    username,
                    emotion,
                    timestamp: std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap()
                        .as_millis() as u64,
                };
                
                // Broadcast to all users in room
                self.broadcast_to_room(&room_id, &emotion_msg, None).await;
            }
            
            ClientMessage::Typing { user_id, room_id, is_typing, .. } => {
                debug!("⌨️ Typing from {}: {}: {}", connection_id, user_id, is_typing);
                
                // Update typing status in room
                if let Some(room) = self.rooms.get(&room_id) {
                    room.update_user_typing(&user_id, is_typing).await;
                }
                
                let username = self.get_username_for_user(&user_id).await;
                let typing_msg = ServerMessage::Typing {
                    user_id: user_id.clone(),
                    username,
                    is_typing,
                };
                
                // Broadcast to other users in room (exclude sender)
                self.broadcast_to_room(&room_id, &typing_msg, Some(&user_id)).await;
            }
            
            ClientMessage::Ping { timestamp } => {
                debug!("🏓 Ping from {}", connection_id);
                let pong = ServerMessage::Pong { timestamp };
                self.send_to_connection(connection_id, &pong).await;
            }
        }
    }
    
    fn get_or_create_room(&self, room_id: &str) -> Arc<Room> {
        if let Some(room) = self.rooms.get(room_id) {
            room.clone()
        } else {
            let room = Arc::new(Room::new(room_id.to_string()));
            self.rooms.insert(room_id.to_string(), room.clone());
            info!("🏠 Created new room: {}", room_id);
            room
        }
    }
    
    async fn get_username_for_user(&self, user_id: &str) -> String {
        // Try to find username from active connections
        for conn in self.connections.iter() {
            if let Some(ref uid) = conn.user_id {
                if uid == user_id {
                    // Find user in rooms to get username
                    for room in self.rooms.iter() {
                        if let Some(user) = room.get_user(user_id).await {
                            return user.username;
                        }
                    }
                }
            }
        }
        user_id.to_string() // Fallback to user_id
    }
    
    async fn send_to_connection(&self, connection_id: &Uuid, message: &ServerMessage) {
        if let Some(conn_info) = self.connections.get(connection_id) {
            if let Ok(json) = serde_json::to_string(message) {
                let _ = conn_info.sender.send(Message::Text(json));
            }
        }
    }
    
    async fn send_to_user(&self, user_id: &str, message: &ServerMessage) {
        if let Some(connection_id) = self.user_to_connection.get(user_id) {
            self.send_to_connection(&connection_id, message).await;
        }
    }
    
    async fn broadcast_to_room(&self, room_id: &str, message: &ServerMessage, exclude_user: Option<&str>) {
        if let Some(room) = self.rooms.get(room_id) {
            let users = room.get_users().await;
            
            for user in users {
                if let Some(exclude) = exclude_user {
                    if user.user_id == exclude {
                        continue;
                    }
                }
                
                self.send_to_user(&user.user_id, message).await;
            }
        }
    }
    
    async fn cleanup_connection(&self, connection_id: &Uuid) {
        // Get connection info before removing
        let conn_info = self.connections.remove(connection_id);
        
        if let Some((_, conn_info)) = conn_info {
            if let (Some(user_id), Some(room_id)) = (conn_info.user_id, conn_info.room_id) {
                // Remove user from room
                if let Some(room) = self.rooms.get(&room_id) {
                    if let Some(user) = room.remove_user(&user_id).await {
                        // Notify other users
                        let user_left = ServerMessage::UserLeft {
                            user_id: user.user_id.clone(),
                            username: user.username.clone(),
                        };
                        
                        self.broadcast_to_room(&room_id, &user_left, Some(&user_id)).await;
                        
                        // Remove empty rooms
                        if room.is_empty().await {
                            self.rooms.remove(&room_id);
                            info!("🗑️ Removed empty room: {}", room_id);
                        }
                    }
                }
                
                // Remove user mapping
                self.user_to_connection.remove(&user_id);
            }
        }
    }
}

// Clone implementation for shared server state
impl Clone for WebSocketServer {
    fn clone(&self) -> Self {
        Self {
            config: self.config.clone(),
            rooms: self.rooms.clone(),
            connections: self.connections.clone(),
            user_to_connection: self.user_to_connection.clone(),
        }
    }
}