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