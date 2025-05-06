from django.http import JsonResponse
from django.views.decorators.http import require_POST
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_protect
from django.db.models import Count
import json
from .models import Room, RoomBookmark, UserProfile

from django.contrib.auth.models import User
from .models import UserRelationship, Room, Message, Category
from .services import get_room_recommendations, get_friend_suggestions, get_online_friends

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

@login_required
@require_POST
def toggle_bookmark_room(request):
    data = json.loads(request.body)
    room_name = data.get('room_name')
    bookmarked = data.get('bookmarked', False)

    try:
        room = Room.objects.get(name=room_name)

        # Update or create bookmark
        bookmark, created = RoomBookmark.objects.get_or_create(
            user=request.user,
            room=room,
            defaults={'is_bookmarked': bookmarked}
        )

        if not created:
            # Update existing bookmark
            bookmark.is_bookmarked = bookmarked
            bookmark.save()

        return JsonResponse({'success': True})

    except Room.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Room not found'})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@login_required
def get_recommendations(request):
    """API endpoint to get room recommendations and bookmarked rooms"""
    try:
        # Get popular rooms as recommendations
        recommended_rooms = []

        # Get rooms with message counts
        active_rooms = Room.objects.annotate(
            message_count=Count('messages')
        ).order_by('-message_count')[:5]

        for room in active_rooms:
            # Skip rooms the user has already bookmarked (to avoid duplication)
            if RoomBookmark.objects.filter(user=request.user, room=room, is_bookmarked=True).exists():
                continue

            recommended_rooms.append({
                'name': room.name,
                'display_name': room.display_name or room.name.replace('-', ' ').title(),
                'category': room.category.name if room.category else None,
                'message_count': room.message_count,
                'activity': 'high' if room.message_count > 50 else 'medium',
                'is_protected': getattr(room, 'is_protected', False)
            })

        # Get bookmarked rooms
        bookmarked_rooms = []
        bookmarks = RoomBookmark.objects.filter(
            user=request.user,
            is_bookmarked=True
        ).select_related('room', 'room__category')

        for bookmark in bookmarks:
            room = bookmark.room
            if not room:
                continue

            bookmarked_rooms.append({
                'name': room.name,
                'display_name': room.display_name or room.name.replace('-', ' ').title(),
                'category': room.category.name if room.category else None,
                'message_count': room.messages.count(),
                'activity': 'high' if room.messages.count() > 50 else 'medium',
                'is_protected': getattr(room, 'is_protected', False)
            })

        return JsonResponse({
            'success': True,
            'rooms': recommended_rooms,
            'bookmarked_rooms': bookmarked_rooms
        })

    except Exception as e:
        import traceback
        return JsonResponse({
            'success': False,
            'error': str(e),
            'traceback': traceback.format_exc()
        }, status=500)

@login_required
@require_POST
def update_profile_picture(request):
    try:
        if 'profile_picture' in request.FILES:
            # Handle file upload
            profile, created = UserProfile.objects.get_or_create(user=request.user)
            profile.avatar = request.FILES['profile_picture']
            profile.save()

            return JsonResponse({
                'success': True,
                'image_url': profile.avatar.url
            })
        else:
            # Handle JSON profile data
            data = json.loads(request.body)
            profile_picture = data.get('profile_picture', {})

            profile, created = UserProfile.objects.get_or_create(user=request.user)
            profile.profile_picture_data = json.dumps(profile_picture)
            profile.save()

            return JsonResponse({
                'success': True,
                'message': 'Profile updated successfully'
            })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=400)
