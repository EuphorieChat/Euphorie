// src/room.rs - Complete room management with scene state, nationality support, and screen sharing
use crate::user::User;
use crate::message::{Position, RoomInfo, UserInfo, AvatarInfo};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone)]
pub struct Room {
    pub id: String,
    pub name: String,
    pub users: Arc<RwLock<HashMap<String, RoomUser>>>,
    pub max_users: usize,
    pub created_at: DateTime<Utc>,
    pub last_activity: Arc<RwLock<DateTime<Utc>>>,
    pub scene_preset: Arc<RwLock<String>>, // Track current scene preset
    pub current_weather: Arc<RwLock<Option<WeatherState>>>, // Track weather state
    pub current_time: Arc<RwLock<Option<TimeState>>>, // Track time state
}

#[derive(Debug, Clone)]
pub struct RoomUser {
    pub user_id: String,
    pub username: String,
    pub position: Position,
    pub nationality: Option<String>, // User nationality
    pub joined_at: DateTime<Utc>,
    pub connected_at: DateTime<Utc>,
    pub last_seen: DateTime<Utc>,
}

// Weather state tracking
#[derive(Debug, Clone)]
pub struct WeatherState {
    pub weather_type: String,
    pub intensity: f32,
    pub changed_by: String,
    pub changed_at: DateTime<Utc>,
}

// Time state tracking
#[derive(Debug, Clone)]
pub struct TimeState {
    pub time_of_day: String,
    pub hour: Option<u8>,
    pub changed_by: String,
    pub changed_at: DateTime<Utc>,
}

impl Room {
    pub fn new(id: String, name: String, max_users: usize) -> Self {
        Self {
            id,
            name,
            users: Arc::new(RwLock::new(HashMap::new())),
            max_users,
            created_at: Utc::now(),
            last_activity: Arc::new(RwLock::new(Utc::now())),
            scene_preset: Arc::new(RwLock::new("forest".to_string())), // Default scene
            current_weather: Arc::new(RwLock::new(None)),
            current_time: Arc::new(RwLock::new(None)),
        }
    }

    pub async fn add_user(&self, user: User) -> bool {
        let mut users = self.users.write().await;
        
        if users.len() >= self.max_users {
            return false;
        }

        // Update last activity
        self.update_last_activity().await;

        let room_user = RoomUser {
            user_id: user.id.clone(),
            username: user.username.clone(),
            position: user.position.clone(),
            nationality: user.nationality.clone(), // Store nationality
            joined_at: Utc::now(),
            connected_at: user.connected_at,
            last_seen: Utc::now(),
        };

        users.insert(user.id.clone(), room_user);
        
        tracing::info!("👤 User {} added to room {} ({}/{})", 
                      user.id, self.id, users.len(), self.max_users);
        true
    }

    pub async fn remove_user(&self, user_id: &str) -> Option<RoomUser> {
        let mut users = self.users.write().await;
        
        if let Some(mut user) = users.remove(user_id) {
            // Update last activity and user's last seen
            self.update_last_activity().await;
            user.last_seen = Utc::now();
            
            tracing::info!("👤 User {} removed from room {} ({}/{})", 
                          user_id, self.id, users.len(), self.max_users);
            
            Some(user)
        } else {
            None
        }
    }

    pub async fn get_user(&self, user_id: &str) -> Option<RoomUser> {
        let users = self.users.read().await;
        users.get(user_id).cloned()
    }

    pub async fn update_user_position(&self, user_id: &str, position: Position) -> bool {
        let mut users = self.users.write().await;
        if let Some(user) = users.get_mut(user_id) {
            user.position = position;
            user.last_seen = Utc::now();
            
            // Update last activity
            drop(users); // Release the lock before calling update_last_activity
            self.update_last_activity().await;
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

    pub async fn has_user(&self, user_id: &str) -> bool {
        let users = self.users.read().await;
        users.contains_key(user_id)
    }

    pub async fn is_empty(&self) -> bool {
        let users = self.users.read().await;
        users.is_empty()
    }

    // Scene Management Methods
    pub async fn update_scene_preset(&self, new_preset: String) {
        let mut scene_preset = self.scene_preset.write().await;
        *scene_preset = new_preset.clone();
        
        // Update last activity
        self.update_last_activity().await;
        
        tracing::info!("🏠 Room {} scene updated to: {}", self.id, new_preset);
    }

    pub async fn get_scene_preset(&self) -> String {
        let scene_preset = self.scene_preset.read().await;
        scene_preset.clone()
    }

    // Weather Management Methods
    pub async fn update_weather(&self, weather_type: String, intensity: f32, changed_by: String) {
        let mut current_weather = self.current_weather.write().await;
        *current_weather = Some(WeatherState {
            weather_type: weather_type.clone(),
            intensity,
            changed_by: changed_by.clone(),
            changed_at: Utc::now(),
        });
        
        // Update last activity
        drop(current_weather); // Release the lock
        self.update_last_activity().await;
        
        tracing::info!("🌦️ Room {} weather updated to: {} (intensity: {}) by {}", 
                      self.id, weather_type, intensity, changed_by);
    }

    pub async fn get_weather(&self) -> Option<WeatherState> {
        let current_weather = self.current_weather.read().await;
        current_weather.clone()
    }

    // Time Management Methods
    pub async fn update_time(&self, time_of_day: String, hour: Option<u8>, changed_by: String) {
        let mut current_time = self.current_time.write().await;
        *current_time = Some(TimeState {
            time_of_day: time_of_day.clone(),
            hour,
            changed_by: changed_by.clone(),
            changed_at: Utc::now(),
        });
        
        // Update last activity
        drop(current_time); // Release the lock
        self.update_last_activity().await;
        
        tracing::info!("🌅 Room {} time updated to: {} (hour: {:?}) by {}", 
                      self.id, time_of_day, hour, changed_by);
    }

    pub async fn get_time(&self) -> Option<TimeState> {
        let current_time = self.current_time.read().await;
        current_time.clone()
    }

    // Get room environment state for new users
    pub async fn get_environment_state(&self) -> (String, Option<WeatherState>, Option<TimeState>) {
        let scene = self.get_scene_preset().await;
        let weather = self.get_weather().await;
        let time = self.get_time().await;
        (scene, weather, time)
    }

    // Update last activity timestamp
    async fn update_last_activity(&self) {
        let mut last_activity = self.last_activity.write().await;
        *last_activity = Utc::now();
    }

    pub async fn get_last_activity(&self) -> DateTime<Utc> {
        let last_activity = self.last_activity.read().await;
        *last_activity
    }

    // Get demographics breakdown for the room
    pub async fn get_demographics(&self) -> HashMap<String, usize> {
        let users = self.users.read().await;
        let mut demographics = HashMap::new();
        
        for user in users.values() {
            let nationality = user.nationality.as_ref().unwrap_or(&"UN".to_string()).clone();
            *demographics.entry(nationality).or_insert(0) += 1;
        }
        
        demographics
    }

    // Get users by nationality
    pub async fn get_users_by_nationality(&self, nationality: &str) -> Vec<RoomUser> {
        let users = self.users.read().await;
        users.values()
            .filter(|user| user.nationality.as_ref().map_or(false, |n| n == nationality))
            .cloned()
            .collect()
    }

    // Get room activity summary
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
                nationality: user.nationality, // Include nationality
                last_seen: user.last_seen.timestamp_millis(),
            })
            .collect();

        RoomInfo {
            room_id: self.id.clone(),
            name: self.name.clone(),
            user_count,
            max_users: self.max_users,
            scene_preset: current_scene, // Use current scene preset
            active_users,
            ongoing_screen_share: None, // This will be populated by the server
        }
    }

    // Get room statistics for monitoring
    pub async fn get_stats(&self) -> RoomStats {
        let user_count = self.get_user_count().await;
        let scene_preset = self.get_scene_preset().await;
        let last_activity = self.get_last_activity().await;
        let demographics = self.get_demographics().await;
        
        RoomStats {
            room_id: self.id.clone(),
            name: self.name.clone(),
            user_count,
            max_users: self.max_users,
            scene_preset,
            created_at: self.created_at,
            last_activity,
            uptime_seconds: (Utc::now() - self.created_at).num_seconds() as u64,
            demographics,
            weather: self.get_weather().await,
            time: self.get_time().await,
        }
    }
}

#[derive(Debug, Clone)]
pub struct RoomStats {
    pub room_id: String,
    pub name: String,
    pub user_count: usize,
    pub max_users: usize,
    pub scene_preset: String,
    pub created_at: DateTime<Utc>,
    pub last_activity: DateTime<Utc>,
    pub uptime_seconds: u64,
    pub demographics: HashMap<String, usize>,
    pub weather: Option<WeatherState>,
    pub time: Option<TimeState>,
}