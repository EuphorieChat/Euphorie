import requests
import json
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Euphorie AI Service")

# Get EC2 public IP or domain
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://your-domain.com")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "https://localhost:5173", "https://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

@app.options("/api/vision/analyze")
@app.options("/api/chat")
async def options_handler():
    return {"message": "OK"}

@app.get("/")
@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "euphorie-ai",
        "jarvis_status": "active",
        "ollama_status": "connected" if check_ollama() else "disconnected",
        "timestamp": int(time.time())
    }

def check_ollama():
    try:
        response = requests.get('http://localhost:11434/api/version', timeout=5)
        return response.status_code == 200
    except:
        return False

@app.post("/api/chat")
async def chat(request: dict):
    message = request.get("message", "")
    user_name = request.get("user_name", "User")
    
    logger.info(f"💬 Chat from {user_name}: {message}")
    
    # Use Ollama for chat responses too
    try:
        response = requests.post('http://localhost:11434/api/generate',
            json={
                "model": "llama2",  # or mistral
                "prompt": f"You are Jarvis, an AI assistant in the Euphorie platform. User {user_name} says: {message}. Respond helpfully and conversationally.",
                "stream": False
            },
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            ai_response = result.get('response', '').strip()
        else:
            ai_response = f"I'm here to assist, {user_name}! I can help with coding, learning, creative work, and more."
    
    except Exception as e:
        logger.error(f"Chat error: {e}")
        ai_response = f"I'm here to assist, {user_name}! (Chat model temporarily unavailable)"
    
    return {
        "response": ai_response,
        "agent_name": "Jarvis",
        "confidence": 0.9,
        "timestamp": int(time.time())
    }

@app.post("/api/vision/analyze")
async def vision_analyze(request: dict):
    user_id = request.get('user_id', 'unknown')
    frame_data = request.get('frame')
    
    logger.info(f"👁️ Local vision analysis from user {user_id}")
    
    if not frame_data:
        return {"insight": None, "should_respond": False}
    
    try:
        # Send image to local Ollama LLaVA model
        response = requests.post('http://localhost:11434/api/generate',
            json={
                "model": "llava",
                "prompt": "Analyze this image and provide a brief, helpful insight about what you see. Focus on what assistance might be needed with coding, learning, or work tasks. Be concise and actionable.",
                "images": [frame_data],
                "stream": False
            },
            timeout=60  # Increased timeout for vision processing
        )
        
        if response.status_code == 200:
            result = response.json()
            insight = result.get('response', '').strip()
            
            logger.info(f"LLaVA Vision response: {insight[:50]}...")
            
            return {
                "insight": insight,
                "scene_description": "Local AI vision analysis",
                "should_respond": True,
                "confidence": 0.8,
                "timestamp": int(time.time())
            }
        else:
            logger.error(f"Ollama API error: {response.status_code}")
            return {
                "insight": "Local vision model not responding. Checking connection...",
                "should_respond": True,
                "confidence": 0.3
            }
            
    except requests.exceptions.ConnectionError:
        logger.error("Cannot connect to Ollama. Is it running?")
        return {
            "insight": "Local vision model offline. Starting Ollama service...",
            "should_respond": True,
            "confidence": 0.3
        }
    except requests.exceptions.Timeout:
        logger.error("Ollama request timed out")
        return {
            "insight": "Vision analysis taking longer than usual. Please try again.",
            "should_respond": True,
            "confidence": 0.3
        }
    except Exception as e:
        logger.error(f"Vision analysis error: {str(e)}")
        return {
            "insight": f"Vision analysis temporarily unavailable: {str(e)[:50]}",
            "should_respond": True,
            "confidence": 0.3
        }

if __name__ == "__main__":
    print("🚀 Starting Euphorie AI Service on EC2...")
    print("🤖 Jarvis is coming online...")
    print("🔧 CORS enabled for production frontend...")
    print("🔧 Local Ollama LLaVA vision integration active...")
    print("🌍 Running on all interfaces for EC2 deployment...")
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=False)