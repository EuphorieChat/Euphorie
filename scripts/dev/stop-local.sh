#!/bin/bash

echo "🛑 Stopping Euphorie development environment..."

cd "$(dirname "$0")/../.."

# Stop services using PID files
stop_service() {
    local service_name=$1
    local pid_file="logs/${service_name}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            echo "🛑 Stopping $service_name (PID: $pid)..."
            kill "$pid"
            rm "$pid_file"
        else
            echo "⚠️ $service_name process not found, cleaning up PID file"
            rm "$pid_file"
        fi
    fi
}

stop_service "backend"
stop_service "ai-service" 
stop_service "frontend"

# Kill any remaining processes
pkill -f "target/debug/euphorie" 2>/dev/null || true
pkill -f "python3 main.py" 2>/dev/null || true
pkill -f "vite.*5173" 2>/dev/null || true

echo "✅ Euphorie stopped"
