// src/lib.rs - Updated library exports
pub mod config;
pub mod server;
pub mod room;
pub mod user;
pub mod message;

// Re-export commonly used types
pub use config::Config;
pub use server::WebSocketServer;
pub use room::Room;
pub use user::User;
pub use message::{ClientMessage, ServerMessage, Position, UserInfo, RoomInfo};