// FINAL FIXED: src/room.rs - All field errors resolved
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use crate::message::{RoomInfo, UserInfo, Position, AvatarInfo};

#[derive(Debug, Clone)]
pub struct Room {
    pub id: String,
    pub name: String,
    pub users: Arc<RwLock<HashMap<String, RoomUser>>>,
    pub max_users: usize,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone)]
pub struct RoomUser {
    pub user_id: String,
    pub username: String,
    pub position: Position,
    pub joined_at: chrono::DateTime<chrono::Utc>,
}

impl Room {
    pub fn new(id: String, name: String, max_users: usize) -> Self {
        Self {
            id,
            name,
            users: Arc::new(RwLock::new(HashMap::new())),
            max_users,
            created_at: chrono::Utc::now(),
        }
    }

    pub async fn add_user(&self, user: crate::user::User) -> bool {
        let mut users = self.users.write().await;
        
        if users.len() >= self.max_users {
            return false;
        }

        let room_user = RoomUser {
            user_id: user.id.clone(),
            username: user.username.clone(),
            position: user.position.clone(),
            joined_at: chrono::Utc::now(),
        };

        users.insert(user.id, room_user);
        true
    }

    pub async fn remove_user(&self, user_id: &str) -> Option<RoomUser> {
        let mut users = self.users.write().await;
        users.remove(user_id)
    }

    pub async fn get_user(&self, user_id: &str) -> Option<RoomUser> {
        let users = self.users.read().await;
        users.get(user_id).cloned()
    }

    pub async fn update_user_position(&self, user_id: &str, position: Position) -> bool {
        let mut users = self.users.write().await;
        if let Some(user) = users.get_mut(user_id) {
            user.position = position;
            true
        } else {
            false
        }
    }

    pub async fn get_all_users(&self) -> Vec<RoomUser> {
        let users = self.users.read().await;
        users.values().cloned().collect()
    }

    pub async fn get_user_count(&self) -> usize {
        let users = self.users.read().await;
        users.len()
    }

    pub async fn to_room_info(&self) -> RoomInfo {
        let user_count = self.get_user_count().await;
        // FIXED: Create UserInfo with all required fields
        let active_users: Vec<UserInfo> = self.get_all_users().await
            .into_iter()
            .map(|user| UserInfo {
                user_id: user.user_id,
                username: user.username,
                position: Some(user.position), // FIXED: Wrapped in Some()
                avatar: Some(AvatarInfo::default()), // FIXED: Added missing field
                is_typing: false, // FIXED: Added missing field
                last_seen: chrono::Utc::now().timestamp_millis(), // FIXED: Added missing field
            })
            .collect();

        RoomInfo {
            room_id: self.id.clone(),
            name: self.name.clone(),
            user_count,
            max_users: self.max_users,
            scene_preset: "forest".to_string(), // FIXED: Added missing field
            active_users, // FIXED: Use correct field name
        }
    }
}