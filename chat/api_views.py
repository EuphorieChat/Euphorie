from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from django.contrib.auth.models import User
from django.db.models import Count, Q, F
from datetime import timedelta
import json
import logging

from .models import (
    Room, Message, Category, UserRelationship,
    UserStatus, UserInterest, RoomBookmark
)
from .services import (
    get_online_friends, get_room_recommendations,
    record_user_interest, get_friend_suggestions
)

logger = logging.getLogger(__name__)


def get_recommendations(request):
    """
    Get room recommendations - works for both authenticated and guest users
    """
    try:
        recommendations = []
        bookmarked_rooms = []

        if request.user.is_authenticated:
            # Get personalized recommendations for authenticated users
            # Get rooms the user has already participated in
            user_rooms = Room.objects.filter(
                messages__user=request.user
            ).distinct().values_list('id', flat=True)

            # Get recommendations - exclude rooms the user is already in
            recommendations = Room.objects.exclude(
                id__in=user_rooms
            ).annotate(
                msg_count=Count('messages')
            ).order_by('-msg_count')[:5]

            # Get bookmarked rooms
            bookmarks = RoomBookmark.objects.filter(
                user=request.user,
                is_bookmarked=True
            ).select_related('room', 'room__category')

            for bookmark in bookmarks:
                room = bookmark.room
                if room:
                    msg_count = room.messages.count()
                    bookmarked_rooms.append({
                        'name': room.name,
                        'display_name': room.display_name or room.name.title(),
                        'category': room.category.name if room.category else None,
                        'message_count': msg_count,
                        'activity': 'high' if msg_count > 50 else 'medium',
                        'is_protected': getattr(room, 'is_protected', False)
                    })
        else:
            # For anonymous users, just return popular rooms
            recommendations = Room.objects.annotate(
                msg_count=Count('messages')
            ).order_by('-msg_count')[:5]

        # Format recommendations for frontend
        rooms_data = []
        for room in recommendations:
            msg_count = getattr(room, 'msg_count', 0)
            rooms_data.append({
                'name': room.name,
                'display_name': room.display_name or room.name.title(),
                'category': room.category.name if room.category else None,
                'message_count': msg_count,
                'activity': 'high' if msg_count > 50 else 'medium',
                'is_protected': getattr(room, 'is_protected', False)
            })

        return JsonResponse({
            'success': True,
            'rooms': rooms_data,
            'bookmarked_rooms': bookmarked_rooms
        })
    except Exception as e:
        logger.error(f"Error in get_recommendations: {str(e)}", exc_info=True)

        return JsonResponse({
            'success': True,  # Return success but with empty data
            'rooms': [],
            'bookmarked_rooms': []
        })


@login_required
def send_friend_request(request):
    """Send a friend request to another user"""
    try:
        if request.method == 'POST':
            data = json.loads(request.body)
            receiver_username = data.get('receiver')

            if not receiver_username:
                return JsonResponse({
                    'success': False,
                    'error': 'Receiver username is required'
                }, status=400)

            receiver = get_object_or_404(User, username=receiver_username)

            if receiver == request.user:
                return JsonResponse({
                    'success': False,
                    'error': 'Cannot send friend request to yourself'
                }, status=400)

            # Check if relationship already exists
            existing = UserRelationship.objects.filter(
                Q(requester=request.user, receiver=receiver) |
                Q(requester=receiver, receiver=request.user)
            ).first()

            if existing:
                if existing.status == 'accepted':
                    return JsonResponse({
                        'success': False,
                        'error': 'You are already friends'
                    }, status=400)
                elif existing.status == 'pending':
                    return JsonResponse({
                        'success': False,
                        'error': 'Friend request already pending'
                    }, status=400)

            # Create new friend request
            relationship = UserRelationship.objects.create(
                requester=request.user,
                receiver=receiver,
                status='pending'
            )

            return JsonResponse({
                'success': True,
                'message': 'Friend request sent successfully'
            })

    except Exception as e:
        logger.error(f"Error in send_friend_request: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': 'An error occurred while sending friend request'
        }, status=500)


@login_required
def respond_to_friend_request(request):
    """Accept or decline a friend request"""
    try:
        if request.method == 'POST':
            data = json.loads(request.body)
            requester_username = data.get('requester')
            action = data.get('action')  # 'accept' or 'decline'

            if not requester_username or action not in ['accept', 'decline']:
                return JsonResponse({
                    'success': False,
                    'error': 'Invalid parameters'
                }, status=400)

            requester = get_object_or_404(User, username=requester_username)

            # Find the pending request
            relationship = get_object_or_404(
                UserRelationship,
                requester=requester,
                receiver=request.user,
                status='pending'
            )

            if action == 'accept':
                relationship.status = 'accepted'
                message = 'Friend request accepted'
            else:
                relationship.status = 'declined'
                message = 'Friend request declined'

            relationship.save()

            return JsonResponse({
                'success': True,
                'message': message
            })

    except Exception as e:
        logger.error(f"Error in respond_to_friend_request: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': 'An error occurred while responding to friend request'
        }, status=500)


@login_required
def remove_friend(request):
    """Remove a friend relationship"""
    try:
        if request.method == 'POST':
            data = json.loads(request.body)
            friend_username = data.get('friend')

            if not friend_username:
                return JsonResponse({
                    'success': False,
                    'error': 'Friend username is required'
                }, status=400)

            friend = get_object_or_404(User, username=friend_username)

            # Remove friendship
            success = UserRelationship.remove_friendship(request.user, friend)

            if success:
                return JsonResponse({
                    'success': True,
                    'message': 'Friend removed successfully'
                })
            else:
                return JsonResponse({
                    'success': False,
                    'error': 'Could not remove friend'
                }, status=400)

    except Exception as e:
        logger.error(f"Error in remove_friend: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': False,
            'error': 'An error occurred while removing friend'
        }, status=500)


def get_friend_suggestions_ajax(request):
    """Get friend suggestions for the current user"""
    try:
        suggestions = []

        if request.user.is_authenticated:
            suggestions_list = get_friend_suggestions(request.user, limit=10)

            for user in suggestions_list:
                suggestions.append({
                    'username': user.username,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'id': user.id
                })

        return JsonResponse({
            'success': True,
            'suggestions': suggestions
        })

    except Exception as e:
        logger.error(f"Error in get_friend_suggestions_ajax: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': True,
            'suggestions': []
        })


def get_online_friends_api(request):
    """Get list of online friends for the current user"""
    try:
        online_friends = []

        if request.user.is_authenticated:
            friends_list = get_online_friends(request.user)

            for friend in friends_list:
                online_friends.append({
                    'username': friend.username,
                    'first_name': friend.first_name,
                    'last_name': friend.last_name,
                    'id': friend.id,
                    'is_online': True
                })

        return JsonResponse({
            'success': True,
            'friends': online_friends
        })

    except Exception as e:
        logger.error(f"Error in get_online_friends_api: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': True,
            'friends': []
        })


def get_recommended_rooms(request):
    """Get recommended rooms for the current user"""
    try:
        rooms = []

        if request.user.is_authenticated:
            recommended_rooms = get_room_recommendations(request.user, limit=5)

            for room in recommended_rooms:
                rooms.append({
                    'name': room.name,
                    'display_name': room.display_name or room.name.title(),
                    'category': room.category.name if room.category else None,
                    'message_count': room.messages.count(),
                    'is_protected': getattr(room, 'is_protected', False)
                })
        else:
            # For anonymous users, get popular rooms
            popular_rooms = Room.objects.annotate(
                msg_count=Count('messages')
            ).order_by('-msg_count')[:5]

            for room in popular_rooms:
                rooms.append({
                    'name': room.name,
                    'display_name': room.display_name or room.name.title(),
                    'category': room.category.name if room.category else None,
                    'message_count': getattr(room, 'msg_count', 0),
                    'is_protected': getattr(room, 'is_protected', False)
                })

        return JsonResponse({
            'success': True,
            'rooms': rooms
        })

    except Exception as e:
        logger.error(f"Error in get_recommended_rooms: {str(e)}", exc_info=True)
        return JsonResponse({
            'success': True,
            'rooms': []
        })
