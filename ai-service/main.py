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

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your domain
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
        "model_status": "smolvlm2" if check_smolvlm() else "loading",
        "timestamp": int(time.time())
    }

def check_ollama():
    try:
        response = requests.get('http://localhost:11434/api/version', timeout=5)
        return response.status_code == 200
    except:
        return False

def check_smolvlm():
    """Check if SmolVLM2 model is available"""
    try:
        response = requests.get('http://localhost:11434/api/tags', timeout=5)
        if response.status_code == 200:
            models = response.json().get('models', [])
            return any('smolvlm2' in model.get('name', '') for model in models)
    except:
        pass
    return False

@app.post("/api/chat")
async def chat(request: dict):
    message = request.get("message", "")
    user_name = request.get("user_name", "User")
    
    logger.info(f"💬 Chat from {user_name}: {message}")
    
    try:
        response = requests.post('http://localhost:11434/api/generate',
            json={
                "model": "llama2",
                "prompt": f"You are Jarvis, an AI assistant. User {user_name} says: {message}. Respond helpfully.",
                "stream": False
            },
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            ai_response = result.get('response', '').strip()
        else:
            ai_response = f"I'm here to assist, {user_name}! I can help with coding, learning, and creative work."
    
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
    
    logger.info(f"👁️ Vision analysis from user {user_id}")
    
    if not frame_data:
        return {"insight": None, "should_respond": False}
    
    try:
        # Try SmolVLM2 first, fallback to LLaVA
        model_to_use = "smolvlm2" if check_smolvlm() else "llava"
        
        logger.info(f"Using vision model: {model_to_use}")
        
        response = requests.post('http://localhost:11434/api/generate',
            json={
                "model": model_to_use,
                "prompt": "Analyze this image and provide a brief, helpful insight. Focus on what assistance might be needed with coding, learning, or work tasks. Be concise and actionable.",
                "images": [frame_data],
                "stream": False,
                "options": {
                    "num_ctx": 2048,  # Reduced context for efficiency
                    "temperature": 0.7
                }
            },
            timeout=120  # Reduced timeout for faster model
        )
        
        if response.status_code == 200:
            result = response.json()
            insight = result.get('response', '').strip()
            
            logger.info(f"{model_to_use.upper()} Vision response: {insight[:50]}...")
            
            return {
                "insight": insight,
                "scene_description": f"{model_to_use} vision analysis",
                "should_respond": True,
                "confidence": 0.8,
                "model_used": model_to_use,
                "timestamp": int(time.time())
            }
        else:
            logger.error(f"Ollama API error: {response.status_code}")
            return {
                "insight": "Vision model not responding.",
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
    print("🤖 Jarvis is coming online with SmolVLM2...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)