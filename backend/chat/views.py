# backend/chat/views.py

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth.models import User
from django.contrib import messages
from django.http import JsonResponse, HttpResponseForbidden
from django.core.paginator import Paginator
from django.db.models import Q, Count, F
from django.shortcuts import render
from django.views.generic import TemplateView
from django.utils import timezone
from datetime import timedelta
from django.views.decorators.http import require_http_methods, require_POST
from django.views.decorators.csrf import csrf_exempt
from django.shortcuts import render
import json

from .models import (
    Room, Message, UserProfile, RoomCategory, Friendship, FriendRequest,
    RoomBookmark, MessageReport, UserActivity
)
from .forms import RoomCreationForm, UserProfileForm, QuickMessageForm

# ==================== MAIN PAGES ====================

def index(request):
    """Enhanced homepage with categories and features"""
    # Get active rooms with related data - Show more rooms on homepage
    active_rooms = Room.objects.filter(is_public=True).select_related(
        'category', 'creator'
    ).annotate(
        total_messages=Count('messages')
    ).order_by('-last_activity')[:20]  # Increased from 12 to 20
    
    # Get room categories
    categories = RoomCategory.objects.all().order_by('name')
    
    # Create category choices for form
    category_choices = [(cat.slug, cat.name) for cat in categories]
    
    # Get user context if authenticated
    pending_friend_requests_count = 0
    user_created_rooms = False
    
    if request.user.is_authenticated:
        pending_friend_requests_count = FriendRequest.objects.filter(
            to_user=request.user,
            status='pending'
        ).count()
        
        user_created_rooms = Room.objects.filter(creator=request.user).exists()
    
    context = {
        'active_rooms': active_rooms,
        'categories': categories,
        'category_choices': category_choices,
        'pending_friend_requests_count': pending_friend_requests_count,
        'user_created_rooms': user_created_rooms,
    }
    
    return render(request, 'chat/room_list.html', context) 

def explore_rooms(request):
    """Enhanced room exploration page - Show ALL rooms"""
    # Get all rooms with filtering
    rooms = Room.objects.filter(is_public=True).select_related(
        'category', 'creator'
    ).annotate(
        total_messages=Count('messages')
    )
    
    # Apply filters
    category = request.GET.get('category')
    search = request.GET.get('q')  # Changed from 'search' to 'q' to match template
    filter_type = request.GET.get('filter', 'all')
    
    if category and category != 'all':
        rooms = rooms.filter(category__slug=category)
    
    if search:
        rooms = rooms.filter(
            Q(name__icontains=search) | 
            Q(display_name__icontains=search) |
            Q(description__icontains=search)
        )
    
    # Apply filter types
    if filter_type == 'trending':
        rooms = rooms.filter(total_messages__gte=20)
    elif filter_type == 'newest':
        week_ago = timezone.now() - timedelta(days=7)
        rooms = rooms.filter(created_at__gte=week_ago)
    elif filter_type == 'popular':
        rooms = rooms.filter(total_messages__gte=10)
    
    # Order by activity
    rooms = rooms.order_by('-last_activity', '-total_messages')
    
    # Increased pagination to show more rooms per page
    paginator = Paginator(rooms, 50)  # Increased from 24 to 50
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    # Get categories
    categories = RoomCategory.objects.all().order_by('name')
    
    # Get user context
    pending_friend_requests_count = 0
    if request.user.is_authenticated:
        pending_friend_requests_count = FriendRequest.objects.filter(
            to_user=request.user,
            status='pending'
        ).count()
    
    context = {
        'rooms': page_obj,
        'categories': categories,
        'current_category': category,
        'current_filter': filter_type,
        'search_query': search,
        'pending_friend_requests_count': pending_friend_requests_count,
        'total_rooms_count': Room.objects.filter(is_public=True).count(),  # Added total count
    }
    
    return render(request, 'chat/room_list.html', context)

def room(request, room_name):
    """Individual room view"""
    room = get_object_or_404(Room, name=room_name)
    
    # Check if room is public or user has access
    if not room.is_public and request.user != room.creator:
        messages.error(request, "You don't have access to this room.")
        return redirect('index')
    
    # Get messages
    messages_list = Message.objects.filter(room=room).select_related(
        'user', 'user__profile'
    ).order_by('timestamp')
    
    # Update last activity
    room.last_activity = timezone.now()
    room.save(update_fields=['last_activity'])
    
    # Track user activity
    if request.user.is_authenticated:
        UserActivity.objects.create(
            user=request.user,
            room=room,
            activity_type='joined_room',
            description=f"Joined {room.display_name or room.name}"
        )
            
    context = {
        'room': room,
        'messages': messages_list,
        'message_form': QuickMessageForm(),
    }
    
    return render(request, 'chat/room_3d.html', context)

@login_required
def create_room(request):
    """Create a new room"""
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
            
            messages.success(request, f'Room "{room.display_name}" created successfully!')
            return redirect('room', room_name=room.name)
        else:
            messages.error(request, 'Please correct the errors below.')
    else:
        form = RoomCreationForm()
    
    return render(request, 'chat/create_room.html', {'form': form})

def search_rooms(request):
    """Search rooms with AJAX support"""
    query = request.GET.get('q', '').strip()
    
    if not query:
        return JsonResponse({'rooms': []})
    
    rooms = Room.objects.filter(
        Q(name__icontains=query) | 
        Q(display_name__icontains=query) |
        Q(description__icontains=query),
        is_public=True
    ).select_related('category', 'creator').annotate(
        total_messages=Count('messages')
    )[:20]  # Increased search results from 10 to 20
    
    rooms_data = [{
        'name': room.name,
        'display_name': room.display_name,
        'description': room.description or '',
        'category': room.category.name if room.category else '',
        'creator': room.creator.username,
        'message_count': room.total_messages,
        'url': f'/room/{room.name}/',
    } for room in rooms]
    
    if request.headers.get('Content-Type') == 'application/json':
        return JsonResponse({'rooms': rooms_data})
    
    return render(request, 'chat/search_results.html', {
        'rooms': rooms,
        'query': query
    })

# ==================== PROFILE VIEWS ====================

def user_profile(request, username):
    """User profile view"""
    profile_user = get_object_or_404(User, username=username)
    user_profile, created = UserProfile.objects.get_or_create(user=profile_user)
    
    # Get user's rooms
    user_rooms = Room.objects.filter(creator=profile_user, is_public=True).annotate(
        total_messages=Count('messages')
    )[:6]
    
    # Check friendship status
    friendship_status = 'none'
    can_send_request = True
    
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
    
    context = {
        'profile_user': profile_user,
        'user_profile': user_profile,
        'user_rooms': user_rooms,
        'friendship_status': friendship_status,
        'can_send_request': can_send_request,
    }
    
    return render(request, 'chat/user_profile.html', context)

@login_required
def edit_profile(request, username):
    """Edit user profile"""
    if request.user.username != username:
        return HttpResponseForbidden()
    
    user_profile, created = UserProfile.objects.get_or_create(user=request.user)
    
    if request.method == 'POST':
        form = UserProfileForm(request.POST, instance=user_profile)
        if form.is_valid():
            form.save()
            messages.success(request, 'Profile updated successfully!')
            return redirect('user_profile', username=username)
    else:
        form = UserProfileForm(instance=user_profile)
    
    return render(request, 'chat/edit_profile.html', {
        'form': form,
        'user_profile': user_profile
    })

@login_required
def profile_settings(request):
    """User profile settings"""
    user_profile, created = UserProfile.objects.get_or_create(user=request.user)
    
    if request.method == 'POST':
        form = UserProfileForm(request.POST, instance=user_profile)
        if form.is_valid():
            form.save()
            messages.success(request, 'Settings updated successfully!')
            return redirect('profile_settings')
    else:
        form = UserProfileForm(instance=user_profile)
    
    context = {
        'form': form,
        'user_profile': user_profile,
    }
    
    return render(request, 'chat/profile_settings.html', context)

# ==================== FRIEND VIEWS ====================

@login_required
def friends_list(request):
    """Display user's friends and friend requests"""
    
    # Get user's current friends
    friends = Friendship.get_friends(request.user)
    
    # Get pending friend requests (received)
    pending_requests = FriendRequest.objects.filter(
        to_user=request.user,
        status='pending'
    ).select_related('from_user__profile')
    
    # Get sent friend requests
    sent_requests = FriendRequest.objects.filter(
        from_user=request.user,
        status='pending'
    ).select_related('to_user__profile')
    
    context = {
        'friends': friends,
        'pending_requests': pending_requests,
        'sent_requests': sent_requests,
    }
    
    return render(request, 'chat/friends_list.html', context)

@login_required
@require_POST
def send_friend_request(request, user_id):
    """Send a friend request to another user"""
    try:
        to_user = get_object_or_404(User, id=user_id)
        
        # Check if trying to send to self
        if to_user == request.user:
            messages.error(request, "You can't send a friend request to yourself!")
            return redirect('friends_list')
        
        # Check if already friends
        if Friendship.are_friends(request.user, to_user):
            messages.info(request, f"You are already friends with {to_user.username}!")
            return redirect('friends_list')
        
        # Check if request already exists
        existing_request = FriendRequest.objects.filter(
            Q(from_user=request.user, to_user=to_user) |
            Q(from_user=to_user, to_user=request.user),
            status='pending'
        ).first()
        
        if existing_request:
            messages.info(request, "A friend request already exists between you and this user.")
            return redirect('friends_list')
        
        # Create friend request
        friend_request = FriendRequest.objects.create(
            from_user=request.user,
            to_user=to_user
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
        
        # Accept the request
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
        
        # Remove friendship
        Friendship.objects.filter(
            Q(user=request.user, friend=friend) |
            Q(user=friend, friend=request.user)
        ).delete()
        
        messages.success(request, f"You are no longer friends with {friend.username}.")
        return redirect('friends_list')
        
    except Exception as e:
        messages.error(request, "An error occurred while removing the friend.")
        return redirect('friends_list')

@login_required
@require_http_methods(["POST"])
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
        to_user=friend_user
    )
    messages.success(request, f"Friend request sent to {username}.")
    
    return redirect('user_profile', username=username)

@login_required
@require_http_methods(["POST"])
def respond_friend_request(request, friendship_id):
    """Accept or decline a friend request (legacy method)"""
    friendship = get_object_or_404(Friendship, id=friendship_id, friend=request.user)
    action = request.POST.get('action')
    
    if action == 'accept':
        friendship.status = 'accepted'
        friendship.save()
        messages.success(request, f"You are now friends with {friendship.user.username}.")
    elif action == 'decline':
        friendship.delete()
        messages.info(request, "Friend request declined.")
    
    return redirect('friends_list')

@login_required
@require_http_methods(["POST"])
def remove_friend_by_username(request, username):
    """Remove a friend by username"""
    friend_user = get_object_or_404(User, username=username)
    
    friendship = Friendship.objects.filter(
        Q(user=request.user, friend=friend_user) |
        Q(user=friend_user, friend=request.user),
        status='accepted'
    ).first()
    
    if friendship:
        friendship.delete()
        messages.success(request, f"Removed {username} from friends.")
    
    return redirect('friends_list')

@login_required
def friend_suggestions(request):
    """Friend suggestions based on mutual friends"""
    # This is a simplified version - you can enhance the algorithm
    suggestions = User.objects.exclude(
        id=request.user.id
    ).exclude(
        Q(friendships__friend=request.user) |
        Q(friend_of__user=request.user)
    )[:10]
    
    return render(request, 'chat/friend_suggestions.html', {
        'suggestions': suggestions
    })

# ==================== ADMIN VIEWS ====================

@user_passes_test(lambda u: u.is_staff)
def admin_dashboard(request):
    """Admin dashboard"""
    stats = {
        'total_users': User.objects.count(),
        'total_rooms': Room.objects.count(),
        'total_messages': Message.objects.count(),
        'active_users_today': User.objects.filter(
            last_login__gte=timezone.now() - timedelta(days=1)
        ).count(),
        'public_rooms': Room.objects.filter(is_public=True).count(),  # Added public rooms count
        'private_rooms': Room.objects.filter(is_public=False).count(),  # Added private rooms count
        'pending_friend_requests': FriendRequest.objects.filter(status='pending').count(),
    }
    
    recent_rooms = Room.objects.select_related('creator').order_by('-created_at')[:5]
    recent_reports = MessageReport.objects.select_related(
        'reporter', 'message'
    ).order_by('-created_at')[:5]
    
    context = {
        'stats': stats,
        'recent_rooms': recent_rooms,
        'recent_reports': recent_reports,
    }
    
    return render(request, 'chat/admin/dashboard.html', context)

@user_passes_test(lambda u: u.is_staff)
def admin_rooms(request):
    """Admin room management"""
    rooms = Room.objects.select_related('creator', 'category').annotate(
        total_messages=Count('messages')
    ).order_by('-created_at')
    
    return render(request, 'chat/admin/rooms.html', {'rooms': rooms})

@user_passes_test(lambda u: u.is_staff)
def admin_messages(request):
    """Admin message management"""
    messages_list = Message.objects.select_related(
        'user', 'room'
    ).order_by('-timestamp')
    
    paginator = Paginator(messages_list, 50)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    return render(request, 'chat/admin/messages.html', {'messages': page_obj})

@user_passes_test(lambda u: u.is_staff)
def admin_user_activity(request):
    """Admin user activity monitoring"""
    activities = UserActivity.objects.select_related(
        'user', 'room'
    ).order_by('-created_at')[:100]  # Fixed field name from timestamp to created_at
    
    return render(request, 'chat/admin/user_activity.html', {'activities': activities})

@user_passes_test(lambda u: u.is_staff)
def admin_user_settings(request):
    """Admin user settings"""
    users = User.objects.select_related('profile').annotate(
        room_count=Count('created_rooms')
    ).order_by('-date_joined')
    
    return render(request, 'chat/admin/user_settings.html', {'users': users})

# ==================== API ENDPOINTS ====================

@login_required
def api_user_profile(request):
    """Get user profile data"""
    user_profile, created = UserProfile.objects.get_or_create(user=request.user)
    
    # Fixed field names to match the model
    data = {
        'username': request.user.username,
        'bio': user_profile.bio,
        'location': user_profile.location,
        'website': user_profile.website,
        'theme': user_profile.theme,  # Fixed field name
        'avatar_customization': user_profile.avatar_customization,  # Updated to use JSON field
    }
    
    return JsonResponse(data)

@login_required
@require_http_methods(["POST"])
def api_update_avatar(request):
    """Update user avatar"""
    try:
        data = json.loads(request.body)
        user_profile, created = UserProfile.objects.get_or_create(user=request.user)
        
        # Update avatar customization JSON field
        current_avatar = user_profile.avatar_customization or {}
        current_avatar.update(data)
        user_profile.avatar_customization = current_avatar
        user_profile.save()
        
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@login_required
def api_friends_online(request):
    """Get online friends"""
    # Simplified - you can enhance with real online status
    friends = Friendship.objects.filter(
        user=request.user,
        status='accepted'
    ).select_related('friend', 'friend__profile')[:10]
    
    friends_data = []
    for friendship in friends:
        friends_data.append({
            'username': friendship.friend.username,
            'status': 'online',  # You can implement real status tracking
        })
    
    return JsonResponse({'friends': friends_data})

def api_load_more_rooms(request):
    """Load more rooms for infinite scroll"""
    page = int(request.GET.get('page', 1))
    category = request.GET.get('category', 'all')
    
    rooms = Room.objects.filter(is_public=True).select_related('category', 'creator')
    
    if category != 'all':
        rooms = rooms.filter(category__slug=category)
    
    paginator = Paginator(rooms, 20)  # Increased from 12 to 20
    page_obj = paginator.get_page(page)
    
    rooms_data = [{
        'name': room.name,
        'display_name': room.display_name,
        'description': room.description or '',
        'creator': room.creator.username,
        'url': f'/room/{room.name}/',
    } for room in page_obj]
    
    return JsonResponse({
        'rooms': rooms_data,
        'has_next': page_obj.has_next(),
        'next_page': page_obj.next_page_number() if page_obj.has_next() else None,
    })

def api_search_rooms(request):
    """API endpoint for room search"""
    return search_rooms(request)

# ==================== UTILITY VIEWS ====================

def privacy_policy(request):
    """Privacy policy page view"""
    context = {
        'page_title': 'Privacy Policy - Euphorie, Inc.',
        'meta_description': 'Learn how Euphorie, Inc. protects your privacy and handles your data in our comprehensive privacy policy',
        'site_name': 'Euphorie',
        'privacy_policy_last_updated': 'June 17, 2025',
        'privacy_email': 'privacy@euphorieinc.com',
        'support_email': 'euphorieinc@gmail.com',
        'billing_email': None,  # Set to None or remove if not used
        'debug': True,  # Your template checks for this
        # Add base template variables if needed
        'pending_friend_requests_count': 0,
        'user_created_rooms': False,
    }
    return render(request, 'chat/privacy_policy.html', context)

def terms_of_service(request):
    """Terms of service page"""
    return render(request, 'chat/terms_of_service.html')

# ==================== MODERATION ====================

@login_required
@require_http_methods(["POST"])
def report_message(request, message_id):
    """Report a message"""
    message = get_object_or_404(Message, id=message_id)
    reason = request.POST.get('reason', 'inappropriate')
    
    report, created = MessageReport.objects.get_or_create(
        reporter=request.user,
        message=message,
        defaults={'reason': reason}
    )
    
    if created:
        messages.success(request, 'Message reported. Thank you for helping keep our community safe.')
    else:
        messages.info(request, 'You have already reported this message.')
    
    return redirect('room', room_name=message.room.name)

@login_required
@require_http_methods(["POST"])
def report_user(request, username):
    """Report a user"""
    reported_user = get_object_or_404(User, username=username)
    reason = request.POST.get('reason', 'inappropriate')
    
    # You can create a UserReport model similar to MessageReport
    messages.success(request, 'User reported. Thank you for the report.')
    return redirect('user_profile', username=username)

@user_passes_test(lambda u: u.is_staff)
def moderation_dashboard(request):
    """Moderation dashboard for staff"""
    reports = MessageReport.objects.select_related(
        'reporter', 'message', 'message__user', 'message__room'
    ).filter(status='pending').order_by('-created_at')  # Fixed field name
    
    return render(request, 'chat/admin/moderation.html', {'reports': reports})

# ==================== ROOM ACTIONS ====================

@login_required
@require_http_methods(["POST"])
def bookmark_room(request, room_id):
    """Bookmark or unbookmark a room"""
    room = get_object_or_404(Room, id=room_id)
    
    bookmark, created = RoomBookmark.objects.get_or_create(
        user=request.user,
        room=room
    )
    
    if not created:
        bookmark.delete()
        action = 'removed'
    else:
        action = 'added'
    
    return JsonResponse({'action': action})

def room_categories(request):
    """Get all room categories"""
    categories = RoomCategory.objects.all().order_by('name')
    categories_data = [{
        'slug': cat.slug,
        'name': cat.name,
        'icon': cat.icon,
        'description': cat.description,
    } for cat in categories]
    
    return JsonResponse({'categories': categories_data})

def trending_rooms(request):
    """Get trending rooms"""
    trending = Room.objects.filter(is_public=True).annotate(
        total_messages=Count('messages')
    ).filter(total_messages__gte=20).order_by('-total_messages')[:10]
    
    return render(request, 'chat/trending_rooms.html', {'rooms': trending})

# ==================== DEBUG VIEW (TEMPORARY) ====================

def debug_rooms(request):
    """Debug view to check room counts - REMOVE IN PRODUCTION"""
    if not request.user.is_staff:
        return HttpResponseForbidden()
    
    stats = {
        'total_rooms': Room.objects.count(),
        'public_rooms': Room.objects.filter(is_public=True).count(),
        'private_rooms': Room.objects.filter(is_public=False).count(),
        'rooms_by_category': {},
    }
    
    # Get rooms by category
    for category in RoomCategory.objects.all():
        stats['rooms_by_category'][category.name] = Room.objects.filter(
            category=category, is_public=True
        ).count()
    
    # Get rooms without category
    stats['rooms_by_category']['No Category'] = Room.objects.filter(
        category__isnull=True, is_public=True
    ).count()
    
    # Get all rooms
    all_rooms = Room.objects.all().order_by('name')
    
    return JsonResponse({
        'stats': stats,
        'rooms': [{
            'name': room.name,
            'display_name': room.display_name,
            'is_public': room.is_public,
            'category': room.category.name if room.category else None,
            'creator': room.creator.username if room.creator else None,
        } for room in all_rooms]
    }, json_dumps_params={'indent': 2})

# ==================== AUTHENTICATION VIEWS ====================
# Note: You might want to use Django's built-in auth views or django-allauth
# These are simplified examples

def user_login(request):
    """Login view - you might want to use Django's built-in LoginView"""
    if request.user.is_authenticated:
        return redirect('index')
    
    # Use Django's built-in authentication
    from django.contrib.auth import authenticate, login
    
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        
        user = authenticate(request, username=username, password=password)
        if user:
            login(request, user)
            next_url = request.GET.get('next', 'index')
            return redirect(next_url)
        else:
            messages.error(request, 'Invalid credentials.')
    
    return render(request, 'registration/login.html')

def user_signup(request):
    """Signup view"""
    if request.user.is_authenticated:
        return redirect('index')
    
    from django.contrib.auth.forms import UserCreationForm
    from django.contrib.auth import login
    
    if request.method == 'POST':
        form = UserCreationForm(request.POST)
        if form.is_valid():
            user = form.save()
            login(request, user)
            messages.success(request, 'Account created successfully!')
            return redirect('index')
    else:
        form = UserCreationForm()
    
    return render(request, 'registration/signup.html', {'form': form})

@login_required
def user_logout(request):
    """Logout view"""
    from django.contrib.auth import logout
    logout(request)
    messages.success(request, 'You have been logged out.')
    return redirect('index')