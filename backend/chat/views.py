# backend/chat/views.py

from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth.models import User
from django.contrib import messages
from django.http import JsonResponse, HttpResponseForbidden
from django.core.paginator import Paginator
from django.db.models import Q, Count, F
from django.utils import timezone
from datetime import timedelta
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt
import json

from .models import (
    Room, Message, UserProfile, RoomCategory, Friendship, 
    RoomBookmark, MessageReport, UserActivity
)
from .forms import RoomCreationForm, UserProfileForm, QuickMessageForm

# ==================== MAIN PAGES ====================

def index(request):
    """Enhanced homepage with categories and features"""
    # Get active rooms with related data
    active_rooms = Room.objects.filter(is_public=True).select_related(
        'category', 'creator'
    ).annotate(
        total_messages=Count('messages')
    ).order_by('-last_activity')[:12]
    
    # Get room categories
    categories = RoomCategory.objects.all().order_by('name')
    
    # Create category choices for form
    category_choices = [(cat.slug, cat.name) for cat in categories]
    
    # Get user context if authenticated
    pending_friend_requests_count = 0
    user_created_rooms = False
    
    if request.user.is_authenticated:
        pending_friend_requests_count = Friendship.objects.filter(
            friend=request.user,
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
    
    return render(request, 'chat/index.html', context)

def explore_rooms(request):
    """Enhanced room exploration page"""
    # Get all rooms with filtering
    rooms = Room.objects.filter(is_public=True).select_related(
        'category', 'creator'
    ).annotate(
        total_messages=Count('messages')
    )
    
    # Apply filters
    category = request.GET.get('category')
    search = request.GET.get('search')
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
    
    # Pagination
    paginator = Paginator(rooms, 24)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    # Get categories
    categories = RoomCategory.objects.all().order_by('name')
    
    # Get user context
    pending_friend_requests_count = 0
    if request.user.is_authenticated:
        pending_friend_requests_count = Friendship.objects.filter(
            friend=request.user,
            status='pending'
        ).count()
    
    context = {
        'rooms': page_obj,  # ✅ Change this to match template expectation
        'categories': categories,
        'current_category': category,
        'current_filter': filter_type,
        'search_query': search,
        'pending_friend_requests_count': pending_friend_requests_count,
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
        'user', 'user__userprofile'
    ).order_by('timestamp')
    
    # Update last activity
    room.last_activity = timezone.now()
    room.save(update_fields=['last_activity'])
    
    # Track user activity
    if request.user.is_authenticated:
        UserActivity.objects.create(
            user=request.user,
            room=room,
            action='joined_room'
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
                action='created_room'
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
    )[:10]
    
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
    friendship_status = None
    if request.user.is_authenticated and request.user != profile_user:
        try:
            friendship = Friendship.objects.get(
                Q(user=request.user, friend=profile_user) |
                Q(user=profile_user, friend=request.user)
            )
            friendship_status = friendship.status
        except Friendship.DoesNotExist:
            friendship_status = 'none'
    
    context = {
        'profile_user': profile_user,
        'user_profile': user_profile,
        'user_rooms': user_rooms,
        'friendship_status': friendship_status,
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
    """Friends list and requests"""
    # Get friends
    friends = Friendship.objects.filter(
        Q(user=request.user) | Q(friend=request.user),
        status='accepted'
    ).select_related('user', 'friend', 'user__userprofile', 'friend__userprofile')
    
    # Get pending requests (received)
    pending_requests = Friendship.objects.filter(
        friend=request.user,
        status='pending'
    ).select_related('user', 'user__userprofile')
    
    # Get sent requests
    sent_requests = Friendship.objects.filter(
        user=request.user,
        status='pending'
    ).select_related('friend', 'friend__userprofile')
    
    context = {
        'friends': friends,
        'pending_requests': pending_requests,
        'sent_requests': sent_requests,
        'pending_friend_requests_count': pending_requests.count(),
    }
    
    return render(request, 'chat/friends_list.html', context)

@login_required
@require_http_methods(["POST"])
def send_friend_request(request, username):
    """Send a friend request"""
    friend_user = get_object_or_404(User, username=username)
    
    if friend_user == request.user:
        messages.error(request, "You can't send a friend request to yourself.")
        return redirect('user_profile', username=username)
    
    # Check if friendship already exists
    existing = Friendship.objects.filter(
        Q(user=request.user, friend=friend_user) |
        Q(user=friend_user, friend=request.user)
    ).first()
    
    if existing:
        if existing.status == 'pending':
            messages.info(request, "Friend request already sent.")
        else:
            messages.info(request, "You are already friends.")
    else:
        Friendship.objects.create(
            user=request.user,
            friend=friend_user,
            status='pending'
        )
        messages.success(request, f"Friend request sent to {username}.")
    
    return redirect('user_profile', username=username)

@login_required
@require_http_methods(["POST"])
def respond_friend_request(request, friendship_id):
    """Accept or decline a friend request"""
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
def remove_friend(request, username):
    """Remove a friend"""
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
        Q(friendships_as_user__friend=request.user) |
        Q(friendships_as_friend__user=request.user)
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
    ).order_by('-timestamp')[:100]
    
    return render(request, 'chat/admin/user_activity.html', {'activities': activities})

@user_passes_test(lambda u: u.is_staff)
def admin_user_settings(request):
    """Admin user settings"""
    users = User.objects.select_related('userprofile').annotate(
        room_count=Count('created_rooms')
    ).order_by('-date_joined')
    
    return render(request, 'chat/admin/user_settings.html', {'users': users})

# ==================== API ENDPOINTS ====================

@login_required
def api_user_profile(request):
    """Get user profile data"""
    user_profile, created = UserProfile.objects.get_or_create(user=request.user)
    
    data = {
        'username': request.user.username,
        'bio': user_profile.bio,
        'location': user_profile.location,
        'website': user_profile.website,
        'theme_preference': user_profile.theme_preference,
        'avatar_hair_color': user_profile.avatar_hair_color,
        'avatar_skin_color': user_profile.avatar_skin_color,
    }
    
    return JsonResponse(data)

@login_required
@require_http_methods(["POST"])
def api_update_avatar(request):
    """Update user avatar"""
    try:
        data = json.loads(request.body)
        user_profile, created = UserProfile.objects.get_or_create(user=request.user)
        
        user_profile.avatar_hair_color = data.get('hair_color', user_profile.avatar_hair_color)
        user_profile.avatar_skin_color = data.get('skin_color', user_profile.avatar_skin_color)
        user_profile.save()
        
        return JsonResponse({'success': True})
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)})

@login_required
def api_friends_online(request):
    """Get online friends"""
    # Simplified - you can enhance with real online status
    friends = Friendship.objects.filter(
        Q(user=request.user) | Q(friend=request.user),
        status='accepted'
    ).select_related('user', 'friend')[:10]
    
    friends_data = []
    for friendship in friends:
        friend = friendship.friend if friendship.user == request.user else friendship.user
        friends_data.append({
            'username': friend.username,
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
    
    paginator = Paginator(rooms, 12)
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
    """Privacy policy page"""
    return render(request, 'chat/privacy_policy.html')

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
    ).filter(is_resolved=False).order_by('-created_at')
    
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