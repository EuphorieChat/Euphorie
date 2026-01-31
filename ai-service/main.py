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
OLLAMA_CHAT_URL = "http://localhost:11434/api/chat"
VISION_MODEL = "moondream"
CHAT_MODEL = "tinyllama"
VISION_TIMEOUT = 90
CHAT_TIMEOUT = 60

# Store recent context for conversations
conversation_context = {}

@app.on_event("startup")
async def startup_event():
    logger.info("Starting Euphorie AI Service...")
    logger.info(f"Vision model: {VISION_MODEL}")
    logger.info(f"Chat model: {CHAT_MODEL}")
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
        "chat_model": CHAT_MODEL,
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
            timeout=VISION_TIMEOUT
        )
        elapsed = time.time() - start_time
        logger.info(f"Ollama responded in {elapsed:.1f}s")
        if ollama_response.status_code == 200:
            result = ollama_response.json()
            response_text = result.get("response", "").strip()
            if response_text:
                # Store context for this user
                conversation_context[user_id] = {
                    "last_vision": response_text,
                    "timestamp": time.time()
                }
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
    """Chat with Jarvis AI assistant"""
    start_time = time.time()
    try:
        message = request.get("message", "")
        user_id = request.get("user_id", "anonymous")
        user_name = request.get("user_name", "User")
        include_vision = request.get("include_vision", False)
        
        if not message:
            return {"response": "I did not receive a message. How can I help you?", "agent_name": "Jarvis", "timestamp": int(time.time())}
        
        logger.info(f"Chat from {user_name} ({user_id}): {message[:50]}...")
        
        # Build context with vision if available
        system_context = "You are Jarvis, a helpful and friendly AI assistant. You are concise but thorough. You help users with questions, tasks, and conversations."
        
        # Add vision context if user has recent analysis
        vision_context = ""
        if user_id in conversation_context:
            ctx = conversation_context[user_id]
            # Only use vision context if it's less than 5 minutes old
            if time.time() - ctx["timestamp"] < 300:
                vision_context = f"\n\nYou can also see what the user is looking at. Current view: {ctx['last_vision']}"
        
        prompt = f"{system_context}{vision_context}\n\nUser {user_name} says: {message}\n\nJarvis:"
        
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": CHAT_MODEL,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "num_predict": 50,
                    "temperature": 0.7,
                    "top_p": 0.9
                }
            },
            timeout=CHAT_TIMEOUT
        )
        
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            result = response.json()
            ai_response = result.get("response", "").strip()
            # Clean up response
            if ai_response.startswith("Jarvis:"):
                ai_response = ai_response[7:].strip()
            logger.info(f"Chat response in {elapsed:.1f}s: {ai_response[:50]}...")
            return {
                "response": ai_response if ai_response else "I'm here to help! What would you like to know?",
                "agent_name": "Jarvis",
                "model_used": CHAT_MODEL,
                "processing_time": round(elapsed, 1),
                "has_vision_context": bool(vision_context),
                "timestamp": int(time.time())
            }
        
        return {
            "response": "I'm here to help! How can I assist you?",
            "agent_name": "Jarvis",
            "timestamp": int(time.time())
        }
        
    except requests.exceptions.Timeout:
        logger.error("Chat request timed out")
        return {
            "response": "I'm thinking... please give me a moment and try again.",
            "agent_name": "Jarvis",
            "timestamp": int(time.time())
        }
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return {
            "response": "I encountered an error. Please try again!",
            "agent_name": "Jarvis",
            "timestamp": int(time.time())
        }

@app.post("/api/chat/vision")
async def chat_with_vision(request: dict):
    """Ask a question about an image"""
    start_time = time.time()
    try:
        message = request.get("message", "What do you see?")
        frame_data = request.get("frame")
        user_id = request.get("user_id", "anonymous")
        
        if not frame_data:
            raise HTTPException(status_code=400, detail="No image provided")
        
        logger.info(f"Vision chat from {user_id}: {message[:50]}...")
        
        if "," in frame_data:
            frame_data = frame_data.split(",")[1]
        
        # Use moondream for vision questions
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": VISION_MODEL,
                "prompt": message,
                "images": [frame_data],
                "stream": False,
                "options": {
                    "num_predict": 150,
                    "temperature": 0.5
                }
            },
            timeout=VISION_TIMEOUT
        )
        
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            result = response.json()
            ai_response = result.get("response", "").strip()
            logger.info(f"Vision chat response in {elapsed:.1f}s")
            return {
                "response": ai_response if ai_response else "I could not analyze the image clearly.",
                "agent_name": "Jarvis",
                "model_used": VISION_MODEL,
                "processing_time": round(elapsed, 1),
                "timestamp": int(time.time())
            }
        
        return {
            "response": "I had trouble seeing the image. Please try again.",
            "agent_name": "Jarvis",
            "timestamp": int(time.time())
        }
        
    except requests.exceptions.Timeout:
        return {
            "response": "The image is taking a while to process. Please try again.",
            "agent_name": "Jarvis",
            "timestamp": int(time.time())
        }
    except Exception as e:
        logger.error(f"Vision chat error: {e}")
        return {
            "response": "I encountered an error analyzing the image.",
            "agent_name": "Jarvis",
            "timestamp": int(time.time())
        }

@app.post("/api/chat/clear")
async def clear_context(request: dict):
    """Clear conversation context for a user"""
    user_id = request.get("user_id", "anonymous")
    if user_id in conversation_context:
        del conversation_context[user_id]
    return {"success": True, "message": "Context cleared"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
