"""
Embedding utilities for room and user representations
"""
import numpy as np
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Optional
import pickle
import os
from django.conf import settings
from django.core.cache import cache
import logging

logger = logging.getLogger(__name__)

class RoomEmbeddingManager:
    """Manages embeddings for rooms and users"""
    
    def __init__(self):
        self.model = None
        self.embeddings_path = os.path.join(
            settings.BASE_DIR, 'chat', 'recs', 'embeddings'
        )
        os.makedirs(self.embeddings_path, exist_ok=True)
        
    def get_model(self):
        """Lazy load the sentence transformer model"""
        if self.model is None:
            # Use a lightweight model for speed
            self.model = SentenceTransformer('all-MiniLM-L6-v2')
        return self.model
    
    def generate_room_embedding(self, room):
        """Generate embedding for a single room"""
        # Combine room metadata for embedding
        text_parts = [
            room.display_name or room.name,
            room.description or '',
            room.tags or '',
            f"Category: {room.category.name}" if room.category else '',
        ]
        
        # Add creator info for better personalization
        if room.creator:
            text_parts.append(f"Created by {room.creator.username}")
        
        combined_text = ' '.join(filter(None, text_parts))
        
        # Generate embedding
        model = self.get_model()
        embedding = model.encode(combined_text)
        
        return embedding
    
    def generate_user_preference_embedding(self, user, limit=10):
        """Generate user preference embedding based on their activity"""
        from chat.models import Room, Message, UserActivity
        
        # Get user's recent room interactions
        recent_rooms = []
        
        # Rooms they created
        created_rooms = Room.objects.filter(
            creator=user
        ).order_by('-created_at')[:limit//2]
        recent_rooms.extend(created_rooms)
        
        # Rooms they're active in
        active_rooms = Room.objects.filter(
            messages__user=user
        ).distinct().order_by('-last_activity')[:limit//2]
        recent_rooms.extend(active_rooms)
        
        if not recent_rooms:
            return None
        
        # Generate embeddings for each room
        embeddings = []
        for room in recent_rooms:
            embedding = self.generate_room_embedding(room)
            embeddings.append(embedding)
        
        # Return weighted average (more recent = higher weight)
        weights = np.array([1.0 / (i + 1) for i in range(len(embeddings))])
        weights = weights / weights.sum()
        
        weighted_embedding = np.average(embeddings, axis=0, weights=weights)
        return weighted_embedding
    
    def batch_generate_embeddings(self, rooms):
        """Generate embeddings for multiple rooms efficiently"""
        texts = []
        for room in rooms:
            text_parts = [
                room.display_name or room.name,
                room.description or '',
                room.tags or '',
                f"Category: {room.category.name}" if room.category else '',
            ]
            texts.append(' '.join(filter(None, text_parts)))
        
        model = self.get_model()
        embeddings = model.encode(texts, batch_size=32, show_progress_bar=False)
        return embeddings
    
    def save_embeddings(self, room_embeddings: Dict[int, np.ndarray]):
        """Save room embeddings to disk"""
        filepath = os.path.join(self.embeddings_path, 'room_embeddings.pkl')
        with open(filepath, 'wb') as f:
            pickle.dump(room_embeddings, f)
        logger.info(f"Saved {len(room_embeddings)} room embeddings")
    
    def load_embeddings(self) -> Optional[Dict[int, np.ndarray]]:
        """Load room embeddings from disk"""
        filepath = os.path.join(self.embeddings_path, 'room_embeddings.pkl')
        if os.path.exists(filepath):
            with open(filepath, 'rb') as f:
                return pickle.load(f)
        return None