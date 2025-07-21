// src/main.rs - Complete configuration with enhanced screen sharing support
use anyhow::Result;
use clap::Parser;
use euphorie_websocket::{
    Config,
    WebSocketServer,
    RateLimiterConfig,
    MessageHistoryConfig,
    ScreenSharingConfig,
};
use tracing::{info, error};
use tracing_subscriber;
use std::time::Duration;

#[derive(Parser)]
#[command(name = "euphorie-websocket")]
#[command(about = "High-performance WebSocket server for Euphorie 3D multi-user rooms with advanced screen sharing")]
struct Cli {
    #[arg(long, default_value = "127.0.0.1")]
    host: String,
    
    #[arg(short, long, default_value = "9001")]
    port: u16,
    
    #[arg(long, default_value = "10000")]
    max_connections: usize,
    
    #[arg(long, default_value = "50")]
    max_rooms: usize,
    
    #[arg(long, default_value = "100")]
    max_users_per_room: usize,
    
    // Rate limiting options
    #[arg(long, default_value = "10")]
    rate_limit_messages_per_second: u32,
    
    #[arg(long, default_value = "5")]
    rate_limit_burst: u32,
    
    // Message history options
    #[arg(long, default_value = "100")]
    max_messages_per_room: usize,
    
    #[arg(long, default_value = "200")]
    max_rooms_in_cache: usize,
    
    #[arg(long, default_value = "24")]
    message_ttl_hours: u64,
    
    // Enhanced screen sharing options
    #[arg(long, default_value = "1")]
    max_screen_shares_per_room: usize,
    
    #[arg(long, default_value = "3600")]  // 1 hour in seconds
    screen_share_timeout_seconds: u64,
    
    #[arg(long, default_value = "100")]  // Maximum viewers per share
    max_viewers_per_share: usize,
    
    #[arg(long)]
    enable_screen_share_recording: bool,
    
    #[arg(short, long)]
    verbose: bool,
    
    #[arg(long)]
    cors_origin: Option<String>,
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();
    
    // Initialize enhanced tracing with better formatting for screen sharing debugging
    let subscriber = tracing_subscriber::fmt()
        .with_max_level(if cli.verbose { 
            tracing::Level::DEBUG 
        } else { 
            tracing::Level::INFO 
        })
        .with_target(false)
        .with_thread_ids(true)
        .with_line_number(true)
        .with_file(true)
        .finish();
    
    tracing::subscriber::set_global_default(subscriber)?;
    
    info!("🚀 Starting Euphorie WebSocket Server v2.0.0 with Enhanced Screen Sharing");
    info!("📡 Binding to {}:{}", cli.host, cli.port);
    info!("⚡ Max connections: {}", cli.max_connections);
    info!("🏠 Max rooms: {}", cli.max_rooms);
    info!("👥 Max users per room: {}", cli.max_users_per_room);
    info!("🚦 Rate limit: {} msgs/sec, burst: {}", cli.rate_limit_messages_per_second, cli.rate_limit_burst);
    info!("📚 Message history: {} msgs/room, {} rooms cached, {}h TTL", 
          cli.max_messages_per_room, cli.max_rooms_in_cache, cli.message_ttl_hours);
    
    // Enhanced screen sharing logging
    info!("🖥️ Screen sharing configuration:");
    info!("   📺 Max shares per room: {}", cli.max_screen_shares_per_room);
    info!("   ⏰ Session timeout: {}s", cli.screen_share_timeout_seconds);
    info!("   👁️ Max viewers per share: {}", cli.max_viewers_per_share);
    info!("   📹 Recording enabled: {}", cli.enable_screen_share_recording);
    
    if let Some(ref origin) = cli.cors_origin {
        info!("🌐 CORS origin: {}", origin);
    }
    
    let rate_limiter_config = RateLimiterConfig {
        messages_per_window: cli.rate_limit_messages_per_second,
        window_duration: Duration::from_secs(1),
        burst_limit: cli.rate_limit_burst,
    };

    let message_history_config = MessageHistoryConfig {
        max_messages_per_room: cli.max_messages_per_room,
        max_rooms_in_cache: cli.max_rooms_in_cache,
        message_ttl_hours: cli.message_ttl_hours,
    };
    
    // Enhanced screen sharing configuration with late joiner support
    let screen_sharing_config = ScreenSharingConfig {
        max_shares_per_room: cli.max_screen_shares_per_room,
        session_timeout: Duration::from_secs(cli.screen_share_timeout_seconds),
        enable_recording: cli.enable_screen_share_recording,
        max_viewers_per_share: cli.max_viewers_per_share,
    };
    
    let config = Config {
        host: cli.host,
        port: cli.port,
        max_connections: cli.max_connections,
        max_rooms: cli.max_rooms,
        max_users_per_room: cli.max_users_per_room,
        rate_limiter: rate_limiter_config,
        message_history: message_history_config,
        screen_sharing: screen_sharing_config,
    };
    
    let server = WebSocketServer::new(config).await
        .map_err(|e| {
            error!("Failed to create WebSocket server: {}", e);
            e
        })?;
    
    // Log server capabilities for debugging
    info!("✨ Server capabilities:");
    info!("   🖥️ Screen sharing with late joiner support");
    info!("   🔄 WebRTC signaling relay");
    info!("   👁️ Multiple viewers per share");
    info!("   📡 Real-time connection status");
    info!("   🧹 Automatic cleanup and session management");
    
    // Handle shutdown gracefully
    tokio::select! {
        result = server.run() => {
            match result {
                Ok(_) => info!("✅ Server stopped normally"),
                Err(e) => {
                    error!("❌ Server error: {}", e);
                    return Err(e);
                }
            }
        }
        _ = tokio::signal::ctrl_c() => {
            info!("🛑 Received shutdown signal (Ctrl+C)");
        }
        _ = shutdown_signal() => {
            info!("🛑 Received shutdown signal");
        }
    }
    
    info!("👋 Server shutting down gracefully - cleaning up active screen shares");
    Ok(())
}

#[cfg(unix)]
async fn shutdown_signal() {
    use tokio::signal::unix::{signal, SignalKind};
    
    let mut sigterm = signal(SignalKind::terminate()).expect("Failed to listen for SIGTERM");
    let mut sigint = signal(SignalKind::interrupt()).expect("Failed to listen for SIGINT");
    
    tokio::select! {
        _ = sigterm.recv() => {
            info!("Received SIGTERM");
        }
        _ = sigint.recv() => {
            info!("Received SIGINT");
        }
    }
}

#[cfg(not(unix))]
async fn shutdown_signal() {
    // On non-Unix platforms, just wait indefinitely
    // Ctrl+C handling is done above
    std::future::pending::<()>().await;
}