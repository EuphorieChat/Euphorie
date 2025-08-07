"""
Ultra-lightweight recommendation system for low-memory servers
No ML dependencies required - uses only Django ORM
"""
import random
import hashlib
from django.core.cache import cache
from django.db.models import Q, Count, F
from datetime import timedelta
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

class LiteRecommendationEngine:
    """Memory-efficient recommendation engine using database queries only"""
    
    def __init__(self):
        self.initialized = True
        self.ml_available = False  # For compatibility with full engine
        logger.info("Lite recommendation engine initialized (no ML)")
    
    def build_index(self, force_rebuild=False):
        """
        Compatibility method - lite engine doesn't need an index
        """
        logger.info("Lite engine doesn't require index building")
        return True
    
    def get_recommendations_for_user(self, user, limit=10, exclude_joined=True, strategy='popular'):
        """
        Get recommendations using database queries only
        
        Args:
            user: User object or None for anonymous
            limit: Number of recommendations to return
            exclude_joined: Whether to exclude rooms user has already joined
            strategy: Recommendation strategy ('popular', 'recent', 'random', 'personalized')
        
        Returns:
            List of Room objects
        """
        from chat.models import Room, Message
        
        # Cache key for non-random strategies
        cache_key = f'lite_recs_{user.id if user else "anon"}_{strategy}_{limit}'
        
        # Don't cache random strategy
        if strategy != 'random':
            cached = cache.get(cache_key)
            if cached:
                return cached
        
        recommendations = []
        
        try:
            if strategy == 'random':
                recommendations = self._get_random_rooms(user, limit, exclude_joined)
            elif strategy == 'popular':
                recommendations = self._get_popular_rooms(limit, exclude_joined, user)
            elif strategy == 'recent':
                recommendations = self._get_recent_active_rooms(limit, exclude_joined, user)
            elif strategy == 'personalized' and user and user.is_authenticated:
                recommendations = self._get_personalized_rooms(user, limit, exclude_joined)
            elif strategy == 'hybrid' and user and user.is_authenticated:
                # Hybrid: mix of personalized and popular
                recommendations = self._get_hybrid_recommendations(user, limit, exclude_joined)
            else:
                # Fallback to popular
                recommendations = self._get_popular_rooms(limit, exclude_joined, user)
            
            # Cache non-random results for 30 minutes
            if strategy != 'random' and recommendations:
                cache.set(cache_key, recommendations, 1800)
            
        except Exception as e:
            logger.error(f"Error getting {strategy} recommendations: {e}")
            # Fallback to simple query
            recommendations = list(Room.objects.filter(is_public=True)[:limit])
        
        return recommendations
    
    def _get_random_rooms(self, user, limit, exclude_joined=True):
        """Get random room selection"""
        from chat.models import Room, Message
        
        # Base query for public rooms
        rooms_query = Room.objects.filter(is_public=True)
        
        # Add user's private rooms if authenticated
        if user and user.is_authenticated:
            private_rooms = Room.objects.filter(
                Q(creator=user) | Q(members=user),
                is_public=False
            )
            rooms_query = rooms_query | private_rooms
            rooms_query = rooms_query.distinct()
            
            # Exclude rooms user has already joined if requested
            if exclude_joined:
                joined_room_ids = Message.objects.filter(
                    user=user
                ).values_list('room_id', flat=True).distinct()
                rooms_query = rooms_query.exclude(id__in=joined_room_ids)
        
        # Get IDs and shuffle
        room_ids = list(rooms_query.values_list('id', flat=True))
        random.shuffle(room_ids)
        selected_ids = room_ids[:limit]
        
        # Return rooms maintaining random order
        rooms = list(Room.objects.filter(id__in=selected_ids).select_related('category', 'creator'))
        rooms.sort(key=lambda x: selected_ids.index(x.id))
        
        return rooms
    
    def _get_popular_rooms(self, limit, exclude_joined=True, user=None):
        """Get most active rooms"""
        from chat.models import Room, Message
        
        rooms_query = Room.objects.filter(is_public=True)
        
        # Exclude joined rooms if user is authenticated
        if user and user.is_authenticated and exclude_joined:
            joined_room_ids = Message.objects.filter(
                user=user
            ).values_list('room_id', flat=True).distinct()
            rooms_query = rooms_query.exclude(id__in=joined_room_ids)
        
        # Order by activity metrics
        rooms = rooms_query.select_related('category', 'creator').order_by(
            '-message_count', 
            '-active_users_count',
            '-last_activity'
        )[:limit]
        
        return list(rooms)
    
    def _get_recent_active_rooms(self, limit, exclude_joined=True, user=None):
        """Get recently active rooms"""
        from chat.models import Room, Message
        
        # Define recency window
        time_window = timezone.now() - timedelta(hours=24)
        
        rooms_query = Room.objects.filter(
            is_public=True,
            last_activity__gte=time_window
        )
        
        # Exclude joined rooms if user is authenticated
        if user and user.is_authenticated and exclude_joined:
            joined_room_ids = Message.objects.filter(
                user=user
            ).values_list('room_id', flat=True).distinct()
            rooms_query = rooms_query.exclude(id__in=joined_room_ids)
        
        # Order by last activity
        rooms = rooms_query.select_related('category', 'creator').order_by(
            '-last_activity'
        )[:limit]
        
        return list(rooms)
    
    def _get_personalized_rooms(self, user, limit, exclude_joined=True):
        """Simple personalization based on user activity"""
        from chat.models import Room, Message
        
        if not user or not user.is_authenticated:
            return self._get_popular_rooms(limit, exclude_joined, user)
        
        # Get categories user is active in
        user_categories = Message.objects.filter(
            user=user
        ).values_list(
            'room__category_id', flat=True
        ).distinct()[:10]
        
        # Remove None values
        user_categories = [cat for cat in user_categories if cat is not None]
        
        recommendations = []
        
        # Get rooms in user's preferred categories
        if user_categories:
            category_rooms_query = Room.objects.filter(
                is_public=True,
                category_id__in=user_categories
            )
            
            # Exclude already joined rooms
            if exclude_joined:
                joined_room_ids = Message.objects.filter(
                    user=user
                ).values_list('room_id', flat=True).distinct()
                category_rooms_query = category_rooms_query.exclude(id__in=joined_room_ids)
            
            category_rooms = category_rooms_query.select_related(
                'category', 'creator'
            ).order_by('-message_count')[:limit]
            
            recommendations.extend(category_rooms)
        
        # If not enough recommendations, add popular rooms
        if len(recommendations) < limit:
            additional_needed = limit - len(recommendations)
            popular_rooms = self._get_popular_rooms(
                additional_needed, 
                exclude_joined, 
                user
            )
            
            # Add only rooms not already in recommendations
            existing_ids = {r.id for r in recommendations}
            for room in popular_rooms:
                if room.id not in existing_ids:
                    recommendations.append(room)
                    if len(recommendations) >= limit:
                        break
        
        return recommendations[:limit]
    
    def _get_hybrid_recommendations(self, user, limit, exclude_joined=True):
        """Mix of different recommendation strategies"""
        recommendations = []
        seen_ids = set()
        
        # 40% personalized
        personalized_count = int(limit * 0.4)
        personalized = self._get_personalized_rooms(user, personalized_count, exclude_joined)
        for room in personalized:
            if room.id not in seen_ids:
                recommendations.append(room)
                seen_ids.add(room.id)
        
        # 30% popular
        popular_count = int(limit * 0.3)
        popular = self._get_popular_rooms(popular_count, exclude_joined, user)
        for room in popular:
            if room.id not in seen_ids:
                recommendations.append(room)
                seen_ids.add(room.id)
        
        # 30% recent
        recent_count = limit - len(recommendations)
        if recent_count > 0:
            recent = self._get_recent_active_rooms(recent_count, exclude_joined, user)
            for room in recent:
                if room.id not in seen_ids:
                    recommendations.append(room)
                    seen_ids.add(room.id)
                    if len(recommendations) >= limit:
                        break
        
        return recommendations[:limit]
    
    def get_similar_rooms(self, room_id, limit=5):
        """Get similar rooms based on category and activity patterns"""
        from chat.models import Room
        
        try:
            source_room = Room.objects.select_related('category').get(id=room_id)
            similar_rooms = []
            seen_ids = {room_id}  # Exclude the source room
            
            # 1. Same category rooms
            if source_room.category:
                category_rooms = Room.objects.filter(
                    is_public=True,
                    category=source_room.category
                ).exclude(
                    id=room_id
                ).select_related('category', 'creator').order_by(
                    '-message_count'
                )[:limit]
                
                for room in category_rooms:
                    if room.id not in seen_ids:
                        similar_rooms.append(room)
                        seen_ids.add(room.id)
            
            # 2. If not enough, add rooms with similar activity level
            if len(similar_rooms) < limit:
                message_count = source_room.message_count or 0
                
                # Define similarity range (±50% of message count)
                min_messages = int(message_count * 0.5)
                max_messages = int(message_count * 1.5)
                
                activity_rooms = Room.objects.filter(
                    is_public=True,
                    message_count__gte=min_messages,
                    message_count__lte=max_messages
                ).exclude(
                    id__in=seen_ids
                ).select_related('category', 'creator').order_by(
                    '-message_count'
                )[:limit - len(similar_rooms)]
                
                for room in activity_rooms:
                    if room.id not in seen_ids:
                        similar_rooms.append(room)
                        seen_ids.add(room.id)
            
            # 3. If still not enough, add popular rooms
            if len(similar_rooms) < limit:
                popular_rooms = Room.objects.filter(
                    is_public=True
                ).exclude(
                    id__in=seen_ids
                ).select_related('category', 'creator').order_by(
                    '-message_count'
                )[:limit - len(similar_rooms)]
                
                similar_rooms.extend(popular_rooms)
            
            return similar_rooms[:limit]
            
        except Room.DoesNotExist:
            logger.warning(f"Room {room_id} not found for similar rooms")
            # Return popular rooms as fallback
            return list(Room.objects.filter(
                is_public=True
            ).select_related('category', 'creator').order_by(
                '-message_count'
            )[:limit])
        except Exception as e:
            logger.error(f"Error getting similar rooms: {e}")
            return []
    
    def get_rooms_for_category(self, category_slug, limit=20):
        """Get recommended rooms for a specific category"""
        from chat.models import Room, RoomCategory
        
        try:
            category = RoomCategory.objects.get(slug=category_slug)
            rooms = Room.objects.filter(
                is_public=True,
                category=category
            ).select_related('category', 'creator').order_by(
                '-message_count',
                '-last_activity'
            )[:limit]
            
            return list(rooms)
        except RoomCategory.DoesNotExist:
            logger.warning(f"Category {category_slug} not found")
            return []
    
    def get_trending_rooms(self, limit=10):
        """Get trending rooms based on recent activity"""
        from chat.models import Room, Message
        from django.db.models import Count
        
        # Look at activity in the last 6 hours
        time_window = timezone.now() - timedelta(hours=6)
        
        # Get rooms with recent messages
        trending_rooms = Room.objects.filter(
            is_public=True,
            messages__timestamp__gte=time_window
        ).annotate(
            recent_message_count=Count('messages')
        ).order_by(
            '-recent_message_count'
        ).distinct()[:limit]
        
        return list(trending_rooms)