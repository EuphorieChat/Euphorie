use anyhow::Result;
use clap::Parser;
use euphorie_websocket::{
    config::Config,
    server::WebSocketServer,
};
use tracing::{info, warn};
use tracing_subscriber;

#[derive(Parser)]
#[command(name = "euphorie-websocket")]
#[command(about = "High-performance WebSocket server for Euphorie 3D")]
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
}

#[tokio::main]
async fn main() -> Result<()> {
    let cli = Cli::parse();
    
    // Initialize tracing
    let subscriber = tracing_subscriber::fmt()
        .with_max_level(if cli.verbose { tracing::Level::DEBUG } else { tracing::Level::INFO })
        .finish();
    tracing::subscriber::set_global_default(subscriber)?;
    
    info!("🚀 Starting Euphorie WebSocket Server");
    info!("📡 Binding to {}:{}", cli.host, cli.port);
    info!("⚡ Max connections: {}", cli.max_connections);
    info!("🏠 Max rooms: {}", cli.max_rooms);
    
    let config = Config {
        host: cli.host,
        port: cli.port,
        max_connections: cli.max_connections,
        max_rooms: cli.max_rooms,
        max_users_per_room: cli.max_users_per_room,
    };
    
    let server = WebSocketServer::new(config).await?;
    
    // Handle shutdown gracefully
    tokio::select! {
        result = server.run() => {
            if let Err(e) = result {
                warn!("Server error: {}", e);
            }
        }
        _ = tokio::signal::ctrl_c() => {
            info!("🛑 Received shutdown signal");
        }
    }
    
    info!("👋 Server shutting down");
    Ok(())
}
