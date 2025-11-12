use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: String,
    pub name: String,
    pub avatar_color: String,
    pub position: (f32, f32, f32),
    pub rotation: (f32, f32, f32),
    pub connected_at: u64,
    pub camera_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Room {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub max_users: u32,
    pub created_at: u64,
    pub users: HashMap<String, User>,
    pub agents: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: String,
    pub user_id: String,
    pub user_name: String,
    pub text: String,
    pub timestamp: u64,
    pub is_agent: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WebSocketMessage {
    pub message_type: String,
    pub data: serde_json::Value,
    pub timestamp: u64,
}
