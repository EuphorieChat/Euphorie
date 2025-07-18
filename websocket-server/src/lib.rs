// src/lib.rs - Updated with screen sharing module
pub mod message;
pub mod room;
pub mod server;
pub mod user;
pub mod rate_limiter;
pub mod message_history;
pub mod screen_sharing;  // NEW: Screen sharing module

// Re-export main types
pub use server::{WebSocketServer, Config};
pub use message::{ClientMessage, ServerMessage, Position, AvatarInfo, UserInfo, RoomInfo};
pub use room::{Room, RoomUser};
pub use user::User;
pub use rate_limiter::{RateLimiter, RateLimiterConfig};
pub use message_history::{MessageHistory, MessageHistoryConfig, StoredMessage};
pub use screen_sharing::{ScreenSharingManager, ScreenSharingConfig, ScreenShareMessage, ActiveScreenShare, ScreenShareData};  // NEW: Screen sharing exports