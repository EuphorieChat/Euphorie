#!/bin/bash

set -e

echo "🚀 Starting Euphorie - Direct 3D Experience..."

# Check dependencies
check_dependencies() {
    echo "🔍 Checking dependencies..."
    
    if ! command -v cargo &> /dev/null; then
        echo "❌ Rust/Cargo is required but not installed"
        echo "💡 Run: source ~/.cargo/env"
        exit 1
    fi
    
    if ! command -v python3 &> /dev/null; then
        echo "❌ Python 3 is required but not installed"
        exit 1
    fi
    
    echo "✅ All dependencies found"
}

# Set up environment
setup_env() {
    echo "�� Setting up environment..."
    
    if [ ! -f .env ]; then
        cat > .env << 'ENVEOF'
# Euphorie Configuration
NODE_ENV=development
AI_SERVICE_URL=http://localhost:8001
OPENAI_API_KEY=your_openai_key_here
ANTHROPIC_API_KEY=your_anthropic_key_here
RUST_LOG=info
ENVEOF
        echo "📝 Created .env file"
    fi
    
    export $(cat .env | grep -v '#' | awk '/=/ {print $1}')
}

# Install dependencies
install_deps() {
    if [ "$1" = "--first-run" ]; then
        echo "📦 Installing dependencies..."
        
        # Backend dependencies
        cd backend
        cargo build --release
        cd ..
        
        # AI service dependencies
        cd ai-service
        pip3 install -r requirements.txt
        cd ..
        
        echo "✅ Dependencies installed"
    fi
}

# Start services
start_services() {
    echo "🌟 Starting Euphorie services..."
    mkdir -p logs
    
    # Start Rust backend
    echo "🦀 Starting backend (port 8000)..."
    cd backend
    cargo run --release > ../logs/backend.log 2>&1 &
    echo $! > ../logs/backend.pid
    cd ..
    
    # Start AI service
    echo "🤖 Starting AI service (port 8001)..."
    cd ai-service
    python3 main.py > ../logs/ai-service.log 2>&1 &
    echo $! > ../logs/ai-service.pid
    cd ..
    
    # Start frontend
    echo "🎨 Starting frontend (port 5173)..."
    cd frontend
    python3 -m http.server 5173 > ../logs/frontend.log 2>&1 &
    echo $! > ../logs/frontend.pid
    cd ..
    
    sleep 3
}

# Check health
check_health() {
    echo "🏥 Checking services..."
    
    if curl -s http://localhost:8000/api/health > /dev/null; then
        echo "✅ Backend healthy"
    else
        echo "⚠️ Backend not responding (check logs/backend.log)"
    fi
    
    if curl -s http://localhost:8001/health > /dev/null; then
        echo "✅ AI service healthy"
    else
        echo "⚠️ AI service not responding (check logs/ai-service.log)"
    fi
    
    if curl -s http://localhost:5173 > /dev/null; then
        echo "✅ Frontend healthy"
    else
        echo "⚠️ Frontend not responding (check logs/frontend.log)"
    fi
}

# Show info
show_info() {
    echo ""
    echo "🎊 EUPHORIE IS LIVE!"
    echo ""
    echo "🌐 Visit: http://localhost:5173"
    echo ""
    echo "✨ Experience:"
    echo "   • Land directly in 3D space"
    echo "   • Chat with AI agents & humans"
    echo "   • Enable camera for AI vision"
    echo "   • Get contextual assistance"
    echo ""
    echo "🔧 Services:"
    echo "   • Frontend:   http://localhost:5173"
    echo "   • Backend:    http://localhost:8000"
    echo "   • AI Service: http://localhost:8001"
    echo ""
    echo "📋 Logs:"
    echo "   • Backend:    tail -f logs/backend.log"
    echo "   • AI Service: tail -f logs/ai-service.log"
    echo "   • Frontend:   tail -f logs/frontend.log"
    echo ""
    echo "�� Stop: ./scripts/dev/stop-local.sh"
    echo "💡 Press Ctrl+C to stop all services"
}

# Cleanup
cleanup() {
    echo "🧹 Cleaning up..."
    [ -f logs/backend.pid ] && kill $(cat logs/backend.pid) 2>/dev/null && rm logs/backend.pid
    [ -f logs/ai-service.pid ] && kill $(cat logs/ai-service.pid) 2>/dev/null && rm logs/ai-service.pid
    [ -f logs/frontend.pid ] && kill $(cat logs/frontend.pid) 2>/dev/null && rm logs/frontend.pid
}

trap cleanup EXIT

# Main execution
main() {
    cd "$(dirname "$0")/../.."
    
    check_dependencies
    setup_env
    install_deps "$1"
    start_services
    
    sleep 5
    check_health
    show_info
    
    wait
}

main "$@"
