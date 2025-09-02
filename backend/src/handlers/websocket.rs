use axum::extract::ws::{WebSocket, Message};
use crate::AppState;

pub async fn websocket_handler(socket: WebSocket, state: AppState) {
    println!("🔗 New WebSocket connection established");
    // TODO: Implement full WebSocket handling
}
