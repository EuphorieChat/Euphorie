// FIXED: src/user.rs
use crate::message::{UserInfo, Position}; // Removed unused AvatarInfo import
use chrono::{DateTime, Utc};

#[derive(Debug, Clone)]
pub struct User {
    pub id: String,
    pub username: String,
    pub position: Position,
    pub room_id: Option<String>,
    pub connected_at: DateTime<Utc>,
}

impl User {
    pub fn new(id: String, username: String) -> Self {
        Self {
            id,
            username,
            position: Position { x: 0.0, y: 0.0, z: 0.0 },
            room_id: None,
            connected_at: Utc::now(),
        }
    }

    pub fn to_user_info(&self) -> UserInfo {
        UserInfo {
            user_id: self.id.clone(),
            username: self.username.clone(),
            position: self.position.clone(),
        }
    }

    pub fn update_position(&mut self, position: Position) {
        self.position = position;
    }

    pub fn join_room(&mut self, room_id: String) {
        self.room_id = Some(room_id);
    }

    pub fn leave_room(&mut self) {
        self.room_id = None;
    }
}