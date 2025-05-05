from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_protect
import json

from django.contrib.auth.models import User
from .models import UserRelationship, Room, Message, Category
from .user_services import get_room_recommendations, get_friend_suggestions, get_online_friends

@login_required
@csrf_protect
@require_POST
def send_friend_request(request):
    """
    API view to send a friend request to another user
    """
    try:
        data = json.loads(request.body)
        receiver_id = data.get('receiver_id')

        if not receiver_id:
            return JsonResponse({'success': False, 'error': 'Receiver ID is required'})

        # Get receiver user
        try:
            receiver = User.objects.get(id=receiver_id)
        except User.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'User not found'})

        # Don't allow sending request to yourself
        if receiver.id == request.user.id:
            return JsonResponse({'success': False, 'error': 'Cannot send friend request to yourself'})

        # Check if relationship already exists
        existing = UserRelationship.get_friendship(request.user, receiver)
        if existing:
            return JsonResponse({'success': False, 'error': f'A relationship already exists with status: {existing.status}'})

        # Create the relationship
        relationship = UserRelationship.objects.create(
            requester=request.user,
            receiver=receiver,
            status='pending'
        )

        # TODO: Send notification to receiver

        return JsonResponse({'success': True})

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@login_required
@csrf_protect
@require_POST
def respond_to_friend_request(request):
    """
    API view to accept or decline a friend request
    """
    try:
        data = json.loads(request.body)
        relationship_id = data.get('relationship_id')
        action = data.get('action')  # 'accept' or 'decline'

        if not relationship_id or not action:
            return JsonResponse({'success': False, 'error': 'Relationship ID and action are required'})

        if action not in ['accept', 'decline']:
            return JsonResponse({'success': False, 'error': 'Invalid action. Must be "accept" or "decline"'})

        # Get relationship
        try:
            relationship = UserRelationship.objects.get(id=relationship_id, receiver=request.user, status='pending')
        except UserRelationship.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Friend request not found'})

        # Update status
        relationship.status = 'accepted' if action == 'accept' else 'declined'
        relationship.save()

        # TODO: Send notification to requester

        return JsonResponse({'success': True})

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@login_required
@csrf_protect
@require_POST
def remove_friend(request):
    """
    API view to remove a friend relationship
    """
    try:
        data = json.loads(request.body)
        username = data.get('username')

        if not username:
            return JsonResponse({'success': False, 'error': 'Username is required'})

        # Get the friend user
        try:
            friend = User.objects.get(username=username)
        except User.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'User not found'})

        # Remove relationship
        result = UserRelationship.remove_friendship(request.user, friend)

        if not result:
            return JsonResponse({'success': False, 'error': 'Friendship not found'})

        return JsonResponse({'success': True})

    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'error': 'Invalid JSON'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@login_required
def get_friend_suggestions_ajax(request):
    """
    API view to get friend suggestions for the current user
    """
    try:
        suggestions = get_friend_suggestions(request.user)

        # Format the suggestions for the response
        formatted_suggestions = [
            {
                'id': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'avatar': user.username[:1].upper()
            }
            for user in suggestions
        ]

        return JsonResponse({
            'success': True,
            'suggestions': formatted_suggestions
        })

    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

def get_recommended_rooms(request):
    """
    API view to get room recommendations
    """
    try:
        rooms = get_room_recommendations(request.user)

        # Format the rooms for the response
        formatted_rooms = [
            {
                'id': room.id,
                'name': room.name,
                'display_name': room.display_name or room.name,
                'category': room.category.name if room.category else None,
                'message_count': room.messages.count(),
                'is_protected': room.is_protected,
                'creator': room.creator.username
            }
            for room in rooms
        ]

        return JsonResponse({
            'success': True,
            'rooms': formatted_rooms
        })

    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@login_required
def get_online_friends_api(request):
    """
    API view to get online friends for the current user
    """
    try:
        online_friends = get_online_friends(request.user)

        # Format the online friends for the response
        formatted_friends = [
            {
                'id': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'avatar': user.username[:1].upper()
            }
            for user in online_friends
        ]

        return JsonResponse({
            'success': True,
            'friends': formatted_friends
        })

    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})
