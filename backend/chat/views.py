# Standard Library
import csv
import json
import logging
import uuid
from datetime import datetime, timedelta

# Third-party
import stripe
import requests

# Django Core
from django.conf import settings
from django.contrib import messages
from django.contrib.auth import logout, get_user_model
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth.models import User
from django.contrib.admin.views.decorators import staff_member_required
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.paginator import Paginator
from django.core.validators import validate_email
from django.db.models import Q, Count, Sum, F, Max
from django.http import JsonResponse, HttpResponse, HttpResponseForbidden
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods, require_POST
from django.views.generic import TemplateView

# Local App Imports
from .models import (
    Room, Message, UserProfile, RoomCategory, Friendship,
    RoomBookmark, MessageReport, UserActivity, FriendRequest,
    NationalityStats, get_client_ip,
    SubscriptionPlan, UserSubscription, Payment, PaymentAttempt
)
from .forms import RoomCreationForm, UserProfileForm, QuickMessageForm

# Logging setup
logger = logging.getLogger(__name__)

# ==================== NATIONALITY HELPER FUNCTIONS ====================

def get_country_from_ip(ip):
    """Get country code from IP address with multiple fallbacks"""
    try:
        # Try to get from cache first (24 hour cache)
        cached_country = cache.get(f'country_{ip}')
        if cached_country:
            return cached_country
        
        # Method 1: Use Django GeoIP2 (recommended for production)
        try:
            from django.contrib.gis.geoip2 import GeoIP2
            g = GeoIP2()
            country = g.country_code(ip)
            if country:
                cache.set(f'country_{ip}', country, 86400)  # Cache for 24 hours
                return country
        except Exception as e:
            print(f"GeoIP2 failed: {e}")
        
        # Method 2: External API fallback
        try:
            response = requests.get(f'https://ipapi.co/{ip}/country_code/', timeout=5)
            if response.status_code == 200:
                country = response.text.strip().upper()
                if len(country) == 2:  # Valid country code
                    cache.set(f'country_{ip}', country, 86400)
                    return country
        except requests.RequestException as e:
            print(f"IP API failed: {e}")
        
        # Method 3: Alternative API
        try:
            response = requests.get(f'http://ip-api.com/json/{ip}?fields=countryCode', timeout=5)
            if response.status_code == 200:
                data = response.json()
                country = data.get('countryCode')
                if country:
                    cache.set(f'country_{ip}', country, 86400)
                    return country
        except requests.RequestException as e:
            print(f"Alternative IP API failed: {e}")
            
    except Exception as e:
        print(f"Country detection failed: {e}")
    
    return 'UN'  # Unknown country

def get_country_name(country_code):
    """Get country name from country code"""
    country_dict = dict(UserProfile.COUNTRY_CHOICES)
    return country_dict.get(country_code, 'Unknown')

# ==================== MAIN PAGES ====================

def index(request):
    """
    FINAL FIXED index view with proper room membership support
    """
    try:
        if request.user.is_authenticated:
            # For authenticated users: show public rooms + private rooms they have access to
            rooms = Room.objects.select_related('creator', 'category').filter(
                Q(is_public=True) | 
                Q(creator=request.user, is_public=False) |
                Q(members=request.user, is_public=False)  # Now this will work!
            ).distinct()
        else:
            # For non-authenticated users: only public rooms
            rooms = Room.objects.select_related('creator', 'category').filter(
                is_public=True
            )
        
        # Add annotations (these were working in your shell test)
        rooms = rooms.annotate(
            total_messages=F('message_count'),
            last_message_time=Max('messages__timestamp')
        )
        
        # Handle search
        search_query = request.GET.get('q', '').strip()
        if search_query:
            rooms = rooms.filter(
                Q(name__icontains=search_query) |
                Q(display_name__icontains=search_query) |
                Q(description__icontains=search_query) |
                Q(tags__icontains=search_query)
            )
        
        # Handle category filter
        category_filter = request.GET.get('category', '').strip()
        if category_filter and category_filter != 'all':
            rooms = rooms.filter(category__slug=category_filter)
        
        # Handle sorting
        sort_option = request.GET.get('sort', 'activity')
        if sort_option == 'newest':
            rooms = rooms.order_by('-created_at')
        elif sort_option == 'oldest':
            rooms = rooms.order_by('created_at')
        elif sort_option == 'name':
            rooms = rooms.order_by('name')
        elif sort_option == 'popular':
            rooms = rooms.order_by('-message_count', '-active_users_count')
        else:  # 'activity' (default)
            rooms = rooms.order_by('-last_activity', '-message_count')
        
        # Get categories
        categories = RoomCategory.objects.filter(
            is_active=True
        ).exclude(
            slug='all'
        ).order_by('sort_order', 'name')
        
        # Get stats
        total_rooms = rooms.count()
        total_users = User.objects.count()
        total_messages = Message.objects.count()
        
        context = {
            'rooms': rooms,
            'categories': categories,
            'search_query': search_query,
            'current_category': category_filter,
            'current_sort': sort_option,
            'total_rooms': total_rooms,
            'total_users': total_users,
            'total_messages': total_messages,
            'user_authenticated': request.user.is_authenticated,
            'search_scope': 'public_and_private' if request.user.is_authenticated else 'public_only',
        }
        
        return render(request, 'chat/room_list.html', context)
        
    except Exception as e:
        print(f"ERROR in index view: {str(e)}")
        
        # Fallback context
        context = {
            'rooms': Room.objects.none(),
            'categories': RoomCategory.objects.filter(is_active=True).exclude(slug='all'),
            'error': f"Error loading rooms: {str(e)}" if request.user.is_staff else "Sorry, we're experiencing technical difficulties.",
            'search_query': '',
            'current_category': '',
            'current_sort': 'activity',
            'total_rooms': 0,
            'total_users': User.objects.count(),
            'total_messages': Message.objects.count(),
            'user_authenticated': request.user.is_authenticated,
            'search_scope': 'public_only',
        }
        return render(request, 'chat/room_list.html', context)

def room(request, room_name):
    """Individual room view with enhanced features and nationality support"""
    room = get_object_or_404(Room, name=room_name)
    
    # Check if room is public or user has access
    if not room.is_public and request.user != room.creator:
        messages.error(request, "You don't have access to this room.")
        return redirect('index')
    
    # Get messages with pagination for better performance
    messages_list = Message.objects.filter(
        room=room, 
        is_deleted=False
    ).select_related(
        'user', 'user__profile'
    ).order_by('-timestamp')[:100]
    messages_list = list(reversed(messages_list))
    
    # Update last activity and increment active users
    room.last_activity = timezone.now()
    if request.user.is_authenticated:
        room.active_users_count = F('active_users_count') + 1
        room.save(update_fields=['last_activity', 'active_users_count'])
        room.refresh_from_db()
    else:
        room.save(update_fields=['last_activity'])
    
    # Initialize nationality variables
    user_nationality = 'UN'
    user_country_name = 'Unknown'
    user_flag_url = ''
    
    if request.user.is_authenticated:
        UserActivity.objects.create(
            user=request.user,
            room=room,
            activity_type='joined_room',
            description=f"Joined {room.display_name or room.name}"
        )
        
        is_bookmarked = RoomBookmark.objects.filter(
            user=request.user, room=room
        ).exists()
        
        user_profile, _ = UserProfile.objects.get_or_create(user=request.user)
        user_nationality = user_profile.get_display_nationality()
        
        # Auto-detect nationality if not set or is unknown
        if not user_nationality or user_nationality == 'UN':
            try:
                ip = get_client_ip(request)
                detected_country = get_country_from_ip(ip)
                
                if detected_country and detected_country != 'UN':
                    user_profile.auto_detected_country = detected_country
                    if not user_profile.nationality:
                        user_profile.nationality = detected_country
                    user_profile.save()
                    user_nationality = detected_country
                    logger.info(f"Auto-detected nationality {detected_country} for user {request.user.username} from IP {ip}")
            except Exception as e:
                logger.warning(f"Failed to auto-detect nationality for user {request.user.username}: {e}")
        
        user_country_name = user_profile.get_country_name()
        user_flag_url = user_profile.get_flag_url()
        
        try:
            from .models import NationalityStats
            stats, _ = NationalityStats.objects.get_or_create(
                country_code=user_nationality,
                defaults={
                    'total_users': 0,
                    'active_users': 0,
                    'total_messages': 0,
                    'room_visits': 0
                }
            )
            stats.room_visits = F('room_visits') + 1
            stats.save(update_fields=['room_visits'])
        except Exception as e:
            logger.warning(f"Failed to update nationality statistics: {e}")
    
    else:
        is_bookmarked = False
        try:
            ip = get_client_ip(request)
            detected_country = get_country_from_ip(ip)
            if detected_country and detected_country != 'UN':
                user_nationality = detected_country
                
                country_choices = dict(getattr(settings, 'COUNTRY_CHOICES', []))
                user_country_name = country_choices.get(user_nationality, 'Unknown')
                
                flag_settings = getattr(settings, 'NATIONALITY_SETTINGS', {})
                flag_cdn_url = flag_settings.get('FLAG_CDN_URL', 'https://flagcdn.com/w{size}/{country}.png')
                flag_size = flag_settings.get('SUPPORTED_FLAG_SIZES', [32])[0]
                user_flag_url = flag_cdn_url.format(size=flag_size, country=user_nationality.lower())
                
                logger.info(f"Anonymous user detected from {detected_country} (IP: {ip})")
        except Exception as e:
            logger.warning(f"Failed to detect nationality for anonymous user: {e}")
    
    context = {
        'room': room,
        'messages': messages_list,
        'message_form': QuickMessageForm(),
        'is_bookmarked': is_bookmarked,
        'room_tags': room.get_tags_list(),
        'user_id': request.user.id if request.user.is_authenticated else None,
        'is_authenticated': request.user.is_authenticated,
        
        'user_nationality': user_nationality,
        'user_country_name': user_country_name,
        'user_flag_url': user_flag_url,
        
        'nationality_enabled': getattr(settings, 'NATIONALITY_SETTINGS', {}).get('ENABLE_FLAG_DISPLAY', True),
        'nationality_countries': getattr(settings, 'COUNTRY_CHOICES', []),
        'nationality_auto_detect': getattr(settings, 'NATIONALITY_SETTINGS', {}).get('ENABLE_AUTO_DETECTION', True),
        
        'room_demographics': get_room_demographics(room) if getattr(settings, 'NATIONALITY_SETTINGS', {}).get('ENABLE_ROOM_DEMOGRAPHICS', True) else None,
    }
    
    return render(request, 'chat/room_3d.html', context)


def get_room_demographics(room):
    """Get nationality demographics for the room"""
    try:
        from django.db.models import Count
        from .models import UserProfile
        
        # Get recent messages with nationality info
        demographics = Message.objects.filter(
            room=room,
            timestamp__gte=timezone.now() - timedelta(hours=24)  # Last 24 hours
        ).select_related(
            'user__profile'
        ).values(
            'user__profile__nationality'
        ).annotate(
            count=Count('user__profile__nationality')
        ).order_by('-count')
        
        # Format for frontend
        formatted_demographics = []
        for demo in demographics:
            nationality = demo['user__profile__nationality'] or 'UN'
            count = demo['count']
            
            # Get country name
            from django.conf import settings
            country_choices = dict(getattr(settings, 'COUNTRY_CHOICES', []))
            country_name = country_choices.get(nationality, 'Unknown')
            
            formatted_demographics.append({
                'code': nationality,
                'name': country_name,
                'count': count,
                'percentage': 0  # Will be calculated in frontend
            })
        
        return formatted_demographics[:10]  # Top 10 countries
        
    except Exception as e:
        logger.warning(f"Failed to get room demographics: {e}")
        return []

@login_required
def create_room(request):
    """Create a new room with enhanced validation"""
    # Check user's room limit
    from django.conf import settings
    max_rooms = getattr(settings, 'EUPHORIE_SETTINGS', {}).get('MAX_ROOMS_PER_USER', 10)
    user_room_count = Room.objects.filter(creator=request.user).count()
    
    if user_room_count >= max_rooms:
        messages.error(request, f'You can only create up to {max_rooms} rooms.')
        return redirect('index')
    
    if request.method == 'POST':
        form = RoomCreationForm(request.POST)
        if form.is_valid():
            room = form.save(commit=False)
            room.creator = request.user
            room.save()
            
            # Create activity log
            UserActivity.objects.create(
                user=request.user,
                room=room,
                activity_type='created_room',
                description=f"Created room {room.display_name or room.name}"
            )
            
            # Update user profile room count
            profile, created = UserProfile.objects.get_or_create(user=request.user)
            profile.rooms_created = F('rooms_created') + 1
            profile.save(update_fields=['rooms_created'])
            
            messages.success(request, f'Room "{room.display_name or room.name}" created successfully!')
            return redirect('room', room_name=room.name)
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        form = RoomCreationForm()
    
    context = {
        'form': form,
        'user_room_count': user_room_count,
        'max_rooms': max_rooms,
    }
    
    return render(request, 'chat/create_room.html', context)

def search_rooms(request):
    """Enhanced search rooms with better filtering - NOW SUPPORTS NON-AUTH USERS"""
    query = request.GET.get('q', '').strip()
    category = request.GET.get('category', '')
    
    if not query:
        return JsonResponse({'rooms': []})
    
    # Build search query - ALWAYS filter for public rooms first
    rooms = Room.objects.filter(is_public=True).select_related('category', 'creator')
    
    # For authenticated users, also include their private rooms
    if request.user.is_authenticated:
        private_rooms = Room.objects.filter(
            Q(creator=request.user) | Q(members=request.user)
        ).select_related('category', 'creator')
        rooms = rooms.union(private_rooms).distinct()
    
    # Search in multiple fields
    search_filter = (
        Q(name__icontains=query) | 
        Q(display_name__icontains=query) |
        Q(description__icontains=query) |
        Q(tags__icontains=query)
    )
    rooms = rooms.filter(search_filter)
    
    # Category filter
    if category and category != 'all':
        rooms = rooms.filter(category__slug=category)
    
    # Annotate with message count and limit results
    rooms = rooms.annotate(
        total_messages=Count('messages')
    ).order_by('-total_messages', '-last_activity')[:20]
    
    rooms_data = [{
        'name': room.name,
        'display_name': room.display_name,
        'description': room.description or '',
        'category': room.category.name if room.category else 'General',
        'category_icon': room.category.icon if room.category else '💬',
        'creator': room.creator.username,
        'message_count': room.total_messages,
        'tags': room.get_tags_list(),
        'url': reverse('room', kwargs={'room_name': room.name}),
        'is_public': room.is_public,  # Add this for frontend differentiation
    } for room in rooms]
    
    # Add metadata about search scope
    response_data = {
        'rooms': rooms_data,
        'search_scope': 'public_and_private' if request.user.is_authenticated else 'public_only',
        'total_results': len(rooms_data),
        'query': query,
        'user_authenticated': request.user.is_authenticated,
    }
    
    if request.headers.get('Content-Type') == 'application/json':
        return JsonResponse(response_data)
    
    return render(request, 'chat/search_results.html', {
        'rooms': rooms,
        'query': query,
        'search_scope': response_data['search_scope']
    })

# NEW: Add a specific public search endpoint
def public_search_api(request):
    """Public search API endpoint that works for non-authenticated users"""
    query = request.GET.get('q', '').strip()
    
    if not query:
        return JsonResponse({'results': [], 'message': 'No search query provided'})
    
    # Search only in public rooms for this endpoint
    rooms = Room.objects.filter(
        is_public=True
    ).filter(
        Q(name__icontains=query) |
        Q(display_name__icontains=query) |
        Q(description__icontains=query) |
        Q(tags__icontains=query)
    ).select_related('category', 'creator').order_by('-message_count')[:10]
    
    results = [{
        'name': room.name,
        'display_name': room.display_name,
        'description': room.description or '',
        'category': room.category.name if room.category else 'General',
        'creator': room.creator.username,
        'url': reverse('room', kwargs={'room_name': room.name}),
        'message_count': room.message_count,
        'tags': room.get_tags_list(),
        'is_public': True,
    } for room in rooms]
    
    return JsonResponse({
        'results': results,
        'total': len(results),
        'query': query,
        'scope': 'public_only',
        'user_authenticated': request.user.is_authenticated,
    })

def explore_rooms(request):
    """Dedicated room exploration page - SUPPORTS ALL USERS"""
    # Redirect to index since they serve the same purpose now
    # but you could customize this differently if needed
    return index(request)

# ==================== NATIONALITY API ENDPOINTS ====================

@require_http_methods(["GET"])
def api_get_user_country(request):
    """API endpoint to get user's country"""
    ip = get_client_ip(request)
    country = get_country_from_ip(ip)
    
    # If user is authenticated, update their auto-detected country
    if request.user.is_authenticated:
        user_profile, created = UserProfile.objects.get_or_create(user=request.user)
        if user_profile.auto_detected_country != country:
            user_profile.auto_detected_country = country
            user_profile.save(update_fields=['auto_detected_country'])
    
    return JsonResponse({
        'country_code': country,
        'country_name': get_country_name(country),
        'ip': ip,
        'user_set_nationality': request.user.profile.nationality if request.user.is_authenticated and hasattr(request.user, 'profile') else None,
        'display_nationality': request.user.profile.get_display_nationality() if request.user.is_authenticated and hasattr(request.user, 'profile') else country
    })

@csrf_exempt
@login_required
@require_http_methods(["POST"])
def api_update_nationality(request):
    """API endpoint to update user's nationality"""
    try:
        data = json.loads(request.body)
        nationality = data.get('nationality', '').upper()
        
        # Validate nationality code
        valid_countries = [code for code, name in UserProfile.COUNTRY_CHOICES]
        
        if nationality not in valid_countries:
            return JsonResponse({'error': 'Invalid country code'}, status=400)
        
        # Update user's nationality
        user_profile, created = UserProfile.objects.get_or_create(user=request.user)
        success = user_profile.update_nationality(nationality)
        
        if success:
            # Create activity log
            UserActivity.objects.create(
                user=request.user,
                activity_type='updated_nationality',
                description=f"Updated nationality to {get_country_name(nationality)}",
                metadata={'old_nationality': user_profile.nationality, 'new_nationality': nationality}
            )
            
            return JsonResponse({
                'success': True,
                'nationality': nationality,
                'country_name': get_country_name(nationality),
                'message': f'Nationality updated to {get_country_name(nationality)}'
            })
        else:
            return JsonResponse({'error': 'Failed to update nationality'}, status=500)
        
    except json.JSONDecodeError:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@require_http_methods(["GET"])
def api_detect_nationality(request):
    """API endpoint for explicit nationality detection"""
    ip = get_client_ip(request)
    country = get_country_from_ip(ip)
    
    return JsonResponse({
        'detected_country': country,
        'country_name': get_country_name(country),
        'ip': ip,
        'method': 'ip_detection'
    })

@require_http_methods(["GET"])
def api_get_countries(request):
    """API endpoint to get list of available countries"""
    countries = [
        {'code': code, 'name': name} 
        for code, name in UserProfile.COUNTRY_CHOICES
    ]
    return JsonResponse({'countries': countries})

@require_http_methods(["GET"])
def api_nationality_stats(request):
    """API endpoint to get nationality statistics"""
    # Update stats first
    NationalityStats.update_stats()
    
    stats = NationalityStats.objects.all().order_by('-user_count')[:20]
    
    stats_data = [{
        'nationality': stat.nationality,
        'country_name': get_country_name(stat.nationality),
        'user_count': stat.user_count,
        'message_count': stat.message_count,
        'rooms_created': stat.rooms_created,
    } for stat in stats]
    
    return JsonResponse({
        'stats': stats_data,
        'total_users': User.objects.count(),
        'users_with_nationality': UserProfile.objects.exclude(
            Q(nationality__isnull=True) & Q(auto_detected_country__isnull=True)
        ).count()
    })

@login_required
def api_user_profile_extended(request):
    """Extended user profile API with nationality"""
    user_profile, created = UserProfile.objects.get_or_create(user=request.user)
    
    data = {
        'username': request.user.username,
        'display_name': user_profile.display_name,
        'bio': user_profile.bio,
        'location': user_profile.location,
        'website': user_profile.website,
        'theme': user_profile.theme,
        'status': user_profile.status,
        'avatar_customization': user_profile.avatar_customization,
        'nationality': user_profile.nationality,
        'auto_detected_country': user_profile.auto_detected_country,
        'display_nationality': user_profile.get_display_nationality(),
        'country_name': user_profile.get_country_name(),
        'flag_url': user_profile.get_flag_url(),
        'show_nationality': user_profile.show_nationality,
    }
    
    return JsonResponse(data)

# ==================== ROOM NATIONALITY ENDPOINTS ====================

@require_http_methods(["GET"])
def api_room_demographics(request, room_id):
    """API endpoint to get room nationality demographics"""
    room = get_object_or_404(Room, id=room_id)
    
    # Get nationality distribution
    nationalities = room.get_user_nationalities()
    
    # Convert to detailed format
    demographics = []
    for nationality, count in nationalities.items():
        demographics.append({
            'nationality': nationality,
            'country_name': get_country_name(nationality),
            'user_count': count,
            'flag_url': f"https://flagcdn.com/w40/{nationality.lower()}.png" if nationality != 'UN' else None
        })
    
    demographics.sort(key=lambda x: x['user_count'], reverse=True)
    
    return JsonResponse({
        'room_id': room_id,
        'room_name': room.name,
        'demographics': demographics,
        'total_active_users': sum(nationalities.values()),
        'unique_countries': len(nationalities)
    })

@require_http_methods(["GET"])
def api_room_users_by_country(request, room_id):
    """API endpoint to get users in a room grouped by nationality"""
    room = get_object_or_404(Room, id=room_id)
    
    # Get recent messages to find active users
    recent_messages = room.messages.filter(
        timestamp__gte=timezone.now() - timezone.timedelta(hours=24)
    ).select_related('user__profile').distinct('user')
    
    users_by_country = {}
    for message in recent_messages:
        if hasattr(message.user, 'profile'):
            nationality = message.user.profile.get_display_nationality() or 'UN'
            if nationality not in users_by_country:
                users_by_country[nationality] = []
            
            users_by_country[nationality].append({
                'username': message.user.username,
                'display_name': message.user.profile.display_username,
                'last_active': message.timestamp.isoformat()
            })
    
    return JsonResponse({
        'room_id': room_id,
        'users_by_country': users_by_country
    })

def room_demographics(request):
    """Room demographics page"""
    # Get top rooms by diversity
    rooms = Room.objects.filter(is_public=True).annotate(
        message_count_calc=Count('messages')
    ).order_by('-message_count_calc')[:20]
    
    room_data = []
    for room in rooms:
        nationalities = room.get_user_nationalities()
        room_data.append({
            'room': room,
            'unique_countries': len(nationalities),
            'total_users': sum(nationalities.values()),
            'top_countries': sorted(nationalities.items(), key=lambda x: x[1], reverse=True)[:5]
        })
    
    # Sort by diversity (unique countries)
    room_data.sort(key=lambda x: x['unique_countries'], reverse=True)
    
    return render(request, 'chat/room_demographics.html', {
        'room_data': room_data
    })

# ==================== FRIEND NATIONALITY ENDPOINTS ====================

@login_required
def api_friends_by_nationality(request):
    """API endpoint to get friends grouped by nationality"""
    friends = Friendship.get_friends(request.user).select_related('profile')
    
    friends_by_nationality = {}
    for friend in friends:
        nationality = friend.profile.get_display_nationality() if hasattr(friend, 'profile') else 'UN'
        if nationality not in friends_by_nationality:
            friends_by_nationality[nationality] = []
        
        friends_by_nationality[nationality].append({
            'username': friend.username,
            'display_name': friend.profile.display_username if hasattr(friend, 'profile') else friend.username,
            'status': friend.profile.status if hasattr(friend, 'profile') else 'online',
        })
    
    return JsonResponse({
        'friends_by_nationality': friends_by_nationality,
        'total_friends': friends.count()
    })

@login_required
def api_nationality_friend_suggestions(request):
    """API endpoint for nationality-based friend suggestions"""
    user_profile = getattr(request.user, 'profile', None)
    if not user_profile:
        return JsonResponse({'suggestions': []})
    
    user_nationality = user_profile.get_display_nationality()
    if not user_nationality:
        return JsonResponse({'suggestions': []})
    
    # Get existing friends and pending requests
    excluded_user_ids = list(Friendship.objects.filter(
        user=request.user
    ).values_list('friend_id', flat=True))
    
    pending_user_ids = list(FriendRequest.objects.filter(
        Q(from_user=request.user) | Q(to_user=request.user),
        status='pending'
    ).values_list('from_user_id', 'to_user_id'))
    pending_user_ids = [user_id for pair in pending_user_ids for user_id in pair]
    excluded_user_ids.extend(pending_user_ids)
    excluded_user_ids.append(request.user.id)
    
    # Find users with same nationality
    same_nationality_users = User.objects.filter(
        profile__nationality=user_nationality
    ).exclude(
        id__in=excluded_user_ids
    ).select_related('profile')[:10]
    
    suggestions = []
    for user in same_nationality_users:
        suggestions.append({
            'user_id': user.id,
            'username': user.username,
            'display_name': user.profile.display_username,
            'nationality': user_nationality,
            'country_name': get_country_name(user_nationality),
            'flag_url': user.profile.get_flag_url(),
            'suggestion_reason': f"From {get_country_name(user_nationality)}"
        })
    
    return JsonResponse({
        'suggestions': suggestions,
        'user_nationality': user_nationality,
        'country_name': get_country_name(user_nationality)
    })

# ==================== ADMIN NATIONALITY ENDPOINTS ====================

@staff_member_required
def admin_nationality_stats(request):
    """Admin page for nationality statistics"""
    # Update stats
    NationalityStats.update_stats()
    
    stats = NationalityStats.objects.all().order_by('-user_count')
    
    # Get user distribution
    total_users = User.objects.count()
    users_with_nationality = UserProfile.objects.exclude(
        Q(nationality__isnull=True) & Q(auto_detected_country__isnull=True)
    ).count()
    
    # Get top countries
    top_countries = stats[:10]
    
    context = {
        'stats': stats,
        'total_users': total_users,
        'users_with_nationality': users_with_nationality,
        'coverage_percentage': (users_with_nationality / total_users * 100) if total_users > 0 else 0,
        'top_countries': top_countries,
    }
    
    return render(request, 'chat/admin/nationality_stats.html', context)

def debug_nationality(request):
    """Debug nationality system"""
    if not (request.user.is_staff and request.user.is_superuser):
        return HttpResponseForbidden("Access denied")
    
    # Get IP and detection info
    ip = get_client_ip(request)
    detected_country = get_country_from_ip(ip)
    
    # Get user nationality info
    user_nationality_info = {}
    if request.user.is_authenticated:
        user_profile = getattr(request.user, 'profile', None)
        if user_profile:
            user_nationality_info = {
                'nationality': user_profile.nationality,
                'auto_detected_country': user_profile.auto_detected_country,
                'display_nationality': user_profile.get_display_nationality(),
                'country_name': user_profile.get_country_name(),
                'flag_url': user_profile.get_flag_url(),
                'show_nationality': user_profile.show_nationality,
            }
    
    # Get nationality stats
    nationality_counts = {}
    for profile in UserProfile.objects.all():
        nationality = profile.get_display_nationality()
        if nationality:
            nationality_counts[nationality] = nationality_counts.get(nationality, 0) + 1
    
    debug_info = {
        'ip_info': {
            'ip': ip,
            'detected_country': detected_country,
            'country_name': get_country_name(detected_country),
        },
        'user_info': user_nationality_info,
        'nationality_counts': nationality_counts,
        'total_users': User.objects.count(),
        'users_with_nationality': len([c for c in nationality_counts.values() if c > 0]),
        'cache_info': {
            'cached_country': cache.get(f'country_{ip}'),
        }
    }
    
    return JsonResponse(debug_info, json_dumps_params={'indent': 2})

# ==================== PROFILE VIEWS ====================

def user_profile(request, username):
    """Enhanced user profile view with nationality"""
    profile_user = get_object_or_404(User, username=username)
    user_profile, created = UserProfile.objects.get_or_create(user=profile_user)
    
    # Get user's rooms
    user_rooms = Room.objects.filter(creator=profile_user, is_public=True).annotate(
        total_messages=Count('messages')
    ).order_by('-last_activity')[:6]
    
    # Get user's recent activity (if public)
    recent_activities = []
    if user_profile.profile_visibility == 'public' or (
        request.user.is_authenticated and Friendship.are_friends(request.user, profile_user)
    ):
        recent_activities = UserActivity.objects.filter(
            user=profile_user, is_public=True
        ).select_related('room').order_by('-created_at')[:10]
    
    # Check friendship status
    friendship_status = 'none'
    can_send_request = True
    pending_request = None
    
    if request.user.is_authenticated and request.user != profile_user:
        # Check if they are already friends
        if Friendship.are_friends(request.user, profile_user):
            friendship_status = 'friends'
            can_send_request = False
        else:
            # Check for pending friend requests
            pending_request = FriendRequest.objects.filter(
                Q(from_user=request.user, to_user=profile_user) |
                Q(from_user=profile_user, to_user=request.user),
                status='pending'
            ).first()
            
            if pending_request:
                if pending_request.from_user == request.user:
                    friendship_status = 'request_sent'
                else:
                    friendship_status = 'request_received'
                can_send_request = False
        
        # Check if user allows friend requests
        if not user_profile.allow_friend_requests:
            can_send_request = False
    
    context = {
        'profile_user': profile_user,
        'user_profile': user_profile,
        'user_rooms': user_rooms,
        'recent_activities': recent_activities,
        'friendship_status': friendship_status,
        'can_send_request': can_send_request,
        'pending_request': pending_request,
        'user_nationality': user_profile.get_display_nationality(),
        'country_name': user_profile.get_country_name(),
        'flag_url': user_profile.get_flag_url(),
    }
    
    return render(request, 'chat/user_profile.html', context)

@login_required
def edit_profile(request, username):
    """Edit user profile with enhanced features"""
    if request.user.username != username:
        return HttpResponseForbidden("You can only edit your own profile.")
    
    user_profile, created = UserProfile.objects.get_or_create(user=request.user)
    
    if request.method == 'POST':
        form = UserProfileForm(request.POST, instance=user_profile)
        if form.is_valid():
            profile = form.save()
            
            # Create activity log
            UserActivity.objects.create(
                user=request.user,
                activity_type='customized_avatar',
                description="Updated profile settings"
            )
            
            messages.success(request, 'Profile updated successfully!')
            return redirect('user_profile', username=username)
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        form = UserProfileForm(instance=user_profile)
    
    return render(request, 'chat/edit_profile.html', {
        'form': form,
        'user_profile': user_profile
    })

@login_required
def profile_settings(request):
    """Enhanced user profile settings"""
    user_profile, created = UserProfile.objects.get_or_create(user=request.user)
    
    if request.method == 'POST':
        form = UserProfileForm(request.POST, instance=user_profile)
        if form.is_valid():
            form.save()
            messages.success(request, 'Settings updated successfully!')
            return redirect('profile_settings')
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        form = UserProfileForm(instance=user_profile)
    
    # Get user statistics
    user_stats = {
        'rooms_created': Room.objects.filter(creator=request.user).count(),
        'messages_sent': Message.objects.filter(user=request.user).count(),
        'friends_count': Friendship.objects.filter(user=request.user, status='accepted').count(),
        'join_date': request.user.date_joined,
    }
    
    context = {
        'form': form,
        'user_profile': user_profile,
        'user_stats': user_stats,
    }
    
    return render(request, 'chat/profile_settings.html', context)

# ==================== FRIEND VIEWS ====================

@login_required
def friends_list(request):
    """Enhanced friends list with search and filtering"""
    
    # Get user's current friends
    friends = Friendship.get_friends(request.user).select_related('profile')
    
    # Get pending friend requests (received)
    pending_requests = FriendRequest.objects.filter(
        to_user=request.user,
        status='pending'
    ).select_related('from_user__profile').order_by('-created_at')
    
    # Get sent friend requests
    sent_requests = FriendRequest.objects.filter(
        from_user=request.user,
        status='pending'
    ).select_related('to_user__profile').order_by('-created_at')
    
    # Search functionality
    search_query = request.GET.get('q', '').strip()
    if search_query:
        friends = friends.filter(
            Q(username__icontains=search_query) |
            Q(first_name__icontains=search_query) |
            Q(last_name__icontains=search_query)
        )
    
    context = {
        'friends': friends,
        'pending_requests': pending_requests,
        'sent_requests': sent_requests,
        'search_query': search_query,
        'friends_count': friends.count(),
        'pending_count': pending_requests.count(),
    }
    
    return render(request, 'chat/friends_list.html', context)

@login_required
@require_POST
def send_friend_request(request, user_id):
    """Send a friend request to another user by ID"""
    try:
        to_user = get_object_or_404(User, id=user_id)
        
        # Validation checks
        if to_user == request.user:
            messages.error(request, "You can't send a friend request to yourself!")
            return redirect('friends_list')
        
        # Check if already friends
        if Friendship.are_friends(request.user, to_user):
            messages.info(request, f"You are already friends with {to_user.username}!")
            return redirect('user_profile', username=to_user.username)
        
        # Check if user allows friend requests
        to_user_profile = getattr(to_user, 'profile', None)
        if to_user_profile and not to_user_profile.allow_friend_requests:
            messages.error(request, f"{to_user.username} is not accepting friend requests.")
            return redirect('user_profile', username=to_user.username)
        
        # Check if request already exists
        existing_request = FriendRequest.objects.filter(
            Q(from_user=request.user, to_user=to_user) |
            Q(from_user=to_user, to_user=request.user),
            status='pending'
        ).first()
        
        if existing_request:
            messages.info(request, "A friend request already exists between you and this user.")
            return redirect('user_profile', username=to_user.username)
        
        # Create friend request
        friend_request = FriendRequest.objects.create(
            from_user=request.user,
            to_user=to_user,
            message=request.POST.get('message', '')
        )
        
        messages.success(request, f"Friend request sent to {to_user.username}!")
        return redirect('user_profile', username=to_user.username)
        
    except Exception as e:
        messages.error(request, "An error occurred while sending the friend request.")
        return redirect('friends_list')

@login_required
@require_POST
def accept_friend_request(request, request_id):
    """Accept a friend request"""
    try:
        friend_request = get_object_or_404(
            FriendRequest, 
            id=request_id, 
            to_user=request.user,
            status='pending'
        )
        
        # Accept the request (this creates the friendship)
        friend_request.accept()
        
        messages.success(request, f"You are now friends with {friend_request.from_user.username}!")
        return redirect('friends_list')
        
    except Exception as e:
        messages.error(request, "An error occurred while accepting the friend request.")
        return redirect('friends_list')

@login_required
@require_POST
def decline_friend_request(request, request_id):
    """Decline a friend request"""
    try:
        friend_request = get_object_or_404(
            FriendRequest, 
            id=request_id, 
            to_user=request.user,
            status='pending'
        )
        
        friend_request.decline()
        messages.info(request, f"Friend request from {friend_request.from_user.username} declined.")
        return redirect('friends_list')
        
    except Exception as e:
        messages.error(request, "An error occurred while declining the friend request.")
        return redirect('friends_list')

@login_required
@require_POST
def cancel_friend_request(request, request_id):
    """Cancel a sent friend request"""
    try:
        friend_request = get_object_or_404(
            FriendRequest, 
            id=request_id, 
            from_user=request.user,
            status='pending'
        )
        
        friend_request.cancel()
        messages.info(request, f"Friend request to {friend_request.to_user.username} cancelled.")
        return redirect('friends_list')
        
    except Exception as e:
        messages.error(request, "An error occurred while cancelling the friend request.")
        return redirect('friends_list')

@login_required
@require_POST
def remove_friend(request, user_id):
    """Remove a friend"""
    try:
        friend = get_object_or_404(User, id=user_id)
        
        # Remove bidirectional friendship
        Friendship.objects.filter(
            Q(user=request.user, friend=friend) |
            Q(user=friend, friend=request.user),
            status='accepted'
        ).delete()
        
        messages.success(request, f"You are no longer friends with {friend.username}.")
        return redirect('friends_list')
        
    except Exception as e:
        messages.error(request, "An error occurred while removing the friend.")
        return redirect('friends_list')

@login_required
@require_POST
def send_friend_request_by_username(request, username):
    """Send a friend request by username (for profile pages)"""
    friend_user = get_object_or_404(User, username=username)
    
    if friend_user == request.user:
        messages.error(request, "You can't send a friend request to yourself.")
        return redirect('user_profile', username=username)
    
    # Check if friendship already exists
    if Friendship.are_friends(request.user, friend_user):
        messages.info(request, "You are already friends.")
        return redirect('user_profile', username=username)
    
    # Check if user allows friend requests
    friend_profile = getattr(friend_user, 'profile', None)
    if friend_profile and not friend_profile.allow_friend_requests:
        messages.error(request, f"{username} is not accepting friend requests.")
        return redirect('user_profile', username=username)
    
    # Check if request already exists
    existing_request = FriendRequest.objects.filter(
        Q(from_user=request.user, to_user=friend_user) |
        Q(from_user=friend_user, to_user=request.user),
        status='pending'
    ).first()
    
    if existing_request:
        messages.info(request, "Friend request already sent.")
        return redirect('user_profile', username=username)
    
    FriendRequest.objects.create(
        from_user=request.user,
        to_user=friend_user,
        message=request.POST.get('message', '')
    )
    messages.success(request, f"Friend request sent to {username}.")
    
    return redirect('user_profile', username=username)

@login_required
@require_POST
def remove_friend_by_username(request, username):
    """Remove a friend by username"""
    friend_user = get_object_or_404(User, username=username)
    
    # Remove bidirectional friendship
    removed_count = Friendship.objects.filter(
        Q(user=request.user, friend=friend_user) |
        Q(user=friend_user, friend=request.user),
        status='accepted'
    ).delete()[0]
    
    if removed_count > 0:
        messages.success(request, f"Removed {username} from friends.")
    else:
        messages.info(request, f"You were not friends with {username}.")
    
    return redirect('friends_list')

@login_required
def friend_suggestions(request):
    """Enhanced friend suggestions with nationality-based suggestions"""
    # Get users who are not already friends and not self
    excluded_user_ids = list(Friendship.objects.filter(
        user=request.user
    ).values_list('friend_id', flat=True))
    excluded_user_ids.append(request.user.id)
    
    # Get users with pending requests
    pending_user_ids = list(FriendRequest.objects.filter(
        Q(from_user=request.user) | Q(to_user=request.user),
        status='pending'
    ).values_list('from_user_id', 'to_user_id'))
    # Flatten the list
    pending_user_ids = [user_id for pair in pending_user_ids for user_id in pair]
    excluded_user_ids.extend(pending_user_ids)
    
    # Get nationality-based suggestions
    nationality_suggestions = []
    user_profile = getattr(request.user, 'profile', None)
    if user_profile and user_profile.get_display_nationality():
        nationality_suggestions = User.objects.filter(
            profile__nationality=user_profile.get_display_nationality()
        ).exclude(
            id__in=excluded_user_ids
        ).select_related('profile')[:5]
    
    # Get general suggestions
    general_suggestions = User.objects.exclude(
        id__in=excluded_user_ids
    ).select_related('profile').filter(
        profile__allow_friend_requests=True
    )[:10]
    
    context = {
        'nationality_suggestions': nationality_suggestions,
        'general_suggestions': general_suggestions,
        'user_nationality': user_profile.get_display_nationality() if user_profile else None,
        'country_name': user_profile.get_country_name() if user_profile else None,
    }
    
    return render(request, 'chat/friend_suggestions.html', context)

@login_required
def dashboard(request):
    user = request.user
    
    # Get user's rooms using a single query with OR condition
    user_rooms = Room.objects.filter(
        Q(creator=user) | Q(messages__user=user)
    ).distinct()
    
    # Get user's message count
    user_messages_count = Message.objects.filter(user=user).count()
    
    # Get recent messages from all rooms (limit to recent activity)
    recent_messages = Message.objects.select_related(
        'user', 'room'
    ).order_by('-timestamp')[:10]
    
    # Get today's messages by this user
    today = datetime.now().date()
    messages_today = Message.objects.filter(
        user=user,
        timestamp__date=today
    ).count()
    
    # Simple online count (you can enhance this later)
    online_users_count = 0
    
    context = {
        'user_rooms': user_rooms,
        'user_rooms_count': user_rooms.count(),
        'user_messages_count': user_messages_count,
        'recent_messages': recent_messages,
        'messages_today': messages_today,
        'online_users_count': online_users_count,
    }
    
    return render(request, 'chat/dashboard.html', context)

@login_required
def user_settings(request):
    """Enhanced user settings view with full functionality"""
    user = request.user
    user_profile, created = UserProfile.objects.get_or_create(user=user)
    
    # Get pending friend requests count for the template
    pending_friend_requests_count = FriendRequest.objects.filter(
        to_user=user, status='pending'
    ).count()
    
    if request.method == 'POST':
        section = request.POST.get('section', 'profile')
        
        try:
            if section == 'profile':
                # Enhanced profile updates with better validation
                email = request.POST.get('email', '').strip()
                first_name = request.POST.get('first_name', '').strip()
                last_name = request.POST.get('last_name', '').strip()
                
                # Validate email
                if not email:
                    messages.error(request, 'Email is required.')
                    return redirect('user_settings')
                
                # Validate email format
                try:
                    validate_email(email)
                except ValidationError:
                    messages.error(request, 'Please enter a valid email address.')
                    return redirect('user_settings')
                
                # Check if email is already taken by another user
                if User.objects.filter(email=email).exclude(id=user.id).exists():
                    messages.error(request, 'This email is already in use by another account.')
                    return redirect('user_settings')
                
                # Validate name lengths
                if first_name and len(first_name) > 150:
                    messages.error(request, 'First name is too long (maximum 150 characters).')
                    return redirect('user_settings')
                
                if last_name and len(last_name) > 150:
                    messages.error(request, 'Last name is too long (maximum 150 characters).')
                    return redirect('user_settings')
                
                # Update user fields
                user.email = email
                user.first_name = first_name
                user.last_name = last_name
                user.save()
                
                # Update profile fields if they exist in the form
                display_name = request.POST.get('display_name', '').strip()
                bio = request.POST.get('bio', '').strip()
                location = request.POST.get('location', '').strip()
                website = request.POST.get('website', '').strip()
                
                # Validate profile fields
                if display_name and len(display_name) > 100:
                    messages.error(request, 'Display name is too long (maximum 100 characters).')
                    return redirect('user_settings')
                
                if bio and len(bio) > 500:
                    messages.error(request, 'Bio is too long (maximum 500 characters).')
                    return redirect('user_settings')
                
                if location and len(location) > 100:
                    messages.error(request, 'Location is too long (maximum 100 characters).')
                    return redirect('user_settings')
                
                if website:
                    # Basic URL validation
                    if not website.startswith(('http://', 'https://')):
                        website = 'https://' + website
                    
                    # Simple URL validation
                    import re
                    url_pattern = re.compile(
                        r'^https?://'  # http:// or https://
                        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
                        r'localhost|'  # localhost...
                        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
                        r'(?::\d+)?'  # optional port
                        r'(?:/?|[/?]\S+)$', re.IGNORECASE)
                    
                    if not url_pattern.match(website):
                        messages.error(request, 'Please enter a valid website URL.')
                        return redirect('user_settings')
                
                # Update profile fields
                if display_name is not None:
                    user_profile.display_name = display_name
                if bio is not None:
                    user_profile.bio = bio
                if location is not None:
                    user_profile.location = location
                if website is not None:
                    user_profile.website = website
                
                user_profile.save()
                
                # Log activity
                UserActivity.objects.create(
                    user=user,
                    activity_type='updated_profile',
                    description="Updated profile information"
                )
                
                messages.success(request, 'Profile updated successfully!')
                
            elif section == 'privacy':
                # Enhanced privacy settings with all toggles
                email_notifications = request.POST.get('email_notifications') == 'on'
                allow_friend_requests = request.POST.get('allow_friend_requests') == 'on'
                public_profile = request.POST.get('public_profile') == 'on'
                allow_room_invites = request.POST.get('allow_room_invites') == 'on'
                show_online_status = request.POST.get('show_online_status') == 'on'
                show_nationality = request.POST.get('show_nationality') == 'on'
                
                # Update profile privacy settings
                user_profile.allow_friend_requests = allow_friend_requests
                user_profile.show_online_status = show_online_status
                user_profile.show_nationality = show_nationality
                
                # Set profile visibility
                user_profile.profile_visibility = 'public' if public_profile else 'private'
                
                # Store notification preferences (add to UserProfile model if needed)
                # For now, we'll add these fields to the profile model
                if hasattr(user_profile, 'email_notifications'):
                    user_profile.email_notifications = email_notifications
                if hasattr(user_profile, 'allow_room_invites'):
                    user_profile.allow_room_invites = allow_room_invites
                
                user_profile.save()
                
                # Log activity
                UserActivity.objects.create(
                    user=user,
                    activity_type='updated_privacy',
                    description="Updated privacy settings"
                )
                
                messages.success(request, 'Privacy settings updated successfully!')
                
            elif section == 'security':
                # Handle security settings (placeholder for now)
                messages.info(request, 'Security settings updated!')
                
            else:
                messages.error(request, 'Invalid section specified.')
                
        except Exception as e:
            messages.error(request, f'An error occurred while updating your settings.')
            print(f"Settings error: {e}")  # For debugging
        
        return redirect('user_settings')
    
    # GET request - render the settings page
    context = {
        'user': user,
        'user_profile': user_profile,
        'pending_friend_requests_count': pending_friend_requests_count,
        
        # User stats for display
        'user_stats': {
            'rooms_created': Room.objects.filter(creator=user).count(),
            'messages_sent': Message.objects.filter(user=user).count(),
            'friends_count': Friendship.objects.filter(user=user, status='accepted').count() if hasattr(Friendship, 'objects') else 0,
            'join_date': user.date_joined,
            'last_seen': getattr(user_profile, 'last_seen', None),
        },
        
        # Privacy settings current state
        'privacy_settings': {
            'email_notifications': getattr(user_profile, 'email_notifications', True),
            'allow_friend_requests': user_profile.allow_friend_requests,
            'public_profile': user_profile.profile_visibility == 'public',
            'allow_room_invites': getattr(user_profile, 'allow_room_invites', True),
            'show_online_status': user_profile.show_online_status,
            'show_nationality': user_profile.show_nationality,
        },
        
        # Security info
        'security_info': {
            'has_2fa': False,  # Implement when 2FA is ready
            'last_password_change': None,  # Track this if needed
            'active_sessions': 1,  # Implement session tracking
        },
    }
    
    return render(request, 'chat/settings.html', context)


@login_required
@require_POST
def ajax_update_setting(request):
    """Enhanced AJAX endpoint for quick setting updates"""
    try:
        data = json.loads(request.body)
        setting_section = data.get('section', 'privacy')
        settings_data = data.get('settings', {})
        
        user_profile, created = UserProfile.objects.get_or_create(user=request.user)
        
        if setting_section == 'privacy':
            # Handle all privacy settings
            updated_settings = []
            
            if 'email_notifications' in settings_data:
                # Add to model if needed
                if hasattr(user_profile, 'email_notifications'):
                    user_profile.email_notifications = bool(settings_data['email_notifications'])
                    updated_settings.append('email notifications')
            
            if 'allow_friend_requests' in settings_data:
                user_profile.allow_friend_requests = bool(settings_data['allow_friend_requests'])
                updated_settings.append('friend requests')
            
            if 'public_profile' in settings_data:
                user_profile.profile_visibility = 'public' if bool(settings_data['public_profile']) else 'private'
                updated_settings.append('profile visibility')
            
            if 'allow_room_invites' in settings_data:
                if hasattr(user_profile, 'allow_room_invites'):
                    user_profile.allow_room_invites = bool(settings_data['allow_room_invites'])
                    updated_settings.append('room invitations')
            
            if 'show_online_status' in settings_data:
                user_profile.show_online_status = bool(settings_data['show_online_status'])
                updated_settings.append('online status visibility')
            
            if 'show_nationality' in settings_data:
                user_profile.show_nationality = bool(settings_data['show_nationality'])
                updated_settings.append('nationality visibility')
            
            user_profile.save()
            
            return JsonResponse({
                'success': True, 
                'message': f'Updated {", ".join(updated_settings)}',
                'updated_count': len(updated_settings)
            })
        
        else:
            return JsonResponse({'success': False, 'message': 'Invalid section'})
            
    except json.JSONDecodeError:
        return JsonResponse({'success': False, 'message': 'Invalid JSON data'})
    except Exception as e:
        return JsonResponse({'success': False, 'message': f'Error: {str(e)}'})


@login_required
def download_user_data(request):
    """Enhanced GDPR-compliant data download"""
    try:
        user = request.user
        user_profile = getattr(user, 'profile', None)
        
        # Collect comprehensive user data
        user_data = {
            'account_info': {
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'date_joined': user.date_joined.isoformat(),
                'last_login': user.last_login.isoformat() if user.last_login else None,
                'is_active': user.is_active,
                'is_staff': user.is_staff,
            },
            'profile_info': {},
            'rooms_created': [],
            'messages': [],
            'friends': [],
            'activities': [],
            'export_info': {
                'export_date': timezone.now().isoformat(),
                'export_version': '2.0',
                'data_format': 'JSON'
            }
        }
        
        if user_profile:
            user_data['profile_info'] = {
                'display_name': user_profile.display_name,
                'bio': user_profile.bio,
                'location': user_profile.location,
                'website': user_profile.website,
                'nationality': getattr(user_profile, 'nationality', None),
                'theme': getattr(user_profile, 'theme', None),
                'status': getattr(user_profile, 'status', None),
                'profile_visibility': getattr(user_profile, 'profile_visibility', 'public'),
                'allow_friend_requests': getattr(user_profile, 'allow_friend_requests', True),
                'show_online_status': getattr(user_profile, 'show_online_status', True),
                'show_nationality': getattr(user_profile, 'show_nationality', True),
                'created_at': user_profile.created_at.isoformat() if hasattr(user_profile, 'created_at') else None,
            }
        
        # Get user's rooms
        rooms = Room.objects.filter(creator=user)
        for room in rooms:
            user_data['rooms_created'].append({
                'name': room.name,
                'display_name': room.display_name,
                'description': room.description,
                'created_at': room.created_at.isoformat(),
                'is_public': room.is_public,
                'message_count': getattr(room, 'message_count', 0),
            })
        
        # Get user's messages (limit to recent 1000 for performance)
        messages_qs = Message.objects.filter(user=user).order_by('-timestamp')[:1000]
        for message in messages_qs:
            user_data['messages'].append({
                'content': message.content,
                'room': message.room.name,
                'timestamp': message.timestamp.isoformat(),
                'message_type': getattr(message, 'message_type', 'text'),
            })
        
        # Get user's friends
        try:
            friendships = Friendship.objects.filter(user=user, status='accepted')
            for friendship in friendships:
                user_data['friends'].append({
                    'friend_username': friendship.friend.username,
                    'created_at': friendship.created_at.isoformat(),
                    'nickname': getattr(friendship, 'nickname', ''),
                })
        except:
            # If Friendship model doesn't exist or has different structure
            pass
        
        # Get user activities (recent 100)
        try:
            activities = UserActivity.objects.filter(user=user).order_by('-created_at')[:100]
            for activity in activities:
                user_data['activities'].append({
                    'activity_type': activity.activity_type,
                    'description': activity.description,
                    'created_at': activity.created_at.isoformat(),
                })
        except:
            # If UserActivity model doesn't exist
            pass
        
        # Create JSON response
        response = HttpResponse(
            json.dumps(user_data, indent=2, ensure_ascii=False),
            content_type='application/json; charset=utf-8'
        )
        response['Content-Disposition'] = f'attachment; filename="euphorie_data_{user.username}_{timezone.now().strftime("%Y%m%d_%H%M%S")}.json"'
        
        # Log the data download
        try:
            UserActivity.objects.create(
                user=user,
                activity_type='data_downloaded',
                description="Downloaded personal data export"
            )
        except:
            pass
        
        return response
        
    except Exception as e:
        messages.error(request, f'Error generating data export. Please try again later.')
        return redirect('user_settings')


@login_required
@require_POST
def clear_user_activities(request):
    """Enhanced activity clearing with confirmation"""
    try:
        # Get confirmation
        confirmation = request.POST.get('confirmation', '').strip().lower()
        if confirmation != 'clear activities':
            messages.error(request, 'Incorrect confirmation. Activities not cleared.')
            return redirect('user_settings')
        
        count = UserActivity.objects.filter(user=request.user).count()
        UserActivity.objects.filter(user=request.user).delete()
        
        # Log the clearing action
        UserActivity.objects.create(
            user=request.user,
            activity_type='activities_cleared',
            description=f"Cleared {count} activity records"
        )
        
        messages.success(request, f'Successfully cleared {count} activity records.')
        
    except Exception as e:
        messages.error(request, f'Error clearing activities. Please try again.')
    
    return redirect('user_settings')


@login_required
@require_POST  
def deactivate_account(request):
    """Enhanced account deactivation with proper confirmation"""
    try:
        confirmation = request.POST.get('confirmation', '').strip().lower()
        
        if confirmation != 'deactivate':
            messages.error(request, 'Incorrect confirmation. Account not deactivated.')
            return redirect('user_settings')
        
        # Deactivate the account
        user = request.user
        user.is_active = False
        user.save()
        
        # Log the deactivation
        try:
            UserActivity.objects.create(
                user=user,
                activity_type='account_deactivated',
                description="Account deactivated by user"
            )
        except:
            pass
        
        # Logout the user
        logout(request)
        
        messages.success(request, 'Your account has been deactivated. Contact support to reactivate.')
        return redirect('index')
        
    except Exception as e:
        messages.error(request, f'Error deactivating account. Please try again.')
        return redirect('user_settings')


# Add this function if it doesn't exist
@login_required
def api_user_profile_extended(request):
    """Extended user profile API with all fields"""
    user_profile, created = UserProfile.objects.get_or_create(user=request.user)
    
    data = {
        'username': request.user.username,
        'email': request.user.email,
        'first_name': request.user.first_name,
        'last_name': request.user.last_name,
        'display_name': user_profile.display_name,
        'bio': user_profile.bio,
        'location': user_profile.location,
        'website': user_profile.website,
        'theme': getattr(user_profile, 'theme', 'light'),
        'status': getattr(user_profile, 'status', 'online'),
        'avatar_customization': getattr(user_profile, 'avatar_customization', {}),
        'nationality': getattr(user_profile, 'nationality', None),
        'auto_detected_country': getattr(user_profile, 'auto_detected_country', None),
        'display_nationality': user_profile.get_display_nationality() if hasattr(user_profile, 'get_display_nationality') else None,
        'country_name': user_profile.get_country_name() if hasattr(user_profile, 'get_country_name') else None,
        'flag_url': user_profile.get_flag_url() if hasattr(user_profile, 'get_flag_url') else None,
        'show_nationality': user_profile.show_nationality,
        'allow_friend_requests': user_profile.allow_friend_requests,
        'show_online_status': user_profile.show_online_status,
        'profile_visibility': getattr(user_profile, 'profile_visibility', 'public'),
    }
    
    return JsonResponse(data)


# ==================== ADMIN VIEWS ====================

@user_passes_test(lambda u: u.is_staff)
def admin_dashboard(request):
    """Enhanced admin dashboard with nationality stats"""
    # Calculate date ranges
    today = timezone.now().date()
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)
    
    stats = {
        'total_users': User.objects.count(),
        'total_rooms': Room.objects.count(),
        'total_messages': Message.objects.count(),
        'active_users_today': User.objects.filter(
            last_login__gte=timezone.now() - timedelta(days=1)
        ).count(),
        'active_users_week': User.objects.filter(
            last_login__gte=timezone.now() - timedelta(days=7)
        ).count(),
        'public_rooms': Room.objects.filter(is_public=True).count(),
        'private_rooms': Room.objects.filter(is_public=False).count(),
        'pending_friend_requests': FriendRequest.objects.filter(status='pending').count(),
        'pending_reports': MessageReport.objects.filter(status='pending').count(),
        'new_users_week': User.objects.filter(date_joined__gte=week_ago).count(),
        'new_rooms_week': Room.objects.filter(created_at__gte=week_ago).count(),
        'users_with_nationality': UserProfile.objects.exclude(
            Q(nationality__isnull=True) & Q(auto_detected_country__isnull=True)
        ).count(),
    }
    
    # Recent activity
    recent_rooms = Room.objects.select_related('creator', 'category').order_by('-created_at')[:5]
    recent_reports = MessageReport.objects.select_related(
        'reporter', 'message', 'message__user'
    ).order_by('-created_at')[:5]
    recent_users = User.objects.select_related('profile').order_by('-date_joined')[:5]
    
    # Top nationalities
    top_nationalities = NationalityStats.objects.order_by('-user_count')[:10]
    
    context = {
        'stats': stats,
        'recent_rooms': recent_rooms,
        'recent_reports': recent_reports,
        'recent_users': recent_users,
        'top_nationalities': top_nationalities,
    }
    
    return render(request, 'chat/admin_dashboard.html', context)

# [REST OF THE ADMIN VIEWS REMAIN THE SAME]
@staff_member_required
def admin_rooms(request):
    """
    Combined admin view for managing all rooms with search, filter, pagination,
    and handling room actions (clear, delete, export)
    """
    
    # Handle POST actions (clear, delete)
    if request.method == 'POST':
        action = request.POST.get('action')
        room_name = request.POST.get('room_name')
        
        if room_name:
            room = get_object_or_404(Room, name=room_name)
            
            if action == 'clear':
                # Use the correct relationship name 'messages'
                message_count = room.messages.count()
                room.messages.all().delete()
                messages.success(
                    request, 
                    f'Successfully cleared {message_count} messages from room "{room.display_name or room.name}"'
                )
                
            elif action == 'delete':
                room_display_name = room.display_name or room.name
                room.delete()  # This should cascade delete messages
                messages.success(
                    request,
                    f'Room "{room_display_name}" has been permanently deleted.'
                )
        
        return redirect('admin_rooms')
    
    # Handle CSV export
    if request.GET.get('export') and request.GET.get('room_name'):
        room_name = request.GET.get('room_name')
        room = get_object_or_404(Room, name=room_name)
        
        # Create the HttpResponse object with CSV header
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="chat_export_{room.name}_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'
        
        writer = csv.writer(response)
        
        # Write header
        writer.writerow([
            'Timestamp',
            'Username',
            'User Full Name',
            'Message',
        ])
        
        # Write messages using the correct relationship
        room_messages = room.messages.select_related('user').order_by('timestamp')
        
        for message in room_messages:
            writer.writerow([
                message.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                message.user.username if message.user else 'System',
                message.user.get_full_name() if message.user else 'System',
                message.content,
            ])
        
        return response
    
    # Regular GET request - show rooms list
    
    # Get search and filter parameters
    search_query = request.GET.get('search', '').strip()
    selected_category = request.GET.get('category', '')
    
    # Start with all rooms - use existing message_count field or calculate it
    rooms = Room.objects.select_related('creator', 'category')
    
    # If you don't have message_count field, annotate it. If you do, just use it.
    try:
        # Try to use existing message_count field
        rooms = rooms.order_by('-created_at')
        # Test if message_count field exists
        test_room = rooms.first()
        if test_room and hasattr(test_room, 'message_count'):
            # Use existing field
            pass
        else:
            raise AttributeError("No message_count field")
    except:
        # If no message_count field, calculate it
        rooms = rooms.annotate(
            messages_count=Count('messages', distinct=True)
        ).order_by('-created_at')
    
    # Apply search filter
    if search_query:
        rooms = rooms.filter(
            Q(name__icontains=search_query) |
            Q(display_name__icontains=search_query) |
            Q(description__icontains=search_query) |
            Q(creator__username__icontains=search_query) |
            Q(creator__first_name__icontains=search_query) |
            Q(creator__last_name__icontains=search_query)
        )
    
    # Apply category filter
    if selected_category:
        rooms = rooms.filter(category_id=selected_category)
    
    # Pagination
    paginator = Paginator(rooms, 25)  # Show 25 rooms per page
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    # Get statistics
    total_rooms = Room.objects.count()
    
    # Count active rooms - check if is_public field exists instead of is_active
    try:
        # Try is_public field first
        active_rooms = Room.objects.filter(is_public=True).count()
    except:
        try:
            # Try is_active field
            active_rooms = Room.objects.filter(is_active=True).count()
        except:
            # If neither field exists, just use total rooms
            active_rooms = total_rooms
    
    # Get most popular room (by message count)
    try:
        # Try using existing message_count field
        most_popular_room = Room.objects.order_by('-message_count').first()
    except:
        # If no message_count field, calculate it
        most_popular_room = Room.objects.annotate(
            msg_count=Count('messages')
        ).order_by('-msg_count').first()
    
    total_messages = Message.objects.count()
    
    # Get all categories for the filter dropdown
    categories = []
    try:
        # Check if category field exists and get categories
        from .models import Category
        categories = Category.objects.all()
    except:
        # If no Category model or relationship, leave empty
        categories = []
    
    context = {
        'page_obj': page_obj,
        'search_query': search_query,
        'selected_category': selected_category,
        'categories': categories,
        'total_rooms': total_rooms,
        'active_rooms': active_rooms,
        'most_popular_room': most_popular_room.display_name or most_popular_room.name if most_popular_room else 'None',
        'total_messages': total_messages,
    }
    
    return render(request, 'chat/admin_rooms.html', context)

@user_passes_test(lambda u: u.is_staff)
def admin_messages(request):
    """
    Unified admin messages view that handles all message operations:
    - View/List messages (GET)
    - Delete messages (POST with action=delete)
    - Edit messages (POST with action=edit)
    - Add messages (POST with action=add)
    - Bulk operations (POST with action=bulk_delete)
    """
    
    # Handle POST actions first
    if request.method == 'POST':
        action = request.POST.get('action')
        
        if action == 'delete':
            # Single message delete
            message_id = request.POST.get('message_id')
            if message_id:
                try:
                    message = Message.objects.get(id=message_id)
                    message_content = message.content[:50] + "..." if len(message.content) > 50 else message.content
                    message.delete()
                    messages.success(request, f'Message "{message_content}" deleted successfully.')
                except Message.DoesNotExist:
                    messages.error(request, 'Message not found.')
                except Exception as e:
                    messages.error(request, f'Error deleting message: {str(e)}')
        
        elif action == 'bulk_delete':
            # Bulk message delete
            message_ids = request.POST.getlist('message_ids')
            if message_ids:
                try:
                    deleted_count = Message.objects.filter(id__in=message_ids).delete()[0]
                    messages.success(request, f'Successfully deleted {deleted_count} message(s).')
                except Exception as e:
                    messages.error(request, f'Error deleting messages: {str(e)}')
            else:
                messages.warning(request, 'No messages selected for deletion.')
        
        elif action == 'edit':
            # Edit message
            message_id = request.POST.get('message_id')
            new_content = request.POST.get('content', '').strip()
            if message_id and new_content:
                try:
                    message = Message.objects.get(id=message_id)
                    message.content = new_content
                    message.save()
                    messages.success(request, 'Message updated successfully.')
                except Message.DoesNotExist:
                    messages.error(request, 'Message not found.')
                except Exception as e:
                    messages.error(request, f'Error updating message: {str(e)}')
        
        elif action == 'add':
            # Add new message
            content = request.POST.get('content', '').strip()
            room_id = request.POST.get('room_id')
            user_id = request.POST.get('user_id', request.user.id)
            
            if content and room_id:
                try:
                    room = Room.objects.get(id=room_id)
                    user = User.objects.get(id=user_id)
                    Message.objects.create(
                        content=content,
                        room=room,
                        user=user,
                        timestamp=timezone.now()
                    )
                    messages.success(request, 'Message added successfully.')
                except (Room.DoesNotExist, User.DoesNotExist):
                    messages.error(request, 'Invalid room or user selected.')
                except Exception as e:
                    messages.error(request, f'Error adding message: {str(e)}')
        
        elif action == 'ajax_delete':
            # AJAX delete for dynamic UI
            if request.headers.get('X-Requested-With') == 'XMLHttpRequest':
                message_ids = request.POST.getlist('message_ids')
                try:
                    if message_ids:
                        deleted_count = Message.objects.filter(id__in=message_ids).delete()[0]
                        return JsonResponse({
                            'success': True,
                            'message': f'Successfully deleted {deleted_count} message(s)',
                            'deleted_count': deleted_count
                        })
                    else:
                        return JsonResponse({'success': False, 'message': 'No messages selected'})
                except Exception as e:
                    return JsonResponse({'success': False, 'message': str(e)})
        
        # Redirect to avoid form resubmission
        redirect_url = request.get_full_path().split('?')[0]
        if request.GET.urlencode():
            redirect_url += '?' + request.GET.urlencode()
        return redirect(redirect_url)
    
    # Handle GET request - Display messages with filters
    
    # Get filter parameters
    search_query = request.GET.get('search', '').strip()
    time_filter = request.GET.get('timeframe', '')
    keywords = request.GET.get('keywords', '').strip()
    room_filter = request.GET.get('room', '')
    user_filter = request.GET.get('user', '')
    
    # Start with all messages
    messages_qs = Message.objects.select_related('user', 'room').order_by('-timestamp')
    
    # Apply search filter
    if search_query:
        messages_qs = messages_qs.filter(
            Q(content__icontains=search_query) |
            Q(user__username__icontains=search_query) |
            Q(room__name__icontains=search_query) |
            Q(room__display_name__icontains=search_query)
        )
    
    # Apply time filter
    if time_filter:
        now = timezone.now()
        if time_filter == 'day':
            start_time = now - timedelta(days=1)
        elif time_filter == 'week':
            start_time = now - timedelta(weeks=1)
        elif time_filter == 'month':
            start_time = now - timedelta(days=30)
        else:
            start_time = None
        
        if start_time:
            messages_qs = messages_qs.filter(timestamp__gte=start_time)
    
    # Apply keywords filter
    if keywords:
        keyword_terms = [term.strip() for term in keywords.split(',') if term.strip()]
        for term in keyword_terms:
            messages_qs = messages_qs.filter(content__icontains=term)
    
    # Apply room filter
    if room_filter:
        messages_qs = messages_qs.filter(room__id=room_filter)
    
    # Apply user filter
    if user_filter:
        messages_qs = messages_qs.filter(user__id=user_filter)
    
    # Get total message count for stats
    message_count = Message.objects.count()
    
    # Pagination
    paginator = Paginator(messages_qs, 25)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    # Check if any filters are active
    filter_active = bool(search_query or time_filter or keywords or room_filter or user_filter)
    
    # Get data for dropdowns
    all_rooms = Room.objects.all().order_by('name')[:100]  # Limit for performance
    all_users = User.objects.all().order_by('username')[:100]  # Limit for performance
    
    # Get editing message if specified
    edit_message_id = request.GET.get('edit')
    edit_message = None
    if edit_message_id:
        try:
            edit_message = Message.objects.get(id=edit_message_id)
        except Message.DoesNotExist:
            pass
    
    context = {
        'page_obj': page_obj,
        'message_count': message_count,
        'search_query': search_query,
        'time_filter': time_filter,
        'keywords': keywords,
        'room_filter': room_filter,
        'user_filter': user_filter,
        'filter_active': filter_active,
        'all_rooms': all_rooms,
        'all_users': all_users,
        'edit_message': edit_message,
    }
    
    return render(request, 'chat/admin_messages.html', context)

@user_passes_test(lambda u: u.is_staff)
def admin_users(request):
    """
    Unified admin users view that handles user management and activity
    """
    
    # Handle POST actions
    if request.method == 'POST':
        action = request.POST.get('action')
        user_id = request.POST.get('user_id')
        
        if action == 'toggle_active' and user_id:
            try:
                user = User.objects.get(id=user_id)
                user.is_active = not user.is_active
                user.save()
                status = "activated" if user.is_active else "deactivated"
                messages.success(request, f'User {user.username} has been {status}.')
            except User.DoesNotExist:
                messages.error(request, 'User not found.')
        
        elif action == 'toggle_staff' and user_id:
            try:
                user = User.objects.get(id=user_id)
                if user != request.user:  # Prevent self-demotion
                    user.is_staff = not user.is_staff
                    user.save()
                    status = "promoted to staff" if user.is_staff else "removed from staff"
                    messages.success(request, f'User {user.username} has been {status}.')
                else:
                    messages.error(request, 'You cannot change your own staff status.')
            except User.DoesNotExist:
                messages.error(request, 'User not found.')
        
        elif action == 'delete_user' and user_id:
            try:
                user = User.objects.get(id=user_id)
                if user != request.user:  # Prevent self-deletion
                    username = user.username
                    user.delete()
                    messages.success(request, f'User {username} has been deleted.')
                else:
                    messages.error(request, 'You cannot delete your own account.')
            except User.DoesNotExist:
                messages.error(request, 'User not found.')
        
        # Redirect to avoid resubmission
        redirect_url = request.get_full_path().split('?')[0]
        if request.GET.urlencode():
            redirect_url += '?' + request.GET.urlencode()
        return redirect(redirect_url)
    
    # Get filter parameters
    search_query = request.GET.get('search', '').strip()
    user_type = request.GET.get('type', '')  # all, staff, active, inactive
    sort_by = request.GET.get('sort', 'newest')  # newest, oldest, username, messages
    
    # Start with all users
    users_qs = User.objects.select_related('profile').annotate(
        message_count=Count('message'),
        room_count=Count('created_rooms', distinct=True)
    )
    
    # Apply search filter
    if search_query:
        users_qs = users_qs.filter(
            Q(username__icontains=search_query) |
            Q(email__icontains=search_query) |
            Q(first_name__icontains=search_query) |
            Q(last_name__icontains=search_query)
        )
    
    # Apply user type filter
    if user_type == 'staff':
        users_qs = users_qs.filter(is_staff=True)
    elif user_type == 'active':
        users_qs = users_qs.filter(is_active=True)
    elif user_type == 'inactive':
        users_qs = users_qs.filter(is_active=False)
    
    # Apply sorting
    if sort_by == 'oldest':
        users_qs = users_qs.order_by('date_joined')
    elif sort_by == 'username':
        users_qs = users_qs.order_by('username')
    elif sort_by == 'messages':
        users_qs = users_qs.order_by('-message_count')
    else:  # newest (default)
        users_qs = users_qs.order_by('-date_joined')
    
    # Pagination
    paginator = Paginator(users_qs, 25)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    # Get stats
    total_users = User.objects.count()
    active_users = User.objects.filter(is_active=True).count()
    staff_users = User.objects.filter(is_staff=True).count()
    
    # Recent activity (if UserActivity model exists)
    recent_activities = []
    try:
        recent_activities = UserActivity.objects.select_related(
            'user', 'room'
        ).order_by('-created_at')[:10]
    except:
        # If UserActivity model doesn't exist, skip
        pass
    
    context = {
        'page_obj': page_obj,
        'search_query': search_query,
        'user_type': user_type,
        'sort_by': sort_by,
        'total_users': total_users,
        'active_users': active_users,
        'staff_users': staff_users,
        'recent_activities': recent_activities,
    }
    
    return render(request, 'chat/admin_users.html', context)

# Update this view to fix the template path
@user_passes_test(lambda u: u.is_staff)
def admin_user_activity(request):
    """User activity view - redirects to unified admin users"""
    return admin_users(request)

@user_passes_test(lambda u: u.is_staff)
def admin_user_settings(request):
    """Enhanced admin user settings"""
    users = User.objects.select_related('profile').annotate(
        room_count=Count('created_rooms'),
        message_count=Count('message'),
        friend_count=Count('friendships')
    ).order_by('-date_joined')
    
    # Add search
    search_query = request.GET.get('q', '').strip()
    if search_query:
        users = users.filter(
            Q(username__icontains=search_query) |
            Q(email__icontains=search_query) |
            Q(first_name__icontains=search_query) |
            Q(last_name__icontains=search_query)
        )
    
    # Pagination
    paginator = Paginator(users, 25)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    return render(request, 'chat/admin/user_settings.html', {
        'users': page_obj,
        'search_query': search_query
    })

# ==================== API ENDPOINTS ====================

@login_required
def api_user_profile(request):
    """Get user profile data"""
    user_profile, created = UserProfile.objects.get_or_create(user=request.user)
    
    data = {
        'username': request.user.username,
        'display_name': user_profile.display_name,
        'bio': user_profile.bio,
        'location': user_profile.location,
        'website': user_profile.website,
        'theme': user_profile.theme,
        'status': user_profile.status,
        'avatar_customization': user_profile.avatar_customization,
    }
    
    return JsonResponse(data)

@login_required
@require_POST
def api_update_avatar(request):
    """Update user avatar"""
    try:
        data = json.loads(request.body)
        user_profile, created = UserProfile.objects.get_or_create(user=request.user)
        
        # Update avatar customization JSON field
        current_avatar = user_profile.avatar_customization or {}
        current_avatar.update(data)
        user_profile.avatar_customization = current_avatar
        user_profile.save(update_fields=['avatar_customization'])
        
        # Log activity
        UserActivity.objects.create(
            user=request.user,
            activity_type='customized_avatar',
            description="Customized avatar appearance"
        )
        
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@login_required
def api_friends_online(request):
    """Get online friends (simplified implementation)"""
    friends = Friendship.objects.filter(
        user=request.user,
        status='accepted'
    ).select_related('friend', 'friend__profile')[:20]
    
    friends_data = []
    for friendship in friends:
        # Simple online status based on last activity
        last_seen = getattr(friendship.friend.profile, 'last_seen', None)
        is_online = False
        if last_seen:
            time_diff = timezone.now() - last_seen
            is_online = time_diff.total_seconds() < 300  # 5 minutes
        
        friends_data.append({
            'id': friendship.friend.id,
            'username': friendship.friend.username,
            'display_name': friendship.friend.profile.display_username,
            'status': 'online' if is_online else 'offline',
            'last_seen': last_seen.isoformat() if last_seen else None,
            'nationality': friendship.friend.profile.get_display_nationality(),
            'country_name': friendship.friend.profile.get_country_name(),
            'flag_url': friendship.friend.profile.get_flag_url(),
        })
    
    return JsonResponse({'friends': friends_data})

def api_load_more_rooms(request):
    """Load more rooms for infinite scroll - SUPPORTS NON-AUTH USERS"""
    page = int(request.GET.get('page', 1))
    category = request.GET.get('category', 'all')
    sort_by = request.GET.get('sort', 'activity')
    
    # Always start with public rooms
    rooms = Room.objects.filter(is_public=True).select_related('category', 'creator')
    
    # For authenticated users, include their accessible private rooms
    if request.user.is_authenticated:
        private_rooms = Room.objects.filter(
            Q(creator=request.user) | Q(members=request.user),
            is_public=False
        ).select_related('category', 'creator')
        rooms = rooms.union(private_rooms).distinct()
    
    if category != 'all':
        rooms = rooms.filter(category__slug=category)
    
    # Apply sorting
    if sort_by == 'newest':
        rooms = rooms.order_by('-created_at')
    elif sort_by == 'popular':
        rooms = rooms.order_by('-message_count', '-active_users_count')
    else:  # activity
        rooms = rooms.order_by('-last_activity')
    
    paginator = Paginator(rooms, 20)
    page_obj = paginator.get_page(page)
    
    rooms_data = [{
        'name': room.name,
        'display_name': room.display_name,
        'description': room.description or '',
        'category': room.category.name if room.category else 'General',
        'creator': room.creator.username,
        'message_count': room.message_count,
        'active_users': room.active_users_count,
        'tags': room.get_tags_list(),
        'url': reverse('room', kwargs={'room_name': room.name}),
        'is_public': room.is_public,
    } for room in page_obj]
    
    return JsonResponse({
        'rooms': rooms_data,
        'has_next': page_obj.has_next(),
        'next_page': page_obj.next_page_number() if page_obj.has_next() else None,
        'total_pages': paginator.num_pages,
        'search_scope': 'public_and_private' if request.user.is_authenticated else 'public_only',
    })

def api_search_rooms(request):
    """API endpoint for room search - supports both auth and non-auth users"""
    return search_rooms(request)

# ==================== UTILITY VIEWS ====================

def privacy_policy(request):
    """Enhanced privacy policy page view"""
    context = {
        'page_title': 'Privacy Policy - Euphorie, Inc.',
        'meta_description': 'Learn how Euphorie, Inc. protects your privacy and handles your data in our comprehensive privacy policy',
        'site_name': 'Euphorie',
        'privacy_policy_last_updated': 'December 2024',
        'privacy_email': 'privacy@euphorieinc.com',
        'support_email': 'euphorieinc@gmail.com',
        'company_name': 'Euphorie, Inc.',
        'company_address': '123 Innovation Street, Tech City, TC 12345',
    }
    return render(request, 'chat/privacy_policy.html', context)

def terms_of_service(request):
    """Enhanced terms of service page"""
    context = {
        'page_title': 'Terms of Service - Euphorie',
        'meta_description': 'Terms of Service for using the Euphorie platform',
        'last_updated': 'December 2024',
        'company_name': 'Euphorie, Inc.',
    }
    return render(request, 'chat/terms_of_service.html', context)

# ==================== MODERATION ====================

@login_required
@require_POST
def report_message(request, message_id):
    """Report a message with enhanced validation"""
    message = get_object_or_404(Message, id=message_id)
    reason = request.POST.get('reason', 'inappropriate')
    description = request.POST.get('description', '').strip()
    
    # Prevent self-reporting
    if message.user == request.user:
        messages.error(request, "You cannot report your own message.")
        return redirect('room', room_name=message.room.name)
    
    report, created = MessageReport.objects.get_or_create(
        reporter=request.user,
        message=message,
        defaults={
            'reason': reason,
            'description': description
        }
    )
    
    if created:
        messages.success(request, 'Message reported. Thank you for helping keep our community safe.')
    else:
        messages.info(request, 'You have already reported this message.')
    
    return redirect('room', room_name=message.room.name)

@login_required
@require_POST
def report_user(request, username):
    """Report a user (placeholder - implement UserReport model if needed)"""
    reported_user = get_object_or_404(User, username=username)
    reason = request.POST.get('reason', 'inappropriate')
    
    if reported_user == request.user:
        messages.error(request, "You cannot report yourself.")
        return redirect('user_profile', username=username)
    
    # For now, just show a success message
    # In the future, implement a UserReport model
    messages.success(request, 'User reported. Thank you for the report.')
    return redirect('user_profile', username=username)

@user_passes_test(lambda u: u.is_staff)
def moderation_dashboard(request):
    """Enhanced moderation dashboard for staff"""
    reports = MessageReport.objects.select_related(
        'reporter', 'message', 'message__user', 'message__room'
    ).filter(status='pending').order_by('-created_at')
    
    # Add filtering
    filter_reason = request.GET.get('reason', '')
    if filter_reason:
        reports = reports.filter(reason=filter_reason)
    
    # Pagination
    paginator = Paginator(reports, 25)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    # Get reason choices for filter
    reason_choices = MessageReport.REASON_CHOICES
    
    context = {
        'reports': page_obj,
        'reason_choices': reason_choices,
        'current_reason': filter_reason,
    }
    
    return render(request, 'chat/admin/moderation.html', context)

# ==================== ROOM ACTIONS ====================

@login_required
@require_POST
def bookmark_room(request, room_id):
    """Bookmark or unbookmark a room"""
    room = get_object_or_404(Room, id=room_id)
    
    bookmark, created = RoomBookmark.objects.get_or_create(
        user=request.user,
        room=room,
        defaults={'notes': request.POST.get('notes', '')}
    )
    
    if not created:
        bookmark.delete()
        action = 'removed'
        message = f'Removed {room.display_name or room.name} from bookmarks.'
    else:
        action = 'added'
        message = f'Added {room.display_name or room.name} to bookmarks.'
    
    # Return JSON for AJAX requests
    if request.headers.get('Content-Type') == 'application/json':
        return JsonResponse({'action': action, 'message': message})
    
    # Return redirect for regular requests
    messages.success(request, message)
    return redirect('room', room_name=room.name)

def room_categories(request):
    """Get all room categories"""
    categories = RoomCategory.objects.filter(is_active=True).order_by('sort_order', 'name')
    categories_data = [{
        'slug': cat.slug,
        'name': cat.name,
        'icon': cat.icon,
        'color': cat.color,
        'description': cat.description,
        'room_count': Room.objects.filter(category=cat, is_public=True).count(),
    } for cat in categories]
    
    return JsonResponse({'categories': categories_data})

def trending_rooms(request):
    """Get trending rooms based on recent activity"""
    # Define trending criteria
    week_ago = timezone.now() - timedelta(days=7)
    
    trending = Room.objects.filter(
        is_public=True,
        last_activity__gte=week_ago
    ).annotate(
        total_messages=Count('messages'),
        recent_messages=Count('messages', filter=Q(messages__timestamp__gte=week_ago))
    ).filter(
        recent_messages__gte=5  # At least 5 messages in the last week
    ).order_by('-recent_messages', '-total_messages')[:10]
    
    return render(request, 'chat/trending_rooms.html', {'rooms': trending})

# ==================== DEBUG VIEW ====================

def debug_rooms(request):
    """Debug view to check room counts - REMOVE IN PRODUCTION"""
    if not (request.user.is_staff and request.user.is_superuser):
        return HttpResponseForbidden("Access denied")
    
    stats = {
        'total_rooms': Room.objects.count(),
        'public_rooms': Room.objects.filter(is_public=True).count(),
        'private_rooms': Room.objects.filter(is_public=False).count(),
        'rooms_by_category': {},
    }
    
    # Get rooms by category
    for category in RoomCategory.objects.all():
        stats['rooms_by_category'][category.name] = {
            'total': Room.objects.filter(category=category).count(),
            'public': Room.objects.filter(category=category, is_public=True).count(),
        }
    
    # Get rooms without category
    stats['rooms_by_category']['No Category'] = {
        'total': Room.objects.filter(category__isnull=True).count(),
        'public': Room.objects.filter(category__isnull=True, is_public=True).count(),
    }
    
    # Get sample rooms
    sample_rooms = Room.objects.select_related('creator', 'category').order_by('-created_at')[:10]
    
    return JsonResponse({
        'stats': stats,
        'sample_rooms': [{
            'id': room.id,
            'name': room.name,
            'display_name': room.display_name,
            'is_public': room.is_public,
            'category': room.category.name if room.category else None,
            'creator': room.creator.username if room.creator else None,
            'created_at': room.created_at.isoformat(),
            'message_count': room.message_count,
        } for room in sample_rooms]
    }, json_dumps_params={'indent': 2})

# ==================== Screen Share VIEW ====================

@login_required
@require_http_methods(["POST"])
@csrf_exempt
def start_screen_share(request):
    """Start a new screen sharing session"""
    try:
        data = json.loads(request.body)
        room_id = data.get('room_id')
        projection_mode = data.get('projection_mode', 'ceiling')
        quality = data.get('quality', 'medium')
        
        # Get room
        room = get_object_or_404(Room, id=room_id)
        
        # Check if user has permission to share in this room
        if not room.user_can_access(request.user):
            return JsonResponse({'error': 'No permission to share in this room'}, status=403)
        
        # Check if there's already an active share in this room
        existing_share = ScreenShare.objects.filter(
            room=room,
            status='active'
        ).first()
        
        if existing_share and existing_share.sharer != request.user:
            return JsonResponse({
                'error': 'Another user is already sharing in this room',
                'current_sharer': existing_share.sharer.username
            }, status=409)
        
        # Stop existing share if user is already sharing
        if existing_share and existing_share.sharer == request.user:
            existing_share.stop_sharing()
        
        # Create new screen share session
        session_id = str(uuid.uuid4())
        screen_share = ScreenShare.objects.create(
            room=room,
            sharer=request.user,
            session_id=session_id,
            projection_mode=projection_mode,
            quality=quality,
            status='active'
        )
        
        # Create activity log
        UserActivity.objects.create(
            user=request.user,
            room=room,
            activity_type='started_screen_share',
            description=f"Started screen sharing in {room.name}",
            metadata={
                'session_id': session_id,
                'projection_mode': projection_mode,
                'quality': quality
            }
        )
        
        return JsonResponse({
            'success': True,
            'session_id': session_id,
            'screen_share_id': screen_share.id,
            'projection_mode': projection_mode,
            'quality': quality
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
@require_http_methods(["POST"])
@csrf_exempt
def stop_screen_share(request):
    """Stop an active screen sharing session"""
    try:
        data = json.loads(request.body)
        session_id = data.get('session_id')
        
        # Get screen share
        screen_share = get_object_or_404(ScreenShare, session_id=session_id)
        
        # Check if user is the sharer
        if screen_share.sharer != request.user:
            return JsonResponse({'error': 'Not authorized to stop this share'}, status=403)
        
        # Stop the sharing session
        screen_share.stop_sharing()
        
        # Create activity log
        UserActivity.objects.create(
            user=request.user,
            room=screen_share.room,
            activity_type='stopped_screen_share',
            description=f"Stopped screen sharing in {screen_share.room.name}",
            metadata={
                'session_id': session_id,
                'duration_seconds': screen_share.duration_seconds,
                'total_viewers': screen_share.total_viewers,
                'max_concurrent_viewers': screen_share.max_concurrent_viewers
            }
        )
        
        return JsonResponse({
            'success': True,
            'session_id': session_id,
            'duration_seconds': screen_share.duration_seconds,
            'total_viewers': screen_share.total_viewers
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
@require_http_methods(["GET"])
def get_active_screen_shares(request, room_id):
    """Get active screen shares for a room"""
    try:
        room = get_object_or_404(Room, id=room_id)
        
        # Check if user has access to this room
        if not room.user_can_access(request.user):
            return JsonResponse({'error': 'No access to this room'}, status=403)
        
        # Get active screen shares
        screen_shares = ScreenShare.objects.filter(
            room=room,
            status='active'
        ).select_related('sharer')
        
        shares_data = []
        for share in screen_shares:
            shares_data.append({
                'id': share.id,
                'session_id': share.session_id,
                'sharer': {
                    'id': share.sharer.id,
                    'username': share.sharer.username,
                    'display_name': getattr(share.sharer.profile, 'display_name', '') if hasattr(share.sharer, 'profile') else ''
                },
                'projection_mode': share.projection_mode,
                'quality': share.quality,
                'started_at': share.started_at.isoformat(),
                'active_viewers': share.get_active_viewers(),
                'max_concurrent_viewers': share.max_concurrent_viewers
            })
        
        return JsonResponse({
            'success': True,
            'screen_shares': shares_data,
            'total_active': len(shares_data)
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
@require_http_methods(["POST"])
@csrf_exempt
def join_screen_share(request):
    """Join a screen sharing session as a viewer"""
    try:
        data = json.loads(request.body)
        session_id = data.get('session_id')
        
        # Get screen share
        screen_share = get_object_or_404(ScreenShare, session_id=session_id, status='active')
        
        # Check if user has access to the room
        if not screen_share.room.user_can_access(request.user):
            return JsonResponse({'error': 'No access to this room'}, status=403)
        
        # Add user as viewer
        viewer = screen_share.add_viewer(request.user)
        
        return JsonResponse({
            'success': True,
            'session_id': session_id,
            'viewer_id': viewer.id,
            'sharer': screen_share.sharer.username,
            'projection_mode': screen_share.projection_mode,
            'quality': screen_share.quality
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
@require_http_methods(["POST"])
@csrf_exempt
def leave_screen_share(request):
    """Leave a screen sharing session"""
    try:
        data = json.loads(request.body)
        session_id = data.get('session_id')
        
        # Get screen share
        screen_share = get_object_or_404(ScreenShare, session_id=session_id)
        
        # Remove user as viewer
        removed = screen_share.remove_viewer(request.user)
        
        return JsonResponse({
            'success': True,
            'session_id': session_id,
            'removed': removed
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@login_required
@require_http_methods(["GET"])
def screen_share_stats(request, room_id):
    """Get screen sharing statistics for a room"""
    try:
        room = get_object_or_404(Room, id=room_id)
        
        # Check if user has access to this room
        if not room.user_can_access(request.user):
            return JsonResponse({'error': 'No access to this room'}, status=403)
        
        # Get statistics
        total_shares = ScreenShare.objects.filter(room=room).count()
        active_shares = ScreenShare.objects.filter(room=room, status='active').count()
        
        # Top sharers
        top_sharers = ScreenShare.objects.filter(
            room=room
        ).values(
            'sharer__username'
        ).annotate(
            share_count=Count('id'),
            total_duration=Sum('duration_seconds')
        ).order_by('-share_count')[:5]
        
        # Recent shares
        recent_shares = ScreenShare.objects.filter(
            room=room
        ).select_related('sharer').order_by('-started_at')[:10]
        
        recent_data = []
        for share in recent_shares:
            recent_data.append({
                'sharer': share.sharer.username,
                'started_at': share.started_at.isoformat(),
                'duration_seconds': share.duration_seconds,
                'projection_mode': share.projection_mode,
                'max_viewers': share.max_concurrent_viewers,
                'status': share.status
            })
        
        return JsonResponse({
            'success': True,
            'stats': {
                'total_shares': total_shares,
                'active_shares': active_shares,
                'top_sharers': list(top_sharers),
                'recent_shares': recent_data
            }
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)


@csrf_exempt
@require_http_methods(["POST"])
def grok_chat(request):
    """Handle Grok AI chat requests by forwarding to the Groq API"""
    logger.info("Grok chat endpoint called")  # Add this
    
    try:
        # Parse the request body
        data = json.loads(request.body)
        logger.info(f"Received data: {data}")  # Add this
        
        user_message = data.get('message', '').strip()
        room_id = data.get('room_id')
        conversation_history = data.get('history', [])
        
        if not user_message:
            return JsonResponse({
                'status': 'error',
                'message': 'No message provided'
            }, status=400)
        
        # Call the Groq API
        logger.info("Calling Groq API...")  # Add this
        grok_response = call_grok_api(user_message, conversation_history)
        logger.info(f"Groq response: {grok_response}")  # Add this
        
        if grok_response['status'] == 'success':
            return JsonResponse({
                'status': 'success',
                'response': grok_response['message']
            })
        else:
            return JsonResponse({
                'status': 'error',
                'message': grok_response.get('error', 'Failed to get response from Groq')
            }, status=500)
            
    except json.JSONDecodeError:
        logger.error("JSON decode error")  # Add this
        return JsonResponse({
            'status': 'error',
            'message': 'Invalid JSON'
        }, status=400)
    except Exception as e:
        logger.error(f"Grok chat error: {str(e)}")
        return JsonResponse({
            'status': 'error',
            'message': 'An error occurred processing your request'
        }, status=500)

def call_grok_api(message, conversation_history=None):
    """Call the Groq API for fast inference"""
    try:
        # Get API credentials from settings
        api_key = getattr(settings, 'GROQ_API_KEY', None)
        api_url = getattr(settings, 'GROQ_API_URL', 'https://api.groq.com/openai/v1/chat/completions')
        
        if not api_key:
            logger.error("Groq API key not configured")
            return {
                'status': 'error',
                'error': 'Groq API not configured'
            }
        
        # Log API key info (first few chars only for security)
        logger.info(f"Using Groq API key starting with: {api_key[:10]}...")
        
        # Prepare the conversation context
        messages = []
        
        # Add system message to set context
        messages.append({
            "role": "system",
            "content": """You are Euphorie, a helpful AI assistant in Euphorie 3D, a virtual social platform.

            Be direct and helpful when answering questions. If users ask about current events or news:
            - Provide what information you know, but mention your knowledge cutoff date
            - Don't redirect or avoid topics unless they're harmful
            - Be factual and balanced
            - Keep responses concise

            For platform-specific questions, you can explain features like:
            - 3D avatars, chat bubbles, emotions, pets
            - Screen sharing, weather/scene controls
            - Friend systems and group activities

            Always be helpful and direct with users!"""
        })
        
        # Add conversation history if provided
        if conversation_history:
            for msg in conversation_history[-10:]:  # Keep last 10 messages for context
                messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", "")
                })
        
        # Add the current message
        messages.append({
            "role": "user",
            "content": message
        })
        
        # Make the API request
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": "llama3-8b-8192",  # Updated to a supported model
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 500,
            "stream": False,
            "top_p": 0.9
        }
        
        # Log the request details
        logger.info(f"Sending request to Groq API: {api_url}")
        logger.info(f"Payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(
            api_url,
            headers=headers,
            json=payload,
            timeout=30
        )
        
        # Log response details
        logger.info(f"Groq API response status: {response.status_code}")
        logger.info(f"Groq API response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            ai_message = data['choices'][0]['message']['content']
            
            # Add note about knowledge limitations for news-related queries
            # if any(word in message.lower() for word in ['news', 'latest', 'current', 'today', 'yesterday', 'recent']):
            #    ai_message += "\n\n*Note: My knowledge is from my training data and I don't have access to real-time news. For the very latest updates, you may want to check current news sources.*"
            
            return {
                'status': 'success',
                'message': ai_message
            }
        else:
            # Log the full error response
            logger.error(f"Groq API error: {response.status_code}")
            logger.error(f"Error response: {response.text}")
            
            # Try to parse error message
            try:
                error_data = response.json()
                error_message = error_data.get('error', {}).get('message', 'Unknown error')
                logger.error(f"Error message: {error_message}")
            except:
                error_message = response.text
            
            return {
                'status': 'error',
                'error': f'API error: {response.status_code}',
                'details': error_message
            }
            
    except requests.exceptions.Timeout:
        logger.error("Groq API timeout")
        return {
            'status': 'error',
            'error': 'Request timed out. Please try again.'
        }
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error: {str(e)}")
        return {
            'status': 'error',
            'error': 'Failed to connect to Groq API'
        }
    except Exception as e:
        logger.error(f"Unexpected error calling Groq API: {str(e)}")
        logger.exception("Full traceback:")
        return {
            'status': 'error',
            'error': 'An unexpected error occurred'
        }
    

# Configure Stripe
stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', '')

# ==================== PRICING & PLANS ====================

def pricing_page(request):
    """Display pricing plans and subscription options"""
    from django.conf import settings
    
    # Get payment settings
    payment_settings = getattr(settings, 'PAYMENT_SETTINGS', {})
    free_tier_limit = payment_settings.get('FREE_TIER_MAX_USERS', 10)
    premium_tier_limit = payment_settings.get('PREMIUM_TIER_MAX_USERS', 50)
    enterprise_tier_limit = payment_settings.get('ENTERPRISE_TIER_MAX_USERS', 200)
    
    # Calculate room counts based on max_users instead of requires_payment
    context = {
        'user': request.user,
        'total_users': User.objects.count(),
        'total_rooms': Room.objects.filter(is_public=True).count(),
        'free_rooms': Room.objects.filter(
            is_public=True, 
            max_users__lte=free_tier_limit
        ).count(),
        'premium_rooms': Room.objects.filter(
            is_public=True, 
            max_users__gt=free_tier_limit,
            max_users__lte=premium_tier_limit
        ).count(),
        'enterprise_rooms': Room.objects.filter(
            is_public=True, 
            max_users__gt=premium_tier_limit
        ).count(),
        'featured_rooms': Room.objects.filter(
            is_public=True, 
            is_featured=True
        )[:6],
        
        # Pricing tiers
        'pricing_tiers': [
            {
                'name': 'Basic',
                'price': 0,
                'billing': 'Free forever',
                'description': 'Perfect for getting started with Euphorie',
                'max_users': free_tier_limit,
                'max_rooms': 3,
                'features': [
                    f'Up to {free_tier_limit} users per room',
                    'Basic 3D environments',
                    'Text and voice chat',
                    'Public room creation',
                    'Basic avatar customization',
                    'Community support'
                ],
                'cta': 'Get Started',
                'cta_url': '/accounts/signup/' if not request.user.is_authenticated else '/dashboard/',
                'popular': False,
                'current': request.user.is_authenticated and (
                    not hasattr(request.user, 'subscription') or 
                    not request.user.subscription.is_active or 
                    request.user.subscription.plan.name == 'basic'
                ) if request.user.is_authenticated else False
            },
            {
                'name': 'Premium',
                'price': 9.99,
                'billing': 'per month',
                'description': 'Enhanced features for power users and small teams',
                'max_users': premium_tier_limit,
                'max_rooms': 25,
                'features': [
                    f'Up to {premium_tier_limit} users per room',
                    'Advanced 3D environments',
                    'HD voice and video chat',
                    'Private room creation',
                    'Advanced avatar customization',
                    'Custom room themes',
                    'Screen sharing',
                    'Room analytics',
                    'Priority support'
                ],
                'cta': 'Upgrade to Premium',
                'cta_url': '/payment/create-intent/?plan=premium',
                'popular': True,
                'current': request.user.is_authenticated and (
                    hasattr(request.user, 'subscription') and 
                    request.user.subscription.is_active and 
                    request.user.subscription.plan.name == 'premium'
                ) if request.user.is_authenticated else False
            },
            {
                'name': 'Enterprise',
                'price': 29.99,
                'billing': 'per month',
                'description': 'Complete solution for large organizations',
                'max_users': enterprise_tier_limit,
                'max_rooms': 'Unlimited',
                'features': [
                    f'Up to {enterprise_tier_limit} users per room',
                    'Premium 3D environments',
                    '4K video conferencing',
                    'Unlimited private rooms',
                    'Custom avatar uploads',
                    'White-label branding',
                    'Advanced moderation tools',
                    'API access',
                    'Custom integrations',
                    'Dedicated account manager',
                    '24/7 priority support'
                ],
                'cta': 'Contact Sales',
                'cta_url': '/payment/create-intent/?plan=enterprise',
                'popular': False,
                'current': request.user.is_authenticated and (
                    hasattr(request.user, 'subscription') and 
                    request.user.subscription.is_active and 
                    request.user.subscription.plan.name == 'enterprise'
                ) if request.user.is_authenticated else False
            }
        ],
        
        # FAQ data
        'faq_items': [
            {
                'question': 'Can I upgrade or downgrade my plan anytime?',
                'answer': 'Yes! You can upgrade your plan at any time and get immediate access to new features. Downgrades take effect at the end of your current billing cycle.'
            },
            {
                'question': 'What happens to my rooms if I downgrade?',
                'answer': 'Your existing rooms will remain accessible, but you may lose access to premium features. Rooms exceeding your new plan limits will become read-only until upgraded.'
            },
            {
                'question': 'Is there a free trial for Premium or Enterprise?',
                'answer': 'We offer a generous free Basic plan with no time limits. You can upgrade to Premium or Enterprise at any time to access advanced features.'
            },
            {
                'question': 'Do you offer refunds?',
                'answer': 'We offer a 30-day money-back guarantee for all paid plans. Contact our support team if you\'re not satisfied with your subscription.'
            },
            {
                'question': 'Can I pay annually for a discount?',
                'answer': 'Yes! Annual subscriptions receive a 20% discount compared to monthly billing. Contact us for annual billing options.'
            },
            {
                'question': 'What payment methods do you accept?',
                'answer': 'We accept all major credit cards (Visa, Mastercard, American Express), PayPal, and bank transfers for Enterprise plans.'
            }
        ],
        
        # Add Stripe configuration for authenticated users
        'stripe_publishable_key': getattr(settings, 'STRIPE_PUBLISHABLE_KEY', '') if request.user.is_authenticated else '',
        'payment_enabled': getattr(settings, 'PAYMENT_SETTINGS', {}).get('ENABLE_PAYMENTS', True),
    }
    
    # Add user's current subscription info if authenticated
    if request.user.is_authenticated:
        try:
            subscription = request.user.subscription
            context['current_subscription'] = {
                'plan': subscription.plan.name,
                'is_active': subscription.is_active,
                'is_expired': subscription.is_expired,
                'expires_at': subscription.expires_at,
                'can_upgrade': subscription.plan.name in ['basic', 'premium'],
                'can_downgrade': subscription.plan.name in ['premium', 'enterprise'],
            }
        except:
            context['current_subscription'] = {
                'plan': 'basic',
                'is_active': False,
                'is_expired': True,
                'expires_at': None,
                'can_upgrade': True,
                'can_downgrade': False,
            }
    
    return render(request, 'rooms/pricing.html', context)

def pricing_comparison(request):
    """Detailed pricing comparison page"""
    # CHANGE: PaymentPlan -> SubscriptionPlan
    plans = SubscriptionPlan.objects.filter(is_active=True).order_by('price')
    
    # Feature comparison matrix
    features_comparison = [
        {
            'feature': 'Maximum Room Size',
            'basic': '10 users',
            'premium': '50 users', 
            'enterprise': '200+ users'
        },
        {
            'feature': 'Room Creation',
            'basic': 'Unlimited',
            'premium': 'Unlimited',
            'enterprise': 'Unlimited'
        },
        {
            'feature': '3D Avatars',
            'basic': 'Basic customization',
            'premium': 'Advanced customization',
            'enterprise': 'Full customization + API'
        },
        {
            'feature': 'Screen Sharing',
            'basic': 'Limited quality',
            'premium': 'HD quality',
            'enterprise': '4K quality + recording'
        },
        {
            'feature': 'Priority Support',
            'basic': 'Community support',
            'premium': 'Email support',
            'enterprise': '24/7 phone support'
        },
        {
            'feature': 'Analytics Dashboard',
            'basic': 'Basic stats',
            'premium': 'Advanced analytics',
            'enterprise': 'Custom reports + API'
        },
    ]
    
    context = {
        'plans': plans,
        'features_comparison': features_comparison,
        'page_title': 'Compare Plans - Euphorie',
    }
    
    return render(request, 'chat/pricing_comparison.html', context)

# ==================== PAYMENT PROCESSING ====================

@login_required
@require_http_methods(["POST"])
def create_payment_intent(request):
    """Create Stripe payment intent for subscription"""
    try:
        data = json.loads(request.body)
        plan_id = data.get('plan_id')
        
        # CHANGE: PaymentPlan -> SubscriptionPlan
        plan = get_object_or_404(SubscriptionPlan, id=plan_id, is_active=True)
        
        # Check if user already has this plan
        try:
            current_subscription = request.user.subscription
            if current_subscription.plan == plan and current_subscription.is_active:
                return JsonResponse({
                    'error': 'You already have this subscription plan'
                }, status=400)
        except UserSubscription.DoesNotExist:
            pass
        
        # Create or get Stripe customer
        customer = get_or_create_stripe_customer(request.user)
        
        # Create payment intent
        intent = stripe.PaymentIntent.create(
            amount=plan.price_cents,
            currency='usd',
            customer=customer.id,
            metadata={
                'user_id': request.user.id,
                'plan_id': plan.id,
                'plan_name': plan.name,
                'username': request.user.username,
            },
            automatic_payment_methods={
                'enabled': True,
            },
            description=f"Euphorie {plan.get_name_display()} Subscription"
        )
        
        # Create payment record
        payment = Payment.objects.create(
            user=request.user,
            plan=plan,
            stripe_payment_intent_id=intent.id,
            amount_cents=plan.price_cents,
            status='pending',
            description=f"Subscription to {plan.get_name_display()}",
            metadata={
                'stripe_customer_id': customer.id,
                'payment_intent_id': intent.id
            }
        )
        
        # Log payment attempt
        PaymentAttempt.objects.create(
            user=request.user,
            plan=plan,
            amount_cents=plan.price_cents,
            payment_method='card',
            success=False,  # Will be updated on success
            ip_address=get_client_ip(request),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return JsonResponse({
            'client_secret': intent.client_secret,
            'payment_id': payment.id,
            'plan_name': plan.get_name_display(),
            'amount': plan.price_dollars,
        })
        
    except stripe.error.StripeError as e:
        logger.error(f"Stripe error creating payment intent: {str(e)}")
        return JsonResponse({'error': 'Payment processing error. Please try again.'}, status=400)
    except Exception as e:
        logger.error(f"Error creating payment intent: {str(e)}")
        return JsonResponse({'error': 'An unexpected error occurred'}, status=500)

def get_or_create_stripe_customer(user):
    """Get or create Stripe customer for user"""
    try:
        subscription = user.subscription
        if subscription.stripe_customer_id:
            try:
                return stripe.Customer.retrieve(subscription.stripe_customer_id)
            except stripe.error.StripeError:
                pass  # Customer not found, create new one
    except UserSubscription.DoesNotExist:
        pass
    
    # Create new customer
    customer = stripe.Customer.create(
        email=user.email,
        name=f"{user.first_name} {user.last_name}".strip() or user.username,
        metadata={
            'user_id': user.id,
            'username': user.username
        }
    )
    
    # Update subscription with customer ID
    subscription, created = UserSubscription.objects.get_or_create(
        user=user,
        defaults={
            # CHANGE: PaymentPlan -> SubscriptionPlan
            'plan': SubscriptionPlan.objects.filter(name='basic', is_active=True).first(),
            'stripe_customer_id': customer.id,
            'is_active': False
        }
    )
    
    if not subscription.stripe_customer_id:
        subscription.stripe_customer_id = customer.id
        subscription.save()
    
    return customer

@login_required
def payment_success(request):
    """Handle successful payment redirect"""
    payment_intent_id = request.GET.get('payment_intent')
    
    if not payment_intent_id:
        messages.error(request, 'Invalid payment session.')
        return redirect('pricing')
    
    try:
        # Retrieve payment intent from Stripe
        intent = stripe.PaymentIntent.retrieve(payment_intent_id)
        
        if intent.status == 'succeeded':
            # Find the payment record
            payment = Payment.objects.get(stripe_payment_intent_id=payment_intent_id)
            
            if payment.status != 'succeeded':
                payment.mark_as_succeeded()
                
                # Create or update subscription
                create_or_update_subscription(payment.user, payment.plan, intent.customer)
                
                # Update payment attempt as successful
                PaymentAttempt.objects.filter(
                    user=payment.user,
                    plan=payment.plan,
                    created_at__gte=timezone.now() - timedelta(minutes=30)
                ).update(success=True)
            
            messages.success(request, f'Payment successful! You now have access to {payment.plan.get_name_display()} features.')
            return render(request, 'rooms/payment_success.html', {
                'plan': payment.plan,
                'payment': payment,
                'subscription': payment.user.subscription,
            })
        else:
            messages.error(request, 'Payment was not completed successfully.')
            
    except Payment.DoesNotExist:
        messages.error(request, 'Payment record not found.')
    except stripe.error.StripeError as e:
        messages.error(request, f'Error verifying payment: {str(e)}')
    except Exception as e:
        logger.error(f"Error processing payment success: {str(e)}")
        messages.error(request, 'Error processing payment. Please contact support.')
    
    return redirect('pricing')

def create_or_update_subscription(user, plan, stripe_customer_id):
    """Create or update user subscription"""
    subscription, created = UserSubscription.objects.get_or_create(
        user=user,
        defaults={
            'plan': plan,
            'stripe_customer_id': stripe_customer_id,
            'is_active': True,
            'expires_at': timezone.now() + timedelta(days=30),
        }
    )
    
    if not created:
        # Update existing subscription
        old_plan = subscription.plan.name
        subscription.plan = plan
        subscription.stripe_customer_id = stripe_customer_id
        subscription.is_active = True
        subscription.expires_at = timezone.now() + timedelta(days=30)
        subscription.cancelled_at = None
        subscription.save()
        
        # Log plan change
        if old_plan != plan.name:
            try:
                UserActivity.objects.create(
                    user=user,
                    activity_type='subscription_upgraded',
                    description=f"Upgraded from {old_plan} to {plan.name}",
                    metadata={'old_plan': old_plan, 'new_plan': plan.name}
                )
            except:
                pass

@login_required
def payment_cancel(request):
    """Handle payment cancellation"""
    messages.info(request, 'Payment was cancelled. You can try again anytime.')
    return redirect('pricing')

# ==================== SUBSCRIPTION MANAGEMENT ====================

@login_required
def subscription_dashboard(request):
    """User subscription dashboard"""
    try:
        subscription = request.user.subscription
    except UserSubscription.DoesNotExist:
        # Create basic subscription
        basic_plan = SubscriptionPlan.objects.filter(name='basic', is_active=True).first()  # FIXED: Changed from PaymentPlan
        if basic_plan:
            subscription = UserSubscription.objects.create(
                user=request.user,
                plan=basic_plan,
                is_active=True,
                started_at=timezone.now()  # Add started_at
            )
        else:
            messages.error(request, 'No basic plan found. Please contact support.')
            return redirect('index')
    
    # Get user's payment history
    payments = Payment.objects.filter(user=request.user).order_by('-created_at')[:10]
    
    # Get available upgrade plans
    upgrade_plans = SubscriptionPlan.objects.filter(  # FIXED: Changed from PaymentPlan
        is_active=True,
        price__gt=subscription.plan.price  # FIXED: Changed from price_cents to price
    ).order_by('price')  # FIXED: Changed from price_cents to price
    
    # Get room usage stats
    rooms_created = Room.objects.filter(creator=request.user).count()
    rooms_requiring_premium = Room.objects.filter(
        creator=request.user,
        requires_payment=True
    ).count()
    
    # Calculate savings with current plan
    total_paid = payments.filter(status='succeeded').aggregate(
        total=Sum('amount_cents')
    )['total'] or 0
    
    # Calculate days until expiry safely
    days_until_expiry = 0
    if hasattr(subscription, 'days_remaining'):
        days_until_expiry = subscription.days_remaining
    elif subscription.expires_at:
        remaining = subscription.expires_at - timezone.now()
        days_until_expiry = max(0, remaining.days)
    
    # Check if expired safely
    is_expired = False
    if hasattr(subscription, 'is_expired'):
        is_expired = subscription.is_expired
    elif subscription.expires_at:
        is_expired = subscription.expires_at < timezone.now()
    
    context = {
        'subscription': subscription,
        'payments': payments,
        'upgrade_plans': upgrade_plans,
        'rooms_created': rooms_created,
        'rooms_requiring_premium': rooms_requiring_premium,
        'total_paid_dollars': total_paid / 100,
        'days_until_expiry': days_until_expiry,
        'is_expired': is_expired,
        'can_cancel': subscription.is_active and subscription.plan.price > 0,  # FIXED: Changed from price_cents to price
    }
    
    return render(request, 'chat/subscription_dashboard.html', context)

@login_required
@require_POST
def cancel_subscription(request):
    """Cancel user subscription"""
    try:
        subscription = request.user.subscription
        
        if not subscription.is_active:
            messages.info(request, 'Your subscription is already inactive.')
            return redirect('subscription_dashboard')
        
        if subscription.plan.price_cents == 0:
            messages.info(request, 'You cannot cancel the basic plan.')
            return redirect('subscription_dashboard')
        
        # Cancel the subscription
        subscription.cancel_subscription()
        
        # Create activity log
        UserActivity.objects.create(
            user=request.user,
            activity_type='subscription_cancelled',
            description=f"Cancelled {subscription.plan.get_name_display()} subscription"
        )
        
        messages.success(request, 'Your subscription has been cancelled. You can resubscribe anytime.')
        
    except UserSubscription.DoesNotExist:
        messages.error(request, 'No active subscription found.')
    except Exception as e:
        logger.error(f"Error cancelling subscription: {str(e)}")
        messages.error(request, 'Error cancelling subscription. Please contact support.')
    
    return redirect('subscription_dashboard')

# ==================== ROOM ACCESS CONTROL ====================

def room_access_check(request, room_id):
    """Check if user can access a premium room"""
    room = get_object_or_404(Room, id=room_id)
    
    if room.user_can_join(request.user):
        # User can join the room
        return redirect('room', room_name=room.name)
    
    # User needs to upgrade
    required_plan = room.get_required_plan()
    
    messages.warning(
        request, 
        f'This room supports up to {room.max_users} users. You need a {required_plan.get_name_display() if required_plan else "premium"} subscription to join.'
    )
    
    # Redirect to pricing with room context
    return redirect(f"{reverse('pricing')}?required_users={room.max_users}&room_name={room.name}")

def check_room_access_ajax(request, room_id):
    """AJAX endpoint to check room access"""
    if not request.user.is_authenticated:
        return JsonResponse({
            'can_access': False,
            'reason': 'authentication_required',
            'message': 'Please log in to join this room'
        })
    
    room = get_object_or_404(Room, id=room_id)
    can_access = room.can_user_join(request.user)
    
    response_data = {
        'can_access': can_access,
        'room_name': room.name,
        'max_users': room.max_users,
        'requires_payment': room.requires_payment,
    }
    
    if not can_access:
        required_plan = room.get_required_plan()
        response_data.update({
            'reason': 'subscription_required',
            'message': f'Upgrade to {required_plan.get_name_display()} to join this room',
            'required_plan': required_plan.name if required_plan else 'premium',
            'upgrade_url': room.get_upgrade_url(),
        })
    
    return JsonResponse(response_data)

# ==================== STRIPE WEBHOOKS ====================

@csrf_exempt
def stripe_webhook(request):
    """Handle Stripe webhooks"""
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, getattr(settings, 'STRIPE_WEBHOOK_SECRET', '')
        )
    except ValueError as e:
        logger.error(f"Invalid payload in webhook: {e}")
        return HttpResponse(status=400)
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Invalid signature in webhook: {e}")
        return HttpResponse(status=400)
    
    # Handle different event types
    try:
        if event['type'] == 'payment_intent.succeeded':
            handle_payment_succeeded(event['data']['object'])
        elif event['type'] == 'payment_intent.payment_failed':
            handle_payment_failed(event['data']['object'])
        elif event['type'] == 'customer.subscription.deleted':
            handle_subscription_cancelled(event['data']['object'])
        elif event['type'] == 'customer.subscription.updated':
            handle_subscription_updated(event['data']['object'])
        elif event['type'] == 'invoice.payment_succeeded':
            handle_invoice_payment_succeeded(event['data']['object'])
        else:
            logger.info(f"Unhandled webhook event type: {event['type']}")
    
    except Exception as e:
        logger.error(f"Error processing webhook {event['type']}: {str(e)}")
        return HttpResponse(status=500)
    
    return HttpResponse(status=200)

def handle_payment_succeeded(payment_intent):
    """Handle successful payment webhook"""
    try:
        payment = Payment.objects.get(stripe_payment_intent_id=payment_intent['id'])
        
        if payment.status != 'succeeded':
            payment.mark_as_succeeded()
            
            # Update subscription
            create_or_update_subscription(
                payment.user, 
                payment.plan, 
                payment_intent['customer']
            )
            
            logger.info(f"Payment succeeded for user {payment.user.username}: ${payment.amount_dollars}")
        
    except Payment.DoesNotExist:
        logger.warning(f"Payment not found for intent: {payment_intent['id']}")

def handle_payment_failed(payment_intent):
    """Handle failed payment webhook"""
    try:
        payment = Payment.objects.get(stripe_payment_intent_id=payment_intent['id'])
        
        failure_reason = payment_intent.get('last_payment_error', {}).get('message', 'Unknown error')
        payment.mark_as_failed(failure_reason)
        
        # Update payment attempt
        PaymentAttempt.objects.filter(
            user=payment.user,
            plan=payment.plan,
            created_at__gte=timezone.now() - timedelta(minutes=30)
        ).update(success=False, error_message=failure_reason)
        
        logger.info(f"Payment failed for user {payment.user.username}: {failure_reason}")
        
    except Payment.DoesNotExist:
        logger.warning(f"Payment not found for failed intent: {payment_intent['id']}")

def handle_subscription_cancelled(subscription_data):
    """Handle subscription cancellation webhook"""
    try:
        user_subscription = UserSubscription.objects.get(
            stripe_subscription_id=subscription_data['id']
        )
        user_subscription.cancel_subscription()
        logger.info(f"Subscription cancelled for user {user_subscription.user.username}")
    except UserSubscription.DoesNotExist:
        logger.warning(f"Subscription not found: {subscription_data['id']}")

def handle_subscription_updated(subscription_data):
    """Handle subscription update webhook"""
    try:
        user_subscription = UserSubscription.objects.get(
            stripe_subscription_id=subscription_data['id']
        )
        
        # Update subscription status based on Stripe data
        if subscription_data['status'] == 'active':
            user_subscription.is_active = True
        elif subscription_data['status'] in ['canceled', 'incomplete_expired']:
            user_subscription.is_active = False
            user_subscription.cancelled_at = timezone.now()
        
        user_subscription.save()
        logger.info(f"Subscription updated for user {user_subscription.user.username}")
        
    except UserSubscription.DoesNotExist:
        logger.warning(f"Subscription not found: {subscription_data['id']}")

def handle_invoice_payment_succeeded(invoice_data):
    """Handle successful invoice payment (for recurring subscriptions)"""
    customer_id = invoice_data['customer']
    
    try:
        subscription = UserSubscription.objects.get(stripe_customer_id=customer_id)
        
        # Extend subscription for another month
        if subscription.expires_at:
            subscription.expires_at = max(
                subscription.expires_at + timedelta(days=30),
                timezone.now() + timedelta(days=30)
            )
        else:
            subscription.expires_at = timezone.now() + timedelta(days=30)
        
        subscription.is_active = True
        subscription.save()
        
        logger.info(f"Subscription renewed for user {subscription.user.username}")
        
    except UserSubscription.DoesNotExist:
        logger.warning(f"Subscription not found for customer: {customer_id}")

# ==================== ADMIN PAYMENT VIEWS ====================

@user_passes_test(lambda u: u.is_staff)
def admin_payments(request):
    """Admin view for managing payments"""
    # Get filter parameters
    status_filter = request.GET.get('status', '')
    plan_filter = request.GET.get('plan', '')
    search_query = request.GET.get('search', '').strip()
    
    # Start with all payments
    payments = Payment.objects.select_related('user', 'plan').order_by('-created_at')
    
    # Apply filters
    if status_filter:
        payments = payments.filter(status=status_filter)
    
    if plan_filter:
        payments = payments.filter(plan__name=plan_filter)
    
    if search_query:
        payments = payments.filter(
            Q(user__username__icontains=search_query) |
            Q(user__email__icontains=search_query) |
            Q(stripe_payment_intent_id__icontains=search_query)
        )
    
    # Pagination
    paginator = Paginator(payments, 50)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    # Get stats
    total_revenue = Payment.objects.filter(status='succeeded').aggregate(
        total=Sum('amount_cents')
    )['total'] or 0
    
    monthly_revenue = Payment.objects.filter(
        status='succeeded',
        completed_at__gte=timezone.now() - timedelta(days=30)
    ).aggregate(total=Sum('amount_cents'))['total'] or 0
    
    # Get filter options - CHANGE: PaymentPlan -> SubscriptionPlan
    plans = SubscriptionPlan.objects.filter(is_active=True)
    statuses = Payment.PAYMENT_STATUS_CHOICES
    
    context = {
        'page_obj': page_obj,
        'total_revenue': total_revenue / 100,
        'monthly_revenue': monthly_revenue / 100,
        'plans': plans,
        'statuses': statuses,
        'current_filters': {
            'status': status_filter,
            'plan': plan_filter,
            'search': search_query,
        }
    }
    
    return render(request, 'chat/admin/payments.html', context)

@user_passes_test(lambda u: u.is_staff)
def admin_subscriptions(request):
    """Admin view for managing subscriptions"""
    subscriptions = UserSubscription.objects.select_related('user', 'plan').order_by('-created_at')
    
    # Apply filters
    active_filter = request.GET.get('active')
    if active_filter == 'true':
        subscriptions = subscriptions.filter(is_active=True)
    elif active_filter == 'false':
        subscriptions = subscriptions.filter(is_active=False)
    
    # Pagination
    paginator = Paginator(subscriptions, 50)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    # Get stats
    active_subs = UserSubscription.objects.filter(is_active=True).count()
    expired_subs = UserSubscription.objects.filter(is_active=False).count()
    
    context = {
        'page_obj': page_obj,
        'active_subs': active_subs,
        'expired_subs': expired_subs,
        'current_filter': active_filter,
    }
    
    return render(request, 'chat/admin/subscriptions.html', context)