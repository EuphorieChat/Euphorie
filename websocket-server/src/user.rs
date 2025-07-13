// FINAL FIXED: src/user.rs - Complete with Nationality Support and Scene Sync
use crate::message::{UserInfo, Position, AvatarInfo};
use chrono::{DateTime, Utc};

#[derive(Debug, Clone)]
pub struct User {
    pub id: String,
    pub username: String,
    pub position: Position,
    pub room_id: Option<String>,
    pub nationality: Option<String>, // NEW: User nationality support
    pub connected_at: DateTime<Utc>,
}

impl User {
    pub fn new(id: String, username: String) -> Self {
        Self {
            id,
            username,
            position: Position { x: 0.0, y: 0.0, z: 0.0 },
            room_id: None,
            nationality: None, // Default to no nationality
            connected_at: Utc::now(),
        }
    }

    // NEW: Constructor with nationality support
    pub fn new_with_nationality(
        id: String, 
        username: String, 
        nationality: Option<String>
    ) -> Self {
        Self {
            id,
            username,
            position: Position { x: 0.0, y: 0.0, z: 0.0 },
            room_id: None,
            nationality,
            connected_at: Utc::now(),
        }
    }

    // NEW: Create guest user with nationality
    pub fn new_guest(nationality: Option<String>) -> Self {
        let guest_id = format!("guest_{}", 
            uuid::Uuid::new_v4().to_string()
                .split('-')
                .next()
                .unwrap_or("unknown")
        );
        
        Self::new_with_nationality(guest_id, "Guest".to_string(), nationality)
    }

    pub fn to_user_info(&self) -> UserInfo {
        UserInfo {
            user_id: self.id.clone(),
            username: self.username.clone(),
            position: Some(self.position.clone()),
            avatar: Some(AvatarInfo::default()),
            is_typing: false,
            nationality: self.nationality.clone(), // NEW: Include nationality
            last_seen: Utc::now().timestamp_millis(),
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

    // NEW: Nationality management methods
    pub fn set_nationality(&mut self, nationality: Option<String>) {
        self.nationality = nationality;
    }

    pub fn get_nationality_display(&self) -> String {
        self.nationality.as_ref().unwrap_or(&"UN".to_string()).clone()
    }

    pub fn is_guest(&self) -> bool {
        self.id.starts_with("guest_")
    }

    pub fn get_display_name(&self) -> String {
        if let Some(nationality) = &self.nationality {
            if nationality != "UN" {
                format!("{} ({})", self.username, nationality)
            } else {
                self.username.clone()
            }
        } else {
            self.username.clone()
        }
    }

    // NEW: Builder pattern methods for fluent construction
    pub fn with_position(mut self, position: Position) -> Self {
        self.position = position;
        self
    }

    pub fn with_room(mut self, room_id: String) -> Self {
        self.room_id = Some(room_id);
        self
    }

    pub fn with_nationality(mut self, nationality: Option<String>) -> Self {
        self.nationality = nationality;
        self
    }

    // NEW: Utility methods
    pub fn has_nationality(&self) -> bool {
        self.nationality.is_some() && self.nationality.as_ref() != Some(&"UN".to_string())
    }

    pub fn get_flag_emoji(&self) -> String {
        match self.nationality.as_ref().map(|s| s.as_str()) {
            Some("US") => "🇺🇸".to_string(),
            Some("CA") => "🇨🇦".to_string(),
            Some("GB") => "🇬🇧".to_string(),
            Some("DE") => "🇩🇪".to_string(),
            Some("FR") => "🇫🇷".to_string(),
            Some("JP") => "🇯🇵".to_string(),
            Some("KR") => "🇰🇷".to_string(),
            Some("AU") => "🇦🇺".to_string(),
            Some("BR") => "🇧🇷".to_string(),
            Some("IN") => "🇮🇳".to_string(),
            Some("CN") => "🇨🇳".to_string(),
            Some("RU") => "🇷🇺".to_string(),
            Some("MX") => "🇲🇽".to_string(),
            Some("IT") => "🇮🇹".to_string(),
            Some("ES") => "🇪🇸".to_string(),
            _ => "🌍".to_string(), // Default globe for unknown/UN
        }
    }

    pub fn get_country_name(&self) -> String {
        match self.nationality.as_ref().map(|s| s.as_str()) {
            Some("US") => "United States".to_string(),
            Some("CA") => "Canada".to_string(),
            Some("GB") => "United Kingdom".to_string(),
            Some("DE") => "Germany".to_string(),
            Some("FR") => "France".to_string(),
            Some("JP") => "Japan".to_string(),
            Some("KR") => "South Korea".to_string(),
            Some("AU") => "Australia".to_string(),
            Some("BR") => "Brazil".to_string(),
            Some("IN") => "India".to_string(),
            Some("CN") => "China".to_string(),
            Some("RU") => "Russia".to_string(),
            Some("MX") => "Mexico".to_string(),
            Some("IT") => "Italy".to_string(),
            Some("ES") => "Spain".to_string(),
            Some(code) => format!("Country ({})", code),
            None => "Unknown".to_string(),
        }
    }
}