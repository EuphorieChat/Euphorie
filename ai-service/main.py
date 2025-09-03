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

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your domain
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Global model variables
smolvlm_processor = None
smolvlm_model = None
model_status = {"smolvlm": "loading", "jarvis": "active", "ollama": "connected"}

def load_smolvlm_model():
    """Load the SmolVLM-256M model for vision analysis"""
    global smolvlm_processor, smolvlm_model, model_status
    
    try:
        logger.info("🤖 Loading SmolVLM-256M model...")
        
        # Use the smaller, working model
        model_path = "HuggingFaceTB/SmolVLM-256M-Instruct"
        
        smolvlm_processor = AutoProcessor.from_pretrained(model_path, trust_remote_code=True)
        logger.info("✅ Processor loaded")
        
        smolvlm_model = AutoModelForImageTextToText.from_pretrained(
            model_path,
            torch_dtype=torch.float32,  # Use float32 for better CPU performance
            trust_remote_code=True,
            low_cpu_mem_usage=True,  # Optimize for low memory
            # Add CPU optimization
            device_map=None,  # Don't use device_map with CPU
        ).to('cpu')
        
        # Optimize for inference
        smolvlm_model.eval()
        
        logger.info("✅ SmolVLM-256M model loaded successfully!")
        model_status["smolvlm"] = "loaded"
        
    except Exception as e:
        logger.error(f"❌ Failed to load SmolVLM model: {e}")
        model_status["smolvlm"] = "failed"
        smolvlm_processor = None
        smolvlm_model = None

def analyze_with_smolvlm(image_data):
    """Analyze image using SmolVLM-256M with optimizations"""
    global smolvlm_processor, smolvlm_model
    
    if not smolvlm_processor or not smolvlm_model:
        return None
        
    try:
        start_time = time.time()
        
        # Decode and process image
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        
        # Resize image to reduce processing time
        image = image.resize((224, 224))  # Much smaller for faster processing
        
        # Use short, focused prompt for faster inference
        text = "<image>Describe briefly what you see."
        
        # Process inputs
        inputs = smolvlm_processor(
            images=image,
            text=text,
            return_tensors="pt"
        )
        
        # Generate response with aggressive optimization
        with torch.no_grad():
            generated_ids = smolvlm_model.generate(
                **inputs,
                max_new_tokens=15,  # Very short responses for speed
                do_sample=False,
                pad_token_id=smolvlm_processor.tokenizer.eos_token_id,
                # Add speed optimizations
                num_beams=1,  # No beam search
                early_stopping=True,
                use_cache=True,
            )
        
        # Decode response
        response_text = smolvlm_processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
        
        # Extract just the generated part
        if text in response_text:
            clean_response = response_text.replace(text, "").strip()
        else:
            clean_response = response_text
            
        inference_time = (time.time() - start_time) * 1000
        
        logger.info(f"SmolVLM-256M response ({inference_time:.0f}ms): {clean_response[:50]}...")
        
        return clean_response
        
    except Exception as e:
        logger.error(f"SmolVLM inference error: {e}")
        return None

def analyze_with_ollama(image_data, prompt):
    """Fallback to Ollama LLaVA if SmolVLM fails"""
    try:
        start_time = time.time()
        
        ollama_response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "llava",
                "prompt": prompt,
                "images": [image_data],
                "stream": False,
                "options": {
                    "temperature": 0.1,
                    "top_p": 0.9,
                    "num_predict": 50  # Short responses
                }
            },
            timeout=30
        )
        
        if ollama_response.status_code == 200:
            result = ollama_response.json()
            inference_time = (time.time() - start_time) * 1000
            logger.info(f"LLaVA fallback response ({inference_time:.0f}ms): {result.get('response', '')[:50]}...")
            return result.get("response", "")
        else:
            logger.error(f"Ollama request failed: {ollama_response.status_code}")
            return None
            
    except Exception as e:
        logger.error(f"Ollama analysis error: {e}")
        return None

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Starting Euphorie AI Service with SmolVLM-256M...")
    logger.info("🤖 Jarvis is coming online...")
    
    # Load SmolVLM model
    load_smolvlm_model()

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "euphorie-ai",
        "jarvis_status": model_status["jarvis"],
        "smolvlm_status": model_status["smolvlm"],
        "ollama_status": model_status["ollama"],
        "timestamp": int(time.time())
    }

@app.post("/api/vision/analyze")
async def analyze_vision(request: dict):
    try:
        frame_data = request.get("frame")
        user_id = request.get("user_id", "anonymous")
        
        if not frame_data:
            raise HTTPException(status_code=400, detail="No frame data provided")
        
        logger.info(f"👁️ Vision analysis from user {user_id}")
        
        # Try SmolVLM first
        smolvlm_result = analyze_with_smolvlm(frame_data)
        
        if smolvlm_result:
            # Determine if response is worth showing
            should_respond = len(smolvlm_result.strip()) > 10 and not any(
                phrase in smolvlm_result.lower() for phrase in 
                ["i can't", "unable to", "cannot determine", "unclear", "i don't see"]
            )
            
            return {
                "success": True,
                "insight": smolvlm_result,
                "should_respond": should_respond,
                "model_used": "smolvlm-256m",
                "timestamp": int(time.time())
            }
        
        # Fallback to Ollama if SmolVLM fails
        logger.info("SmolVLM failed, trying Ollama fallback...")
        ollama_result = analyze_with_ollama(frame_data, "Describe what you see in this image briefly.")
        
        if ollama_result:
            should_respond = len(ollama_result.strip()) > 10
            return {
                "success": True,
                "insight": ollama_result,
                "should_respond": should_respond,
                "model_used": "llava-fallback",
                "timestamp": int(time.time())
            }
        
        # Both failed
        return {
            "success": False,
            "insight": "Vision analysis temporarily unavailable",
            "should_respond": False,
            "model_used": "none",
            "timestamp": int(time.time())
        }
        
    except Exception as e:
        logger.error(f"Vision analysis error: {e}")
        raise HTTPException(status_code=500, detail="Vision analysis failed")

# Health check for individual services
@app.get("/api/jarvis/status")
async def jarvis_status():
    return {"status": "active", "message": "Jarvis is online and ready"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)