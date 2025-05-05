from django.contrib.auth.models import User
from django.db.models import Count, F, Q, Sum, Case, When, IntegerField, Exists, OuterRef
from django.utils import timezone
from datetime import timedelta

from chat.models import Room, Message, Category
from .models import UserRelationship, UserStatus, UserInterest

def get_online_friends(user):
    """
    Get a list of the user's friends who are currently online.

    Args:
        user: The User object to get online friends for

    Returns:
        QuerySet of User objects who are friends and online
    """
    if not user.is_authenticated:
        return User.objects.none()

    # Get all friends
    friends = UserRelationship.get_friends(user)

    # Filter for online status
    online_friends = friends.filter(status__is_online=True)

    # Order by most recent activity
    return online_friends.order_by('-status__last_activity')


def update_user_status(user, is_online=True):
    """
    Update a user's online status.

    Args:
        user: The User object to update
        is_online: Boolean indicating if the user is online

    Returns:
        UserStatus object
    """
    if not user.is_authenticated:
        return None

    status, created = UserStatus.objects.get_or_create(user=user)
    status.is_online = is_online
    status.last_activity = timezone.now()
    status.save()
    return status


def get_room_recommendations(user, limit=5):
    """
    Get room recommendations for a user based on:
    1. Rooms their friends are active in
    2. Rooms with similar categories to ones they've shown interest in
    3. Popular rooms in general

    Args:
        user: The User object to get recommendations for
        limit: Maximum number of rooms to recommend

    Returns:
        QuerySet of Room objects
    """
    if not user.is_authenticated:
        # For non-authenticated users, just return popular rooms
        return Room.objects.annotate(
            message_count=Count('messages')
        ).order_by('-message_count')[:limit]

    # Get rooms the user has already participated in
    user_rooms = Room.objects.filter(
        messages__user=user
    ).distinct()

    # Get rooms the user's friends are active in
    friends = UserRelationship.get_friends(user)
    friend_active_rooms = Room.objects.filter(
        messages__user__in=friends
    ).exclude(
        id__in=user_rooms
    ).annotate(
        friend_activity=Count('messages')
    ).order_by('-friend_activity')

    # Get recommendations based on categories the user has shown interest in
    user_categories = Category.objects.filter(
        room__in=user_rooms
    ).distinct()

    category_recommendations = Room.objects.filter(
        category__in=user_categories
    ).exclude(
        id__in=user_rooms
    ).exclude(
        id__in=friend_active_rooms
    ).annotate(
        category_score=Count('messages')
    ).order_by('-category_score')

    # Get generally popular rooms
    popular_rooms = Room.objects.exclude(
        id__in=user_rooms
    ).exclude(
        id__in=friend_active_rooms
    ).exclude(
        id__in=category_recommendations
    ).annotate(
        message_count=Count('messages')
    ).order_by('-message_count')

    # Combine recommendations with priority order
    recommendations = list(friend_active_rooms[:limit])
    remaining = limit - len(recommendations)

    if remaining > 0:
        recommendations.extend(list(category_recommendations[:remaining]))
        remaining = limit - len(recommendations)

    if remaining > 0:
        recommendations.extend(list(popular_rooms[:remaining]))

    return recommendations


def record_user_interest(user, room=None, category=None, points=1):
    """
    Record a user's interest in a room or category by incrementing their engagement score.

    Args:
        user: The User object
        room: Optional Room object
        category: Optional Category object
        points: Number of points to add to the engagement score

    Returns:
        UserInterest object
    """
    if not user.is_authenticated:
        return None

    if room:
        interest, created = UserInterest.objects.get_or_create(
            user=user, room=room, defaults={'engagement_score': 0}
        )
        interest.engagement_score = F('engagement_score') + points
        interest.save()

        # Also record interest in the room's category if it has one
        if room.category:
            category_interest, created = UserInterest.objects.get_or_create(
                user=user, category=room.category, defaults={'engagement_score': 0}
            )
            category_interest.engagement_score = F('engagement_score') + (points // 2)  # Half points for category
            category_interest.save()

        return interest

    elif category:
        interest, created = UserInterest.objects.get_or_create(
            user=user, category=category, defaults={'engagement_score': 0}
        )
        interest.engagement_score = F('engagement_score') + points
        interest.save()
        return interest

    return None


def get_friend_suggestions(user, limit=10):
    """
    Get friend suggestions for a user based on:
    1. Friends of friends
    2. Users active in the same rooms
    3. Users with similar interests

    Args:
        user: The User object to get suggestions for
        limit: Maximum number of users to suggest

    Returns:
        List of User objects
    """
    if not user.is_authenticated:
        return []

    # Get the user's current friends
    current_friends = UserRelationship.get_friends(user)

    # Get the IDs of current friends
    friend_ids = list(current_friends.values_list('id', flat=True))

    # Get friends of friends
    friends_of_friends = User.objects.filter(
        relationship_requests_received__requester__in=friend_ids,
        relationship_requests_received__status='accepted'
    ).exclude(
        id=user.id
    ).exclude(
        id__in=friend_ids
    ).distinct()

    # Get users active in the same rooms as the user
    rooms_user_active_in = Room.objects.filter(messages__user=user).distinct()

    common_room_users = User.objects.filter(
        messages__room__in=rooms_user_active_in
    ).exclude(
        id=user.id
    ).exclude(
        id__in=friend_ids
    ).exclude(
        id__in=friends_of_friends.values_list('id', flat=True)
    ).annotate(
        common_activity=Count('messages')
    ).order_by('-common_activity').distinct()

    # Get users with similar interests (categories)
    user_categories = Category.objects.filter(
        room__messages__user=user
    ).distinct()

    similar_interest_users = User.objects.filter(
        messages__room__category__in=user_categories
    ).exclude(
        id=user.id
    ).exclude(
        id__in=friend_ids
    ).exclude(
        id__in=friends_of_friends.values_list('id', flat=True)
    ).exclude(
        id__in=common_room_users.values_list('id', flat=True)
    ).annotate(
        interest_overlap=Count('messages')
    ).order_by('-interest_overlap').distinct()

    # Combine suggestions with priority order
    suggestions = list(friends_of_friends[:limit])
    remaining = limit - len(suggestions)

    if remaining > 0:
        suggestions.extend(list(common_room_users[:remaining]))
        remaining = limit - len(suggestions)

    if remaining > 0:
        suggestions.extend(list(similar_interest_users[:remaining]))

    return suggestions
