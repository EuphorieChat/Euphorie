# backend/chat/views.py

from datetime import datetime, timedelta

from django.contrib import messages
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.auth.decorators import login_required, user_passes_test
from django.contrib.auth.models import User
from django.core.paginator import Paginator
from django.db.models import Q, Count, F, Max
from django.http import JsonResponse, HttpResponseForbidden
from django.shortcuts import render, redirect, get_object_or_404
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods, require_POST
from django.views.generic import TemplateView

from .models import Room, Message, UserProfile

# FIXED: Import all the models your views reference
from .models import (
    Room, Message, UserProfile, RoomCategory, Friendship, 
    RoomBookmark, MessageReport, UserActivity, FriendRequest  # Added FriendRequest
)
from .forms import RoomCreationForm, UserProfileForm, QuickMessageForm

# ==================== MAIN PAGES ====================

def index(request):
    """
    Homepage view that shows room exploration interface
    """
    try:
        # Get all rooms with related data for better performance
        rooms = Room.objects.select_related('creator', 'category').annotate(
            total_messages=F('message_count'),  # Use existing message_count field
            last_message_time=Max('messages__timestamp')  # Use messages (plural)
        ).order_by('-last_activity', '-message_count')
        
        # Get categories for the filter bar
        categories = RoomCategory.objects.filter(is_active=True).order_by('sort_order', 'name')
        
        # Handle search if query parameter exists
        search_query = request.GET.get('q', '').strip()
        if search_query:
            rooms = rooms.filter(
                Q(name__icontains=search_query) |
                Q(display_name__icontains=search_query) |
                Q(description__icontains=search_query) |
                Q(tags__icontains=search_query)  # Added tags search
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
        
        # Limit results for performance
        rooms = rooms[:50]
        
        context = {
            'rooms': rooms,
            'categories': categories,
            'search_query': search_query,
            'current_category': category_filter,
            'current_sort': sort_option,
            'total_rooms': Room.objects.filter(is_public=True).count(),
            'total_users': User.objects.count(),
            'total_messages': Message.objects.count(),  # More efficient than sum
        }
        
        return render(request, 'chat/room_list.html', context)
        
    except Exception as e:
        # Enhanced error handling
        if request.user.is_staff:
            error_msg = f"Database error: {str(e)}"
        else:
            error_msg = "Sorry, we're experiencing technical difficulties. Please try again later."
            
        context = {
            'rooms': [],
            'categories': [],
            'error': error_msg,
            'search_query': '',
            'current_category': '',
            'current_sort': 'activity',
            'total_rooms': 0,
            'total_users': 0,
            'total_messages': 0,
        }
        return render(request, 'chat/room_list.html', context)

def room(request, room_name):
    """Individual room view with enhanced features"""
    room = get_object_or_404(Room, name=room_name)
    
    # Check if room is public or user has access
    if not room.is_public and request.user != room.creator:
        messages.error(request, "You don't have access to this room.")
        return redirect('index')
    
    # Get messages with pagination for better performance
    messages_list = Message.objects.filter(
        room=room, 
        is_deleted=False  # Don't show deleted messages
    ).select_related(
        'user', 'user__profile'
    ).order_by('-timestamp')[:100]  # Limit recent messages
    
    # Reverse for display (oldest first)
    messages_list = list(reversed(messages_list))
    
    # Update last activity and increment active users
    room.last_activity = timezone.now()
    if request.user.is_authenticated:
        # Simple active user tracking (you might want to implement this differently)
        room.active_users_count = F('active_users_count') + 1
    room.save(update_fields=['last_activity'])
    
    # Track user activity
    if request.user.is_authenticated:
        UserActivity.objects.create(
            user=request.user,
            room=room,
            activity_type='joined_room',
            description=f"Joined {room.display_name or room.name}"
        )
        
        # Check if user has bookmarked this room
        is_bookmarked = RoomBookmark.objects.filter(
            user=request.user, room=room
        ).exists()
    else:
        is_bookmarked = False
            
    context = {
        'room': room,
        'messages': messages_list,
        'message_form': QuickMessageForm(),
        'is_bookmarked': is_bookmarked,
        'room_tags': room.get_tags_list(),
    }
    
    return render(request, 'chat/room_3d.html', context)

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
    """Enhanced search rooms with better filtering"""
    query = request.GET.get('q', '').strip()
    category = request.GET.get('category', '')
    
    if not query:
        return JsonResponse({'rooms': []})
    
    # Build search query
    rooms = Room.objects.filter(is_public=True).select_related('category', 'creator')
    
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
    } for room in rooms]
    
    if request.headers.get('Content-Type') == 'application/json':
        return JsonResponse({'rooms': rooms_data})
    
    return render(request, 'chat/search_results.html', {
        'rooms': rooms,
        'query': query
    })

# ==================== PROFILE VIEWS ====================

def user_profile(request, username):
    """Enhanced user profile view"""
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
    """Enhanced friend suggestions"""
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
    
    suggestions = User.objects.exclude(
        id__in=excluded_user_ids
    ).select_related('profile').filter(
        profile__allow_friend_requests=True
    )[:10]
    
    return render(request, 'chat/friend_suggestions.html', {
        'suggestions': suggestions
    })

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
    user = request.user
    
    # You can add logic here to handle form submissions
    if request.method == 'POST':
        # Handle settings updates
        pass
    
    context = {
        'user': user,
        # Add any other context you need
    }
    
    return render(request, 'chat/settings.html', context)

# ==================== ADMIN VIEWS ====================

@user_passes_test(lambda u: u.is_staff)
def admin_dashboard(request):
    """Enhanced admin dashboard"""
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
    }
    
    # Recent activity
    recent_rooms = Room.objects.select_related('creator', 'category').order_by('-created_at')[:5]
    recent_reports = MessageReport.objects.select_related(
        'reporter', 'message', 'message__user'
    ).order_by('-created_at')[:5]
    recent_users = User.objects.select_related('profile').order_by('-date_joined')[:5]
    
    context = {
        'stats': stats,
        'recent_rooms': recent_rooms,
        'recent_reports': recent_reports,
        'recent_users': recent_users,
    }
    
    return render(request, 'chat/admin/dashboard.html', context)

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
def admin_user_activity(request):
    """Enhanced admin user activity monitoring"""
    activities = UserActivity.objects.select_related(
        'user', 'room'
    ).order_by('-created_at')
    
    # Filter by activity type
    activity_type = request.GET.get('type', '')
    if activity_type:
        activities = activities.filter(activity_type=activity_type)
    
    # Pagination
    paginator = Paginator(activities, 100)
    page_number = request.GET.get('page')
    page_obj = paginator.get_page(page_number)
    
    # Get activity types for filter
    activity_types = UserActivity.ACTIVITY_TYPES
    
    return render(request, 'chat/admin/user_activity.html', {
        'activities': page_obj,
        'activity_types': activity_types,
        'current_type': activity_type
    })

@user_passes_test(lambda u: u.is_staff)
def admin_user_settings(request):
    """Enhanced admin user settings"""
    users = User.objects.select_related('profile').annotate(
        room_count=Count('created_rooms'),
        message_count=Count('message_set'),
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
        })
    
    return JsonResponse({'friends': friends_data})

def api_load_more_rooms(request):
    """Load more rooms for infinite scroll"""
    page = int(request.GET.get('page', 1))
    category = request.GET.get('category', 'all')
    sort_by = request.GET.get('sort', 'activity')
    
    rooms = Room.objects.filter(is_public=True).select_related('category', 'creator')
    
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
    } for room in page_obj]
    
    return JsonResponse({
        'rooms': rooms_data,
        'has_next': page_obj.has_next(),
        'next_page': page_obj.next_page_number() if page_obj.has_next() else None,
        'total_pages': paginator.num_pages,
    })

def api_search_rooms(request):
    """API endpoint for room search"""
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

# ==================== EXPLORE ROOMS ====================

def explore_rooms(request):
    """Dedicated room exploration page with enhanced features"""
    # This is essentially the same as index but can be customized differently
    return index(request)

@staff_member_required
def admin_dashboard(request):
    # Get stats for the dashboard
    total_rooms = Room.objects.count()
    total_messages = Message.objects.count()
    total_users = User.objects.count()
    
    # Get messages from last 24 hours
    yesterday = datetime.now() - timedelta(days=1)
    messages_24h = Message.objects.filter(timestamp__gte=yesterday).count()
    
    # Get most active rooms (rooms with most messages)
    rooms = Room.objects.annotate(
        messages_count=Count('messages')
    ).order_by('-messages_count')[:10]
    
    # Get recent messages
    recent_messages = Message.objects.select_related(
        'user', 'room'
    ).order_by('-timestamp')[:20]
    
    context = {
        'total_rooms': total_rooms,
        'total_messages': total_messages,
        'total_users': total_users,
        'messages_24h': messages_24h,
        'rooms': rooms,
        'recent_messages': recent_messages,
    }
    
    return render(request, 'chat/admin_dashboard.html', context)