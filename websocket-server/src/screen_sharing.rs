// src/screen_sharing.rs - Screen sharing module for Euphorie WebSocket server
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;
use tokio::sync::RwLock;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use tracing::{info, warn};

// Screen sharing configuration
#[derive(Debug, Clone)]
pub struct ScreenSharingConfig {
    pub max_shares_per_room: usize,
    pub session_timeout: Duration,
    pub enable_recording: bool,
    pub max_viewers_per_share: usize,
}

impl Default for ScreenSharingConfig {
    fn default() -> Self {
        Self {
            max_shares_per_room: 1,
            session_timeout: Duration::from_secs(3600), // 1 hour
            enable_recording: false,
            max_viewers_per_share: 100,
        }
    }
}

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
    pub started_at: DateTime<Utc>,
    pub viewers: Vec<String>,
    pub session_id: String,
}

// Screen sharing manager
#[derive(Debug)]
pub struct ScreenSharingManager {
    config: ScreenSharingConfig,
    // room_id -> ActiveScreenShare
    active_shares: RwLock<HashMap<String, ActiveScreenShare>>,
    // user_id -> room_id (for cleanup)
    user_shares: RwLock<HashMap<String, String>>,
}

impl ScreenSharingManager {
    pub fn new(config: ScreenSharingConfig) -> Self {
        Self {
            config,
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
    ) -> Result<String, String> {
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
            // If same user, stop existing share first
            info!("User {} restarting screen share in room {}", username, room_id);
        }

        // Generate session ID
        let session_id = Uuid::new_v4().to_string();

        // Create new screen share
        let screen_share = ActiveScreenShare {
            user_id: user_id.clone(),
            username: username.clone(),
            room_id: room_id.clone(),
            nationality,
            share_data,
            started_at: Utc::now(),
            viewers: Vec::new(),
            session_id: session_id.clone(),
        };

        active_shares.insert(room_id.clone(), screen_share);
        user_shares.insert(user_id.clone(), room_id.clone());

        info!("Screen share started: user {} in room {} (session: {})", username, room_id, session_id);
        Ok(session_id)
    }

    pub async fn stop_screen_share(&self, user_id: &str) -> Option<ActiveScreenShare> {
        let mut active_shares = self.active_shares.write().await;
        let mut user_shares = self.user_shares.write().await;

        if let Some(room_id) = user_shares.remove(user_id) {
            if let Some(share) = active_shares.get(&room_id) {
                if share.user_id == user_id {
                    let stopped_share = active_shares.remove(&room_id);
                    if let Some(ref share) = stopped_share {
                        info!("Screen share stopped: user {} in room {} (session: {})", 
                              share.username, share.room_id, share.session_id);
                    }
                    return stopped_share;
                }
            }
        }

        None
    }

    pub async fn add_viewer(&self, room_id: &str, user_id: String) -> bool {
        let mut active_shares = self.active_shares.write().await;
        
        if let Some(share) = active_shares.get_mut(room_id) {
            if !share.viewers.contains(&user_id) && share.viewers.len() < self.config.max_viewers_per_share {
                share.viewers.push(user_id.clone());
                info!("Viewer {} added to screen share in room {} (total: {})", 
                      user_id, room_id, share.viewers.len());
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
                info!("Viewer {} removed from screen share in room {} (total: {})", 
                      user_id, room_id, share.viewers.len());
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

    pub async fn user_disconnected(&self, user_id: &str) -> Option<String> {
        // Stop sharing if user was sharing
        if let Some(share) = self.stop_screen_share(user_id).await {
            info!("User {} disconnected, stopped screen share in room {}", user_id, share.room_id);
            return Some(share.room_id);
        }

        // Remove user from all viewer lists
        let mut active_shares = self.active_shares.write().await;
        for share in active_shares.values_mut() {
            if let Some(pos) = share.viewers.iter().position(|id| id == user_id) {
                share.viewers.remove(pos);
                info!("User {} removed from viewers of screen share in room {}", user_id, share.room_id);
            }
        }

        None
    }

    pub async fn cleanup_expired_shares(&self) -> Vec<String> {
        let mut active_shares = self.active_shares.write().await;
        let mut user_shares = self.user_shares.write().await;
        let mut expired_rooms = Vec::new();

        let now = Utc::now();
        let mut to_remove = Vec::new();

        for (room_id, share) in active_shares.iter() {
            if now.signed_duration_since(share.started_at).to_std().unwrap_or(Duration::ZERO) > self.config.session_timeout {
                to_remove.push(room_id.clone());
                expired_rooms.push(room_id.clone());
                warn!("Screen share session expired in room {} (user: {})", room_id, share.username);
            }
        }

        for room_id in to_remove {
            if let Some(share) = active_shares.remove(&room_id) {
                user_shares.remove(&share.user_id);
            }
        }

        expired_rooms
    }

    pub async fn get_room_viewer_count(&self, room_id: &str) -> usize {
        let active_shares = self.active_shares.read().await;
        active_shares.get(room_id).map(|share| share.viewers.len()).unwrap_or(0)
    }

    pub async fn get_total_active_shares(&self) -> usize {
        let active_shares = self.active_shares.read().await;
        active_shares.len()
    }

    pub async fn get_stats(&self) -> ScreenSharingStats {
        let active_shares = self.active_shares.read().await;
        let total_shares = active_shares.len();
        let total_viewers: usize = active_shares.values().map(|share| share.viewers.len()).sum();
        let average_viewers = if total_shares > 0 { total_viewers as f64 / total_shares as f64 } else { 0.0 };

        ScreenSharingStats {
            total_active_shares: total_shares,
            total_viewers,
            average_viewers_per_share: average_viewers,
            max_shares_per_room: self.config.max_shares_per_room,
            session_timeout_seconds: self.config.session_timeout.as_secs(),
        }
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct ScreenSharingStats {
    pub total_active_shares: usize,
    pub total_viewers: usize,
    pub average_viewers_per_share: f64,
    pub max_shares_per_room: usize,
    pub session_timeout_seconds: u64,
}