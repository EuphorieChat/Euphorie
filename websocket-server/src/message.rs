// FIXED: src/message.rs - Added Screen Sharing Message Types with broadcast support
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
    pub last_seen: i64,
    pub nationality: Option<String>,
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

// FIXED: Screen sharing data structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScreenShareData {
    pub projection_mode: String,
    pub quality: String,
    pub share_type: Option<String>,
    pub session_id: Option<String>,
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
        nationality: Option<String>,
        timestamp: Option<i64>,
    },

    #[serde(rename = "chat_message")]
    ChatMessage {
        message: String,
        user_id: Option<String>,
        room_id: String,
        nationality: Option<String>,
        timestamp: Option<i64>,
    },

    #[serde(rename = "position_update")]
    PositionUpdate {
        user_id: Option<String>,
        room_id: String,
        position: Position,
        nationality: Option<String>,
        timestamp: Option<i64>,
    },

    #[serde(rename = "emotion")]
    Emotion {
        user_id: Option<String>,
        room_id: String,
        emotion: String,
        nationality: Option<String>,
        timestamp: Option<i64>,
    },

    #[serde(rename = "interaction")]
    Interaction {
        user_id: Option<String>,
        room_id: String,
        target_user_id: Option<String>,
        interaction_type: String,
        data: Option<serde_json::Value>,
        nationality: Option<String>,
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

    // Scene Synchronization Messages
    #[serde(rename = "scene_change")]
    SceneChange {
        user_id: Option<String>,
        room_id: String,
        username: Option<String>,
        scene_preset: String,
        scene_name: Option<String>,
        change_data: Option<serde_json::Value>,
        nationality: Option<String>,
        timestamp: Option<i64>,
    },

    #[serde(rename = "weather_change")]
    WeatherChange {
        user_id: Option<String>,
        room_id: String,
        username: Option<String>,
        weather_type: String,
        intensity: Option<f32>,
        nationality: Option<String>,
        timestamp: Option<i64>,
    },

    #[serde(rename = "time_change")]
    TimeChange {
        user_id: Option<String>,
        room_id: String,
        username: Option<String>,
        time_of_day: String,
        hour: Option<u8>,
        nationality: Option<String>,
        timestamp: Option<i64>,
    },

    // FIXED: Screen Sharing Messages - COMPLETE SET
    #[serde(rename = "screen_share_started")]
    ScreenShareStarted {
        user_id: String,
        room_id: String,
        username: String,
        nationality: Option<String>,
        share_data: ScreenShareData,
        timestamp: i64,
    },

    #[serde(rename = "screen_share_stopped")]
    ScreenShareStopped {
        user_id: String,
        room_id: String,
        username: String,
        nationality: Option<String>,
        timestamp: i64,
    },

    #[serde(rename = "screen_share_webrtc_offer")]
    ScreenShareWebRTCOffer {
        user_id: String,
        room_id: String,
        target_user_id: String,
        data: serde_json::Value,
        timestamp: i64,
    },

    #[serde(rename = "screen_share_webrtc_answer")]
    ScreenShareWebRTCAnswer {
        user_id: String,
        room_id: String,
        target_user_id: String,
        data: serde_json::Value,
        timestamp: i64,
    },

    #[serde(rename = "screen_share_webrtc_candidate")]
    ScreenShareWebRTCCandidate {
        user_id: String,
        room_id: String,
        target_user_id: String,
        data: serde_json::Value,
        timestamp: i64,
    },

    #[serde(rename = "screen_share_webrtc_ready")]
    ScreenShareWebRTCReady {
        user_id: String,
        room_id: String,
        username: String,
        share_data: ScreenShareData,
        timestamp: i64,
    },

    // NEW: Missing broadcast offer message type
    #[serde(rename = "screen_share_broadcast_offer")]
    ScreenShareBroadcastOffer {
        user_id: String,
        room_id: String,
        username: String,
        share_type: Option<String>,
        timestamp: Option<i64>,
    },
}

// Server -> Client messages
#[derive(Debug, Clone, Serialize, Deserialize)]
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
        nationality: Option<String>,
    },

    #[serde(rename = "user_left")]
    UserLeft {
        user_id: String,
        username: String,
        nationality: Option<String>,
    },

    #[serde(rename = "chat_message")]
    ChatMessage {
        user_id: String,
        username: String,
        message: String,
        nationality: Option<String>,
        timestamp: i64,
    },

    #[serde(rename = "user_position_update")]
    UserPositionUpdate {
        user_id: String,
        position: Position,
        nationality: Option<String>,
        timestamp: i64,
    },

    #[serde(rename = "emotion")]
    Emotion {
        user_id: String,
        username: String,
        emotion: String,
        nationality: Option<String>,
        timestamp: i64,
    },

    #[serde(rename = "interaction")]
    Interaction {
        user_id: String,
        username: String,
        target_user_id: Option<String>,
        interaction_type: String,
        data: Option<serde_json::Value>,
        nationality: Option<String>,
        timestamp: i64,
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

    // Scene Synchronization Response Messages
    #[serde(rename = "scene_change")]
    SceneChange {
        user_id: String,
        username: String,
        scene_preset: String,
        scene_name: Option<String>,
        change_data: Option<serde_json::Value>,
        nationality: Option<String>,
        timestamp: i64,
    },

    #[serde(rename = "weather_change")]
    WeatherChange {
        user_id: String,
        username: String,
        weather_type: String,
        intensity: f32,
        nationality: Option<String>,
        timestamp: i64,
    },

    #[serde(rename = "time_change")]
    TimeChange {
        user_id: String,
        username: String,
        time_of_day: String,
        hour: Option<u8>,
        nationality: Option<String>,
        timestamp: i64,
    },

    // FIXED: Screen Sharing Response Messages - COMPLETE SET
    #[serde(rename = "screen_share_started")]
    ScreenShareStarted {
        user_id: String,
        room_id: String,
        username: String,
        nationality: Option<String>,
        share_data: ScreenShareData,
        timestamp: i64,
    },

    #[serde(rename = "screen_share_stopped")]
    ScreenShareStopped {
        user_id: String,
        room_id: String,
        username: String,
        nationality: Option<String>,
        timestamp: i64,
    },

    #[serde(rename = "screen_share_webrtc_offer")]
    ScreenShareWebRTCOffer {
        user_id: String,
        room_id: String,
        target_user_id: String,
        data: serde_json::Value,
        timestamp: i64,
    },

    #[serde(rename = "screen_share_webrtc_answer")]
    ScreenShareWebRTCAnswer {
        user_id: String,
        room_id: String,
        target_user_id: String,
        data: serde_json::Value,
        timestamp: i64,
    },

    #[serde(rename = "screen_share_webrtc_candidate")]
    ScreenShareWebRTCCandidate {
        user_id: String,
        room_id: String,
        target_user_id: String,
        data: serde_json::Value,
        timestamp: i64,
    },

    #[serde(rename = "screen_share_webrtc_ready")]
    ScreenShareWebRTCReady {
        user_id: String,
        room_id: String,
        username: String,
        share_data: ScreenShareData,
        timestamp: i64,
    },
}