#!/bin/bash
set -e

echo "🔨 Building Euphorie WebSocket Server..."

# Development build
echo "📦 Building development version..."
cargo build

# Release build
echo "🚀 Building release version..."
cargo build --release

echo "✅ Build complete!"
echo "   - Development binary: ./target/debug/euphorie-websocket"
echo "   - Production binary: ./target/release/euphorie-websocket"

# Show binary size
if [ -f "./target/release/euphorie-websocket" ]; then
    SIZE=$(ls -lh ./target/release/euphorie-websocket | awk '{print $5}')
    echo "   - Binary size: $SIZE"
fi
