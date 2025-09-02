from abc import ABC, abstractmethod
from typing import Dict, Any

class BaseAgent(ABC):
    def __init__(self, agent_id: str, name: str, description: str):
        self.agent_id = agent_id
        self.name = name
        self.description = description
        self.status = "initializing"

    @abstractmethod
    async def initialize(self):
        pass

    @abstractmethod
    async def process_message(self, message: str, user_id: str, user_name: str, room_id: str, context: Dict[str, Any]):
        pass
