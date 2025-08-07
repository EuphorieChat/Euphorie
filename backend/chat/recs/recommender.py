"""
Main recommendation engine combining all approaches
"""
from typing import List, Optional, Dict, Any
import numpy as np
from django.core.cache import cache
from django.db.models import Q, Count, F
from datetime import timedelta
from django.utils import timezone
import logging
import random

logger = logging.getLogger(__name__)

class RoomRecommendationEngine:
    """Main recommendation engine for Euphorie rooms"""
    
    def __init__(self):
        from .embedding_utils import RoomEmbeddingManager
        from .vector_search import RoomVectorSearch
        from .ranker import RoomRanker
        
        self.embedding_manager = RoomEmbeddingManager()
        self.vector_search = RoomVectorSearch()
        self.ranker = RoomRanker()
        self.index_built = False
    
    def build_index(self, force_rebuild=False):
        """Build or rebuild the recommendation index"""
        from chat.models import Room
        
        if self.index_built and not force_rebuild:
            return
        
        # Load existing embeddings or generate new ones
        embeddings = self.embedding_manager.load_embeddings()
        
        if embeddings is None or force_rebuild:
            # Generate embeddings for all public rooms
            rooms = Room.objects.filter(is_public=True).select_related('category', 'creator')
            
            embeddings = {}
            batch_size = 50
            
            for i in range(0, len(rooms), batch_size):
                batch = rooms[i:i+batch_size]
                batch_embeddings = self.embedding_manager.batch_generate_embeddings(batch)
                
                for room, embedding in zip(batch, batch_embeddings):
                    embeddings[room.id] = embedding
            
            # Save embeddings
            self.embedding_manager.save_embeddings(embeddings)
        
        # Build FAISS index
        self.vector_search.build_index(embeddings)
        self.index_built = True
        
        logger.info("Recommendation index built successfully")
    
    def get_recommendations_for_user(
        self,
        user,
        limit: int = 10,
        exclude_joined: bool = True,
        strategy: str = 'hybrid'
    ) -> List:
        """Get personalized room recommendations for a user"""
        from chat.models import Room, Message
        
        # Cache key
        cache_key = f'room_recs_{user.id if user and user.is_authenticated else "anon"}_{limit}_{strategy}'
        cached = cache.get(cache_key)
        if cached and not strategy == 'random':
            return cached
        
        recommendations = []
        
        if strategy == 'random':
            # Random shuffle (existing functionality)
            recommendations = self.get_random_recommendations(user, limit)
        
        elif strategy == 'popular':
            # Popular rooms
            recommendations = self.get_popular_recommendations(user, limit)
        
        elif strategy == 'content':
            # Content-based recommendations
            recommendations = self.get_content_based_recommendations(user, limit)
        
        elif strategy == 'social':
            # Social recommendations (friends' rooms)
            recommendations = self.get_social_recommendations(user, limit)
        
        elif strategy == 'hybrid':
            # Hybrid approach combining all signals
            recommendations = self.get_hybrid_recommendations(user, limit)
        
        else:
            # Fallback to popular
            recommendations = self.get_popular_recommendations(user, limit)
        
        # Cache results (except random)
        if strategy != 'random':
            cache.set(cache_key, recommendations, 1800)  # 30 minutes
        
        return recommendations
    
    def get_random_recommendations(self, user, limit: int) -> List:
        """Get random room recommendations (shuffle)"""
        from chat.models import Room
        
        query = Room.objects.filter(is_public=True)
        
        if user and user.is_authenticated:
            # Include user's private rooms
            query = Room.objects.filter(
                Q(is_public=True) |
                Q(creator=user, is_public=False) |
                Q(members=user, is_public=False)
            ).distinct()
        
        rooms = list(query)
        random.shuffle(rooms)
        return rooms[:limit]
    
    def get_popular_recommendations(self, user, limit: int) -> List:
        """Get popular rooms based on activity"""
        from chat.models import Room
        
        # Get rooms with most activity in last 7 days
        week_ago = timezone.now() - timedelta(days=7)
        
        rooms = Room.objects.filter(
            is_public=True,
            last_activity__gte=week_ago
        ).annotate(
            recent_messages=Count(
                'messages',
                filter=Q(messages__timestamp__gte=week_ago)
            )
        ).order_by('-recent_messages', '-message_count')[:limit]
        
        return list(rooms)
    
    def get_content_based_recommendations(self, user, limit: int) -> List:
        """Get content-based recommendations using embeddings"""
        from chat.models import Room
        
        # Ensure index is built
        self.build_index()
        
        if not user or not user.is_authenticated:
            # For anonymous users, return popular rooms
            return self.get_popular_recommendations(None, limit)
        
        # Generate user preference embedding
        user_embedding = self.embedding_manager.generate_user_preference_embedding(user)
        
        if user_embedding is None:
            # User has no activity, return popular
            return self.get_popular_recommendations(user, limit)
        
        # Find similar rooms
        similar_room_ids = self.vector_search.search_similar_rooms(
            user_embedding,
            k=limit * 2  # Get extra for filtering
        )
        
        # Get room objects
        room_ids = [room_id for room_id, score in similar_room_ids]
        rooms = Room.objects.filter(id__in=room_ids, is_public=True)
        
        # Sort by similarity score
        room_dict = {room.id: room for room in rooms}
        sorted_rooms = []
        for room_id, score in similar_room_ids:
            if room_id in room_dict:
                sorted_rooms.append(room_dict[room_id])
                if len(sorted_rooms) >= limit:
                    break
        
        return sorted_rooms
    
    def get_social_recommendations(self, user, limit: int) -> List:
        """Get recommendations based on friends' activity"""
        from chat.models import Room, Friendship, Message
        
        if not user or not user.is_authenticated:
            return []
        
        # Get user's friends
        friend_ids = Friendship.objects.filter(
            user=user,
            status='accepted'
        ).values_list('friend_id', flat=True)
        
        if not friend_ids:
            return []
        
        # Get rooms where friends are active
        rooms = Room.objects.filter(
            is_public=True,
            messages__user_id__in=friend_ids
        ).annotate(
            friend_activity=Count(
                'messages',
                filter=Q(messages__user_id__in=friend_ids)
            )
        ).order_by('-friend_activity')[:limit]
        
        return list(rooms)
    
    def get_hybrid_recommendations(self, user, limit: int) -> List:
        """Hybrid recommendation combining all signals"""
        from chat.models import Room
        
        recommendations = []
        scores = {}  # room_id -> score
        
        # 1. Content-based candidates (40% weight)
        content_recs = self.get_content_based_recommendations(user, limit * 2)
        for i, room in enumerate(content_recs):
            score = (1.0 - i / len(content_recs)) * 0.4
            scores[room.id] = scores.get(room.id, 0) + score
        
        # 2. Popular rooms (30% weight)
        popular_recs = self.get_popular_recommendations(user, limit)
        for i, room in enumerate(popular_recs):
            score = (1.0 - i / len(popular_recs)) * 0.3
            scores[room.id] = scores.get(room.id, 0) + score
        
        # 3. Social recommendations (30% weight)
        if user and user.is_authenticated:
            social_recs = self.get_social_recommendations(user, limit)
            for i, room in enumerate(social_recs):
                score = (1.0 - i / len(social_recs)) * 0.3
                scores[room.id] = scores.get(room.id, 0) + score
        
        # Get all unique rooms
        all_room_ids = list(scores.keys())
        rooms = Room.objects.filter(id__in=all_room_ids)
        room_dict = {room.id: room for room in rooms}
        
        # Use ML ranker if available
        if user and user.is_authenticated and self.ranker.model:
            # Re-rank using ML model
            candidate_rooms = [room_dict[room_id] for room_id in all_room_ids if room_id in room_dict]
            ranked_rooms = self.ranker.rank_rooms(user, candidate_rooms)
            
            # Combine ML scores with hybrid scores
            for room, ml_score in ranked_rooms:
                if room.id in scores:
                    scores[room.id] = scores[room.id] * 0.6 + ml_score * 0.4
        
        # Sort by final score
        sorted_room_ids = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)
        
        # Build final list
        for room_id in sorted_room_ids[:limit]:
            if room_id in room_dict:
                recommendations.append(room_dict[room_id])
        
        return recommendations
    
    def get_similar_rooms(self, room_id: int, limit: int = 5) -> List:
        """Get rooms similar to a specific room"""
        from chat.models import Room
        
        # Ensure index is built
        self.build_index()
        
        # Find similar rooms using vector search
        similar_room_ids = self.vector_search.find_similar_rooms_to_room(room_id, limit)
        
        if not similar_room_ids:
            # Fallback to same category
            room = Room.objects.get(id=room_id)
            return list(Room.objects.filter(
                category=room.category,
                is_public=True
            ).exclude(id=room_id)[:limit])
        
        # Get room objects
        room_ids = [rid for rid, score in similar_room_ids]
        rooms = Room.objects.filter(id__in=room_ids)
        
        # Sort by similarity
        room_dict = {room.id: room for room in rooms}
        sorted_rooms = []
        for rid, score in similar_room_ids:
            if rid in room_dict:
                sorted_rooms.append(room_dict[rid])
        
        return sorted_rooms