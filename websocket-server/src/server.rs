// FIXED: src/server.rs  
use std::collections::HashMap;
use std::sync::Arc;
use crate::message::{ClientMessage, ServerMessage, Position}; // Removed unused imports
use crate::room::{Room, RoomUser}; // Import RoomUser instead of User
use crate::user::User;
use dashmap::DashMap;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::RwLock;
use tokio_tungstenite::{accept_async, tungstenite::Message, WebSocketStream};
use futures_util::{SinkExt, StreamExt};
use uuid::Uuid;

pub struct WebSocketServer {
    pub connections: Arc<DashMap<String, WebSocketConnection>>,
    pub rooms: Arc<DashMap<String, Arc<Room>>>, // Use Arc<Room> for shared ownership
}

#[derive(Debug)]
pub struct WebSocketConnection {
    pub user_id: String,
    pub room_id: Option<String>,
    pub sender: tokio::sync::mpsc::UnboundedSender<Message>,
}

impl WebSocketServer {
    pub fn new() -> Self {
        Self {
            connections: Arc::new(DashMap::new()),
            rooms: Arc::new(DashMap::new()),
        }
    }

    pub async fn start(&self, addr: &str) -> Result<(), Box<dyn std::error::Error>> {
        let listener = TcpListener::bind(addr).await?;
        println!("🚀 WebSocket server listening on {}", addr);

        while let Ok((stream, addr)) = listener.accept().await {
            println!("👋 New connection from {}", addr);
            let server = self.clone();
            tokio::spawn(async move {
                if let Err(e) = server.handle_connection(stream).await {
                    eprintln!("❌ Error handling connection: {}", e);
                }
            });
        }

        Ok(())
    }

    async fn handle_connection(&self, stream: TcpStream) -> Result<(), Box<dyn std::error::Error>> {
        let ws_stream = accept_async(stream).await?;
        let (mut ws_sender, mut ws_receiver) = ws_stream.split();
        
        let user_id = Uuid::new_v4().to_string();
        let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();

        let connection = WebSocketConnection {
            user_id: user_id.clone(),
            room_id: None,
            sender: tx,
        };

        self.connections.insert(user_id.clone(), connection);

        // Handle outgoing messages
        let connections_clone = self.connections.clone(); // Prefixed with underscore to avoid warning
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
                        eprintln!("❌ Error handling message: {}", e);
                    }
                }
                Ok(Message::Close(_)) => {
                    println!("👋 Connection closed for user {}", user_id);
                    break;
                }
                Err(e) => {
                    eprintln!("❌ WebSocket error: {}", e);
                    break;
                }
                _ => {}
            }
        }

        // Cleanup
        self.cleanup_user(&user_id).await;
        Ok(())
    }

    async fn handle_message(&self, user_id: &str, text: &str) -> Result<(), Box<dyn std::error::Error>> {
        let message: ClientMessage = serde_json::from_str(text)?;
        
        match message {
            ClientMessage::Auth { user_id: auth_user_id, room_id, username, timestamp: _ } => {
                // Update user ID if provided
                let final_user_id = auth_user_id.unwrap_or_else(|| user_id.to_string());
                
                // Create or get room
                let room = self.get_or_create_room(&room_id).await;
                
                // Create user
                let user = User {
                    id: final_user_id.clone(),
                    username: username.clone(),
                    position: Position { x: 0.0, y: 0.0, z: 0.0 },
                    room_id: Some(room_id.clone()),
                    connected_at: chrono::Utc::now(),
                };

                // Add user to room
                if room.add_user(user).await {
                    // Update connection
                    if let Some(mut conn) = self.connections.get_mut(user_id) {
                        conn.room_id = Some(room_id.clone());
                    }

                    // Send auth success
                    let response = ServerMessage::AuthSuccess {
                        room_id: room_id.clone(),
                        room_info: Some(room.to_room_info().await),
                    };
                    self.send_to_user(user_id, &response).await?;

                    // Notify others about new user
                    let user_joined = ServerMessage::UserJoined {
                        user_id: final_user_id.clone(),
                        username: username.clone(),
                        position: Position { x: 0.0, y: 0.0, z: 0.0 },
                    };
                    self.broadcast_to_room(&room_id, &user_joined, Some(user_id)).await?;

                } else {
                    let response = ServerMessage::AuthError {
                        error: "Room is full".to_string(),
                    };
                    self.send_to_user(user_id, &response).await?;
                }
            }

            ClientMessage::ChatMessage { message: msg, user_id: msg_user_id, room_id, timestamp: _ } => {
                if let Some(conn) = self.connections.get(user_id) {
                    if let Some(ref conn_room_id) = conn.room_id {
                        if conn_room_id == &room_id {
                            let response = ServerMessage::ChatMessage {
                                user_id: msg_user_id.unwrap_or_else(|| user_id.to_string()),
                                username: "User".to_string(), // You might want to get this from the room
                                message: msg,
                                timestamp: chrono::Utc::now().timestamp_millis(),
                            };
                            self.broadcast_to_room(&room_id, &response, None).await?;
                        }
                    }
                }
            }

            ClientMessage::PositionUpdate { user_id: pos_user_id, room_id, position, timestamp: _ } => {
                let final_user_id = pos_user_id.unwrap_or_else(|| user_id.to_string());
                
                if let Some(room) = self.rooms.get(&room_id) {
                    if room.update_user_position(&final_user_id, position.clone()).await {
                        let response = ServerMessage::UserPositionUpdate {
                            user_id: final_user_id,
                            position,
                        };
                        self.broadcast_to_room(&room_id, &response, Some(user_id)).await?;
                    }
                }
            }

            ClientMessage::Emotion { user_id: emotion_user_id, room_id, emotion, timestamp: _ } => {
                let final_user_id = emotion_user_id.unwrap_or_else(|| user_id.to_string());
                
                let response = ServerMessage::Emotion {
                    user_id: final_user_id,
                    username: "User".to_string(), // Get from room if available
                    emotion,
                };
                self.broadcast_to_room(&room_id, &response, Some(user_id)).await?;
            }

            ClientMessage::Interaction { user_id: int_user_id, room_id, target_user_id, interaction_type, data, timestamp: _ } => {
                let final_user_id = int_user_id.unwrap_or_else(|| user_id.to_string());
                
                let response = ServerMessage::Interaction {
                    user_id: final_user_id,
                    username: "User".to_string(),
                    target_user_id,
                    interaction_type,
                    data,
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
                    let response = ServerMessage::RoomState {
                        room_info: room.to_room_info().await,
                        users: room.get_all_users().await.into_iter().map(|u| UserInfo {
                            user_id: u.user_id,
                            username: u.username,
                            position: u.position,
                        }).collect(),
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

    async fn get_or_create_room(&self, room_id: &str) -> Arc<Room> {
        if let Some(room) = self.rooms.get(room_id) {
            room.value().clone() // FIXED: Use .value() to get the Arc<Room>
        } else {
            let room = Arc::new(Room::new(
                room_id.to_string(),
                format!("Room {}", room_id),
                10, // max users
            ));
            self.rooms.insert(room_id.to_string(), room.clone()); // FIXED: Insert the Arc<Room>
            room
        }
    }

    async fn send_to_user(&self, user_id: &str, message: &ServerMessage) -> Result<(), Box<dyn std::error::Error>> {
        if let Some(conn) = self.connections.get(user_id) {
            let json = serde_json::to_string(message)?;
            let _ = conn.sender.send(Message::Text(json));
        }
        Ok(())
    }

    async fn broadcast_to_room(&self, room_id: &str, message: &ServerMessage, exclude_user: Option<&str>) -> Result<(), Box<dyn std::error::Error>> {
        let json = serde_json::to_string(message)?;
        
        for conn in self.connections.iter() {
            if let Some(ref conn_room_id) = conn.room_id {
                if conn_room_id == room_id {
                    if let Some(exclude) = exclude_user {
                        if conn.user_id == exclude {
                            continue;
                        }
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
        }
    }
}