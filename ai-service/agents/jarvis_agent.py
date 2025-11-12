import asyncio
import time
import os
from typing import Dict, List, Optional, Any
import logging

from .base_agent import BaseAgent

logger = logging.getLogger(__name__)

class AgentResponse:
    def __init__(self, agent_name, text, confidence, context, timestamp):
        self.agent_name = agent_name
        self.text = text
        self.confidence = confidence
        self.context = context
        self.timestamp = timestamp

class JarvisAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            agent_id="jarvis",
            name="Jarvis",
            description="Your intelligent AI assistant in Euphorie"
        )
        
        self.conversation_memory = {}
        self.active_contexts = {}
        self.recent_vision_contexts = {}

    async def initialize(self):
        self.status = "active"
        logger.info("�� Jarvis agent initialized and ready")

    async def process_message(self, message: str, user_id: str, user_name: str, room_id: str, context: Dict[str, Any]) -> AgentResponse:
        try:
            # Generate contextual response
            response_text = await self.generate_response(message, user_name)
            
            logger.info(f"�� Jarvis responded to {user_name}: {response_text[:50]}...")
            
            return AgentResponse(
                agent_name="Jarvis",
                text=response_text,
                confidence=0.9,
                context=context,
                timestamp=int(time.time())
            )
            
        except Exception as e:
            logger.error(f"❌ Error processing message: {str(e)}")
            return AgentResponse(
                agent_name="Jarvis",
                text="I'm having a moment of confusion. Could you try asking that again?",
                confidence=0.1,
                context=context,
                timestamp=int(time.time())
            )

    async def generate_response(self, message: str, user_name: str) -> str:
        message_lower = message.lower()
        
        # Greeting responses
        if any(word in message_lower for word in ["hello", "hi", "hey", "greetings"]):
            greetings = [
                f"Hello {user_name}! I'm Jarvis, your AI assistant in Euphorie. How can I help you today?",
                f"Hi there, {user_name}! Welcome to Euphorie. I'm here to assist with anything you need.",
                f"Greetings, {user_name}! I'm Jarvis. Enable camera vision and I can help with whatever you're working on!"
            ]
            return greetings[hash(message) % len(greetings)]
        
        # Camera/vision related
        elif any(word in message_lower for word in ["camera", "vision", "see", "look", "watch"]):
            vision_responses = [
                "I can analyze what you're looking at through your camera! Just click 'Enable AI Vision' and I can help with coding, learning, cooking, or whatever you're working on.",
                "My vision capabilities let me see your screen, documents, or workspace and provide contextual assistance. Try enabling camera vision!",
                "When you enable camera vision, I can see what you're doing and offer proactive help - like debugging code, explaining documents, or suggesting recipes!"
            ]
            return vision_responses[hash(message) % len(vision_responses)]
        
        # Coding/programming help
        elif any(word in message_lower for word in ["code", "programming", "debug", "error", "function", "python", "javascript", "react"]):
            coding_responses = [
                "I'd love to help with coding! Enable camera vision so I can see your screen and help debug issues, explain code, or suggest improvements in real-time.",
                "Programming assistance is one of my specialties! With camera vision enabled, I can see your IDE and provide contextual help with syntax, logic, and best practices.",
                "I can help with debugging, code review, and programming concepts. Enable AI Vision and I'll be able to see your code directly!"
            ]
            return coding_responses[hash(message) % len(coding_responses)]
        
        # Learning/education
        elif any(word in message_lower for word in ["learn", "study", "homework", "explain", "teach", "understand"]):
            learning_responses = [
                "I'm here to help you learn! I can explain concepts, answer questions, and provide additional context. Enable camera vision and I can even help with textbooks or documents you're reading.",
                "Learning support is what I do best! Whether it's math, science, history, or any subject - I can help explain difficult concepts and answer your questions.",
                "I love helping people learn! With camera vision, I can see what you're studying and provide targeted explanations and examples."
            ]
            return learning_responses[hash(message) % len(learning_responses)]
        
        # General help
        elif any(word in message_lower for word in ["help", "assist", "support", "can you"]):
            help_responses = [
                "I'm here to help with anything! I can assist with coding, learning, creative projects, general questions, and much more. What are you working on?",
                "Absolutely! I can help with a wide range of tasks. Enable camera vision for the full experience where I can see what you're doing and provide contextual assistance.",
                "I'd be happy to help! I specialize in coding, education, creative projects, and problem-solving. What can I assist you with today?"
            ]
            return help_responses[hash(message) % len(help_responses)]
        
        # Creative/art
        elif any(word in message_lower for word in ["art", "creative", "design", "music", "draw", "paint"]):
            creative_responses = [
                "Creative projects are exciting! I can help with design ideas, artistic techniques, color theory, and creative problem-solving. What are you working on?",
                "I love helping with creative work! Whether it's visual art, music, writing, or design - I can provide inspiration and technical guidance.",
                "Art and creativity are wonderful! Enable camera vision and I can see your work and provide specific feedback and suggestions."
            ]
            return creative_responses[hash(message) % len(creative_responses)]
        
        # Default responses
        else:
            default_responses = [
                f"That's interesting, {user_name}! I'm still learning about that topic. Can you tell me more about what you're working on?",
                f"Good question, {user_name}! I can help with many things - coding, learning, creative projects, and more. Enable camera vision for even better assistance!",
                f"I'd love to help with that, {user_name}! Could you provide a bit more context about what you need assistance with?",
                f"Fascinating topic, {user_name}! I'm here to help however I can. What specific aspect would you like to explore?",
                f"Thanks for sharing that, {user_name}! I can assist with analysis, explanations, or next steps. What would be most helpful?"
            ]
            return default_responses[hash(message + user_name) % len(default_responses)]
