// FIXED: src/message.rs - Correct timestamp types
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AvatarInfo {
    pub avatar_type: String,
    pub color: String,
    pub accessories: Vec<String>,
}

impl Default for AvatarInfo {
    fn default() -> Self {
        Self {
            avatar_type: "default".to_string(),
            color: "#4CAF50".to_string(),
            accessories: vec![],
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInfo {
    pub user_id: String,
    pub username: String,
    pub position: Option<Position>,
    pub avatar: Option<AvatarInfo>,
    pub is_typing: bool,
    pub last_seen: i64, // Keep as i64 for consistency with chrono
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoomInfo {
    pub room_id: String,
    pub name: String,
    pub user_count: usize,
    pub max_users: usize,
    pub scene_preset: String,
    pub active_users: Vec<UserInfo>,
}

// Client -> Server messages
#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
pub enum ClientMessage {
    #[serde(rename = "auth")]
    Auth {
        user_id: Option<String>,
        room_id: String,
        username: Option<String>,
        timestamp: Option<i64>,
    },

    #[serde(rename = "chat_message")]
    ChatMessage {
        message: String,
        user_id: Option<String>,
        room_id: String,
        timestamp: Option<i64>,
    },

    #[serde(rename = "position_update")]
    PositionUpdate {
        user_id: Option<String>,
        room_id: String,
        position: Position,
        timestamp: Option<i64>,
    },

    #[serde(rename = "emotion")]
    Emotion {
        user_id: Option<String>,
        room_id: String,
        emotion: String,
        timestamp: Option<i64>,
    },

    #[serde(rename = "interaction")]
    Interaction {
        user_id: Option<String>,
        room_id: String,
        target_user_id: Option<String>,
        interaction_type: String,
        data: Option<serde_json::Value>,
        timestamp: Option<i64>,
    },

    #[serde(rename = "typing")]
    Typing {
        user_id: Option<String>,
        room_id: String,
        is_typing: bool,
    },

    #[serde(rename = "get_room_state")]
    GetRoomState {
        room_id: String,
    },

    #[serde(rename = "ping")]
    Ping {
        timestamp: i64,
    },
}

// Server -> Client messages
#[derive(Debug, Serialize)]
#[serde(tag = "type")]
pub enum ServerMessage {
    #[serde(rename = "auth_success")]
    AuthSuccess {
        user_id: String,
        room_id: String,
        room_info: RoomInfo,
    },

    #[serde(rename = "auth_error")]
    AuthError {
        error: String,
    },

    #[serde(rename = "room_state")]
    RoomState {
        room_id: String,
        users: Vec<UserInfo>,
    },

    #[serde(rename = "user_joined")]
    UserJoined {
        user_id: String,
        username: String,
        avatar: Option<AvatarInfo>,
    },

    #[serde(rename = "user_left")]
    UserLeft {
        user_id: String,
        username: String,
    },

    #[serde(rename = "chat_message")]
    ChatMessage {
        user_id: String,
        username: String,
        message: String,
        timestamp: i64, // FIXED: Changed to i64 for consistency
    },

    #[serde(rename = "user_position_update")]
    UserPositionUpdate {
        user_id: String,
        position: Position,
        timestamp: i64, // FIXED: Changed to i64 for consistency
    },

    #[serde(rename = "emotion")]
    Emotion {
        user_id: String,
        username: String,
        emotion: String,
        timestamp: i64, // FIXED: Changed to i64 for consistency
    },

    #[serde(rename = "interaction")]
    Interaction {
        user_id: String,
        username: String,
        target_user_id: Option<String>,
        interaction_type: String,
        data: Option<serde_json::Value>,
        timestamp: i64, // FIXED: Changed to i64 for consistency
    },

    #[serde(rename = "typing")]
    Typing {
        user_id: String,
        username: String,
        is_typing: bool,
    },

    #[serde(rename = "pong")]
    Pong {
        timestamp: i64,
    },

    #[serde(rename = "system")]
    System {
        message: String,
    },

    #[serde(rename = "error")]
    Error {
        error: String,
    },
}