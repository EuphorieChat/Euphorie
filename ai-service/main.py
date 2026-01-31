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

# Configuration
OLLAMA_URL = "http://localhost:11434/api/generate"
VISION_MODEL = "moondream"
TIMEOUT_SECONDS = 90

@app.on_event("startup")
async def startup_event():
    logger.info("Starting Euphorie AI Service...")
    logger.info(f"Using vision model: {VISION_MODEL}")
    try:
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        if response.status_code == 200:
            models = [m["name"] for m in response.json().get("models", [])]
            logger.info(f"Ollama connected. Models: {models}")
    except Exception as e:
        logger.error(f"Cannot connect to Ollama: {e}")

@app.get("/health")
async def health_check():
    ollama_ok = False
    try:
        response = requests.get("http://localhost:11434/api/tags", timeout=5)
        ollama_ok = response.status_code == 200
    except:
        pass
    return {
        "status": "healthy" if ollama_ok else "degraded",
        "service": "euphorie-ai",
        "jarvis_status": "active",
        "vision_model": VISION_MODEL,
        "ollama_connected": ollama_ok,
        "timestamp": int(time.time())
    }

@app.post("/api/vision/analyze")
async def analyze_vision(request: dict):
    start_time = time.time()
    try:
        frame_data = request.get("frame")
        user_id = request.get("user_id", "anonymous")
        if not frame_data:
            raise HTTPException(status_code=400, detail="No frame data provided")
        logger.info(f"Vision analysis request from user: {user_id}")
        if "," in frame_data:
            frame_data = frame_data.split(",")[1]
        logger.info(f"Sending to {VISION_MODEL}...")
        ollama_response = requests.post(
            OLLAMA_URL,
            json={
                "model": VISION_MODEL,
                "prompt": "Describe what you see in this image. Focus on the main subjects, activities, and any text visible. Be concise.",
                "images": [frame_data],
                "stream": False,
                "options": {"num_predict": 100, "temperature": 0.3}
            },
            timeout=TIMEOUT_SECONDS
        )
        elapsed = time.time() - start_time
        logger.info(f"Ollama responded in {elapsed:.1f}s")
        if ollama_response.status_code == 200:
            result = ollama_response.json()
            response_text = result.get("response", "").strip()
            if response_text:
                logger.info(f"Analysis complete: {response_text[:50]}...")
                return {
                    "success": True,
                    "insight": response_text,
                    "should_respond": True,
                    "model_used": VISION_MODEL,
                    "processing_time": round(elapsed, 1),
                    "timestamp": int(time.time())
                }
        return {
            "success": False,
            "insight": "Could not analyze image",
            "should_respond": False,
            "model_used": VISION_MODEL,
            "timestamp": int(time.time())
        }
    except requests.exceptions.Timeout:
        return {
            "success": False,
            "insight": "Analysis taking longer than usual. Try again.",
            "should_respond": False,
            "model_used": "timeout",
            "timestamp": int(time.time())
        }
    except Exception as e:
        logger.error(f"Vision analysis error: {e}")
        return {
            "success": False,
            "insight": "Analysis error",
            "should_respond": False,
            "model_used": "error",
            "timestamp": int(time.time())
        }

@app.post("/api/chat")
async def chat(request: dict):
    try:
        message = request.get("message", "")
        user_name = request.get("user_name", "User")
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": "llama2",
                "prompt": f"You are Jarvis, a helpful AI assistant. {user_name} says: {message}. Respond helpfully.",
                "stream": False,
                "options": {"num_predict": 150, "temperature": 0.7}
            },
            timeout=60
        )
        if response.status_code == 200:
            result = response.json()
            return {"response": result.get("response", "How can I help?"), "agent_name": "Jarvis", "timestamp": int(time.time())}
        return {"response": "How can I help you?", "agent_name": "Jarvis", "timestamp": int(time.time())}
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return {"response": "I am here to assist!", "agent_name": "Jarvis", "timestamp": int(time.time())}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
