from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import login
from django.utils.text import slugify
from django.db.models import Count, Q
from django.http import JsonResponse
from django.core.paginator import Paginator
from django.views.decorators.csrf import csrf_exempt
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from collections import defaultdict
from django.utils import timezone
from datetime import timedelta
import json
import os
from .models import Room, Message, Reaction, Category, Meetup


def index(request):
    # Create default categories using the model method instead of duplicating the list here
    Category.create_default_categories()

    # Get all categories
    categories = Category.objects.all().order_by('name')

    # Get rooms with message counts
    rooms = []
    all_rooms = Room.objects.all().order_by('-created_at')

    for room in all_rooms:
        # Skip if room is None (shouldn't happen, but being safe)
        if room is None:
            continue

        message_count = Message.objects.filter(room=room).count()
        display_name = room.name.replace('-', ' ').title()

        # Create a room object with all needed data - with safe defaults
        room_data = {
            'name': room.name,
            'display_name': display_name,
            'creator': room.creator,
            'message_count': message_count,
            'category': room.category,  # This might be None, that's ok
            'category_slug': room.category.slug if room.category else 'all',
        }
        rooms.append(room_data)

    # Get rooms by category
    rooms_by_category = {}
    for category in categories:
        # Filter rooms for this category safely
        category_rooms = [
            r for r in rooms
            if r['category'] is not None and r['category'].id == category.id
        ]
        rooms_by_category[category.slug] = category_rooms

    # Add an "All Rooms" category
    rooms_by_category['all'] = rooms

    # For the room creation form's category dropdown
    category_choices = [(c.slug, c.name) for c in categories]

    # MODIFIED: Get trending rooms (rooms with the most messages overall, top 30)
    # First, get message counts for each room
    room_activities = {}
    for room in all_rooms:
        if room is None:
            continue

        # Count all messages in the room
        message_count = Message.objects.filter(room=room).count()

        if message_count > 0:
            room_activities[room.id] = {
                'room': room,
                'message_count': message_count
            }

    # Sort by message count and take top 30
    sorted_rooms = sorted(
        room_activities.values(),
        key=lambda x: x['message_count'],
        reverse=True
    )[:30]  # Get top 30 most active rooms

    # Prepare trending room data safely
    trending_room_data = []
    for activity_data in sorted_rooms:
        room_obj = activity_data['room']

        # Find the corresponding room data from our main rooms list
        for r in rooms:
            if 'name' in r and r['name'] == room_obj.name:
                trending_room_data.append(r)
                break

    # Add trending rooms to category dict
    rooms_by_category['trending'] = trending_room_data

    context = {
        'categories': categories,
        'active_rooms': rooms,  # For backwards compatibility
        'rooms_by_category': rooms_by_category,
        'category_choices': category_choices,
    }

    return render(request, 'chat/index.html', context)

def load_more_rooms(request):
    page = int(request.GET.get('page', 1))
    page_size = 20
    offset = (page - 1) * page_size

    # Get category filter if provided
    category = request.GET.get('category', None)

    # Filter by category if specified
    if category and category != 'all' and category != 'trending':
        # Normal category filter
        room_objects = Room.objects.filter(
            category__name__iexact=category
        ).order_by('-created_at')[offset:offset+page_size]

        total_count = Room.objects.filter(
            category__name__iexact=category
        ).count()
    elif category == 'trending':
        # MODIFIED: Get the rooms with the most messages overall (top 30)
        # Get all rooms with their message counts
        rooms_with_counts = []
        for room in Room.objects.all():
            count = Message.objects.filter(room=room).count()
            rooms_with_counts.append((room, count))

        # Sort by message count (most messages first)
        rooms_with_counts.sort(key=lambda x: x[1], reverse=True)

        # Get the top 30 rooms overall
        top_rooms = rooms_with_counts[:30]

        # Get the subset for this page
        room_subset = top_rooms[offset:offset+page_size]
        room_objects = [r[0] for r in room_subset]
        total_count = len(top_rooms)  # Use the count of trending rooms
    else:
        # No category filter or "all" category
        room_objects = Room.objects.all().order_by('-created_at')[offset:offset+page_size]
        total_count = Room.objects.count()

    rooms = []
    for room in room_objects:
        message_count = Message.objects.filter(room=room).count()

        # Use display_name if available, otherwise format the name
        if hasattr(room, 'display_name') and room.display_name:
            display_name = room.display_name
        else:
            display_name = room.name.replace('-', ' ').title()

        category_name = room.category.name.lower() if room.category else 'all'

        room_data = {
            'name': room.name,
            'display_name': display_name,
            'message_count': message_count,
            'category': category_name,
            'creator': room.creator.username
        }
        rooms.append(room_data)

    has_next = total_count > offset + page_size

    return JsonResponse({
        'rooms': rooms,
        'has_next': has_next
    })

def room(request, room_name):
    # Get the room or return 404
    room = get_object_or_404(Room, name=room_name)

    # Get messages for the room
    messages = Message.objects.filter(room=room).order_by('timestamp')

    # Prepare reaction data
    reactions = defaultdict(dict)

    # Get all reactions for these messages
    message_reactions = Reaction.objects.filter(
        message__in=messages
    ).values('message_id', 'emoji').annotate(count=Count('id'))

    # Organize reactions by message_id and emoji
    for reaction in message_reactions:
        message_id = reaction['message_id']
        emoji = reaction['emoji']
        count = reaction['count']

        if str(message_id) not in reactions:
            reactions[str(message_id)] = {}

        reactions[str(message_id)][emoji] = count

    # Get username (handle both authenticated and non-authenticated users)
    username = request.user.username if request.user.is_authenticated else "Guest"

    # Get upcoming meetups for this room
    upcoming_meetups = Meetup.objects.filter(
        room=room,
        datetime__gt=timezone.now()
    ).order_by('datetime')

    # Pass data to template
    context = {
        'room_name': room_name,
        'room': room,
        'messages': messages,
        'username': username,
        'reactions': reactions,
        'can_delete': request.user.is_authenticated and room.creator == request.user,
        'upcoming_meetups': upcoming_meetups,
    }

    return render(request, 'chat/room.html', context)

@login_required
def delete_room(request, room_name):
    room = get_object_or_404(Room, name=room_name)
    if request.user == room.creator:
        room.delete()
    return redirect('index')

def signup(request):
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            return redirect('index')
    else:
        form = UserCreationForm()
    return render(request, 'chat/signup.html', {'form': form})

@csrf_exempt
def upload_media(request):
    if request.method == 'POST' and request.FILES.getlist('media'):
        urls = []
        for f in request.FILES.getlist('media'):
            path = default_storage.save(f'chat_uploads/{f.name}', ContentFile(f.read()))
            urls.append(default_storage.url(path))
        return JsonResponse({'success': True, 'urls': urls})
    return JsonResponse({'success': False, 'error': 'No files received'}, status=400)

@login_required
def create_room(request):
    if request.method == 'POST':
        room_name = request.POST.get('room_name', '').strip()
        category_slug = request.POST.get('room_category', '').strip()  # Get slug instead of name

        if room_name:
            # Convert to slug format
            room_slug = slugify(room_name)

            # Check if room exists
            if not Room.objects.filter(name=room_slug).exists():
                # Find category by slug (more reliable than name)
                category = None
                if category_slug:
                    try:
                        category = Category.objects.get(slug=category_slug)
                    except Category.DoesNotExist:
                        # If exact slug not found, try to get by name as fallback
                        try:
                            category = Category.objects.get(name__iexact=category_slug)
                        except Category.DoesNotExist:
                            # Create a new category only if necessary
                            category = Category.objects.create(
                                name=category_slug.title(),
                                icon=get_category_icon(category_slug)
                            )

                # Create room with category
                room = Room.objects.create(
                    name=room_slug,
                    display_name=room_name,  # Store the original name
                    creator=request.user,
                    category=category
                )

                return redirect('room', room_name=room_slug)

    return redirect('index')

def get_category_icon(category_name):
    """Return an appropriate icon for the category based on its name."""
    category_icons = {
        'tech': '💻',
        'social': '👋',
        'creative': '🎨',
        'gaming': '🎮',
        'education': '📚',
        'health': '🧘',
        'music': '🎵',
        'food': '🍕',
        'travel': '✈️',
        'finance': '💰',
        'sports': '⚽',
        'media': '🎬',
        'books': '📖',
        'science': '🔬',
    }
    return category_icons.get(category_name.lower(), '🌟')  # Default icon if not found

@csrf_exempt
@login_required
def send_message(request, room_name):
    """Send a new message to the room."""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            content = data.get('message', '').strip()
            media_url = data.get('media_url', None)

            if not content and not media_url:
                return JsonResponse({'error': 'Message cannot be empty'}, status=400)

            room = get_object_or_404(Room, name=room_name)

            # Create the message
            message = Message.objects.create(
                user=request.user,
                room=room,
                content=content
            )

            # If there's media attached
            if media_url:
                message.media = media_url
                message.save()

            # Instead of returning JSON, we'll let the WebSocket handle the UI update
            # This is to match the existing chat.js behavior

            # Import the channel layer to send WebSocket message
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync

            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"chat_{room_name}",
                {
                    'type': 'chat_message',
                    'message': content,
                    'username': request.user.username,
                    'message_id': message.id,
                    'timestamp': message.timestamp.isoformat()
                }
            )

            return JsonResponse({
                'success': True,
                'message_id': message.id,
                'timestamp': message.timestamp.isoformat(),
                'username': request.user.username
            })

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    return JsonResponse({'error': 'Invalid request method'}, status=405)

@csrf_exempt
@login_required
def add_reaction(request, message_id):
    """Add a reaction to a message."""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            emoji = data.get('emoji', '').strip()
            reaction = data.get('reaction', emoji).strip()  # For compatibility with your chat.js

            if not reaction:
                return JsonResponse({'error': 'Emoji cannot be empty'}, status=400)

            message = get_object_or_404(Message, id=message_id)

            # Check if this reaction already exists
            reaction_obj, created = Reaction.objects.get_or_create(
                message=message,
                user=request.user,
                emoji=reaction
            )

            if not created:
                # If the reaction already exists, remove it (toggle behavior)
                reaction_obj.delete()
                action = 'removed'
            else:
                action = 'added'

            # Get updated reaction count
            reaction_count = Reaction.objects.filter(
                message=message,
                emoji=reaction
            ).count()

            # Get users who reacted with this emoji
            users = list(Reaction.objects.filter(
                message=message,
                emoji=reaction
            ).values_list('user__username', flat=True))

            # Send update via WebSocket
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync

            room_name = message.room.name
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"chat_{room_name}",
                {
                    'type': 'reaction',
                    'message_id': message_id,
                    'reaction': reaction,
                    'count': reaction_count,
                    'users': users
                }
            )

            return JsonResponse({
                'success': True,
                'action': action,
                'emoji': reaction,
                'count': reaction_count,
                'message_id': message_id,
                'users': users
            })

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    return JsonResponse({'error': 'Invalid request method'}, status=405)

@login_required
def get_reaction_users(request, message_id, emoji):
    """Get the list of users who reacted with a specific emoji."""
    try:
        message = get_object_or_404(Message, id=message_id)
        reactions = Reaction.objects.filter(message=message, emoji=emoji)

        users = [reaction.user.username for reaction in reactions]

        return JsonResponse({
            'success': True,
            'users': users,
            'emoji': emoji,
            'message_id': message_id
        })

    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
@login_required
def create_meetup(request, room_name):
    """Create a new meetup for a room."""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            title = data.get('title', '').strip()
            datetime_str = data.get('datetime', '').strip()
            location = data.get('location', '').strip()
            description = data.get('description', '').strip()

            if not title or not datetime_str or not location:
                return JsonResponse({'error': 'Title, datetime, and location are required'}, status=400)

            room = get_object_or_404(Room, name=room_name)

            from django.utils.dateparse import parse_datetime
            parsed_datetime = parse_datetime(datetime_str)

            # Create the meetup
            meetup = Meetup.objects.create(
                title=title,
                description=description,
                datetime=parsed_datetime,
                location=location,
                room=room,
                creator=request.user
            )

            return JsonResponse({
                'success': True,
                'meetup_id': meetup.id,
                'title': meetup.title,
                'datetime': meetup.datetime.isoformat(),
                'location': meetup.location
            })

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    return JsonResponse({'error': 'Invalid request method'}, status=405)

@login_required
def get_room_media(request, room_name):
    """Get all media files shared in a room."""
    room = get_object_or_404(Room, name=room_name)

    # Get all messages with media in this room
    messages_with_media = Message.objects.filter(
        room=room,
        media__isnull=False
    ).order_by('-timestamp')

    media_files = []
    for message in messages_with_media:
        media_type = 'image' if any(message.media.name.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif']) else 'video'
        media_files.append({
            'url': message.media.url,
            'type': media_type,
            'uploaded_by': message.user.username,
            'timestamp': message.timestamp.isoformat(),
            'message_id': message.id
        })

    return JsonResponse({
        'success': True,
        'media': media_files
    })

def get_active_users(request, room_name):
    """Get a list of users currently active in a room."""
    # This would typically use a websocket/channel layer to track active users
    # For now, we'll return a simulated list of active users
    room = get_object_or_404(Room, name=room_name)

    # Find users who sent messages in this room in the last hour
    from django.utils import timezone
    from datetime import timedelta

    last_hour = timezone.now() - timedelta(hours=1)
    recent_users = Message.objects.filter(
        room=room,
        timestamp__gte=last_hour
    ).values_list('user__username', flat=True).distinct()

    # Add the current user to the list if authenticated
    if request.user.is_authenticated and request.user.username not in recent_users:
        recent_users = list(recent_users)
        recent_users.append(request.user.username)

    return JsonResponse({
        'success': True,
        'active_users': recent_users
    })

def search_rooms(request):
    """Search for rooms by name or category."""
    query = request.GET.get('q', '').strip()

    if not query:
        return JsonResponse({'rooms': []})

    rooms = Room.objects.filter(
        Q(name__icontains=query) |
        Q(category__name__icontains=query)
    ).order_by('-created_at')

    results = []
    for room in rooms:
        message_count = Message.objects.filter(room=room).count()
        display_name = room.name.replace('-', ' ').title()

        results.append({
            'name': room.name,
            'display_name': display_name,
            'message_count': message_count,
            'category': room.category.name.lower() if room.category else 'all',
            'creator': room.creator.username
        })

    return JsonResponse({'rooms': results})

@csrf_exempt
def whiteboard_update(request, room_name):
    """Handle whiteboard drawing updates."""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            drawing_data = data.get('drawing_data', [])

            # In a real implementation, this would save to a database or broadcast via WebSockets
            # For now, we'll just acknowledge receipt

            return JsonResponse({'success': True})

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    return JsonResponse({'error': 'Invalid request method'}, status=405)
