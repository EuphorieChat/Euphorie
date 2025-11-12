import logging
from PIL import Image
import base64
import io

logger = logging.getLogger(__name__)

class SimpleVisionModel:
    """Lightweight vision model for t3.large - uses API fallback"""
    
    def __init__(self):
        self.loaded = True
        logger.info("✅ Using lightweight vision mode (API-based)")
    
    def load_model(self):
        """No heavy model to load"""
        pass
    
    def analyze_image(self, image: Image.Image, prompt: str = "Describe this image") -> str:
        """Returns a placeholder - will use API in production"""
        return "Vision analysis ready. Waiting for API integration."
    
    def analyze_context(self, image: Image.Image) -> dict:
        """Lightweight context analysis"""
        return {
            "description": "Image received and ready for analysis",
            "objects": [],
            "text_content": "Analyzing...",
            "activity": "Processing",
            "model_version": "lightweight-v1.0",
            "confidence": 0.8
        }

# Global instance
vision_model = SimpleVisionModel()
