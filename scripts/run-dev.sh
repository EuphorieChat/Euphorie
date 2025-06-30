#!/bin/bash
set -e

echo "🛠️ Starting Euphorie WebSocket Server (Development Mode)"

# Build first
cargo build

# Run with development settings
RUST_LOG=debug ./target/debug/euphorie-websocket \
    --host 127.0.0.1 \
    --port 9001 \
    --max-connections 1000 \
    --max-rooms 10 \
    --max-users-per-room 50 \
    --verbose
