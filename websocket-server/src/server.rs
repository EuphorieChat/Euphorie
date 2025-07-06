use std::sync::Arc;

use crate::message::{ClientMessage, ServerMessage, Position, AvatarInfo, UserInfo};
use crate::room::Room;
use crate::user::User;

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
}

impl Config {
    pub fn address(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }
}

pub struct WebSocketServer {
    pub connections: Arc<DashMap<String, WebSocketConnection>>,
    pub rooms: Arc<DashMap<String, Arc<Room>>>,
    pub config: Config,
}

#[derive(Debug)]
pub struct WebSocketConnection {
    pub user_id: String,
    pub room_id: Option<String>,
    pub sender: tokio::sync::mpsc::UnboundedSender<Message>,
}

impl WebSocketServer {
    pub async fn new(config: Config) -> Result<Self> {
        Ok(Self {
            connections: Arc::new(DashMap::new()),
            rooms: Arc::new(DashMap::new()),
            config,
        })
    }

    pub async fn run(&self) -> Result<()> {
        let addr = self.config.address();
        let listener = TcpListener::bind(&addr).await?;
        tracing::info!("🚀 WebSocket server listening on {}", addr);

        while let Ok((stream, addr)) = listener.accept().await {
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
        
        let user_id = uuid::Uuid::new_v4().to_string();
        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();

        let connection = WebSocketConnection {
            user_id: user_id.clone(),
            room_id: None,
            sender: tx,
        };

        self.connections.insert(user_id.clone(), connection);

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
                    if let Err(e) = self.handle_message(&user_id, &text).await {
                        tracing::error!("❌ Error handling message: {}", e);
                    }
                }
                Ok(Message::Close(_)) => {
                    tracing::debug!("👋 Connection closed for user {}", user_id);
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
        self.cleanup_user(&user_id).await;
        Ok(())
    }

    async fn handle_message(&self, user_id: &str, text: &str) -> Result<()> {
        let message: ClientMessage = serde_json::from_str(text)?;
        
        match message {
            ClientMessage::Auth { user_id: auth_user_id, room_id, username, .. } => {
                let final_user_id = auth_user_id.unwrap_or_else(|| user_id.to_string());
                let final_username = username.unwrap_or_else(|| "Guest".to_string());

                let room = self.get_or_create_room(&room_id).await?;

                let user = User {
                    id: final_user_id.clone(),
                    username: final_username.clone(),
                    position: Position { x: 0.0, y: 0.0, z: 0.0 },
                    room_id: Some(room_id.clone()),
                    connected_at: chrono::Utc::now(),
                };

                if room.add_user(user).await {
                    if let Some(mut conn) = self.connections.get_mut(user_id) {
                        conn.room_id = Some(room_id.clone());
                    }

                    let response = ServerMessage::AuthSuccess {
                        user_id: final_user_id.clone(),
                        room_id: room_id.clone(),
                        room_info: room.to_room_info().await,
                    };
                    self.send_to_user(user_id, &response).await?;

                    let user_joined = ServerMessage::UserJoined {
                        user_id: final_user_id,
                        username: final_username,
                        avatar: Some(AvatarInfo::default()),
                    };
                    self.broadcast_to_room(&room_id, &user_joined, Some(user_id)).await?;
                } else {
                    let response = ServerMessage::AuthError {
                        error: "Room is full".to_string(),
                    };
                    self.send_to_user(user_id, &response).await?;
                }
            }

            ClientMessage::ChatMessage { message: msg, user_id: msg_user_id, room_id, .. } => {
                if let Some(conn) = self.connections.get(user_id) {
                    if let Some(ref conn_room_id) = conn.room_id {
                        if conn_room_id == &room_id {
                            let final_user_id = msg_user_id.unwrap_or_else(|| user_id.to_string());
                            let response = ServerMessage::ChatMessage {
                                user_id: final_user_id,
                                username: "User".to_string(),
                                message: msg,
                                timestamp: chrono::Utc::now().timestamp_millis(),
                            };
                            self.broadcast_to_room(&room_id, &response, None).await?;
                        }
                    }
                }
            }

            ClientMessage::PositionUpdate { user_id: pos_user_id, room_id, position, .. } => {
                let final_user_id = pos_user_id.unwrap_or_else(|| user_id.to_string());
                if let Some(room) = self.rooms.get(&room_id) {
                    if room.update_user_position(&final_user_id, position.clone()).await {
                        let response = ServerMessage::UserPositionUpdate {
                            user_id: final_user_id,
                            position,
                            timestamp: chrono::Utc::now().timestamp_millis(),
                        };
                        self.broadcast_to_room(&room_id, &response, Some(user_id)).await?;
                    }
                }
            }

            ClientMessage::Emotion { user_id: emotion_user_id, room_id, emotion, .. } => {
                let final_user_id = emotion_user_id.unwrap_or_else(|| user_id.to_string());
                let response = ServerMessage::Emotion {
                    user_id: final_user_id,
                    username: "User".to_string(),
                    emotion,
                    timestamp: chrono::Utc::now().timestamp_millis(),
                };
                self.broadcast_to_room(&room_id, &response, Some(user_id)).await?;
            }

            ClientMessage::Interaction { user_id: int_user_id, room_id, target_user_id, interaction_type, data, .. } => {
                let final_user_id = int_user_id.unwrap_or_else(|| user_id.to_string());
                let response = ServerMessage::Interaction {
                    user_id: final_user_id,
                    username: "User".to_string(),
                    target_user_id,
                    interaction_type,
                    data,
                    timestamp: chrono::Utc::now().timestamp_millis(),
                };
                self.broadcast_to_room(&room_id, &response, Some(user_id)).await?;
            }

            ClientMessage::Typing { user_id: typing_user_id, room_id, is_typing } => {
                let final_user_id = typing_user_id.unwrap_or_else(|| user_id.to_string());
                let response = ServerMessage::Typing {
                    user_id: final_user_id,
                    username: "User".to_string(),
                    is_typing,
                };
                self.broadcast_to_room(&room_id, &response, Some(user_id)).await?;
            }

            ClientMessage::GetRoomState { room_id } => {
                if let Some(room) = self.rooms.get(&room_id) {
                    let users: Vec<UserInfo> = room.get_all_users().await.into_iter().map(|u| UserInfo {
                        user_id: u.user_id,
                        username: u.username,
                        position: Some(u.position),
                        avatar: Some(AvatarInfo::default()),
                        is_typing: false,
                        last_seen: chrono::Utc::now().timestamp_millis(),
                    }).collect();

                    let response = ServerMessage::RoomState {
                        room_id,
                        users,
                    };
                    self.send_to_user(user_id, &response).await?;
                }
            }

            ClientMessage::Ping { timestamp } => {
                let response = ServerMessage::Pong { timestamp };
                self.send_to_user(user_id, &response).await?;
            }
        }

        Ok(())
    }

    async fn get_or_create_room(&self, room_id: &str) -> Result<Arc<Room>> {
        if let Some(room) = self.rooms.get(room_id) {
            Ok(room.value().clone())
        } else {
            // Check room limits
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

    async fn send_to_user(&self, user_id: &str, message: &ServerMessage) -> Result<()> {
        if let Some(conn) = self.connections.get(user_id) {
            let json = serde_json::to_string(message)?;
            let _ = conn.sender.send(Message::Text(json));
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

    async fn cleanup_user(&self, user_id: &str) {
        if let Some((_, conn)) = self.connections.remove(user_id) {
            if let Some(room_id) = conn.room_id {
                if let Some(room) = self.rooms.get(&room_id) {
                    if let Some(removed_user) = room.remove_user(user_id).await {
                        let response = ServerMessage::UserLeft {
                            user_id: removed_user.user_id.clone(),
                            username: removed_user.username.clone(),
                        };
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
        }
    }
}