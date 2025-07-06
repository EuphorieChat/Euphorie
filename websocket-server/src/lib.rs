pub mod message;
pub mod room;
pub mod server;
pub mod user;

// Re-export main types
pub use server::{WebSocketServer, Config};
pub use message::{ClientMessage, ServerMessage, Position, AvatarInfo, UserInfo, RoomInfo};
pub use room::{Room, RoomUser};
pub use user::User;