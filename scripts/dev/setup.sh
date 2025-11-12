#!/bin/bash

# Euphorie AI Vision Platform Setup Script for EC2
# Run this script after cloning the repository

set -e

echo "🚀 Setting up Euphorie AI Vision Platform..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install Python dependencies
sudo apt install python3-pip python3-venv nginx -y

# Create virtual environment for AI service
cd ai-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
cd ..

# Install Ollama
echo "📦 Installing Ollama..."
curl -fsSL https://ollama.ai/install.sh | sh

# Start Ollama service
sudo systemctl enable ollama
sudo systemctl start ollama

# Download AI models (this will take several minutes)
echo "🤖 Downloading AI models (this may take 10-15 minutes)..."
ollama pull llava    # Vision model (~4GB)
ollama pull llama2   # Chat model (~3.8GB)

# Set up Nginx configuration
echo "🌐 Configuring Nginx..."
sudo cp nginx/euphorie.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/euphorie.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Set up systemd service
echo "⚙️ Setting up systemd service..."
sudo cp systemd/euphorie-ai.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable euphorie-ai
sudo systemctl start euphorie-ai

# Check status
echo "✅ Installation complete! Checking services..."
echo ""
echo "Ollama status:"
sudo systemctl status ollama --no-pager -l
echo ""
echo "AI Service status:"
sudo systemctl status euphorie-ai --no-pager -l
echo ""
echo "Nginx status:"
sudo systemctl status nginx --no-pager -l

echo ""
echo "🎉 Euphorie AI Vision Platform is now running!"
echo "Visit http://$(curl -s ifconfig.me) to access the interface"
echo ""
echo "To monitor logs:"
echo "  AI Service: sudo journalctl -u euphorie-ai -f"
echo "  Nginx: sudo tail -f /var/log/nginx/access.log"
echo "  Ollama: sudo journalctl -u ollama -f"