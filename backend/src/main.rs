from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
import time
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Euphorie AI Service")

# Add CORS middleware to handle cross-origin requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://localhost:5173", "https://127.0.0.1:5173", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    user_name: str
    user_id: str
    room_id: str
    timestamp: int

class ChatResponse(BaseModel):
    response: str
    agent_name: str
    confidence: float
    timestamp: int

@app.get("/")
@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "service": "euphorie-ai",
        "jarvis_status": "active",
        "timestamp": int(time.time())
    }

@app.post("/api/chat")
async def chat(request: dict):
    message = request.get("message", "")
    user_name = request.get("user_name", "User")
    
    logger.info(f"💬 Chat from {user_name}: {message}")
    
    # Smart contextual responses
    message_lower = message.lower()
    
    if any(word in message_lower for word in ["hello", "hi", "hey"]):
        response = f"Hello {user_name}! I'm Jarvis, your magical AI assistant in Euphorie. I can help with coding, learning, creative projects and more!"
    elif any(word in message_lower for word in ["camera", "vision", "see"]):
        response = "With AI Vision enabled, I can see what you're working on and provide contextual help - perfect for debugging code or explaining documents!"
    elif any(word in message_lower for word in ["code", "debug", "programming", "error"]):
        response = "I'd love to help with coding! Enable camera vision so I can see your screen and help debug issues, explain code, or suggest improvements."
    elif any(word in message_lower for word in ["learn", "study", "explain", "help"]):
        response = "I'm here to help you learn! Enable camera vision and I can even assist with textbooks, documents, or any learning materials you're reading."
    elif any(word in message_lower for word in ["thank"]):
        response = f"You're very welcome, {user_name}! I'm always here to help however I can."
    elif any(word in message_lower for word in ["genie", "magic", "wizard"]):
        response = f"Indeed, {user_name}! I am your digital genie, floating here with magical powers to assist you. My crown and energy rings aren't just for show - they represent my readiness to grant your wishes for knowledge and help!"
    elif any(word in message_lower for word in ["beautiful", "cool", "awesome", "amazing"]):
        response = f"Thank you, {user_name}! I do try to look my best with my ethereal form and swirling energy. Beauty and function combined - that's the Euphorie way!"
    else:
        response = f"I'm here to assist, {user_name}! I can help with coding, learning, creative work, and more. Enable AI Vision for contextual help based on what you show me!"
    
    return {
        "response": response,
        "agent_name": "Jarvis",
        "confidence": 0.9,
        "timestamp": int(time.time())
    }

@app.post("/api/vision/analyze")
async def vision_analyze(request: dict):
    user_id = request.get('user_id', 'unknown')
    logger.info(f"👁️ Vision analysis from user {user_id}")
    
    # Mock vision insights with more variety
    insights = [
        "I can see you're at your workspace! I'm ready to help with any coding or learning questions.",
        "I notice you're working on something interesting. Feel free to ask me about what you're doing!",
        "I see your computer setup. I can help with debugging, explanations, or project guidance!",
        "Looks like you're working hard! Let me know if you need assistance with anything on your screen.",
        "I can see some text and graphics. If you need help understanding or working with any content, just ask!",
        "Your workspace looks productive! I'm here whenever you need help with what you're working on.",
        None,  # Sometimes no insight
        None,  # Sometimes no insight
    ]
    
    import random
    insight = random.choice(insights)
    
    return {
        "insight": insight,
        "scene_description": "I can see a workspace with computer and person",
        "objects_detected": ["computer", "desk", "person", "screen"],
        "should_respond": insight is not None,
        "confidence": 0.8,
        "timestamp": int(time.time())
    }

if __name__ == "__main__":
    print("🚀 Starting Euphorie AI Service...")
    print("🤖 Jarvis is coming online...")
    print("🔧 CORS enabled for HTTPS frontend...")
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=False)