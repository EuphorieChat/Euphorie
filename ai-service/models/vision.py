from pydantic import BaseModel
from typing import Optional, List
from PIL import Image

class VisionFrame(BaseModel):
    user_id: str
    room_id: str
    timestamp: int
    # Note: image will be handled separately due to PIL Image not being JSON serializable

class VisionAnalysis(BaseModel):
    scene_description: str
    objects_detected: List[str]
    confidence: float
    actionable_insight: Optional[str]
    timestamp: int
