// UPDATED: src/room.rs - Added Scene State Management and Nationality Support
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
    pub scene_preset: Arc<RwLock<String>>, // NEW: Track current scene preset
    pub current_weather: Arc<RwLock<Option<WeatherState>>>, // NEW: Track weather state
    pub current_time: Arc<RwLock<Option<TimeState>>>, // NEW: Track time state
}

#[derive(Debug, Clone)]
pub struct RoomUser {
    pub user_id: String,
    pub username: String,
    pub position: Position,
    pub nationality: Option<String>, // NEW: User nationality
    pub joined_at: chrono::DateTime<chrono::Utc>,
}

// NEW: Weather state tracking
#[derive(Debug, Clone)]
pub struct WeatherState {
    pub weather_type: String,
    pub intensity: f32,
    pub changed_by: String,
    pub changed_at: chrono::DateTime<chrono::Utc>,
}

// NEW: Time state tracking
#[derive(Debug, Clone)]
pub struct TimeState {
    pub time_of_day: String,
    pub hour: Option<u8>,
    pub changed_by: String,
    pub changed_at: chrono::DateTime<chrono::Utc>,
}

impl Room {
    pub fn new(id: String, name: String, max_users: usize) -> Self {
        Self {
            id,
            name,
            users: Arc::new(RwLock::new(HashMap::new())),
            max_users,
            created_at: chrono::Utc::now(),
            scene_preset: Arc::new(RwLock::new("forest".to_string())), // Default scene
            current_weather: Arc::new(RwLock::new(None)),
            current_time: Arc::new(RwLock::new(None)),
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
            nationality: user.nationality.clone(), // NEW: Store nationality
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

    // 🆕 NEW: Scene Management Methods
    pub async fn update_scene_preset(&self, new_preset: String) {
        let mut scene_preset = self.scene_preset.write().await;
        *scene_preset = new_preset;
        tracing::info!("🏠 Room {} scene updated to: {}", self.id, scene_preset);
    }

    pub async fn get_scene_preset(&self) -> String {
        let scene_preset = self.scene_preset.read().await;
        scene_preset.clone()
    }

    // 🆕 NEW: Weather Management Methods
    pub async fn update_weather(&self, weather_type: String, intensity: f32, changed_by: String) {
        let mut current_weather = self.current_weather.write().await;
        *current_weather = Some(WeatherState {
            weather_type: weather_type.clone(),
            intensity,
            changed_by: changed_by.clone(),
            changed_at: chrono::Utc::now(),
        });
        tracing::info!("🌦️ Room {} weather updated to: {} (intensity: {}) by {}", 
                      self.id, weather_type, intensity, changed_by);
    }

    pub async fn get_weather(&self) -> Option<WeatherState> {
        let current_weather = self.current_weather.read().await;
        current_weather.clone()
    }

    // 🆕 NEW: Time Management Methods
    pub async fn update_time(&self, time_of_day: String, hour: Option<u8>, changed_by: String) {
        let mut current_time = self.current_time.write().await;
        *current_time = Some(TimeState {
            time_of_day: time_of_day.clone(),
            hour,
            changed_by: changed_by.clone(),
            changed_at: chrono::Utc::now(),
        });
        tracing::info!("🌅 Room {} time updated to: {} (hour: {:?}) by {}", 
                      self.id, time_of_day, hour, changed_by);
    }

    pub async fn get_time(&self) -> Option<TimeState> {
        let current_time = self.current_time.read().await;
        current_time.clone()
    }

    // 🆕 NEW: Get room environment state for new users
    pub async fn get_environment_state(&self) -> (String, Option<WeatherState>, Option<TimeState>) {
        let scene = self.get_scene_preset().await;
        let weather = self.get_weather().await;
        let time = self.get_time().await;
        (scene, weather, time)
    }

    pub async fn to_room_info(&self) -> RoomInfo {
        let user_count = self.get_user_count().await;
        let current_scene = self.get_scene_preset().await;
        
        // Create UserInfo with all required fields including nationality
        let active_users: Vec<UserInfo> = self.get_all_users().await
            .into_iter()
            .map(|user| UserInfo {
                user_id: user.user_id,
                username: user.username,
                position: Some(user.position),
                avatar: Some(AvatarInfo::default()),
                is_typing: false,
                nationality: user.nationality, // NEW: Include nationality
                last_seen: chrono::Utc::now().timestamp_millis(),
            })
            .collect();

        RoomInfo {
            room_id: self.id.clone(),
            name: self.name.clone(),
            user_count,
            max_users: self.max_users,
            scene_preset: current_scene, // Use current scene preset
            active_users,
        }
    }

    // 🆕 NEW: Get demographics breakdown for the room
    pub async fn get_demographics(&self) -> HashMap<String, usize> {
        let users = self.users.read().await;
        let mut demographics = HashMap::new();
        
        for user in users.values() {
            let nationality = user.nationality.as_ref().unwrap_or(&"UN".to_string()).clone();
            *demographics.entry(nationality).or_insert(0) += 1;
        }
        
        demographics
    }

    // 🆕 NEW: Get users by nationality
    pub async fn get_users_by_nationality(&self, nationality: &str) -> Vec<RoomUser> {
        let users = self.users.read().await;
        users.values()
            .filter(|user| user.nationality.as_ref().map_or(false, |n| n == nationality))
            .cloned()
            .collect()
    }

    // 🆕 NEW: Check if room is empty
    pub async fn is_empty(&self) -> bool {
        let users = self.users.read().await;
        users.is_empty()
    }

    // 🆕 NEW: Get room activity summary
    pub async fn get_activity_summary(&self) -> String {
        let user_count = self.get_user_count().await;
        let scene = self.get_scene_preset().await;
        let weather = self.get_weather().await;
        let time = self.get_time().await;
        
        let mut summary = format!("Room {}: {} users in {} scene", self.name, user_count, scene);
        
        if let Some(w) = weather {
            summary.push_str(&format!(", weather: {}", w.weather_type));
        }
        
        if let Some(t) = time {
            summary.push_str(&format!(", time: {}", t.time_of_day));
        }
        
        summary
    }
}