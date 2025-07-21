// src/screen_sharing.rs - Enhanced Screen sharing module with late joiner support
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;
use tokio::sync::RwLock;
use uuid::Uuid;
use chrono::{DateTime, Utc};
use tracing::{info, warn};
use crate::message::{ServerMessage, OngoingScreenShareInfo};

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

        info!("🖥️ Screen share started: user {} in room {} (session: {})", username, room_id, session_id);
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
                        info!("🖥️ Screen share stopped: user {} in room {} (session: {})", 
                              share.username, share.room_id, share.session_id);
                    }
                    return stopped_share;
                }
            }
        }

        None
    }

    // Handle WebRTC offer relay
    pub async fn handle_webrtc_offer(
        &self,
        user_id: &str,
        room_id: &str,
        target_user_id: &str,
        offer_data: serde_json::Value,
        timestamp: i64,
    ) -> Result<ServerMessage, String> {
        // Verify there's an active screen share in this room
        let active_shares = self.active_shares.read().await;
        if let Some(share) = active_shares.get(room_id) {
            if share.user_id == user_id {
                info!("🔄 Relaying WebRTC offer from {} to {} in room {}", user_id, target_user_id, room_id);
                
                Ok(ServerMessage::ScreenShareWebRTCOffer {
                    user_id: user_id.to_string(),
                    room_id: room_id.to_string(),
                    target_user_id: target_user_id.to_string(),
                    data: offer_data,
                    timestamp,
                })
            } else {
                Err(format!("User {} is not the active screen sharer in room {}", user_id, room_id))
            }
        } else {
            Err(format!("No active screen share in room {}", room_id))
        }
    }

    // Handle WebRTC answer relay
    pub async fn handle_webrtc_answer(
        &self,
        user_id: &str,
        room_id: &str,
        target_user_id: &str,
        answer_data: serde_json::Value,
        timestamp: i64,
    ) -> Result<ServerMessage, String> {
        // Verify there's an active screen share in this room
        let active_shares = self.active_shares.read().await;
        if active_shares.contains_key(room_id) {
            info!("🔄 Relaying WebRTC answer from {} to {} in room {}", user_id, target_user_id, room_id);
            
            Ok(ServerMessage::ScreenShareWebRTCAnswer {
                user_id: user_id.to_string(),
                room_id: room_id.to_string(),
                target_user_id: target_user_id.to_string(),
                data: answer_data,
                timestamp,
            })
        } else {
            Err(format!("No active screen share in room {}", room_id))
        }
    }

    // Handle WebRTC ICE candidate relay
    pub async fn handle_webrtc_candidate(
        &self,
        user_id: &str,
        room_id: &str,
        target_user_id: &str,
        candidate_data: serde_json::Value,
        timestamp: i64,
    ) -> Result<ServerMessage, String> {
        // Verify there's an active screen share in this room
        let active_shares = self.active_shares.read().await;
        if active_shares.contains_key(room_id) {
            info!("🔄 Relaying WebRTC ICE candidate from {} to {} in room {}", user_id, target_user_id, room_id);
            
            Ok(ServerMessage::ScreenShareWebRTCCandidate {
                user_id: user_id.to_string(),
                room_id: room_id.to_string(),
                target_user_id: target_user_id.to_string(),
                data: candidate_data,
                timestamp,
            })
        } else {
            Err(format!("No active screen share in room {}", room_id))
        }
    }

    // Handle WebRTC ready broadcast
    pub async fn handle_webrtc_ready(
        &self,
        user_id: &str,
        room_id: &str,
        username: &str,
        share_data: ScreenShareData,
        timestamp: i64,
    ) -> Result<ServerMessage, String> {
        // Verify there's an active screen share in this room
        let active_shares = self.active_shares.read().await;
        if let Some(share) = active_shares.get(room_id) {
            if share.user_id == user_id {
                info!("📡 Broadcasting WebRTC ready from {} in room {}", username, room_id);
                
                Ok(ServerMessage::ScreenShareWebRTCReady {
                    user_id: user_id.to_string(),
                    room_id: room_id.to_string(),
                    username: username.to_string(),
                    share_data: crate::message::ScreenShareData {
                        projection_mode: share_data.projection_mode,
                        quality: share_data.quality,
                        share_type: Some("screen".to_string()),
                        session_id: share_data.session_id,
                    },
                    timestamp,
                })
            } else {
                Err(format!("User {} is not the active screen sharer in room {}", user_id, room_id))
            }
        } else {
            Err(format!("No active screen share in room {}", room_id))
        }
    }

    // NEW: Handle late joiner requesting to join ongoing share
    pub async fn handle_join_request(
        &self,
        viewer_user_id: &str,
        room_id: &str,
        target_user_id: &str,
    ) -> Result<ServerMessage, String> {
        let active_shares = self.active_shares.read().await;
        
        if let Some(share) = active_shares.get(room_id) {
            if share.user_id == target_user_id {
                info!("👁️ New viewer {} requesting to join share from {} in room {}", 
                      viewer_user_id, target_user_id, room_id);
                
                // Notify the sharer about the new viewer
                Ok(ServerMessage::NewViewerJoined {
                    viewer_user_id: viewer_user_id.to_string(),
                    viewer_username: "New Viewer".to_string(), // Could be enhanced to get actual username
                    room_id: room_id.to_string(),
                    sharer_user_id: target_user_id.to_string(),
                    timestamp: chrono::Utc::now().timestamp_millis(),
                })
            } else {
                Err(format!("User {} is not sharing in room {}", target_user_id, room_id))
            }
        } else {
            Err(format!("No active screen share in room {}", room_id))
        }
    }

    // NEW: Handle viewer requesting offer from sharer
    pub async fn handle_offer_request(
        &self,
        viewer_user_id: &str,
        room_id: &str,
        target_user_id: &str,
    ) -> Result<ServerMessage, String> {
        let active_shares = self.active_shares.read().await;
        
        if let Some(share) = active_shares.get(room_id) {
            if share.user_id == target_user_id {
                info!("📤 Viewer {} requesting offer from sharer {} in room {}", 
                      viewer_user_id, target_user_id, room_id);
                
                Ok(ServerMessage::ViewerRequestsOffer {
                    viewer_user_id: viewer_user_id.to_string(),
                    viewer_username: "Viewer".to_string(), // Could be enhanced
                    room_id: room_id.to_string(),
                    timestamp: chrono::Utc::now().timestamp_millis(),
                })
            } else {
                Err(format!("User {} is not sharing in room {}", target_user_id, room_id))
            }
        } else {
            Err(format!("No active screen share in room {}", room_id))
        }
    }

    pub async fn add_viewer(&self, room_id: &str, user_id: String) -> bool {
        let mut active_shares = self.active_shares.write().await;
        
        if let Some(share) = active_shares.get_mut(room_id) {
            if !share.viewers.contains(&user_id) && share.viewers.len() < self.config.max_viewers_per_share {
                share.viewers.push(user_id.clone());
                info!("👁️ Viewer {} added to screen share in room {} (total: {})", 
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
                info!("👁️ Viewer {} removed from screen share in room {} (total: {})", 
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

    // NEW: Get ongoing screen share info for room state
    pub async fn get_ongoing_share_info(&self, room_id: &str) -> Option<OngoingScreenShareInfo> {
        let active_shares = self.active_shares.read().await;
        
        if let Some(share) = active_shares.get(room_id) {
            Some(OngoingScreenShareInfo {
                user_id: share.user_id.clone(),
                username: share.username.clone(),
                nationality: share.nationality.clone(),
                share_data: crate::message::ScreenShareData {
                    projection_mode: share.share_data.projection_mode.clone(),
                    quality: share.share_data.quality.clone(),
                    share_type: Some("screen".to_string()),
                    session_id: Some(share.session_id.clone()),
                },
                started_at: share.started_at.timestamp_millis(),
                viewer_count: share.viewers.len(),
            })
        } else {
            None
        }
    }

    pub async fn get_all_active_shares(&self) -> Vec<ActiveScreenShare> {
        let active_shares = self.active_shares.read().await;
        active_shares.values().cloned().collect()
    }

    pub async fn user_disconnected(&self, user_id: &str) -> Option<String> {
        // Stop sharing if user was sharing
        if let Some(share) = self.stop_screen_share(user_id).await {
            info!("🔌 User {} disconnected, stopped screen share in room {}", user_id, share.room_id);
            return Some(share.room_id);
        }

        // Remove user from all viewer lists
        let mut active_shares = self.active_shares.write().await;
        for share in active_shares.values_mut() {
            if let Some(pos) = share.viewers.iter().position(|id| id == user_id) {
                share.viewers.remove(pos);
                info!("🔌 User {} removed from viewers of screen share in room {}", user_id, share.room_id);
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
                warn!("⏰ Screen share session expired in room {} (user: {})", room_id, share.username);
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