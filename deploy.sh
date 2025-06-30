#!/bin/bash
set -e

echo "🚀 Deploying Euphorie Chat Platform..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Pull latest changes
echo -e "${YELLOW}�� Pulling latest changes from GitHub...${NC}"
git pull origin main

# Navigate to backend
cd backend

# Check if virtual environment exists
if [ ! -d "../venv" ]; then
    echo -e "${YELLOW}🔧 Creating virtual environment...${NC}"
    cd ..
    python3 -m venv venv
    cd backend
fi

# Activate virtual environment
echo -e "${YELLOW}🐍 Activating virtual environment...${NC}"
source ../venv/bin/activate

# Install/update dependencies (use pip3 for compatibility)
echo -e "${YELLOW}📦 Installing Python dependencies...${NC}"
pip3 install -r requirements.txt

# Run migrations
echo -e "${YELLOW}🗄️ Running database migrations...${NC}"
python3 manage.py makemigrations
python3 manage.py migrate

# Collect static files
echo -e "${YELLOW}📁 Collecting static files...${NC}"
python3 manage.py collectstatic --noinput

# Build Rust websocket server
echo -e "${YELLOW}🦀 Building Rust websocket server...${NC}"
cd ../websocket-server
cargo build --release

# Return to project root
cd ..

echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo -e "${GREEN}�� Your Euphorie chat platform is ready!${NC}"
