"""
Lightweight recommendation system for memory-constrained servers
No ML models, uses activity-based and similarity heuristics
"""
import hashlib
import random
from typing import List, Dict, Optional
from datetime import timedelta
from django.utils import timezone
from django.core.cache import cache
from django.db.models import Q, Count, F, Avg
import logging

logger = logging.getLogger(__name__)

class LightweightRecommendationEngine:
    """Lightweight recommendations without ML models"""
    
    def __init__(self):
        logger.info("Initializing lightweight recommendation engine (no ML)")
        
    def get_recommendations_for_user(self, user, limit=10, strategy='hybrid'):
        """Get recommendations using lightweight methods"""
        
        cache_key = f'lite_recs_{user.id if user else "anon"}_{strategy}_{limit}'
        cached = cache.get(cache_key)
        if cached and strategy != 'random':
            return cached
        
        if strategy == 'random':
            recommendations = self.get_random_recommendations(user, limit)
        elif strategy == 'popular':
            recommendations = self.get_popular_recommendations(user, limit)
        elif strategy == 'recent':
            recommendations = self.get_recent_active_rooms(user, limit)
        elif strategy == 'social':
            recommendations = self.get_social_recommendations(user, limit)
        elif strategy == 'similar':
            recommendations = self.get_category_based_recommendations(user, limit)
        else:  # hybrid
            recommendations = self.get_hybrid_recommendations(user, limit)
        
        if strategy != 'random':
            cache.set(cache_key, recommendations, 1800)  # 30 min cache
        
        return recommendations
    
    def get_random_recommendations(self, user, limit):
        """Random shuffle of rooms"""
        from chat.models import Room
        
        rooms = Room.objects.filter(is_public=True)
        if user and user.is_authenticated:
            # Include user's private rooms
            rooms = Room.objects.filter(
                Q(is_public=True) |
                Q(creator=user) |
                Q(members=user)
            ).distinct()
        
        room_ids = list(rooms.values_list('id', flat=True))
        random.shuffle(room_ids)
        selected_ids = room_ids[:limit]
        
        # Preserve random order
        rooms = list(Room.objects.filter(id__in=selected_ids))
        rooms.sort(key=lambda r: selected_ids.index(r.id))
        
        return rooms
    
    def get_popular_recommendations(self, user, limit):
        """Most active rooms by message count and users"""
        from chat.models import Room
        
        rooms = Room.objects.filter(
            is_public=True
        ).order_by(
            '-message_count',
            '-active_users_count',
            '-last_activity'
        )[:limit]
        
        return list(rooms)
    
    def get_recent_active_rooms(self, user, limit):
        """Recently active rooms"""
        from chat.models import Room
        
        recent_cutoff = timezone.now() - timedelta(hours=24)
        
        rooms = Room.objects.filter(
            is_public=True,
            last_activity__gte=recent_cutoff
        ).annotate(
            recent_messages=Count(
                'messages',
                filter=Q(messages__timestamp__gte=recent_cutoff)
            )
        ).order_by('-recent_messages', '-last_activity')[:limit]
        
        return list(rooms)
    
    def get_social_recommendations(self, user, limit):
        """Rooms where friends are active"""
        from chat.models import Room, Friendship, Message
        
        if not user or not user.is_authenticated:
            return []
        
        # Get friends
        try:
            friend_ids = Friendship.objects.filter(
                user=user,
                status='accepted'
            ).values_list('friend_id', flat=True)
            
            if not friend_ids:
                return []
            
            # Get rooms with friend activity
            week_ago = timezone.now() - timedelta(days=7)
            rooms = Room.objects.filter(
                is_public=True,
                messages__user_id__in=friend_ids,
                messages__timestamp__gte=week_ago
            ).annotate(
                friend_messages=Count(
                    'messages',
                    filter=Q(messages__user_id__in=friend_ids)
                )
            ).order_by('-friend_messages')[:limit]
            
            return list(rooms)
        except:
            return []
    
    def get_category_based_recommendations(self, user, limit):
        """Recommendations based on categories user has interacted with"""
        from chat.models import Room, Message
        
        if not user or not user.is_authenticated:
            # Return diverse categories for anonymous
            return self.get_diverse_category_rooms(limit)
        
        # Get user's preferred categories
        user_categories = Message.objects.filter(
            user=user
        ).values(
            'room__category'
        ).annotate(
            count=Count('id')
        ).order_by('-count')[:5]
        
        category_ids = [c['room__category'] for c in user_categories if c['room__category']]
        
        if not category_ids:
            return self.get_diverse_category_rooms(limit)
        
        # Get rooms from those categories
        rooms = Room.objects.filter(
            is_public=True,
            category_id__in=category_ids
        ).exclude(
            messages__user=user  # Exclude rooms user already participated in
        ).order_by('-message_count')[:limit]
        
        return list(rooms)
    
    def get_diverse_category_rooms(self, limit):
        """Get rooms from diverse categories"""
        from chat.models import Room, RoomCategory
        
        # Get active categories
        categories = RoomCategory.objects.filter(
            is_active=True
        ).annotate(
            room_count=Count('rooms')
        ).filter(room_count__gt=0)[:5]
        
        rooms = []
        per_category = max(1, limit // len(categories)) if categories else limit
        
        for category in categories:
            cat_rooms = Room.objects.filter(
                is_public=True,
                category=category
            ).order_by('-message_count')[:per_category]
            rooms.extend(cat_rooms)
        
        # Fill remaining slots with popular rooms
        if len(rooms) < limit:
            additional = Room.objects.filter(
                is_public=True
            ).exclude(
                id__in=[r.id for r in rooms]
            ).order_by('-message_count')[:limit - len(rooms)]
            rooms.extend(additional)
        
        return rooms[:limit]
    
    def get_hybrid_recommendations(self, user, limit):
        """Combine multiple strategies"""
        from chat.models import Room
        
        recommendations = []
        seen_ids = set()
        
        # Mix of different strategies
        strategies = [
            ('popular', limit // 3),
            ('recent', limit // 3),
            ('social', limit // 3) if user and user.is_authenticated else ('diverse', limit // 3),
        ]
        
        for strategy, count in strategies:
            if strategy == 'popular':
                rooms = self.get_popular_recommendations(user, count * 2)
            elif strategy == 'recent':
                rooms = self.get_recent_active_rooms(user, count * 2)
            elif strategy == 'social':
                rooms = self.get_social_recommendations(user, count * 2)
            else:  # diverse
                rooms = self.get_diverse_category_rooms(count * 2)
            
            for room in rooms:
                if room.id not in seen_ids:
                    recommendations.append(room)
                    seen_ids.add(room.id)
                    if len(recommendations) >= limit:
                        break
            
            if len(recommendations) >= limit:
                break
        
        # Fill remaining with popular if needed
        if len(recommendations) < limit:
            additional = Room.objects.filter(
                is_public=True
            ).exclude(
                id__in=seen_ids
            ).order_by('-message_count')[:limit - len(recommendations)]
            recommendations.extend(additional)
        
        return recommendations[:limit]
    
    def get_similar_rooms(self, room_id, limit=5):
        """Get similar rooms based on category and activity patterns"""
        from chat.models import Room
        
        try:
            room = Room.objects.get(id=room_id)
            
            similar = []
            
            # Same category
            if room.category:
                same_category = Room.objects.filter(
                    is_public=True,
                    category=room.category
                ).exclude(id=room_id).order_by('-message_count')[:limit//2]
                similar.extend(same_category)
            
            # Similar activity level
            activity_range = (
                max(0, room.message_count - 100),
                room.message_count + 100
            )
            similar_activity = Room.objects.filter(
                is_public=True,
                message_count__range=activity_range
            ).exclude(
                id__in=[room_id] + [r.id for r in similar]
            ).order_by('?')[:limit//2]
            similar.extend(similar_activity)
            
            # Same creator's other rooms
            if len(similar) < limit and room.creator:
                creator_rooms = Room.objects.filter(
                    is_public=True,
                    creator=room.creator
                ).exclude(
                    id__in=[room_id] + [r.id for r in similar]
                )[:limit - len(similar)]
                similar.extend(creator_rooms)
            
            return similar[:limit]
            
        except Room.DoesNotExist:
            return []

    def build_index(self, force_rebuild=False):
        """Lightweight index building - just pre-cache some data"""
        from chat.models import Room
        
        logger.info("Building lightweight recommendation cache...")
        
        # Pre-cache popular rooms
        popular = list(Room.objects.filter(
            is_public=True
        ).order_by('-message_count')[:50])
        cache.set('popular_rooms', popular, 3600)
        
        # Pre-cache recent active
        recent = list(Room.objects.filter(
            is_public=True,
            last_activity__gte=timezone.now() - timedelta(days=1)
        ).order_by('-last_activity')[:50])
        cache.set('recent_active_rooms', recent, 1800)
        
        logger.info("Lightweight cache built successfully")
        return True