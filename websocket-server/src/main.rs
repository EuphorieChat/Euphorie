// src/main.rs - Updated main with better error handling
use anyhow::Result;
use clap::Parser;
use euphorie_websocket::{
    Config,
    WebSocketServer,
};
use tracing::{info, warn, error};
use tracing_subscriber;

#[derive(Parser)]
#[command(name = "euphorie-websocket")]
#[command(about = "High-performance WebSocket server for Euphorie 3D multi-user rooms")]
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
    
    #[arg(short, long)]
    verbose: bool,
    
    #[arg(long)]
    cors_origin: Option<String>,
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();
    
    // Initialize tracing with better formatting
    let subscriber = tracing_subscriber::fmt()
        .with_max_level(if cli.verbose { 
            tracing::Level::DEBUG 
        } else { 
            tracing::Level::INFO 
        })
        .with_target(false)
        .with_thread_ids(true)
        .with_line_number(true)
        .finish();
    
    tracing::subscriber::set_global_default(subscriber)?;
    
    info!("🚀 Starting Euphorie WebSocket Server v1.0.0");
    info!("📡 Binding to {}:{}", cli.host, cli.port);
    info!("⚡ Max connections: {}", cli.max_connections);
    info!("🏠 Max rooms: {}", cli.max_rooms);
    info!("👥 Max users per room: {}", cli.max_users_per_room);
    
    if let Some(ref origin) = cli.cors_origin {
        info!("🌐 CORS origin: {}", origin);
    }
    
    let config = Config {
        host: cli.host,
        port: cli.port,
        max_connections: cli.max_connections,
        max_rooms: cli.max_rooms,
        max_users_per_room: cli.max_users_per_room,
    };
    
    let server = WebSocketServer::new(config).await
        .map_err(|e| {
            error!("Failed to create WebSocket server: {}", e);
            e
        })?;
    
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
    
    info!("👋 Server shutting down gracefully");
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