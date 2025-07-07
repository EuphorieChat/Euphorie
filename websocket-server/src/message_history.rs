// src/message_history.rs
use std::collections::VecDeque;
use std::sync::Arc;
use tokio::sync::RwLock;
use dashmap::DashMap;
use serde::{Deserialize, Serialize};
use crate::message::ServerMessage;

#[derive(Debug, Clone)]
pub struct MessageHistoryConfig {
    pub max_messages_per_room: usize,
    pub max_rooms_in_cache: usize,
    pub message_ttl_hours: u64,
}

impl Default for MessageHistoryConfig {
    fn default() -> Self {
        Self {
            max_messages_per_room: 100,  // Last 100 messages per room
            max_rooms_in_cache: 200,     // Cache up to 200 rooms
            message_ttl_hours: 24,       // Keep messages for 24 hours
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredMessage {
    pub message: ServerMessage,
    pub timestamp: i64,
    pub room_id: String,
}

#[derive(Debug)]
struct RoomHistory {
    messages: VecDeque<StoredMessage>,
    last_accessed: tokio::time::Instant,
}

impl RoomHistory {
    fn new() -> Self {
        Self {
            messages: VecDeque::new(),
            last_accessed: tokio::time::Instant::now(),
        }
    }

    fn add_message(&mut self, message: StoredMessage, max_size: usize) {
        // Remove old messages if we exceed the limit
        while self.messages.len() >= max_size {
            self.messages.pop_front();
        }
        
        self.messages.push_back(message);
        self.last_accessed = tokio::time::Instant::now();
    }

    fn get_recent_messages(&mut self, count: Option<usize>) -> Vec<StoredMessage> {
        self.last_accessed = tokio::time::Instant::now();
        
        let messages: Vec<StoredMessage> = self.messages.iter().cloned().collect();
        
        match count {
            Some(n) => {
                let start = messages.len().saturating_sub(n);
                messages[start..].to_vec()
            }
            None => messages,
        }
    }

    fn get_messages_since(&mut self, since_timestamp: i64) -> Vec<StoredMessage> {
        self.last_accessed = tokio::time::Instant::now();
        
        self.messages
            .iter()
            .filter(|msg| msg.timestamp > since_timestamp)
            .cloned()
            .collect()
    }

    fn cleanup_old_messages(&mut self, ttl_hours: u64) {
        let cutoff = chrono::Utc::now().timestamp_millis() - (ttl_hours as i64 * 3600 * 1000);
        
        while let Some(front) = self.messages.front() {
            if front.timestamp < cutoff {
                self.messages.pop_front();
            } else {
                break;
            }
        }
    }
}

pub struct MessageHistory {
    config: MessageHistoryConfig,
    room_histories: Arc<DashMap<String, Arc<RwLock<RoomHistory>>>>,
}

impl MessageHistory {
    pub fn new(config: MessageHistoryConfig) -> Self {
        let history = Self {
            config,
            room_histories: Arc::new(DashMap::new()),
        };

        // Start cleanup task
        let cleanup_history = history.clone();
        tokio::spawn(async move {
            cleanup_history.start_cleanup_task().await;
        });

        history
    }

    /// Add a message to room history
    pub async fn add_message(&self, room_id: &str, message: ServerMessage) {
        // Only store certain message types in history
        if !self.should_store_message(&message) {
            return;
        }

        let stored_message = StoredMessage {
            message,
            timestamp: chrono::Utc::now().timestamp_millis(),
            room_id: room_id.to_string(),
        };

        let room_history = self.get_or_create_room_history(room_id);
        let mut history = room_history.write().await;
        history.add_message(stored_message, self.config.max_messages_per_room);
    }

    /// Get recent messages for a room
    pub async fn get_recent_messages(&self, room_id: &str, count: Option<usize>) -> Vec<StoredMessage> {
        if let Some(room_history) = self.room_histories.get(room_id) {
            let mut history = room_history.write().await;
            history.get_recent_messages(count)
        } else {
            Vec::new()
        }
    }

    /// Get messages since a specific timestamp
    pub async fn get_messages_since(&self, room_id: &str, since_timestamp: i64) -> Vec<StoredMessage> {
        if let Some(room_history) = self.room_histories.get(room_id) {
            let mut history = room_history.write().await;
            history.get_messages_since(since_timestamp)
        } else {
            Vec::new()
        }
    }

    /// Get room history statistics
    pub async fn get_room_stats(&self, room_id: &str) -> Option<RoomHistoryStats> {
        if let Some(room_history) = self.room_histories.get(room_id) {
            let history = room_history.read().await;
            Some(RoomHistoryStats {
                total_messages: history.messages.len(),
                oldest_message_timestamp: history.messages.front().map(|m| m.timestamp),
                newest_message_timestamp: history.messages.back().map(|m| m.timestamp),
                last_accessed: history.last_accessed,
            })
        } else {
            None
        }
    }

    fn get_or_create_room_history(&self, room_id: &str) -> Arc<RwLock<RoomHistory>> {
        self.room_histories
            .entry(room_id.to_string())
            .or_insert_with(|| Arc::new(RwLock::new(RoomHistory::new())))
            .clone()
    }

    fn should_store_message(&self, message: &ServerMessage) -> bool {
        matches!(message, 
            ServerMessage::ChatMessage { .. } |
            ServerMessage::Emotion { .. } |
            ServerMessage::Interaction { .. } |
            ServerMessage::UserJoined { .. } |
            ServerMessage::UserLeft { .. }
        )
    }

    async fn start_cleanup_task(&self) {
        let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(3600)); // Every hour
        
        loop {
            interval.tick().await;
            self.cleanup_old_data().await;
        }
    }

    async fn cleanup_old_data(&self) {
        let now = tokio::time::Instant::now();
        let room_ttl = tokio::time::Duration::from_secs(3600 * 4); // 4 hours room inactivity

        // Clean up old messages in each room
        for room_entry in self.room_histories.iter() {
            let mut history = room_entry.value().write().await;
            history.cleanup_old_messages(self.config.message_ttl_hours);
        }

        // Remove inactive rooms if we exceed the cache limit
        if self.room_histories.len() > self.config.max_rooms_in_cache {
            let mut room_ages: Vec<(String, tokio::time::Instant)> = Vec::new();
            
            for room_entry in self.room_histories.iter() {
                let history = room_entry.value().read().await;
                room_ages.push((room_entry.key().clone(), history.last_accessed));
            }

            // Sort by last accessed time (oldest first)
            room_ages.sort_by(|a, b| a.1.cmp(&b.1));

            // Remove the oldest rooms until we're under the limit
            let rooms_to_remove = self.room_histories.len() - self.config.max_rooms_in_cache;
            for i in 0..rooms_to_remove {
                if let Some((room_id, last_accessed)) = room_ages.get(i) {
                    // Only remove if room has been inactive for a while
                    if now.duration_since(*last_accessed) > room_ttl {
                        self.room_histories.remove(room_id);
                        tracing::debug!("Removed inactive room history: {}", room_id);
                    }
                }
            }
        }

        tracing::debug!("Message history cleanup completed. Active rooms: {}", self.room_histories.len());
    }
}

#[derive(Debug)]
pub struct RoomHistoryStats {
    pub total_messages: usize,
    pub oldest_message_timestamp: Option<i64>,
    pub newest_message_timestamp: Option<i64>,
    pub last_accessed: tokio::time::Instant,
}

impl Clone for MessageHistory {
    fn clone(&self) -> Self {
        Self {
            config: self.config.clone(),
            room_histories: self.room_histories.clone(),
        }
    }
}