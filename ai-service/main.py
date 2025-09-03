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
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Global model variables
smolvlm_processor = None
smolvlm_model = None
model_status = {"smolvlm": "loading", "jarvis": "active", "ollama": "connected"}

def load_smolvlm_model():
    """Load SmolVLM-256M as backup model"""
    global smolvlm_processor, smolvlm_model, model_status
    
    try:
        logger.info("Loading SmolVLM-256M backup model...")
        
        model_path = "HuggingFaceTB/SmolVLM-256M-Instruct"
        
        smolvlm_processor = AutoProcessor.from_pretrained(model_path, trust_remote_code=True)
        smolvlm_model = AutoModelForImageTextToText.from_pretrained(
            model_path,
            torch_dtype=torch.float32,
            trust_remote_code=True,
            low_cpu_mem_usage=True,
        ).to('cpu')
        
        smolvlm_model.eval()
        logger.info("✅ SmolVLM-256M backup loaded")
        model_status["smolvlm"] = "loaded"
        
    except Exception as e:
        logger.error(f"❌ Failed to load SmolVLM backup: {e}")
        model_status["smolvlm"] = "failed"
        smolvlm_processor = None
        smolvlm_model = None

def analyze_with_moondream(image_data, prompt):
    """Primary analysis using Moondream (fastest)"""
    try:
        start_time = time.time()
        
        moondream_response = requests.post(
            "http://localhost:11434/api/generate",
            json={
                "model": "moondream",
                "prompt": prompt,
                "images": [image_data],
                "stream": False,
                "options": {
                    "temperature": 0.1,
                    "top_p": 0.9,
                    "num_predict": 40,  # Short responses for speed
                    "num_ctx": 512,     # Reduced context for speed
                }
            },
            timeout=15  # 15 second timeout
        )
        
        if moondream_response.status_code == 200:
            result = moondream_response.json()
            inference_time = (time.time() - start_time) * 1000
            response_text = result.get("response", "").strip()
            logger.info(f"Moondream response ({inference_time:.0f}ms): {response_text[:50]}...")
            return response_text
        else:
            logger.error(f"Moondream request failed: {moondream_response.status_code}")
            return None
            
    except Exception as e:
        logger.error(f"Moondream analysis error: {e}")
        return None

def analyze_with_smolvlm(image_data):
    """Backup analysis using SmolVLM-256M (slower)"""
    global smolvlm_processor, smolvlm_model
    
    if not smolvlm_processor or not smolvlm_model:
        return None
        
    try:
        start_time = time.time()
        
        # Decode and process image
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        
        # Aggressive size reduction for speed
        image = image.resize((160, 160))  # Even smaller
        
        text = "<image>What do you see?"
        
        inputs = smolvlm_processor(
            images=image,
            text=text,
            return_tensors="pt"
        )
        
        with torch.no_grad():
            generated_ids = smolvlm_model.generate(
                **inputs,
                max_new_tokens=10,  # Very short for speed
                do_sample=False,
                pad_token_id=smolvlm_processor.tokenizer.eos_token_id,
                num_beams=1,
                use_cache=True,
            )
        
        response_text = smolvlm_processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
        
        if text in response_text:
            clean_response = response_text.replace(text, "").strip()
        else:
            clean_response = response_text
            
        inference_time = (time.time() - start_time) * 1000
        logger.info(f"SmolVLM backup response ({inference_time:.0f}ms): {clean_response[:50]}...")
        
        return clean_response
        
    except Exception as e:
        logger.error(f"SmolVLM backup error: {e}")
        return None

def analyze_with_llava_fallback(image_data, prompt):
    """Final fallback to LLaVA"""
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
                    "num_predict": 30
                }
            },
            timeout=20
        )
        
        if ollama_response.status_code == 200:
            result = ollama_response.json()
            inference_time = (time.time() - start_time) * 1000
            logger.info(f"LLaVA fallback response ({inference_time:.0f}ms): {result.get('response', '')[:50]}...")
            return result.get("response", "")
        else:
            return None
            
    except Exception as e:
        logger.error(f"LLaVA fallback error: {e}")
        return None

@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Starting Euphorie AI Service with Moondream primary...")
    logger.info("🤖 Jarvis is coming online...")
    
    # Load SmolVLM as backup only
    load_smolvlm_model()
    
    # Test Moondream availability
    try:
        test_response = requests.get("http://localhost:11434/api/tags", timeout=5)
        if test_response.status_code == 200:
            models = test_response.json().get("models", [])
            moondream_available = any("moondream" in model.get("name", "") for model in models)
            if moondream_available:
                logger.info("✅ Moondream model available")
                model_status["ollama"] = "moondream_ready"
            else:
                logger.warning("⚠️  Moondream not found in Ollama")
                model_status["ollama"] = "llava_only"
        else:
            logger.error("❌ Ollama not responding")
            model_status["ollama"] = "disconnected"
    except Exception as e:
        logger.error(f"❌ Ollama check failed: {e}")
        model_status["ollama"] = "disconnected"

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "euphorie-ai",
        "jarvis_status": model_status["jarvis"],
        "smolvlm_status": model_status["smolvlm"], 
        "ollama_status": model_status["ollama"],
        "primary_model": "moondream",
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
        
        # Priority 1: Try Moondream (fastest)
        moondream_result = analyze_with_moondream(frame_data, "Describe what you see in this image briefly.")
        
        if moondream_result:
            should_respond = len(moondream_result.strip()) > 5
            return {
                "success": True,
                "insight": moondream_result,
                "should_respond": should_respond,
                "model_used": "moondream",
                "timestamp": int(time.time())
            }
        
        # Priority 2: Try SmolVLM backup (slower)
        logger.info("Moondream failed, trying SmolVLM backup...")
        smolvlm_result = analyze_with_smolvlm(frame_data)
        
        if smolvlm_result:
            should_respond = len(smolvlm_result.strip()) > 5
            return {
                "success": True,
                "insight": smolvlm_result,
                "should_respond": should_respond,
                "model_used": "smolvlm-256m",
                "timestamp": int(time.time())
            }
        
        # Priority 3: LLaVA final fallback
        logger.info("SmolVLM failed, trying LLaVA final fallback...")
        llava_result = analyze_with_llava_fallback(frame_data, "Describe what you see in this image.")
        
        if llava_result:
            should_respond = len(llava_result.strip()) > 5
            return {
                "success": True,
                "insight": llava_result,
                "should_respond": should_respond,
                "model_used": "llava-fallback",
                "timestamp": int(time.time())
            }
        
        # All models failed
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

@app.get("/api/jarvis/status")
async def jarvis_status():
    return {"status": "active", "message": "Jarvis is online and ready"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)