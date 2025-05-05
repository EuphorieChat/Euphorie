from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import user_passes_test
from django.contrib import messages
from django.db.models import Count, Q
from django.http import JsonResponse, HttpResponseForbidden
from django.core.paginator import Paginator
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from datetime import timedelta
import json

from .models import Room, Message, Category, Reaction, Announcement, AnnouncementReadStatus

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

    # Get count of password-protected rooms
    protected_rooms_count = Room.objects.filter(is_protected=True).count()

    # Get count of rooms with active announcements
    rooms_with_announcements = Room.objects.filter(
        announcements__is_active=True
    ).distinct().count()

    context = {
        'total_rooms': total_rooms,
        'total_messages': total_messages,
        'total_users': total_users,
        'messages_24h': messages_24h,
        'active_rooms_24h': active_rooms_24h,
        'protected_rooms_count': protected_rooms_count,
        'rooms_with_announcements': rooms_with_announcements,
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

# Room detail view with messages - now includes password and announcement management
@user_passes_test(is_admin)
def admin_room_detail(request, room_name):
    room = get_object_or_404(Room, name=room_name)

    # Handle password form submission
    if request.method == 'POST' and 'password_action' in request.POST:
        is_protected = request.POST.get('is_protected') == 'on'
        password = request.POST.get('password', '')

        if is_protected:
            if password:  # Only update password if a new one is provided
                room.set_password(password)
            elif not room.password:  # If no password exists and none provided
                messages.error(request, "You must set a password if enabling protection")
            else:  # Keep existing password
                room.is_protected = True
        else:
            room.is_protected = False
            room.password = None

        room.save()
        messages.success(request, f"Password protection for '{room.display_name or room.name}' has been updated")

    # Handle announcement form submission
    elif request.method == 'POST' and 'announcement_action' in request.POST:
        action = request.POST.get('announcement_action')

        if action == 'create':
            content = request.POST.get('content', '').strip()
            if content:
                announcement = Announcement.objects.create(
                    room=room,
                    creator=request.user,
                    content=content,
                    is_active=True
                )

                # Broadcast the new announcement via WebSockets
                from channels.layers import get_channel_layer
                from asgiref.sync import async_to_sync

                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    f"chat_{room_name}",
                    {
                        'type': 'announcement',
                        'action': 'new',
                        'announcement_id': announcement.id,
                        'content': announcement.content,
                        'creator': request.user.username,
                        'created_at': announcement.created_at.isoformat()
                    }
                )

                messages.success(request, "Announcement created successfully")

        elif action == 'toggle':
            announcement_id = request.POST.get('announcement_id')
            announcement = get_object_or_404(Announcement, id=announcement_id, room=room)
            announcement.is_active = not announcement.is_active
            announcement.save()
            status = "activated" if announcement.is_active else "deactivated"
            messages.success(request, f"Announcement {status} successfully")

            # If reactivating, broadcast to all users
            if announcement.is_active:
                from channels.layers import get_channel_layer
                from asgiref.sync import async_to_sync

                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    f"chat_{room_name}",
                    {
                        'type': 'announcement',
                        'action': 'new',
                        'announcement_id': announcement.id,
                        'content': announcement.content,
                        'creator': announcement.creator.username,
                        'created_at': announcement.created_at.isoformat()
                    }
                )

        elif action == 'delete':
            announcement_id = request.POST.get('announcement_id')
            announcement = get_object_or_404(Announcement, id=announcement_id, room=room)
            announcement.delete()
            messages.success(request, "Announcement deleted successfully")

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

    # Get announcements
    announcements = Announcement.objects.filter(room=room).order_by('-created_at')
    active_announcements = announcements.filter(is_active=True)

    # Pagination
    paginator = Paginator(messages_list, 50)  # 50 messages per page
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)

    context = {
        'room': room,
        'page_obj': page_obj,
        'search_query': search_query,
        'message_count': messages_list.count(),
        'is_password_protected': room.is_protected,
        'announcements': announcements,
        'active_announcements': active_announcements,
        'active_announcements_count': active_announcements.count(),
        'total_announcements_count': announcements.count(),
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

# NEW FEATURE: Room Password Management
@user_passes_test(is_admin)
def admin_manage_room_password(request, room_name):
    """Admin view to set or change room password"""
    room = get_object_or_404(Room, name=room_name)

    if request.method == 'POST':
        is_protected = request.POST.get('is_protected') == 'on'
        password = request.POST.get('password', '')

        if is_protected:
            if password:  # Only update password if a new one is provided
                room.set_password(password)
            elif not room.password:  # If no password exists and none provided
                messages.error(request, "You must set a password if enabling protection")
                return render(request, 'chat/manage/room_password.html', {'room': room})
            else:  # Keep existing password
                room.is_protected = True
        else:
            room.is_protected = False
            room.password = None

        room.save()
        messages.success(request, f"Password protection for '{room.display_name or room.name}' has been updated")
        return redirect('admin_room_detail', room_name=room_name)

    return render(request, 'chat/manage/room_password.html', {'room': room})

# NEW FEATURE: Announcements Management
@user_passes_test(is_admin)
def admin_manage_announcements(request, room_name):
    """Admin view to manage room announcements"""
    room = get_object_or_404(Room, name=room_name)
    announcements = Announcement.objects.filter(room=room).order_by('-created_at')

    if request.method == 'POST':
        action = request.POST.get('action')

        if action == 'create':
            content = request.POST.get('content', '').strip()
            if content:
                announcement = Announcement.objects.create(
                    room=room,
                    creator=request.user,
                    content=content,
                    is_active=True
                )

                # Broadcast the new announcement via WebSockets
                from channels.layers import get_channel_layer
                from asgiref.sync import async_to_sync

                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    f"chat_{room_name}",
                    {
                        'type': 'announcement',
                        'action': 'new',
                        'announcement_id': announcement.id,
                        'content': announcement.content,
                        'creator': request.user.username,
                        'created_at': announcement.created_at.isoformat()
                    }
                )

                messages.success(request, "Announcement created successfully")

        elif action == 'toggle':
            announcement_id = request.POST.get('announcement_id')
            announcement = get_object_or_404(Announcement, id=announcement_id, room=room)
            announcement.is_active = not announcement.is_active
            announcement.save()
            status = "activated" if announcement.is_active else "deactivated"
            messages.success(request, f"Announcement {status} successfully")

            # If reactivating, broadcast to all users
            if announcement.is_active:
                from channels.layers import get_channel_layer
                from asgiref.sync import async_to_sync

                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    f"chat_{room_name}",
                    {
                        'type': 'announcement',
                        'action': 'new',
                        'announcement_id': announcement.id,
                        'content': announcement.content,
                        'creator': announcement.creator.username,
                        'created_at': announcement.created_at.isoformat()
                    }
                )

        elif action == 'delete':
            announcement_id = request.POST.get('announcement_id')
            announcement = get_object_or_404(Announcement, id=announcement_id, room=room)
            announcement.delete()
            messages.success(request, "Announcement deleted successfully")

        return redirect('admin_manage_announcements', room_name=room_name)

    return render(request, 'chat/manage/announcements.html', {
        'room': room,
        'announcements': announcements
    })

# Client-side API for announcements
@csrf_exempt
@user_passes_test(is_admin, login_url='/login/')
def create_announcement(request, room_name):
    """API endpoint to create a new announcement"""
    if request.method == 'POST':
        try:
            room = get_object_or_404(Room, name=room_name)

            # Check if user is admin or room creator
            if not (request.user.is_staff or request.user == room.creator):
                return JsonResponse({'error': 'You do not have permission to create announcements'}, status=403)

            # Parse request body
            data = json.loads(request.body)
            content = data.get('content', '').strip()

            if not content:
                return JsonResponse({'error': 'Announcement content cannot be empty'}, status=400)

            # Create announcement
            announcement = Announcement.objects.create(
                room=room,
                creator=request.user,
                content=content,
                is_active=True
            )

            # Broadcast via WebSockets
            from channels.layers import get_channel_layer
            from asgiref.sync import async_to_sync

            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f"chat_{room_name}",
                {
                    'type': 'announcement',
                    'action': 'new',
                    'announcement_id': announcement.id,
                    'content': announcement.content,
                    'creator': request.user.username,
                    'created_at': announcement.created_at.isoformat()
                }
            )

            return JsonResponse({
                'success': True,
                'announcement_id': announcement.id,
                'content': content,
                'creator': request.user.username,
                'created_at': announcement.created_at.isoformat()
            })

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    return JsonResponse({'error': 'Invalid request method'}, status=405)

@csrf_exempt
def mark_announcement_read(request, announcement_id):
    """API endpoint to mark an announcement as read"""
    if request.method == 'POST':
        if not request.user.is_authenticated:
            return JsonResponse({'error': 'Authentication required'}, status=401)

        try:
            announcement = get_object_or_404(Announcement, id=announcement_id)

            # Create read status if it doesn't exist
            AnnouncementReadStatus.objects.get_or_create(
                announcement=announcement,
                user=request.user
            )

            return JsonResponse({
                'success': True,
                'announcement_id': announcement_id
            })

        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    return JsonResponse({'error': 'Invalid request method'}, status=405)

# Password protection for room access in the frontend view
def room_password_check(request, room_name):
    """View to check if a room password is correct"""
    room = get_object_or_404(Room, name=room_name)

    if not room.is_protected:
        # Room is not password protected, redirect to room
        return redirect('room', room_name=room_name)

    if request.method == 'POST':
        password = request.POST.get('password', '')
        if room.check_password(password):
            # Password is correct, set session variable to remember
            request.session[f'room_access_{room_name}'] = True
            return redirect('room', room_name=room_name)
        else:
            messages.error(request, 'Incorrect password. Please try again.')

    return render(request, 'chat/room_password.html', {'room': room})

# Add or update your room view to check for password
def room(request, room_name):
    room = get_object_or_404(Room, name=room_name)

    # Check if room is password protected and user has access
    if room.is_protected:
        if not request.session.get(f'room_access_{room_name}'):
            return redirect('room_password_check', room_name=room_name)

    # Continue with your existing room view code...
    # Get messages, etc.

    # Get active announcements for this room that the user hasn't read
    active_announcements = []
    if request.user.is_authenticated:
        for announcement in Announcement.objects.filter(room=room, is_active=True):
            is_read = AnnouncementReadStatus.objects.filter(
                announcement=announcement,
                user=request.user
            ).exists()

            if not is_read:
                active_announcements.append({
                    'id': announcement.id,
                    'content': announcement.content,
                    'creator': announcement.creator.username,
                    'created_at': announcement.created_at,
                    'is_read': False
                })

    # Include announcements in template context
    context = {
        # Your existing context...
        'active_announcements': active_announcements
    }

    return render(request, 'chat/room.html', context)
