// src/rate_limiter.rs
use std::collections::VecDeque;
use std::time::{Duration, Instant};
use dashmap::DashMap;
use std::sync::Arc;

#[derive(Debug, Clone)]
pub struct RateLimiterConfig {
    pub messages_per_window: u32,
    pub window_duration: Duration,
    pub burst_limit: u32,
}

impl Default for RateLimiterConfig {
    fn default() -> Self {
        Self {
            messages_per_window: 10,           // 10 messages per window
            window_duration: Duration::from_secs(1), // 1 second window
            burst_limit: 5,                    // Allow 5 message burst
        }
    }
}

#[derive(Debug)]
struct UserRateLimit {
    message_times: VecDeque<Instant>,
    burst_count: u32,
    last_burst_reset: Instant,
}

impl UserRateLimit {
    fn new() -> Self {
        Self {
            message_times: VecDeque::new(),
            burst_count: 0,
            last_burst_reset: Instant::now(),
        }
    }
}

pub struct RateLimiter {
    config: RateLimiterConfig,
    user_limits: Arc<DashMap<String, UserRateLimit>>,
}

impl RateLimiter {
    pub fn new(config: RateLimiterConfig) -> Self {
        Self {
            config,
            user_limits: Arc::new(DashMap::new()),
        }
    }

    /// Check if user can send a message. Returns true if allowed, false if rate limited
    pub fn check_rate_limit(&self, user_id: &str) -> bool {
        let now = Instant::now();
        
        let mut user_limit = self.user_limits
            .entry(user_id.to_string())
            .or_insert_with(UserRateLimit::new);

        // Clean old messages outside the window
        while let Some(&front_time) = user_limit.message_times.front() {
            if now.duration_since(front_time) > self.config.window_duration {
                user_limit.message_times.pop_front();
            } else {
                break;
            }
        }

        // Reset burst count every second
        if now.duration_since(user_limit.last_burst_reset) >= Duration::from_secs(1) {
            user_limit.burst_count = 0;
            user_limit.last_burst_reset = now;
        }

        // Check burst limit
        if user_limit.burst_count >= self.config.burst_limit {
            return false;
        }

        // Check rate limit
        if user_limit.message_times.len() >= self.config.messages_per_window as usize {
            return false;
        }

        // Allow the message
        user_limit.message_times.push_back(now);
        user_limit.burst_count += 1;
        true
    }

    /// Get current rate limit status for a user
    pub fn get_rate_limit_status(&self, user_id: &str) -> RateLimitStatus {
        if let Some(user_limit) = self.user_limits.get(user_id) {
            let now = Instant::now();
            
            // Count messages in current window
            let messages_in_window = user_limit.message_times
                .iter()
                .filter(|&&time| now.duration_since(time) <= self.config.window_duration)
                .count() as u32;

            RateLimitStatus {
                messages_remaining: self.config.messages_per_window.saturating_sub(messages_in_window),
                reset_in: self.config.window_duration,
                is_limited: messages_in_window >= self.config.messages_per_window,
            }
        } else {
            RateLimitStatus {
                messages_remaining: self.config.messages_per_window,
                reset_in: self.config.window_duration,
                is_limited: false,
            }
        }
    }

    /// Clean up old user data periodically
    pub fn cleanup_old_users(&self) {
        let cutoff = Instant::now() - Duration::from_secs(300); // 5 minutes
        
        self.user_limits.retain(|_, user_limit| {
            if let Some(&last_message) = user_limit.message_times.back() {
                last_message > cutoff
            } else {
                user_limit.last_burst_reset > cutoff
            }
        });
    }
}

#[derive(Debug)]
pub struct RateLimitStatus {
    pub messages_remaining: u32,
    pub reset_in: Duration,
    pub is_limited: bool,
}

impl Clone for RateLimiter {
    fn clone(&self) -> Self {
        Self {
            config: self.config.clone(),
            user_limits: self.user_limits.clone(),
        }
    }
}