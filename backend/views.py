"""
Euphorie AI Backend - Enhanced Vision with Conversational AI
"""

import logging
import base64
import io
import time
import random
from PIL import Image
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

# AI/ML imports
import torch
from transformers import BlipProcessor, BlipForConditionalGeneration

logger = logging.getLogger('vision')


# ============================================
# Conversational AI Layer
# ============================================

class ConversationalInsightGenerator:
    """
    Takes raw BLIP captions and transforms them into
    helpful, proactive, conversational insights.
    """
    
    def __init__(self):
        # Track state across frames
        self.seen_objects = {}  # object -> count
        self.last_insights = []  # avoid repeating
        self.session_start = time.time()
        self.frame_count = 0
        
    def generate_insight(self, caption: str, context: dict) -> dict:
        """
        Transform boring caption into engaging insight
        
        Args:
            caption: Raw BLIP output like "a person sitting at desk"
            context: Dict with time_of_day, session_duration, detected_objects, etc.
        
        Returns:
            Dict with insight, should_respond, priority
        """
        self.frame_count += 1
        caption_lower = caption.lower()
        
        # Extract context
        time_of_day = context.get('time_of_day', 'day')
        session_mins = context.get('session_duration_minutes', 0)
        detected_objects = context.get('detected_objects', [])
        frame_num = context.get('frame_number', 0)
        
        # Update object tracking
        for obj in detected_objects:
            self.seen_objects[obj] = self.seen_objects.get(obj, 0) + 1
        
        # Try to generate a smart insight
        insight, priority, should_respond = self._pick_best_insight(
            caption_lower, time_of_day, session_mins, detected_objects
        )
        
        # Avoid repeating recent insights
        if insight in self.last_insights:
            should_respond = False
        else:
            self.last_insights.append(insight)
            if len(self.last_insights) > 10:
                self.last_insights.pop(0)
        
        return {
            'insight': insight,
            'should_respond': should_respond,
            'priority': priority  # 'high', 'medium', 'low'
        }
    
    def _pick_best_insight(self, caption: str, time_of_day: str, session_mins: int, objects: list):
        """Pick the most relevant insight based on context"""
        
        # ============================================
        # PRIORITY 1: Health & Wellness Reminders
        # ============================================
        
        # Long session warning (every 30 mins)
        if session_mins > 0 and session_mins % 30 == 0 and session_mins <= 120:
            messages = [
                f"You've been working for {session_mins} minutes. Quick stretch? 🧘",
                f"{session_mins} min focus session! Remember to hydrate 💧",
                f"Nice {session_mins}-minute flow! Rest your eyes for 20 seconds 👀",
            ]
            return random.choice(messages), 'high', True
        
        # Very long session
        if session_mins > 90 and self.frame_count % 20 == 0:
            return "You've been at it for a while. A short break boosts productivity! ☕", 'high', True
        
        # Late night working
        if time_of_day == 'evening' and any(w in caption for w in ['screen', 'laptop', 'computer', 'monitor']):
            if random.random() < 0.1:  # 10% chance
                messages = [
                    "Working late? Remember, sleep is a superpower 🌙",
                    "Evening session! Maybe enable night mode? 🌃",
                    "Late night coding hits different. Don't forget to wind down later ✨",
                ]
                return random.choice(messages), 'medium', True
        
        # ============================================
        # PRIORITY 2: Activity-Based Insights
        # ============================================
        
        # Coding detected
        if any(w in caption for w in ['code', 'screen', 'monitor', 'computer']) and 'laptop' in objects:
            coding_insights = [
                "Deep in the code! Need a rubber duck? 🦆",
                "Coding flow detected. You've got this! 💪",
                "Debugging? Remember: it's always a semicolon... or is it? 🤔",
                "Nice setup! What are you building today?",
            ]
            if random.random() < 0.15:  # 15% chance
                return random.choice(coding_insights), 'low', True
        
        # Reading/documents
        if any(w in caption for w in ['book', 'paper', 'document', 'reading']):
            if random.random() < 0.2:
                return "Looks like reading time! Good lighting helps reduce eye strain 📚", 'low', True
        
        # Multiple people
        if 'person' in caption and any(w in caption for w in ['people', 'group', 'meeting']):
            return "Meeting in progress. I'll keep quiet! 🤫", 'medium', True
        
        # Phone detected
        if 'phone' in objects or 'cell phone' in objects:
            if random.random() < 0.1:
                messages = [
                    "Phone spotted! Quick check or rabbit hole? 📱",
                    "Multitasking? Your brain thanks you for single-tasking 🧠",
                ]
                return random.choice(messages), 'low', True
        
        # Coffee/drinks
        if any(w in caption for w in ['cup', 'mug', 'coffee', 'drink']):
            if random.random() < 0.15:
                messages = [
                    "Coffee break? Good call ☕",
                    "Hydration check! Is that water or caffeine? 💧",
                    "Fuel for the grind! ☕",
                ]
                return random.choice(messages), 'low', True
        
        # ============================================
        # PRIORITY 3: Time-Based Greetings
        # ============================================
        
        # First few frames - greeting
        if self.frame_count <= 3:
            greetings = {
                'morning': [
                    "Good morning! Ready to crush it today? ☀️",
                    "Morning! Let's make today productive 🚀",
                    "Rise and grind! What's on the agenda? ✨",
                ],
                'afternoon': [
                    "Afternoon session! You're doing great 💪",
                    "Post-lunch productivity mode! 🎯",
                    "Afternoon vibes. Let's keep the momentum! ⚡",
                ],
                'evening': [
                    "Evening session! Don't overdo it 🌙",
                    "Burning the midnight oil? Respect ✨",
                    "Night owl mode activated 🦉",
                ]
            }
            return random.choice(greetings.get(time_of_day, greetings['afternoon'])), 'medium', True
        
        # ============================================
        # PRIORITY 4: Object-Based Observations
        # ============================================
        
        # Interesting object combinations
        if 'keyboard' in objects and 'mouse' in objects:
            if random.random() < 0.05:
                return "Nice peripherals! Mechanical keyboard? 🎹", 'low', True
        
        # Books detected
        if 'book' in objects:
            if random.random() < 0.1:
                return "I see books! Knowledge is power 📖", 'low', True
        
        # ============================================
        # DEFAULT: Stay quiet most of the time
        # ============================================
        
        # Only respond ~5% of the time with generic observations
        if random.random() < 0.05:
            generic = [
                "Monitoring your workspace... all looks good! 👍",
                "Still here if you need anything! 🤖",
                "Workspace looking productive! ✨",
            ]
            return random.choice(generic), 'low', True
        
        # Most of the time, don't respond
        return "Observing...", 'low', False


# Global instance
insight_generator = ConversationalInsightGenerator()


# ============================================
# AI Vision Service (Local BLIP Model)
# ============================================

class VisionService:
    """Local AI Vision using BLIP model"""
    
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
            self.is_loaded = False
    
    def analyze(self, image: Image.Image, context: dict):
        """
        Analyze image and return conversational insight
        """
        try:
            # Step 1: Get raw BLIP caption
            caption = self._get_caption(image)
            logger.info(f"📝 BLIP caption: {caption}")
            
            # Step 2: Extract detected objects (from TensorFlow.js on frontend)
            detected_objects = context.get('detected_objects', [])
            
            # Step 3: Generate conversational insight
            insight_result = insight_generator.generate_insight(caption, context)
            
            return {
                'raw_caption': caption,
                'insight': insight_result['insight'],
                'should_respond': insight_result['should_respond'],
                'priority': insight_result['priority'],
                'objects_detected': detected_objects,
                'confidence': 0.85 if self.is_loaded else 0.6,
                'model_used': self.model_name if self.is_loaded else 'fallback'
            }
            
        except Exception as e:
            logger.error(f"Analysis error: {e}")
            raise
    
    def _get_caption(self, image: Image.Image):
        """Get BLIP caption"""
        if self.is_loaded:
            try:
                # Resize for speed
                max_size = 384
                if max(image.size) > max_size:
                    ratio = max_size / max(image.size)
                    new_size = tuple(int(dim * ratio) for dim in image.size)
                    image = image.resize(new_size, Image.Resampling.LANCZOS)
                
                inputs = self.processor(image, return_tensors="pt").to(self.device)
                
                with torch.no_grad():
                    outputs = self.model.generate(
                        **inputs,
                        max_length=50,
                        num_beams=3
                    )
                
                caption = self.processor.decode(outputs[0], skip_special_tokens=True)
                return caption
                
            except Exception as e:
                logger.error(f"BLIP error: {e}")
                return "scene with activity"
        else:
            return "workspace scene"


# Initialize
vision_service = VisionService()


# ============================================
# API Views
# ============================================

@api_view(['GET'])
@permission_classes([AllowAny])
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
@permission_classes([AllowAny])
def analyze_vision(request):
    """
    Main vision analysis endpoint
    
    Expects:
    {
        "user_id": "user_xxx",
        "frame": "data:image/jpeg;base64,...",
        "context": {
            "time_of_day": "morning",
            "session_duration_minutes": 45,
            "detected_objects": ["laptop", "person", "cup"],
            "frame_number": 15
        }
    }
    """
    try:
        frame_data = request.data.get('frame')
        user_id = request.data.get('user_id', 'anonymous')
        context = request.data.get('context', {})
        
        # Handle old format (string context)
        if isinstance(context, str):
            context = {'time_of_day': context.split('_')[0] if '_' in context else 'day'}
        
        if not frame_data:
            return Response(
                {'error': 'No frame data provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        logger.info(f"📸 Vision request from {user_id}, context: {context}")
        
        # Decode image
        try:
            if ',' in frame_data:
                frame_data = frame_data.split(',')[1]
            
            image_bytes = base64.b64decode(frame_data)
            image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
            
        except Exception as e:
            logger.error(f"❌ Image decode error: {e}")
            return Response(
                {'error': 'Invalid image data'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Analyze
        try:
            analysis = vision_service.analyze(image, context)
            
            logger.info(f"✅ Insight: {analysis['insight'][:60]}... (respond: {analysis['should_respond']})")
            
            return Response({
                'success': True,
                'insight': analysis['insight'],
                'should_respond': analysis['should_respond'],
                'priority': analysis.get('priority', 'low'),
                'objects_detected': analysis.get('objects_detected', []),
                'confidence': analysis.get('confidence', 0.0),
                'raw_caption': analysis.get('raw_caption', ''),
                'model_used': analysis.get('model_used', 'unknown'),
                'timestamp': int(time.time())
            })
            
        except Exception as e:
            logger.error(f"❌ Analysis error: {e}")
            return Response({
                'success': False,
                'insight': 'Still watching...',
                'should_respond': False,
                'priority': 'low',
                'timestamp': int(time.time())
            })
    
    except Exception as e:
        logger.error(f"❌ Request error: {e}")
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_session(request):
    """Reset the insight generator for a new session"""
    global insight_generator
    insight_generator = ConversationalInsightGenerator()
    
    return Response({
        'success': True,
        'message': 'Session reset'
    })