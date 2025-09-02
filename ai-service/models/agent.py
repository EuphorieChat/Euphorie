from pydantic import BaseModel
from typing import Optional, Dict, Any

class AgentResponse(BaseModel):
    agent_name: str
    text: str
    confidence: float
    context: Dict[str, Any]
    timestamp: int

class AgentContext(BaseModel):
    user_id: str
    room_id: str
    conversation_history: list
