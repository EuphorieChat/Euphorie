// backend/rust-websocket-server/src/handlers/screen_sharing.rs
// Screen sharing message handlers for Rust WebSocket server

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tokio::sync::RwLock;
use uuid::Uuid;

// Screen sharing message types
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ScreenShareMessage {
    #[serde(rename = "screen_share_started")]
    Started {
        user_id: String,
        room_id: String,
        username: String,
        nationality: Option<String>,
        share_data: ScreenShareData,
        timestamp: u64,
    },
    #[serde(rename = "screen_share_stopped")]
    Stopped {
        user_id: String,
        room_id: String,
        username: String,
        nationality: Option<String>,
        timestamp: u64,
    },
    #[serde(rename = "screen_share_webrtc_offer")]
    WebRTCOffer {
        user_id: String,
        room_id: String,
        target_user_id: String,
        data: serde_json::Value,
        timestamp: u64,
    },
    #[serde(rename = "screen_share_webrtc_answer")]
    WebRTCAnswer {
        user_id: String,
        room_id: String,
        target_user_id: String,
        data: serde_json::Value,
        timestamp: u64,
    },
    #[serde(rename = "screen_share_webrtc_candidate")]
    WebRTCCandidate {
        user_id: String,
        room_id: String,
        target_user_id: String,
        data: serde_json::Value,
        timestamp: u64,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenShareData {
    pub projection_mode: String,
    pub quality: String,
    pub session_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActiveScreenShare {
    pub user_id: String,
    pub username: String,
    pub room_id: String,
    pub nationality: Option<String>,
    pub share_data: ScreenShareData,
    pub started_at: u64,
    pub viewers: Vec<String>,
}

// Screen sharing state manager
#[derive(Debug, Default)]
pub struct ScreenSharingManager {
    // room_id -> ActiveScreenShare
    active_shares: RwLock<HashMap<String, ActiveScreenShare>>,
    // user_id -> room_id (for cleanup)
    user_shares: RwLock<HashMap<String, String>>,
}

impl ScreenSharingManager {
    pub fn new() -> Self {
        Self {
            active_shares: RwLock::new(HashMap::new()),
            user_shares: RwLock::new(HashMap::new()),
        }
    }

    pub async fn start_screen_share(
        &self,
        user_id: String,
        room_id: String,
        username: String,
        nationality: Option<String>,
        share_data: ScreenShareData,
    ) -> Result<(), String> {
        let mut active_shares = self.active_shares.write().await;
        let mut user_shares = self.user_shares.write().await;

        // Check if there's already an active share in this room
        if let Some(existing_share) = active_shares.get(&room_id) {
            if existing_share.user_id != user_id {
                return Err(format!(
                    "User {} is already sharing in room {}",
                    existing_share.username, room_id
                ));
            }
        }

        // Create new screen share
        let screen_share = ActiveScreenShare {
            user_id: user_id.clone(),
            username,
            room_id: room_id.clone(),
            nationality,
            share_data,
            started_at: chrono::Utc::now().timestamp_millis() as u64,
            viewers: Vec::new(),
        };

        active_shares.insert(room_id.clone(), screen_share);
        user_shares.insert(user_id, room_id);

        Ok(())
    }

    pub async fn stop_screen_share(&self, user_id: &str) -> Option<ActiveScreenShare> {
        let mut active_shares = self.active_shares.write().await;
        let mut user_shares = self.user_shares.write().await;

        if let Some(room_id) = user_shares.remove(user_id) {
            if let Some(share) = active_shares.get(&room_id) {
                if share.user_id == user_id {
                    return active_shares.remove(&room_id);
                }
            }
        }

        None
    }

    pub async fn add_viewer(&self, room_id: &str, user_id: String) -> bool {
        let mut active_shares = self.active_shares.write().await;
        
        if let Some(share) = active_shares.get_mut(room_id) {
            if !share.viewers.contains(&user_id) {
                share.viewers.push(user_id);
                return true;
            }
        }
        false
    }

    pub async fn remove_viewer(&self, room_id: &str, user_id: &str) -> bool {
        let mut active_shares = self.active_shares.write().await;
        
        if let Some(share) = active_shares.get_mut(room_id) {
            if let Some(pos) = share.viewers.iter().position(|id| id == user_id) {
                share.viewers.remove(pos);
                return true;
            }
        }
        false
    }

    pub async fn get_active_share(&self, room_id: &str) -> Option<ActiveScreenShare> {
        let active_shares = self.active_shares.read().await;
        active_shares.get(room_id).cloned()
    }

    pub async fn get_all_active_shares(&self) -> Vec<ActiveScreenShare> {
        let active_shares = self.active_shares.read().await;
        active_shares.values().cloned().collect()
    }

    pub async fn user_disconnected(&self, user_id: &str) {
        // Stop sharing if user was sharing
        if let Some(share) = self.stop_screen_share(user_id).await {
            println!("User {} disconnected, stopped screen share in room {}", user_id, share.room_id);
        }

        // Remove user from all viewer lists
        let mut active_shares = self.active_shares.write().await;
        for share in active_shares.values_mut() {
            if let Some(pos) = share.viewers.iter().position(|id| id == user_id) {
                share.viewers.remove(pos);
            }
        }
    }
}

// Handler implementation for your WebSocket server
// Add this to your existing WebSocket message handling logic

use crate::websocket::{WebSocketMessage, ConnectionManager};
use tokio::sync::Arc;

pub struct ScreenSharingHandler {
    manager: Arc<ScreenSharingManager>,
    connection_manager: Arc<ConnectionManager>,
}

impl ScreenSharingHandler {
    pub fn new(connection_manager: Arc<ConnectionManager>) -> Self {
        Self {
            manager: Arc::new(ScreenSharingManager::new()),
            connection_manager,
        }
    }

    pub async fn handle_message(&self, message: ScreenShareMessage, sender_id: &str) -> Result<(), String> {
        match message {
            ScreenShareMessage::Started {
                user_id,
                room_id,
                username,
                nationality,
                share_data,
                timestamp,
            } => {
                // Start screen share
                self.manager
                    .start_screen_share(
                        user_id.clone(),
                        room_id.clone(),
                        username.clone(),
                        nationality.clone(),
                        share_data.clone(),
                    )
                    .await?;

                // Broadcast to all users in the room
                let broadcast_message = ScreenShareMessage::Started {
                    user_id,
                    room_id: room_id.clone(),
                    username,
                    nationality,
                    share_data,
                    timestamp,
                };

                self.broadcast_to_room(&room_id, broadcast_message, Some(sender_id)).await;

                println!("Screen share started in room: {}", room_id);
            }

            ScreenShareMessage::Stopped {
                user_id,
                room_id,
                username,
                nationality,
                timestamp,
            } => {
                // Stop screen share
                if let Some(_stopped_share) = self.manager.stop_screen_share(&user_id).await {
                    // Broadcast to all users in the room
                    let broadcast_message = ScreenShareMessage::Stopped {
                        user_id,
                        room_id: room_id.clone(),
                        username,
                        nationality,
                        timestamp,
                    };

                    self.broadcast_to_room(&room_id, broadcast_message, Some(sender_id)).await;

                    println!("Screen share stopped in room: {}", room_id);
                }
            }

            ScreenShareMessage::WebRTCOffer {
                user_id,
                room_id,
                target_user_id,
                data,
                timestamp,
            } => {
                // Send WebRTC offer to target user
                let offer_message = ScreenShareMessage::WebRTCOffer {
                    user_id,
                    room_id,
                    target_user_id: target_user_id.clone(),
                    data,
                    timestamp,
                };

                self.send_to_user(&target_user_id, offer_message).await;
            }

            ScreenShareMessage::WebRTCAnswer {
                user_id,
                room_id,
                target_user_id,
                data,
                timestamp,
            } => {
                // Send WebRTC answer to target user
                let answer_message = ScreenShareMessage::WebRTCAnswer {
                    user_id,
                    room_id,
                    target_user_id: target_user_id.clone(),
                    data,
                    timestamp,
                };

                self.send_to_user(&target_user_id, answer_message).await;
            }

            ScreenShareMessage::WebRTCCandidate {
                user_id,
                room_id,
                target_user_id,
                data,
                timestamp,
            } => {
                // Send WebRTC candidate to target user
                let candidate_message = ScreenShareMessage::WebRTCCandidate {
                    user_id,
                    room_id,
                    target_user_id: target_user_id.clone(),
                    data,
                    timestamp,
                };

                self.send_to_user(&target_user_id, candidate_message).await;
            }
        }

        Ok(())
    }

    async fn broadcast_to_room(&self, room_id: &str, message: ScreenShareMessage, exclude_user: Option<&str>) {
        // Get all users in the room
        let room_users = self.connection_manager.get_room_users(room_id).await;

        for user_id in room_users {
            // Skip the sender if specified
            if let Some(exclude) = exclude_user {
                if user_id == exclude {
                    continue;
                }
            }

            // Send message to user
            self.send_to_user(&user_id, message.clone()).await;
        }
    }

    async fn send_to_user(&self, user_id: &str, message: ScreenShareMessage) {
        if let Ok(json_message) = serde_json::to_string(&message) {
            self.connection_manager
                .send_to_user(user_id, json_message)
                .await;
        }
    }

    pub async fn handle_user_disconnected(&self, user_id: &str) {
        self.manager.user_disconnected(user_id).await;
    }

    pub async fn get_room_screen_share(&self, room_id: &str) -> Option<ActiveScreenShare> {
        self.manager.get_active_share(room_id).await
    }

    pub async fn get_all_active_shares(&self) -> Vec<ActiveScreenShare> {
        self.manager.get_all_active_shares().await
    }
}

// Integration with your main WebSocket server
// Add this to your main WebSocket handling logic

/*
Example integration in your main WebSocket handler:

use crate::handlers::screen_sharing::{ScreenSharingHandler, ScreenShareMessage};

pub struct WebSocketServer {
    connection_manager: Arc<ConnectionManager>,
    screen_sharing_handler: ScreenSharingHandler,
}

impl WebSocketServer {
    pub fn new() -> Self {
        let connection_manager = Arc::new(ConnectionManager::new());
        let screen_sharing_handler = ScreenSharingHandler::new(connection_manager.clone());
        
        Self {
            connection_manager,
            screen_sharing_handler,
        }
    }

    pub async fn handle_message(&self, user_id: &str, message_text: &str) -> Result<(), String> {
        // Try to parse as screen sharing message first
        if let Ok(screen_share_msg) = serde_json::from_str::<ScreenShareMessage>(message_text) {
            return self.screen_sharing_handler.handle_message(screen_share_msg, user_id).await;
        }

        // Handle other message types...
        // ... your existing message handling logic
        
        Ok(())
    }

    pub async fn handle_user_disconnected(&self, user_id: &str) {
        self.screen_sharing_handler.handle_user_disconnected(user_id).await;
        // ... your existing disconnect handling logic
    }
}
*/

// Add this to your Cargo.toml dependencies:
/*
[dependencies]
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1.0", features = ["full"] }
uuid = { version = "1.0", features = ["v4"] }
chrono = { version = "0.4", features = ["serde"] }
*/