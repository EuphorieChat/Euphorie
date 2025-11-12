import requests
import json
import base64
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import time
import logging
from PIL import Image
import io

# Import your enhanced vision model
from vision.euphorie_vision import vision_model

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

# Load model on startup
@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Starting Euphorie AI Service...")
    try:
        vision_model.load_model()
        logger.info("✅ Enhanced Vision Model loaded!")
    except Exception as e:
        logger.error(f"⚠️ Could not load vision model: {e}")
        logger.info("Falling back to Ollama if available")

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "euphorie-ai",
        "jarvis_status": "active",
        "vision_model": "enhanced-v2.0" if vision_model.loaded else "ollama-fallback",
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

        # Decode base64 image
        try:
            image_bytes = base64.b64decode(frame_data.split(',')[1] if ',' in frame_data else frame_data)
            image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        except Exception as e:
            logger.error(f"Image decode error: {e}")
            raise HTTPException(status_code=400, detail="Invalid image data")

        # Try enhanced model first
        if vision_model.loaded:
            try:
                logger.info("Using Euphorie Enhanced Vision Model")
                
                # Get comprehensive analysis
                analysis = vision_model.analyze_context(image)
                
                return {
                    "success": True,
                    "insight": analysis["description"],
                    "detailed_analysis": {
                        "objects": analysis["objects"],
                        "text_content": analysis["text_content"],
                        "activity": analysis["activity"]
                    },
                    "should_respond": True,
                    "model_used": "euphorie-enhanced-v2",
                    "timestamp": int(time.time())
                }
            except Exception as e:
                logger.error(f"Enhanced model error: {e}, falling back to Ollama")
        
        # Fallback to Ollama
        logger.info("Using Ollama fallback")
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
            timeout=25
        )

        if ollama_response.status_code == 200:
            result = ollama_response.json()
            response_text = result.get("response", "")

            return {
                "success": True,
                "insight": response_text,
                "should_respond": True,
                "model_used": "llava-ollama",
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

@app.post("/api/vision/quick-analysis")
async def quick_analysis(request: dict):
    '''Fast analysis for real-time streaming'''
    try:
        frame_data = request.get("frame")
        
        if not frame_data:
            raise HTTPException(status_code=400, detail="No frame data provided")

        image_bytes = base64.b64decode(frame_data.split(',')[1] if ',' in frame_data else frame_data)
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')

        if vision_model.loaded:
            description = vision_model.analyze_image(image, "Briefly describe what you see.")
            
            return {
                "success": True,
                "description": description,
                "model_used": "euphorie-enhanced-v2"
            }
        else:
            raise HTTPException(status_code=503, detail="Vision model not loaded")

    except Exception as e:
        logger.error(f"Quick analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
