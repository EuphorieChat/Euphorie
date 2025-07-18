// src/config.rs - Updated with screen sharing configuration
use crate::rate_limiter::RateLimiterConfig;
use crate::message_history::MessageHistoryConfig;
use crate::screen_sharing::ScreenSharingConfig;  // NEW: Import screen sharing config
use std::time::Duration;

#[derive(Debug, Clone)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub max_connections: usize,
    pub max_rooms: usize,
    pub max_users_per_room: usize,
    pub rate_limiter: RateLimiterConfig,
    pub message_history: MessageHistoryConfig,
    pub screen_sharing: ScreenSharingConfig,  // NEW: Screen sharing configuration
}

impl Default for Config {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".to_string(),
            port: 9001,
            max_connections: 10000,
            max_rooms: 50,
            max_users_per_room: 100,
            rate_limiter: RateLimiterConfig::default(),
            message_history: MessageHistoryConfig::default(),
            screen_sharing: ScreenSharingConfig::default(),  // NEW: Default screen sharing config
        }
    }
}