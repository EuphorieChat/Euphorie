import requests
import json
import base64
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "euphorie-ai",
        "jarvis_status": "active",
        "ollama_status": "connected",
        "timestamp": int(time.time())
    }

@app.post("/api/vision/analyze")
async def analyze_vision(request: dict):
    try:
        frame_data = request.get("frame")
        user_id = request.get("user_id", "anonymous")
        
        if not frame_data:
            raise HTTPException(status_code=400, detail="No frame data provided")
        
        logger.info(f"Vision analysis from user {user_id}")
        
        # Simple LLaVA call with shorter timeout
        ollama_response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "llava",
                "prompt": "Describe this image in one sentence.",
                "images": [frame_data],
                "stream": False,
                "options": {
                    "num_predict": 50,
                    "temperature": 0.1
                }
            },
            timeout=25  # 25 second timeout
        )
        
        if ollama_response.status_code == 200:
            result = ollama_response.json()
            response_text = result.get("response", "")
            
            return {
                "success": True,
                "insight": response_text,
                "should_respond": True,
                "model_used": "llava",
                "timestamp": int(time.time())
            }
        else:
            return {
                "success": False,
                "insight": "Vision analysis unavailable",
                "should_respond": False,
                "model_used": "none",
                "timestamp": int(time.time())
            }
        
    except Exception as e:
        logger.error(f"Vision analysis error: {e}")
        return {
            "success": False,
            "insight": "Analysis timeout",
            "should_respond": False,
            "model_used": "error",
            "timestamp": int(time.time())
        }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)