"""
Vector similarity search for room recommendations
"""
import numpy as np
import faiss
from typing import List, Tuple, Optional
import logging
from django.core.cache import cache

logger = logging.getLogger(__name__)

class RoomVectorSearch:
    """FAISS-based vector search for similar rooms"""
    
    def __init__(self):
        self.index = None
        self.room_id_map = []  # Maps FAISS index to room IDs
        self.embedding_dim = 384  # MiniLM embedding dimension
        
    def build_index(self, room_embeddings: dict):
        """Build FAISS index from room embeddings"""
        if not room_embeddings:
            logger.warning("No embeddings provided for index building")
            return
        
        # Convert to numpy arrays
        room_ids = list(room_embeddings.keys())
        embeddings = np.array(list(room_embeddings.values())).astype('float32')
        
        # Normalize embeddings for cosine similarity
        faiss.normalize_L2(embeddings)
        
        # Create index (using Inner Product for cosine similarity on normalized vectors)
        self.index = faiss.IndexFlatIP(self.embedding_dim)
        self.index.add(embeddings)
        self.room_id_map = room_ids
        
        logger.info(f"Built FAISS index with {len(room_ids)} rooms")
    
    def search_similar_rooms(
        self, 
        query_embedding: np.ndarray, 
        k: int = 10,
        exclude_ids: List[int] = None
    ) -> List[Tuple[int, float]]:
        """Find k most similar rooms to query embedding"""
        if self.index is None:
            logger.warning("Index not built, returning empty results")
            return []
        
        # Normalize query
        query_embedding = query_embedding.reshape(1, -1).astype('float32')
        faiss.normalize_L2(query_embedding)
        
        # Search
        scores, indices = self.index.search(query_embedding, k * 2)  # Get extra for filtering
        
        # Convert to room IDs and filter
        results = []
        exclude_ids = set(exclude_ids or [])
        
        for idx, score in zip(indices[0], scores[0]):
            if idx < len(self.room_id_map):
                room_id = self.room_id_map[idx]
                if room_id not in exclude_ids:
                    results.append((room_id, float(score)))
                    if len(results) >= k:
                        break
        
        return results
    
    def find_similar_rooms_to_room(
        self, 
        room_id: int, 
        k: int = 10
    ) -> List[Tuple[int, float]]:
        """Find rooms similar to a specific room"""
        cache_key = f'similar_rooms_{room_id}_{k}'
        cached = cache.get(cache_key)
        if cached:
            return cached
        
        # Get the room's embedding from the index
        if room_id not in self.room_id_map:
            logger.warning(f"Room {room_id} not in index")
            return []
        
        idx = self.room_id_map.index(room_id)
        room_embedding = self.index.reconstruct(idx)
        
        # Search for similar, excluding the room itself
        results = self.search_similar_rooms(
            room_embedding, 
            k=k, 
            exclude_ids=[room_id]
        )
        
        cache.set(cache_key, results, 3600)  # Cache for 1 hour
        return results
