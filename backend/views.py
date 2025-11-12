"""
Euphorie AI Backend - Complete Views
All API endpoints + AI vision service in one file!
"""

import logging
import base64
import io
import time
from PIL import Image
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

# AI/ML imports
import torch
from transformers import BlipProcessor, BlipForConditionalGeneration

logger = logging.getLogger('vision')

# ============================================
# AI Vision Service (Local BLIP Model)
# ============================================

class VisionService:
    """Local AI Vision using BLIP model - No API costs!"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.initialized = False
        return cls._instance
    
    def __init__(self):
        if not self.initialized:
            self.model = None
            self.processor = None
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            self.is_loaded = False
            self.model_name = "Salesforce/blip-image-captioning-base"
            self.load_model()
            self.initialized = True
    
    def load_model(self):
        """Load BLIP model for image captioning"""
        try:
            logger.info(f"🤖 Loading BLIP model on {self.device}...")
            
            self.processor = BlipProcessor.from_pretrained(self.model_name)
            self.model = BlipForConditionalGeneration.from_pretrained(
                self.model_name
            ).to(self.device)
            
            self.is_loaded = True
            logger.info("✅ BLIP model loaded successfully!")
            
        except Exception as e:
            logger.error(f"⚠️ Could not load BLIP model: {e}")
            logger.info("Will use fallback descriptions")
            self.is_loaded = False
    
    def analyze(self, image: Image.Image, context: str = "general"):
        """
        Analyze image and return structured response
        
        Returns dict with:
        - insight: Human-readable description
        - should_respond: Whether to show to user
        - objects_detected: List of detected objects
        - confidence: 0.0 to 1.0
        - suggestions: List of helpful tips
        """
        try:
            # Get AI description
            description = self._get_description(image)
            
            # Determine if interesting enough to show
            should_respond = self._should_respond(description, context)
            
            # Extract objects from description
            objects = self._extract_objects(description)
            
            # Generate contextual insight
            insight = self._generate_insight(description, context)
            
            # Calculate confidence
            confidence = 0.85 if self.is_loaded else 0.6
            
            # Generate helpful suggestions
            suggestions = self._generate_suggestions(description, context)
            
            return {
                'insight': insight,
                'should_respond': should_respond,
                'objects_detected': objects,
                'confidence': confidence,
                'suggestions': suggestions,
                'model_used': self.model_name if self.is_loaded else 'fallback'
            }
            
        except Exception as e:
            logger.error(f"Analysis error: {e}")
            raise
    
    def _get_description(self, image: Image.Image):
        """Get AI description of image"""
        if self.is_loaded:
            try:
                # Resize if too large (for speed)
                max_size = 512
                if max(image.size) > max_size:
                    ratio = max_size / max(image.size)
                    new_size = tuple(int(dim * ratio) for dim in image.size)
                    image = image.resize(new_size, Image.Resampling.LANCZOS)
                
                # Generate caption with BLIP
                inputs = self.processor(image, return_tensors="pt").to(self.device)
                
                with torch.no_grad():
                    outputs = self.model.generate(**inputs, max_length=50)
                
                caption = self.processor.decode(outputs[0], skip_special_tokens=True)
                return caption
                
            except Exception as e:
                logger.error(f"BLIP error: {e}, using fallback")
                return self._fallback_description(image)
        else:
            return self._fallback_description(image)
    
    def _fallback_description(self, image: Image.Image):
        """Simple fallback when model unavailable"""
        width, height = image.size
        grayscale = image.convert('L')
        avg_brightness = sum(grayscale.getdata()) / (width * height)
        
        if avg_brightness < 50:
            return "dark scene with low lighting"
        elif avg_brightness < 150:
            return "indoor scene with moderate lighting"
        else:
            return "bright scene with good lighting"
    
    def _should_respond(self, description: str, context: str):
        """Decide if insight is interesting enough to show"""
        interesting_keywords = [
            'person', 'people', 'screen', 'monitor', 'laptop', 'computer',
            'code', 'text', 'document', 'paper', 'book', 'phone', 'device',
            'writing', 'typing', 'working', 'desk'
        ]
        
        desc_lower = description.lower()
        has_interesting = any(kw in desc_lower for kw in interesting_keywords)
        
        # Show if interesting, or 20% of the time randomly
        return has_interesting or (hash(description) % 5 == 0)
    
    def _extract_objects(self, description: str):
        """Extract object names from description"""
        common_objects = [
            'laptop', 'computer', 'monitor', 'screen', 'keyboard', 'mouse',
            'phone', 'tablet', 'book', 'paper', 'desk', 'chair', 'window',
            'person', 'hand', 'cup', 'mug', 'bottle', 'pen', 'notebook'
        ]
        
        desc_lower = description.lower()
        detected = [obj for obj in common_objects if obj in desc_lower]
        return detected[:5]
    
    def _generate_insight(self, description: str, context: str):
        """Generate contextual insight"""
        desc_lower = description.lower()
        
        # Work session detected
        if any(w in desc_lower for w in ['screen', 'monitor', 'computer', 'laptop']):
            if context.startswith('morning'):
                return f"Good morning! Starting your workday. {description} 💻"
            elif context.startswith('afternoon'):
                return f"Afternoon session! {description} 🚀"
            elif context.startswith('evening'):
                return f"Evening work. {description} Take breaks! ✨"
            return f"Work session detected. {description}"
        
        # Coding detected
        if any(w in desc_lower for w in ['code', 'programming', 'terminal', 'editor']):
            return f"Coding session! {description} 👨‍💻"
        
        # Meeting/collaboration
        if any(w in desc_lower for w in ['meeting', 'presentation', 'people']):
            return f"Collaborative work. {description} 🤝"
        
        # Default
        return description
    
    def _generate_suggestions(self, description: str, context: str):
        """Generate helpful suggestions"""
        suggestions = []
        desc_lower = description.lower()
        
        if 'screen' in desc_lower:
            suggestions.append("Take a 20-second break every 20 minutes (20-20-20 rule)")
        
        if context.startswith('evening'):
            suggestions.append("Enable dark mode to reduce eye strain")
        
        if any(w in desc_lower for w in ['laptop', 'computer', 'desk']):
            suggestions.append("Maintain good posture while working")
        
        return suggestions[:3]

# Initialize vision service (singleton)
vision_service = VisionService()


# ============================================
# API Views
# ============================================

@api_view(['GET'])
def health_check(request):
    """Health check endpoint"""
    return Response({
        'status': 'healthy',
        'service': 'euphorie-vision-api',
        'model_loaded': vision_service.is_loaded,
        'model_name': vision_service.model_name,
        'device': vision_service.device,
        'timestamp': int(time.time())
    })


@api_view(['POST'])
def analyze_vision(request):
    """
    Main vision analysis endpoint
    
    Expects:
    {
        "user_id": "user_xxx",
        "frame": "data:image/jpeg;base64,...",
        "context": "morning_work"
    }
    """
    try:
        # Extract data
        frame_data = request.data.get('frame')
        user_id = request.data.get('user_id', 'anonymous')
        context = request.data.get('context', 'general')
        
        if not frame_data:
            return Response(
                {'error': 'No frame data provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        logger.info(f"📸 Vision analysis from user: {user_id}")
        
        # Decode base64 image
        try:
            if ',' in frame_data:
                frame_data = frame_data.split(',')[1]
            
            image_bytes = base64.b64decode(frame_data)
            image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
            
            logger.info(f"✅ Image decoded: {image.size}")
            
        except Exception as e:
            logger.error(f"❌ Image decode error: {e}")
            return Response(
                {'error': 'Invalid image data'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Analyze with AI
        try:
            analysis = vision_service.analyze(image, context)
            
            logger.info(f"✅ Analysis complete: {analysis.get('insight')[:50]}...")
            
            # Return in expected format
            return Response({
                'success': True,
                'insight': analysis['insight'],
                'should_respond': analysis['should_respond'],
                'objects_detected': analysis.get('objects_detected', []),
                'confidence': analysis.get('confidence', 0.0),
                'suggestions': analysis.get('suggestions', []),
                'model_used': analysis.get('model_used', 'unknown'),
                'timestamp': int(time.time())
            })
            
        except Exception as e:
            logger.error(f"❌ Analysis error: {e}")
            return Response({
                'success': False,
                'insight': 'Analysis temporarily unavailable',
                'should_respond': False,
                'model_used': 'error',
                'timestamp': int(time.time())
            })
    
    except Exception as e:
        logger.error(f"❌ Request error: {e}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
def quick_analysis(request):
    """Fast analysis for real-time streaming"""
    try:
        frame_data = request.data.get('frame')
        
        if not frame_data:
            return Response(
                {'error': 'No frame data provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Decode image
        if ',' in frame_data:
            frame_data = frame_data.split(',')[1]
        
        image_bytes = base64.b64decode(frame_data)
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        
        # Quick description
        description = vision_service._get_description(image)
        
        return Response({
            'success': True,
            'description': description,
            'model_used': vision_service.model_name
        })
        
    except Exception as e:
        logger.error(f"Quick analysis error: {e}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )