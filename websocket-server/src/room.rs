// src/room.rs - Room management for multi-user support
use crate::message::{RoomInfo, UserInfo, Position};
use crate::user::User;
use dashmap::DashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{debug, info};
use uuid::Uuid;

#[derive(Debug)]
pub struct Room {
    pub room_id: String,
    pub name: String,
    pub max_users: usize,
    pub scene_preset: String,
    users: Arc<DashMap<String, User>>, // user_id -> User
    created_at: u64,
}

impl Room {
    pub fn new(room_id: String) -> Self {
        Self {
            name: format!("Room {}", room_id),
            room_id,
            max_users: 100,
            scene_preset: "modern_office".to_string(),
            users: Arc::new(DashMap::new()),
            created_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        }
    }
    
    pub async fn add_user(&self, user: User) -> bool {
        if self.users.len() >= self.max_users {
            return false;
        }
        
        let user_id = user.user_id.clone();
        let username = user.username.clone();
        
        self.users.insert(user_id.clone(), user);
        info!("👤 User {} ({}) joined room {}", username, user_id, self.room_id);
        
        true
    }
    
    pub async fn remove_user(&self, user_id: &str) -> Option<User> {
        if let Some((_, user)) = self.users.remove(user_id) {
            info!("👤 User {} ({}) left room {}", user.username, user.user_id, self.room_id);
            Some(user)
        } else {
            None
        }
    }
    
    pub async fn get_user(&self, user_id: &str) -> Option<User> {
        self.users.get(user_id).map(|u| u.clone())
    }
    
    pub async fn get_users(&self) -> Vec<User> {
        self.users.iter().map(|entry| entry.value().clone()).collect()
    }
    
    pub async fn update_user_position(&self, user_id: &str, position: Position) {
        if let Some(mut user) = self.users.get_mut(user_id) {
            user.position = position;
            debug!("📍 Updated position for user {} in room {}", user_id, self.room_id);
        }
    }
    
    pub async fn update_user_typing(&self, user_id: &str, is_typing: bool) {
        if let Some(mut user) = self.users.get_mut(user_id) {
            user.is_typing = is_typing;
            debug!("⌨️ Updated typing status for user {} in room {}: {}", user_id, self.room_id, is_typing);
        }
    }
    
    pub async fn get_room_info(&self) -> RoomInfo {
        let users: Vec<UserInfo> = self.users
            .iter()
            .map(|entry| entry.value().clone().into())
            .collect();
        
        RoomInfo {
            room_id: self.room_id.clone(),
            name: self.name.clone(),
            user_count: users.len(),
            max_users: self.max_users,
            scene_preset: self.scene_preset.clone(),
            active_users: users,
        }
    }
    
    pub async fn is_empty(&self) -> bool {
        self.users.is_empty()
    }
    
    pub async fn user_count(&self) -> usize {
        self.users.len()
    }
}

// src/user.rs - User representation
use crate::message::{UserInfo, Position, AvatarInfo};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub user_id: String,
    pub username: String,
    pub connection_id: Uuid,
    pub position: Position,
    pub is_typing: bool,
    pub joined_at: u64,
}

impl User {
    pub fn new(user_id: String, username: String, connection_id: Uuid) -> Self {
        Self {
            user_id,
            username,
            connection_id,
            position: Position { x: 0.0, y: 0.0, z: 0.0 },
            is_typing: false,
            joined_at: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        }
    }
}

impl Into<UserInfo> for User {
    fn into(self) -> UserInfo {
        UserInfo {
            user_id: self.user_id,
            username: self.username,
            avatar: None, // Can be expanded later
            position: Some(self.position),
            is_typing: self.is_typing,
            last_seen: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        }
    }
}