import requests
import json
import os
import base64
import io
from PIL import Image
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import time
import logging
import torch
from transformers import AutoProcessor, AutoModelForImageTextToText

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Euphorie AI Service")

# Global variables for model
model = None
processor = None
model_loaded = False

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

def load_smolvlm_model():
    """Load SmolVLM2 model on startup"""
    global model, processor, model_loaded
    
    try:
        logger.info("🤖 Loading SmolVLM2 model...")
        
        # Use the 500M version for t3.large (more memory efficient)
        model_path = "HuggingFaceTB/SmolVLM2-1.7B-Instruct"
        
        processor = AutoProcessor.from_pretrained(model_path, trust_remote_code=True)
        
        # CPU inference settings for t3.large
        model = AutoModelForImageTextToText.from_pretrained(
            model_path,
            torch_dtype=torch.float32,  # Use float32 for CPU
            device_map="cpu",
            trust_remote_code=True
        )
        
        model_loaded = True
        logger.info("✅ SmolVLM2 model loaded successfully!")
        
    except Exception as e:
        logger.error(f"❌ Failed to load SmolVLM2: {e}")
        model_loaded = False

def analyze_image_with_smolvlm(image_data, prompt):
    """Analyze image using SmolVLM2"""
    global model, processor, model_loaded
    
    if not model_loaded:
        return "Model not loaded", False
    
    try:
        # Decode base64 image
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        
        # Prepare messages for chat template
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "image", "image": image},
                    {"type": "text", "text": prompt}
                ]
            }
        ]
        
        # Apply chat template and prepare inputs
        inputs = processor.apply_chat_template(
            messages,
            add_generation_prompt=True,
            tokenize=True,
            return_dict=True,
            return_tensors="pt"
        )
        
        # Generate response
        with torch.no_grad():
            generated_ids = model.generate(
                **inputs,
                do_sample=False,
                max_new_tokens=128,
                pad_token_id=processor.tokenizer.eos_token_id
            )
            
        # Decode response
        response = processor.batch_decode(
            generated_ids,
            skip_special_tokens=True
        )[0]
        
        # Extract only the assistant's response
        if "assistant\n" in response:
            response = response.split("assistant\n")[-1].strip()
        
        return response, True
        
    except Exception as e:
        logger.error(f"SmolVLM analysis error: {e}")
        return f"Analysis error: {str(e)}", False

@app.on_event("startup")
async def startup_event():
    """Load model on startup"""
    load_smolvlm_model()

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
        "smolvlm_status": "loaded" if model_loaded else "loading",
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
    
    prompt = "Analyze this image and provide a brief, helpful insight. Focus on what assistance might be needed with coding, learning, or work tasks. Be concise and actionable."
    
    # Try SmolVLM2 first
    if model_loaded:
        insight, success = analyze_image_with_smolvlm(frame_data, prompt)
        
        if success:
            logger.info(f"SmolVLM2 response: {insight[:50]}...")
            return {
                "insight": insight,
                "scene_description": "SmolVLM2 vision analysis",
                "should_respond": True,
                "confidence": 0.9,
                "model_used": "smolvlm2",
                "timestamp": int(time.time())
            }
    
    # Fallback to Ollama LLaVA if SmolVLM2 fails
    try:
        response = requests.post('http://localhost:11434/api/generate',
            json={
                "model": "llava",
                "prompt": prompt,
                "images": [frame_data],
                "stream": False
            },
            timeout=120
        )
        
        if response.status_code == 200:
            result = response.json()
            insight = result.get('response', '').strip()
            
            return {
                "insight": insight,
                "scene_description": "LLaVA fallback analysis",
                "should_respond": True,
                "confidence": 0.7,
                "model_used": "llava_fallback",
                "timestamp": int(time.time())
            }
    
    except Exception as e:
        logger.error(f"Vision analysis error: {str(e)}")
    
    return {
        "insight": "Vision analysis temporarily unavailable",
        "should_respond": True,
        "confidence": 0.3
    }

if __name__ == "__main__":
    print("🚀 Starting Euphorie AI Service with SmolVLM2...")
    print("🤖 Jarvis is coming online...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)