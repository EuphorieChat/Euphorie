use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ClientMessage {
    Auth {
        user_id: String,
        room_id: String,
        username: Option<String>,
        timestamp: u64,
    },
    ChatMessage {
        message: String,
        user_id: String,
        room_id: String,
        timestamp: u64,
    },
    AvatarUpdate {
        user_id: String,
        room_id: String,
        position: Position,
        rotation: Rotation,
        animation: Option<String>,
        timestamp: u64,
    },
    Interaction {
        user_id: String,
        room_id: String,
        target_user_id: Option<String>,
        interaction_type: String,
        data: Option<serde_json::Value>,
        timestamp: u64,
    },
    Emotion {
        user_id: String,
        room_id: String,
        emotion: String,
        timestamp: u64,
    },
    Typing {
        user_id: String,
        room_id: String,
        is_typing: bool,
    },
    Ping {
        timestamp: u64,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ServerMessage {
    AuthSuccess {
        user_id: String,
        room_id: String,
        room_info: RoomInfo,
    },
    AuthError {
        error: String,
    },
    ChatMessage {
        user_id: String,
        username: String,
        message: String,
        timestamp: u64,
    },
    UserJoined {
        user_id: String,
        username: String,
        avatar: Option<AvatarInfo>,
    },
    UserLeft {
        user_id: String,
        username: String,
    },
    AvatarUpdate {
        user_id: String,
        position: Position,
        rotation: Rotation,
        animation: Option<String>,
        timestamp: u64,
    },
    Interaction {
        user_id: String,
        target_user_id: Option<String>,
        interaction_type: String,
        data: Option<serde_json::Value>,
        timestamp: u64,
    },
    Emotion {
        user_id: String,
        emotion: String,
        timestamp: u64,
    },
    Typing {
        user_id: String,
        username: String,
        is_typing: bool,
    },
    RoomUpdate {
        user_count: usize,
        active_users: Vec<UserInfo>,
    },
    Error {
        error: String,
        code: Option<u16>,
    },
    Pong {
        timestamp: u64,
    },
    System {
        message: String,
        level: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
    pub x: f32,
    pub y: f32,
    pub z: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Rotation {
    pub x: f32,
    pub y: f32,
    pub z: f32,
    pub w: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AvatarInfo {
    pub color: String,
    pub accessories: Vec<String>,
    pub animation: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInfo {
    pub user_id: String,
    pub username: String,
    pub avatar: Option<AvatarInfo>,
    pub position: Option<Position>,
    pub is_typing: bool,
    pub last_seen: u64,
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
