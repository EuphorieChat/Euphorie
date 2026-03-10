"""
Euphorie v3 — Gemini Vision Service
"""
import base64
import time
import logging
import google.generativeai as genai
from django.conf import settings

logger = logging.getLogger(__name__)

SYSTEM_INSTRUCTION = """You are Euphorie AI, a smart camera-based assistant.

Users point their phone/laptop camera at things and talk to you about what they see.
You can see images from their camera and hear what they say (converted to text).

Guidelines:
- Be concise and helpful. Keep responses under 3 sentences unless asked for detail.
- Be conversational and warm, like a knowledgeable friend.
- When you see an image, describe what is relevant to the user's question.
- If the user just says hi without an image, respond naturally.
- You can identify objects, read text, analyze scenes, give advice about what you see.
- If you cannot see clearly, say so honestly.
- Never make up information you cannot verify from the image."""


class GeminiVisionService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self.model = None
        self._setup()

    def _setup(self):
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            logger.error("GEMINI_API_KEY not configured!")
            return
        try:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel(
                'gemini-2.0-flash',
                system_instruction=SYSTEM_INSTRUCTION,
            )
            logger.info("Gemini 2.0 Flash initialized")
        except Exception as e:
            logger.error(f"Failed to initialize Gemini: {e}")

    @property
    def is_ready(self):
        return self.model is not None

    def analyze(self, text, image_b64=None):
        if not self.is_ready:
            return {
                'text': 'AI service is not available right now. Please try again later.',
                'model': 'none', 'tokens': 0, 'time_ms': 0, 'error': True,
            }

        start = time.time()
        try:
            content_parts = []
            if image_b64:
                if ',' in image_b64:
                    image_b64 = image_b64.split(',')[1]
                image_bytes = base64.b64decode(image_b64)
                content_parts.append({'mime_type': 'image/jpeg', 'data': image_bytes})
            content_parts.append(text or 'What do you see?')

            response = self.model.generate_content(content_parts)
            elapsed_ms = int((time.time() - start) * 1000)
            tokens = 0
            if hasattr(response, 'usage_metadata') and response.usage_metadata:
                tokens = getattr(response.usage_metadata, 'total_token_count', 0)

            return {
                'text': response.text, 'model': 'gemini-2.0-flash',
                'tokens': tokens, 'time_ms': elapsed_ms, 'error': False,
            }
        except Exception as e:
            elapsed_ms = int((time.time() - start) * 1000)
            logger.error(f"Gemini API error: {e}")
            return {
                'text': 'Sorry, I had trouble processing that. Please try again.',
                'model': 'gemini-2.0-flash', 'tokens': 0,
                'time_ms': elapsed_ms, 'error': True,
            }


gemini_service = GeminiVisionService()
