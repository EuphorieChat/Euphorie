from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import user_passes_test
from django.contrib import messages
from django.db.models import Count, Q
from django.http import JsonResponse
from django.urls import reverse
from django.core.paginator import Paginator
from django.utils import timezone
from datetime import timedelta

from .models import Room, Message, Category, Reaction

# Helper function to check if user is an admin
def is_admin(user):
    return user.is_authenticated and user.is_staff

# Admin dashboard
@user_passes_test(is_admin)
def admin_dashboard(request):
    # Get basic stats
    total_rooms = Room.objects.count()
    total_messages = Message.objects.count()
    total_users = Message.objects.values('user').distinct().count()

    # Get rooms with message counts - using messages_count to avoid conflict with property
    rooms = Room.objects.annotate(
        messages_count=Count('messages')
    ).order_by('-messages_count')[:10]

    # Get recent messages
    recent_messages = Message.objects.select_related(
        'user', 'room'
    ).order_by('-timestamp')[:20]

    # Messages in the last 24 hours
    day_ago = timezone.now() - timedelta(days=1)
    messages_24h = Message.objects.filter(timestamp__gte=day_ago).count()

    # Active rooms in the last 24 hours
    active_rooms_24h = Message.objects.filter(
        timestamp__gte=day_ago
    ).values('room').distinct().count()

    context = {
        'total_rooms': total_rooms,
        'total_messages': total_messages,
        'total_users': total_users,
        'messages_24h': messages_24h,
        'active_rooms_24h': active_rooms_24h,
        'rooms': rooms,
        'recent_messages': recent_messages,
    }

    return render(request, 'chat/manage/dashboard.html', context)

# Room management
@user_passes_test(is_admin)
def admin_rooms(request):
    # Using messages_count to avoid conflict with property
    rooms = Room.objects.annotate(
        messages_count=Count('messages')
    ).order_by('-created_at')

    # Search functionality
    search_query = request.GET.get('search', '')
    if search_query:
        rooms = rooms.filter(
            Q(name__icontains=search_query) |
            Q(display_name__icontains=search_query) |
            Q(creator__username__icontains=search_query)
        )

    # Pagination
    paginator = Paginator(rooms, 20)  # 20 rooms per page
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)

    context = {
        'page_obj': page_obj,
        'search_query': search_query,
    }

    return render(request, 'chat/manage/rooms.html', context)

# Room detail view with messages
@user_passes_test(is_admin)
def admin_room_detail(request, room_name):
    room = get_object_or_404(Room, name=room_name)

    # Get messages for this room
    messages_list = Message.objects.filter(
        room=room
    ).select_related('user').order_by('-timestamp')

    # Search functionality
    search_query = request.GET.get('search', '')
    if search_query:
        messages_list = messages_list.filter(
            Q(content__icontains=search_query) |
            Q(user__username__icontains=search_query)
        )

    # Pagination
    paginator = Paginator(messages_list, 50)  # 50 messages per page
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)

    context = {
        'room': room,
        'page_obj': page_obj,
        'search_query': search_query,
        'message_count': messages_list.count(),
    }

    return render(request, 'chat/manage/room_detail.html', context)

# Delete message
@user_passes_test(is_admin)
def admin_delete_message(request, message_id):
    message = get_object_or_404(Message, id=message_id)
    room_name = message.room.name

    if request.method == 'POST':
        # Delete all reactions to this message first
        Reaction.objects.filter(message=message).delete()

        # Then delete the message
        message.delete()

        messages.success(request, f"Message ID {message_id} has been deleted.")

        # Redirect back to room detail
        return redirect('admin_room_detail', room_name=room_name)

    # If GET request, show confirmation page
    return render(request, 'chat/manage/confirm_delete_message.html', {'message': message})

# Delete multiple messages
@user_passes_test(is_admin)
def admin_delete_selected_messages(request):
    if request.method == 'POST':
        message_ids = request.POST.getlist('message_ids')
        room_name = request.POST.get('room_name')

        if message_ids:
            # Delete reactions first
            Reaction.objects.filter(message__id__in=message_ids).delete()

            # Then delete messages
            deleted_count = Message.objects.filter(id__in=message_ids).delete()[0]

            messages.success(request, f"{deleted_count} messages have been deleted.")

        # Redirect back to room detail
        return redirect('admin_room_detail', room_name=room_name)

    # If not POST, redirect to rooms list
    return redirect('admin_rooms')

# Delete all messages in a room
@user_passes_test(is_admin)
def admin_clear_room(request, room_name):
    room = get_object_or_404(Room, name=room_name)

    if request.method == 'POST':
        # Delete all reactions in this room first
        Reaction.objects.filter(message__room=room).delete()

        # Then delete all messages
        message_count = Message.objects.filter(room=room).count()
        Message.objects.filter(room=room).delete()

        messages.success(request, f"All {message_count} messages in room '{room.display_name}' have been deleted.")

        # Redirect back to room detail
        return redirect('admin_room_detail', room_name=room_name)

    # If GET request, show confirmation page
    return render(request, 'chat/manage/confirm_clear_room.html', {'room': room})

# Delete a room completely
@user_passes_test(is_admin)
def admin_delete_room(request, room_name):
    room = get_object_or_404(Room, name=room_name)

    if request.method == 'POST':
        room_display_name = room.display_name

        # Room deletion will cascade to delete messages and reactions
        room.delete()

        messages.success(request, f"Room '{room_display_name}' has been deleted.")

        # Redirect to rooms list
        return redirect('admin_rooms')

    # If GET request, show confirmation page
    return render(request, 'chat/manage/confirm_delete_room.html', {'room': room})

# Message management across all rooms
@user_passes_test(is_admin)
def admin_messages(request):
    messages_list = Message.objects.select_related(
        'user', 'room'
    ).order_by('-timestamp')

    # Search functionality
    search_query = request.GET.get('search', '')
    if search_query:
        messages_list = messages_list.filter(
            Q(content__icontains=search_query) |
            Q(user__username__icontains=search_query) |
            Q(room__name__icontains=search_query) |
            Q(room__display_name__icontains=search_query)
        )

    # Filter by timeframe
    time_filter = request.GET.get('timeframe', '')
    if time_filter:
        time_threshold = timezone.now()

        if time_filter == 'day':
            time_threshold = time_threshold - timedelta(days=1)
        elif time_filter == 'week':
            time_threshold = time_threshold - timedelta(weeks=1)
        elif time_filter == 'month':
            time_threshold = time_threshold - timedelta(days=30)

        messages_list = messages_list.filter(timestamp__gte=time_threshold)

    # Pagination
    paginator = Paginator(messages_list, 50)  # 50 messages per page
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)

    context = {
        'page_obj': page_obj,
        'search_query': search_query,
        'time_filter': time_filter,
        'message_count': messages_list.count(),
    }

    return render(request, 'chat/manage/messages.html', context)

# AJAX endpoint to handle mass message deletion
@user_passes_test(is_admin)
def admin_delete_messages_ajax(request):
    if request.method == 'POST' and request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        message_ids = request.POST.getlist('message_ids')

        if message_ids:
            # Delete reactions first
            Reaction.objects.filter(message__id__in=message_ids).delete()

            # Then delete messages
            deleted_count = Message.objects.filter(id__in=message_ids).delete()[0]

            return JsonResponse({
                'success': True,
                'message': f"{deleted_count} messages have been deleted.",
                'deleted_count': deleted_count
            })

        return JsonResponse({
            'success': False,
            'message': "No messages selected for deletion."
        })

    return JsonResponse({
        'success': False,
        'message': "Invalid request."
    }, status=400)

# Filter messages by keywords
@user_passes_test(is_admin)
def admin_filter_messages(request):
    keywords = request.GET.get('keywords', '').strip()

    if not keywords:
        return redirect('admin_messages')

    messages_list = Message.objects.filter(
        content__icontains=keywords
    ).select_related('user', 'room').order_by('-timestamp')

    # Pagination
    paginator = Paginator(messages_list, 50)  # 50 messages per page
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)

    context = {
        'page_obj': page_obj,
        'keywords': keywords,
        'message_count': messages_list.count(),
        'filter_active': True,
    }

    return render(request, 'chat/manage/messages.html', context)

# Admin user activity monitoring
@user_passes_test(is_admin)
def admin_user_activity(request):
    # Get users with message counts - using messages_count to avoid conflicts
    active_users = Message.objects.values(
        'user__username', 'user__id'
    ).annotate(
        messages_count=Count('id')  # Changed from message_count to messages_count
    ).order_by('-messages_count')[:100]

    # Get recent user activity
    day_ago = timezone.now() - timedelta(days=1)
    week_ago = timezone.now() - timedelta(weeks=1)

    day_activity = Message.objects.filter(
        timestamp__gte=day_ago
    ).values('user__username').annotate(
        count=Count('id')
    ).order_by('-count')[:10]

    week_activity = Message.objects.filter(
        timestamp__gte=week_ago
    ).values('user__username').annotate(
        count=Count('id')
    ).order_by('-count')[:10]

    context = {
        'active_users': active_users,
        'day_activity': day_activity,
        'week_activity': week_activity,
    }

    return render(request, 'chat/manage/user_activity.html', context)

# View all messages by a specific user
@user_passes_test(is_admin)
def admin_user_messages(request, user_id):
    from django.contrib.auth.models import User

    user = get_object_or_404(User, id=user_id)

    messages_list = Message.objects.filter(
        user=user
    ).select_related('room').order_by('-timestamp')

    # Search functionality
    search_query = request.GET.get('search', '')
    if search_query:
        messages_list = messages_list.filter(
            Q(content__icontains=search_query) |
            Q(room__name__icontains=search_query)
        )

    # Pagination
    paginator = Paginator(messages_list, 50)  # 50 messages per page
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)

    context = {
        'user_profile': user,
        'page_obj': page_obj,
        'search_query': search_query,
        'message_count': messages_list.count(),
    }

    return render(request, 'chat/manage/user_messages.html', context)

# Export chat history to CSV
@user_passes_test(is_admin)
def admin_export_chat(request, room_name):
    import csv
    from django.http import HttpResponse

    room = get_object_or_404(Room, name=room_name)

    # Get all messages for this room
    messages_list = Message.objects.filter(
        room=room
    ).select_related('user').order_by('timestamp')

    # Create CSV response
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="{room.name}_chat_export.csv"'

    writer = csv.writer(response)
    writer.writerow(['Timestamp', 'Username', 'Message Content'])

    for message in messages_list:
        writer.writerow([
            message.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
            message.user.username,
            message.content
        ])

    return response

# Simple test view to debug authentication issues
def admin_test(request):
    """A simple test view to check authentication status"""
    context = {
        'username': request.user.username,
        'is_authenticated': request.user.is_authenticated,
        'is_staff': getattr(request.user, 'is_staff', False),
        'is_admin_result': is_admin(request.user),
    }
    from django.http import HttpResponse
    return HttpResponse(f"""
        <h1>Admin Authentication Test</h1>
        <p>Username: {request.user.username}</p>
        <p>Is authenticated: {request.user.is_authenticated}</p>
        <p>Is staff: {getattr(request.user, 'is_staff', False)}</p>
        <p>is_admin() result: {is_admin(request.user)}</p>
    """)
