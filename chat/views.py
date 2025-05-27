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
from .models import UserProfile
from collections import defaultdict
from django.views.decorators.http import require_POST
from django.utils import timezone
from django.contrib.auth.models import User
from datetime import timedelta
from django.db import models
from django.conf import settings
import json
import os
import re
from .models import (
    Room, Message, Reaction, Category, Meetup, UserRelationship,
    Announcement, AnnouncementReadStatus
)
import time
import random
from urllib.parse import quote

def generate_random_dicebear_avatar(username):
    """Generate a random DiceBear avatar for a new user"""
    # DiceBear 7.x styles (free, no API key needed)
    styles = [
        'adventurer', 'adventurer-neutral', 'avataaars', 'avataaars-neutral',
        'big-ears', 'big-ears-neutral', 'big-smile', 'bottts', 'bottts-neutral',
        'croodles', 'croodles-neutral', 'fun-emoji', 'icons', 'identicon',
        'lorelei', 'lorelei-neutral', 'micah', 'miniavs',
        'open-peeps', 'personas', 'pixel-art', 'pixel-art-neutral',
        'shapes', 'thumbs'
    ]

    # Choose a random style
    avatar_style = random.choice(styles)

    # Use username as seed for consistency
    seed = username

    # Generate consistent colors based on username
    colors = get_user_colors_for_avatar(username)

    # Build URL
    url = f"https://api.dicebear.com/7.x/{avatar_style}/svg?seed={quote(seed)}&size=200"

    # Add background color for some styles
    if avatar_style in ['initials', 'shapes', 'identicon']:
        bg_color = colors['bg'].replace('#', '')
        url += f"&backgroundColor={bg_color}"

    return {
        'type': 'avatar_url',
        'url': url,
        'service': 'dicebear',
        'style': avatar_style,
        'seed': seed
    }

def get_user_colors_for_avatar(username):
    """Generate consistent colors based on username"""
    # Create a hash from username for consistency
    hash_val = abs(hash(username))

    # Define beautiful color palettes
    palettes = [
        {'bg': '#FF6B6B', 'accent': '#4ECDC4', 'text': '#FFFFFF'},  # Red-Teal
        {'bg': '#4ECDC4', 'accent': '#45B7D1', 'text': '#FFFFFF'},  # Teal-Blue
        {'bg': '#45B7D1', 'accent': '#96CEB4', 'text': '#FFFFFF'},  # Blue-Green
        {'bg': '#96CEB4', 'accent': '#FECA57', 'text': '#2C3E50'},  # Green-Yellow
        {'bg': '#FECA57', 'accent': '#FF9FF3', 'text': '#2C3E50'},  # Yellow-Pink
        {'bg': '#FF9FF3', 'accent': '#54A0FF', 'text': '#FFFFFF'},  # Pink-Blue
        {'bg': '#54A0FF', 'accent': '#5F27CD', 'text': '#FFFFFF'},  # Blue-Purple
        {'bg': '#5F27CD', 'accent': '#00D2D3', 'text': '#FFFFFF'},  # Purple-Cyan
        {'bg': '#00D2D3', 'accent': '#FF9F43', 'text': '#2C3E50'},  # Cyan-Orange
        {'bg': '#FF9F43', 'accent': '#10AC84', 'text': '#FFFFFF'},  # Orange-Green
        {'bg': '#10AC84', 'accent': '#EE5A24', 'text': '#FFFFFF'},  # Green-Orange
        {'bg': '#EE5A24', 'accent': '#0984E3', 'text': '#FFFFFF'},  # Orange-Blue
        {'bg': '#A55EEA', 'accent': '#26C6DA', 'text': '#FFFFFF'},  # Purple-Cyan
        {'bg': '#26C6DA', 'accent': '#FFA726', 'text': '#2C3E50'},  # Cyan-Amber
        {'bg': '#FFA726', 'accent': '#66BB6A', 'text': '#FFFFFF'},  # Amber-Green
    ]

    return palettes[hash_val % len(palettes)]

def index(request):
    # Create default categories if they don't exist
    Category.create_default_categories()

    # Get all categories
    categories = Category.objects.all().order_by('name')

    # Get rooms with message counts using select_related but avoid conflicting with the property
    # UPDATED: Exclude DM rooms from public listing
    all_rooms = Room.objects.filter(is_dm=False)\
        .select_related('creator', 'category')\
        .annotate(msg_count=models.Count('messages'))\
        .order_by('-created_at')

    # Format room data for display
    rooms = []
    for room in all_rooms:
        # Skip if room is None (shouldn't happen, but being safe)
        if room is None:
            continue

        display_name = room.display_name if hasattr(room, 'display_name') and room.display_name else room.name.replace('-', ' ').title()

        # Use msg_count annotation or fall back to property if needed
        message_count = getattr(room, 'msg_count', None) or room.message_count

        # Create a room object with all needed data - with safe defaults
        room_data = {
            'name': room.name,
            'display_name': display_name,
            'creator': room.creator,
            'message_count': message_count,
            'category': room.category,  # This might be None, that's ok
            'category_slug': room.category.slug if room.category and hasattr(room.category, 'slug') else room.category.name.lower() if room.category else 'all',
        }
        rooms.append(room_data)

    # Get trending rooms - most messages first - EXCLUDE DMs
    # Use the annotation for sorting
    trending_rooms = sorted(
        [room for room in all_rooms if getattr(room, 'msg_count', 0) > 0],
        key=lambda x: getattr(x, 'msg_count', 0),
        reverse=True
    )[:30]  # Increased to 30 for more options

    # Create trending room data in the correct format
    trending_room_data = []
    for room_obj in trending_rooms:
        display_name = room_obj.display_name if hasattr(room_obj, 'display_name') and room_obj.display_name else room_obj.name.replace('-', ' ').title()
        message_count = getattr(room_obj, 'msg_count', None) or room_obj.message_count

        trending_room_data.append({
            'name': room_obj.name,
            'display_name': display_name,
            'creator': room_obj.creator,
            'message_count': message_count,
            'category': room_obj.category,
            'category_slug': room_obj.category.slug if room_obj.category and hasattr(room_obj.category, 'slug') else room_obj.category.name.lower() if room_obj.category else 'all',
        })

    # Get rooms by category
    rooms_by_category = {}
    for category in categories:
        # Filter rooms for this category safely
        category_rooms = [
            r for r in rooms
            if r['category'] is not None and r['category'].id == category.id
        ]
        rooms_by_category[category.name.lower()] = category_rooms

    # Add an "All Rooms" category if it doesn't exist
    if not any(c.name.lower() == 'all rooms' for c in categories):
        all_category = {'name': 'All Rooms', 'icon': '🏠'}
        rooms_by_category['all rooms'] = rooms

    # Add trending rooms to category dict
    rooms_by_category['trending'] = trending_room_data

    # For the room creation form's category dropdown
    # Include the icon directly in the choices to avoid needing get_item filter
    category_choices = [(c.slug, f"{c.icon if c.icon else '🌟'} {c.name}") for c in categories]

    # Include flag for determining if there are more rooms available
    has_more_rooms = all_rooms.count() > len(rooms)

    # Add pending friend requests to context if user is authenticated
    pending_friend_requests_count = 0
    if request.user.is_authenticated:
        pending_friend_requests_count = UserRelationship.objects.filter(
            receiver=request.user,
            status='pending'
        ).count()

    context = {
        'categories': categories,
        'active_rooms': rooms,  # For backwards compatibility
        'rooms_by_category': rooms_by_category,
        'category_choices': category_choices,
        'has_more_rooms': has_more_rooms,
        'pending_friend_requests_count': pending_friend_requests_count,
    }

    return render(request, 'chat/index.html', context)


def load_more_rooms(request):
    """
    API view to load more rooms with pagination and filtering
    Modified to work with your specific models
    """
    page = int(request.GET.get('page', 1))
    page_size = 9  # Changed from 20 to 9 for a 3x3 grid display
    offset = (page - 1) * page_size

    # Get filters from query parameters
    category = request.GET.get('category', None)
    sort_by = request.GET.get('sort', 'recent')  # Default to recent for backward compatibility
    search_query = request.GET.get('search', '')

    # Handle the "trending" category - this uses your existing special logic
    if category == 'trending':
        # Get all rooms with their message counts - EXCLUDE DMs
        rooms_with_counts = []
        for room in Room.objects.filter(is_dm=False)[:100]:  # Limit to first 100 for efficiency
            message_count = room.message_count  # Using your model property
            if message_count > 0:
                rooms_with_counts.append((room, message_count))

        # Sort by message count (most messages first)
        rooms_with_counts.sort(key=lambda x: x[1], reverse=True)

        # Get the subset for this page
        page_start = offset
        page_end = offset + page_size
        room_subset = rooms_with_counts[page_start:page_end]

        rooms = []
        for room, message_count in room_subset:
            room_data = {
                'name': room.name,
                'display_name': room.display_name,
                'message_count': message_count,  # Use the actual count we calculated
                'category': room.category.name if room.category else None,
                'category_slug': room.category.slug if room.category else 'all',
                'creator': room.creator.username,
                'created_at': room.created_at.isoformat()  # Added for sorting
            }
            rooms.append(room_data)

        has_next = len(rooms_with_counts) > page_end

    else:
        # Build base queryset - EXCLUDE DMs
        room_queryset = Room.objects.filter(is_dm=False)

        # Apply category filter if provided and not "all"
        if category and category != 'all':
            try:
                # First try to filter by slug (more reliable)
                room_queryset = room_queryset.filter(category__slug=category)
            except:
                # Fall back to case-insensitive name match
                room_queryset = room_queryset.filter(category__name__iexact=category)

        # Apply search filter if provided
        if search_query:
            room_queryset = room_queryset.filter(display_name__icontains=search_query)

        # Apply sorting
        if sort_by == 'alphabetical':
            room_queryset = room_queryset.order_by('display_name')
        else:  # Default to 'recent'
            room_queryset = room_queryset.order_by('-created_at')

        # Get total count before pagination
        total_count = room_queryset.count()

        # Apply pagination
        room_objects = room_queryset[offset:offset + page_size]

        # Format room data
        rooms = []
        for room in room_objects:
            message_count = room.message_count  # Using your model property

            room_data = {
                'name': room.name,
                'display_name': room.display_name,
                'message_count': message_count,
                'category': room.category.name if room.category else None,
                'category_slug': room.category.slug if room.category else 'all',
                'creator': room.creator.username,
                'created_at': room.created_at.isoformat()
            }
            rooms.append(room_data)

        # If sorting by "active", sort the rooms by message count
        if sort_by == 'active':
            # We need to fetch message count for each room
            for room_data in rooms:
                room_obj = next((r for r in room_objects if r.name == room_data['name']), None)
                if room_obj:
                    room_data['message_count'] = room_obj.message_count

            # Sort by message count
            rooms.sort(key=lambda x: x['message_count'], reverse=True)

        has_next = total_count > (offset + page_size)

    # Get trending rooms for the trending section (if not already fetched) - EXCLUDE DMs
    trending_rooms_data = []
    if category != 'trending' and sort_by != 'trending':
        # Logic for trending is similar to the category == 'trending' case
        rooms_with_counts = []
        for room in Room.objects.filter(is_dm=False)[:50]:  # Limit to first 50 for efficiency
            message_count = room.message_count  # Using your model property
            if message_count > 0:
                rooms_with_counts.append((room, message_count))

        rooms_with_counts.sort(key=lambda x: x[1], reverse=True)
        top_trending = rooms_with_counts[:6]  # Just get top 6 for trending section

        for room, message_count in top_trending:
            trending_rooms_data.append({
                'name': room.name,
                'display_name': room.display_name,
                'message_count': message_count,
                'category': room.category.name if room.category else None,
                'category_slug': room.category.slug if room.category else 'all',
                'creator': room.creator.username,
                'created_at': room.created_at.isoformat()
            })

    # Return JSON response with all data
    return JsonResponse({
        'success': True,
        'rooms': rooms,
        'trending_rooms': trending_rooms_data,
        'has_more': has_next
    })


def room(request, room_name):
    request.timestamp = int(time.time())
    room = get_object_or_404(Room, name=room_name)

    # ADDED: Check access for DM rooms - only allow the participants to access
    if room.is_dm:
        # For DM rooms, extract usernames from the room name (format: dm_username1_username2)
        parts = room_name.split('_')
        if len(parts) >= 3 and parts[0] == 'dm':
            # Get the usernames from the room name
            usernames = parts[1:]
            # If the current user's username is not in the usernames, deny access
            if not request.user.is_authenticated or (request.user.username not in usernames and not request.user.is_staff):
                # Redirect to home with an error message
                messages.error(request, "You don't have permission to access this private conversation.")
                return redirect('index')
        else:
            # If the room name format is invalid for a DM, deny access
            messages.error(request, "Invalid direct message room.")
            return redirect('index')

    # Get messages and parse media URLs
    messages_qs = Message.objects.filter(room=room).order_by('timestamp')
    messages = []
    reactions_map = {}

    # First, get all reactions for all messages in this room
    all_reactions = Reaction.objects.filter(
        message__room=room
    ).values('message_id', 'emoji').annotate(count=Count('id'))

    # Build the reactions map
    for reaction in all_reactions:
        msg_id = str(reaction['message_id'])
        if msg_id not in reactions_map:
            reactions_map[msg_id] = {}
        reactions_map[msg_id][reaction['emoji']] = reaction['count']

    # Process messages
    for msg in messages_qs:
        msg_data = {
            'id': msg.id,
            'user': msg.user,
            'content': msg.content,
            'timestamp': msg.timestamp,
            'media_url': None,
            'reactions': reactions_map.get(str(msg.id), {})
        }

        # Check if content contains media in [MEDIA:] format OR GIF format
        if '[MEDIA:' in msg.content:
            import re
            media_match = re.search(r'\[MEDIA:(.*?)\]', msg.content)
            if media_match:
                msg_data['media_url'] = media_match.group(1)
                # Remove media tag from content for display
                msg_data['content'] = re.sub(r'\[MEDIA:.*?\]', '', msg.content).strip()
        elif '[GIF:' in msg.content:
            # NEW: Handle GIF messages
            import re
            gif_match = re.search(r'\[GIF:(.*?)\]', msg.content)
            if gif_match:
                msg_data['media_url'] = '[GIF:' + gif_match.group(1) + ']'
                # Remove GIF tag from content for display
                msg_data['content'] = re.sub(r'\[GIF:.*?\]', '', msg.content).strip()

        messages.append(msg_data)

    # Get username
    username = request.user.username if request.user.is_authenticated else "Guest"

    # Get upcoming meetups for this room
    upcoming_meetups = Meetup.objects.filter(
        room=room,
        datetime__gt=timezone.now()
    ).order_by('datetime')

    # Get active announcements
    active_announcements = []
    if request.user.is_authenticated:
        announcements = Announcement.objects.filter(
            room=room,
            is_active=True
        )

        for announcement in announcements:
            # Check if user has read this announcement
            is_read = AnnouncementReadStatus.objects.filter(
                announcement=announcement,
                user=request.user
            ).exists()

            if not is_read:
                active_announcements.append(announcement)

    context = {
        'room_name': room_name,
        'room': room,
        'messages': messages,
        'username': username,
        'reactions': reactions_map,  # Pass the reactions map
        'can_delete': request.user.is_authenticated and room.creator == request.user,
        'upcoming_meetups': upcoming_meetups,
        'active_announcements': active_announcements,
        'GIPHY_API_KEY': settings.GIPHY_API_KEY,  # NEW: Add Giphy API key
    }

    return render(request, 'chat/room.html', context)

def ensure_user_has_profile(user):
    """Ensure user has a profile with an avatar, create one if needed"""
    if not user.is_authenticated:
        return None

    try:
        profile = UserProfile.objects.get(user=user)
        # Check if profile has avatar data
        if not profile.profile_picture_data:
            # Generate new avatar
            profile_data = generate_random_dicebear_avatar(user.username)
            profile.profile_picture_data = json.dumps(profile_data)
            profile.save()
            return profile_data
    except UserProfile.DoesNotExist:
        # Create new profile with avatar
        profile_data = generate_random_dicebear_avatar(user.username)
        # Generate random country if not already set
        import random
        country_codes = [
            'US', 'CA', 'GB', 'DE', 'FR', 'JP', 'AU', 'BR', 'IN', 'CN',
            'RU', 'IT', 'ES', 'MX', 'KR', 'NL', 'SE', 'NO', 'DK', 'FI'
        ]
        random_country = random.choice(country_codes)

        profile = UserProfile.objects.create(
            user=user,
            profile_picture_data=json.dumps(profile_data),
            country_code=random_country
        )
        return profile_data

    return None

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

            # Create user profile with random DiceBear avatar and random country
            try:
                profile_data = generate_random_dicebear_avatar(user.username)

                # Generate random country for new users
                import random
                country_codes = [
                    'US', 'CA', 'GB', 'DE', 'FR', 'JP', 'AU', 'BR', 'IN', 'CN',
                    'RU', 'IT', 'ES', 'MX', 'KR', 'NL', 'SE', 'NO', 'DK', 'FI',
                    'SG', 'TH', 'PH', 'MY', 'ID', 'VN', 'TR', 'EG', 'ZA', 'NG',
                    'KE', 'AR', 'CL', 'CO', 'PE', 'PL', 'CZ', 'HU', 'GR', 'PT'
                ]
                random_country = random.choice(country_codes)

                profile, created = UserProfile.objects.get_or_create(user=user)
                profile.profile_picture_data = json.dumps(profile_data)
                profile.country_code = random_country
                profile.save()

                print(f"Created DiceBear avatar and assigned country {random_country} for new user: {user.username} - Style: {profile_data['style']}")

            except Exception as e:
                print(f"Error creating avatar/country for {user.username}: {str(e)}")
                # Don't fail registration if avatar/country creation fails
                pass

            login(request, user)
            return redirect('index')
    else:
        form = UserCreationForm()
    return render(request, 'chat/signup.html', {'form': form})

os.makedirs(os.path.join(settings.MEDIA_ROOT, 'chat_uploads'), exist_ok=True)

@csrf_exempt
def upload_media(request):
    if request.method == 'POST' and request.FILES.getlist('media'):
        # Ensure the directory exists
        os.makedirs(os.path.join(settings.MEDIA_ROOT, 'chat_uploads'), exist_ok=True)

        urls = []
        for f in request.FILES.getlist('media'):
            # Save to media/chat_uploads/ directory
            file_path = f'chat_uploads/{f.name}'
            saved_path = default_storage.save(file_path, ContentFile(f.read()))

            # Build full URL with the correct /media/ prefix and domain
            url = request.build_absolute_uri(settings.MEDIA_URL + saved_path)

            # Debug info - will appear in your console logs
            print(f"File saved to: {os.path.join(settings.MEDIA_ROOT, saved_path)}")
            print(f"URL generated: {url}")

            urls.append(url)

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

            # Allow empty content if there's media
            if not content and not media_url:
                return JsonResponse({'error': 'Message cannot be empty'}, status=400)

            room = get_object_or_404(Room, name=room_name)

            # Create the message
            message = Message.objects.create(
                user=request.user,
                room=room,
                content=content or ''  # Allow empty content for media-only messages
            )

            # If there's media attached, handle it differently based on your model
            if media_url:
                # If your Message model has a media field as FileField
                if hasattr(message, 'media'):
                    # For URL-based media, you might need to download and save the file
                    # Or if it's already a path in your media folder, save it directly
                    message.media.name = media_url.replace('/media/', '')
                    message.save()

            # Send via WebSocket
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync

            channel_layer = get_channel_layer()

            # Send the complete message data including media
            message_data = {
                'type': 'chat_message',
                'message': content,
                'username': request.user.username,
                'message_id': message.id,
                'timestamp': message.timestamp.isoformat()
            }

            # Add media_url to the WebSocket message if present
            if media_url:
                message_data['media_url'] = media_url

            async_to_sync(channel_layer.group_send)(
                f"chat_{room_name}",
                message_data
            )

            return JsonResponse({
                'success': True,
                'message_id': message.id,
                'timestamp': message.timestamp.isoformat(),
                'username': request.user.username,
                'media_url': media_url
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

def get_room_media(request, room_name):
    try:
        room = get_object_or_404(Room, name=room_name)
        messages = Message.objects.filter(room=room)

        media_list = []
        import re

        for message in messages:
            # Check if message content contains media URLs
            if '[MEDIA:' in message.content:
                media_match = re.search(r'\[MEDIA:(.*?)\]', message.content)
                if media_match:
                    url = media_match.group(1)

                    # Determine media type based on file extension
                    media_type = 'image'
                    if url.lower().endswith(('.mp4', '.webm', '.mov', '.avi')):
                        media_type = 'video'
                    elif not url.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp')):
                        media_type = 'file'

                    media_list.append({
                        'type': media_type,
                        'url': url,
                        'timestamp': message.timestamp.isoformat()
                    })

        return JsonResponse({'success': True, 'media': media_list})

    except Exception as e:
        return JsonResponse({'success': True, 'media': []})

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

    # UPDATED: Exclude DMs from search results
    rooms = Room.objects.filter(
        Q(name__icontains=query) |
        Q(category__name__icontains=query),
        is_dm=False  # Exclude DM rooms
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

def explore_rooms(request):
    """
    View for the explore rooms page - displays categorized rooms and allows filtering
    """
    # Get all active rooms (limit to 15 for initial load) - EXCLUDE DMs
    all_rooms = Room.objects.filter(is_dm=False).order_by('-created_at')[:15]

    # Get trending rooms - rooms with most messages - EXCLUDE DMs
    # First get all rooms with their message counts
    rooms_with_counts = []
    for room in Room.objects.filter(is_dm=False)[:50]:  # Limit to first 50 for efficiency
        message_count = room.message_count  # Using your model property
        if message_count > 0:
            rooms_with_counts.append((room, message_count))

    # Sort by message count (most messages first)
    rooms_with_counts.sort(key=lambda x: x[1], reverse=True)

    # Get top trending rooms
    trending_rooms = [room for room, count in rooms_with_counts[:9]]

    # For featured rooms, we'll use top trending since you don't have is_featured field
    featured_rooms = [room for room, count in rooms_with_counts[:3]]

    # Get all categories with room count
    categories = Category.objects.all()

    # Add room count to categories
    for category in categories:
        category.room_count = Room.objects.filter(category=category, is_dm=False).count()

    # Sort categories by room count
    categories = sorted(categories, key=lambda x: x.room_count, reverse=True)

    # Get category choices for the dropdown
    category_choices = [(category.slug, category.name) for category in Category.objects.all()]

    # Check if there are more rooms to load
    has_more = Room.objects.filter(is_dm=False).count() > 15

    context = {
        'all_rooms': all_rooms,
        'trending_rooms': trending_rooms,
        'featured_rooms': featured_rooms,
        'categories': categories,
        'category_choices': category_choices,
        'has_more': has_more,
    }

    return render(request, 'chat/manage/explore_rooms.html', context)

# Add this to your context processor to include the friends count in all templates
def user_context(request):
    """
    Context processor to add user-related context variables to all templates
    """
    context = {}

    if request.user.is_authenticated:
        # Get pending friend requests count
        pending_requests_count = UserRelationship.objects.filter(
            receiver=request.user,
            status='pending'
        ).count()

        context['pending_friend_requests_count'] = pending_requests_count

    return context

@login_required
def friends_list(request):
    """
    View for the friends list page
    """
    # Get the user's friends
    friends = UserRelationship.get_friends(request.user)

    # Get pending friend requests received by the user
    pending_requests = UserRelationship.objects.filter(
        receiver=request.user,
        status='pending'
    )

    # For bookmarked rooms, use your existing query
    bookmarked_rooms = Room.objects.filter(
        bookmarks__user=request.user,
        bookmarks__is_bookmarked=True
    )

    # Since there's no 'members' field, you need to find another way to get "joined" rooms
    # This is a common approach - checking messages to see which rooms the user has participated in
    joined_rooms = Room.objects.filter(
        messages__user=request.user
    ).distinct().exclude(
        id__in=bookmarked_rooms.values('id')
    )

    context = {
        'friends': friends,
        'pending_requests': pending_requests,
        'joined_rooms': joined_rooms,
        'bookmarked_rooms': bookmarked_rooms,
    }

    # Update this line to point to the new location:
    return render(request, 'chat/manage/friends_list.html', context)

@login_required
def direct_message(request, username):
    """
    View for direct messaging between users
    """
    from django.shortcuts import get_object_or_404

    # Get the user to message
    recipient = get_object_or_404(User, username=username)

    # Check if the users are friends (if you want to keep this restriction, otherwise remove it)
    # We'll change this to be optional - DMs can be sent even if users aren't friends
    is_friend = UserRelationship.get_friendship(request.user, recipient)

    # Get or create a DM room
    # We'll create a special room name for DMs by combining usernames alphabetically
    usernames = sorted([request.user.username, username])
    room_name = f"dm_{usernames[0]}_{usernames[1]}"

    # Get or create the room
    room, created = Room.objects.get_or_create(
        name=room_name,
        defaults={
            'display_name': f"Chat with {username}",
            'creator': request.user,
            'is_dm': True,  # Flag for direct message rooms
        }
    )

    # Get messages for this room
    messages = Message.objects.filter(room=room).order_by('timestamp')

    # Build reactions map
    reactions_map = {}
    all_reactions = Reaction.objects.filter(
        message__room=room
    ).values('message_id', 'emoji').annotate(count=Count('id'))

    for reaction in all_reactions:
        msg_id = str(reaction['message_id'])
        if msg_id not in reactions_map:
            reactions_map[msg_id] = {}
        reactions_map[msg_id][reaction['emoji']] = reaction['count']

    # Process messages
    processed_messages = []
    for msg in messages:
        msg_data = {
            'id': msg.id,
            'user': msg.user,
            'content': msg.content,
            'timestamp': msg.timestamp,
            'media_url': None,
            'reactions': reactions_map.get(str(msg.id), {})
        }

        # Check if content contains media in [MEDIA:] format
        if '[MEDIA:' in msg.content:
            import re
            media_match = re.search(r'\[MEDIA:(.*?)\]', msg.content)
            if media_match:
                msg_data['media_url'] = media_match.group(1)
                # Remove media tag from content for display
                msg_data['content'] = re.sub(r'\[MEDIA:.*?\]', '', msg.content).strip()

        processed_messages.append(msg_data)

    context = {
        'room_name': room_name,
        'room': room,
        'username': request.user.username,
        'recipient': recipient,
        'messages': processed_messages,
        'reactions': reactions_map,
        'is_friend': is_friend and is_friend.status == 'accepted',
        'timestamp': timezone.now().timestamp(),
        'is_dm': True,  # Add this flag to let the template know this is a DM
    }

    return render(request, 'chat/room.html', context)

def get_bookmarked_rooms(request):
    """Get the user's bookmarked rooms"""
    try:
        from chat.models import RoomBookmark, Room

        # Get user's bookmarked rooms
        bookmarked_rooms = []

        # Check if user is authenticated before accessing bookmarks
        if request.user.is_authenticated:
            bookmarks = RoomBookmark.objects.filter(
                user=request.user,
                is_bookmarked=True
            ).select_related('room')

            for bookmark in bookmarks:
                room = bookmark.room
                if room:
                    bookmarked_rooms.append({
                        'name': room.name,
                        'display_name': room.display_name or room.name.title(),
                        'category': room.category.name if room.category else None,
                        'message_count': 0,  # Simplified
                        'activity': 'medium',
                        'is_protected': False
                    })

        # Always return JSON, even for unauthenticated users
        return JsonResponse({
            'success': True,
            'bookmarked_rooms': bookmarked_rooms
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)

@csrf_exempt
@login_required
def toggle_bookmark_room(request):
    """Toggle a room bookmark for the current user."""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            room_name = data.get('room_name', '')
            bookmarked = data.get('bookmarked', True)

            if not room_name:
                return JsonResponse({'success': False, 'error': 'Room name is required'}, status=400)

            # Get the room
            from chat.models import Room, RoomBookmark
            try:
                room = Room.objects.get(name=room_name)
            except Room.DoesNotExist:
                return JsonResponse({'success': False, 'error': 'Room not found'}, status=404)

            # Update or create the bookmark
            bookmark, created = RoomBookmark.objects.update_or_create(
                user=request.user,
                room=room,
                defaults={'is_bookmarked': bookmarked}
            )

            return JsonResponse({
                'success': True,
                'room_name': room_name,
                'bookmarked': bookmark.is_bookmarked,
                'created': created
            })

        except Exception as e:
            return JsonResponse({'success': False, 'error': str(e)}, status=400)

    return JsonResponse({'success': False, 'error': 'Invalid request method'}, status=405)


# User's profile
@login_required
@require_POST
def update_profile(request):
    try:
        data = json.loads(request.body)
        profile_picture = data.get('profile_picture', {})

        # Get or create user profile
        profile, created = UserProfile.objects.get_or_create(user=request.user)

        # Store profile picture data
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


def get_user_profile(request, username):
    try:
        # Handle Guest users specially
        if username == 'Guest' or not username:
            # Return a default profile for Guest users
            return JsonResponse({
                'success': True,
                'username': 'Guest',
                'profile_picture': {
                    'type': 'gradient',
                    'gradient': 'from-gray-400 to-gray-500'
                },
                'country': {
                    'code': None,
                    'flag': '🌍',
                    'name': 'Unknown'
                }
            })

        # Check if the user exists
        user = User.objects.get(username=username)

        # Get or create the user's profile
        profile, created = UserProfile.objects.get_or_create(user=user)

        # Default profile data
        profile_data = {
            'type': 'gradient',
            'gradient': get_consistent_gradient(username)
        }

        # Try to get profile picture data if the field exists
        if hasattr(profile, 'profile_picture_data') and profile.profile_picture_data:
            try:
                custom_profile_data = json.loads(profile.profile_picture_data)
                if isinstance(custom_profile_data, dict):
                    profile_data = custom_profile_data
            except json.JSONDecodeError:
                # Use default if JSON is invalid
                pass
        else:
            # No profile data exists, create a DiceBear avatar
            try:
                new_profile_data = generate_random_dicebear_avatar(username)
                profile.profile_picture_data = json.dumps(new_profile_data)
                profile.save()
                profile_data = new_profile_data
                print(f"Auto-created DiceBear avatar for existing user: {username}")
            except Exception as e:
                print(f"Error auto-creating avatar for {username}: {str(e)}")
                # Fall back to gradient
                pass

        # Get country information
        country_data = {
            'code': profile.country_code,
            'flag': profile.country_flag_emoji,
            'name': profile.country_name
        }

        # Return successful response
        return JsonResponse({
            'success': True,
            'username': username,
            'profile_picture': profile_data,
            'country': country_data
        })

    except User.DoesNotExist:
        # User not found response - return default for consistency
        return JsonResponse({
            'success': True,
            'username': username,
            'profile_picture': {
                'type': 'gradient',
                'gradient': get_consistent_gradient(username)
            },
            'country': {
                'code': None,
                'flag': '🌍',
                'name': 'Unknown'
            }
        })

    except Exception as e:
        # Log the actual exception for debugging
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error in get_user_profile for {username}: {str(e)}")

        # Return a default profile to prevent UI issues
        return JsonResponse({
            'success': True,
            'username': username,
            'profile_picture': {
                'type': 'gradient',
                'gradient': get_consistent_gradient(username)
            },
            'country': {
                'code': None,
                'flag': '🌍',
                'name': 'Unknown'
            }
        })

# Helper function to generate consistent gradient based on username
def get_consistent_gradient(username):
    gradients = [
        'from-pink-400 to-purple-400',
        'from-blue-400 to-indigo-400',
        'from-green-400 to-teal-400',
        'from-purple-400 to-pink-400',
        'from-yellow-400 to-orange-400',
        'from-red-400 to-pink-400',
        'from-cyan-400 to-blue-400',
        'from-emerald-400 to-green-500'
    ]

    # Simple hash function
    hash_value = 0
    for i, char in enumerate(username):
        hash_value += ord(char) * (i + 1)

    # Get a consistent index based on username
    return gradients[hash_value % len(gradients)]

def user_context(request):
    """
    Context processor to add user-related context variables to all templates
    """
    context = {}

    if request.user.is_authenticated:
        # Get pending friend requests count
        pending_requests_count = UserRelationship.objects.filter(
            receiver=request.user,
            status='pending'
        ).count()

        # Check if user has created any rooms
        user_created_rooms = Room.objects.filter(creator=request.user).exists()

        context['pending_friend_requests_count'] = pending_requests_count
        context['user_created_rooms'] = user_created_rooms

    return context
