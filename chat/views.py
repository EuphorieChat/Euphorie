from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth import login
from django.utils.text import slugify
from django.db.models import Count
from django.http import JsonResponse
from django.core.paginator import Paginator
from .models import Room, Message, Reaction
from django.views.decorators.csrf import csrf_exempt
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from collections import defaultdict
import os

def index(request):
    all_rooms = Room.objects.annotate(message_count=Count('messages')).order_by('-message_count')

    # Decide how many to initially show
    limit = 1000 if request.user.is_authenticated else 20
    active_rooms = all_rooms[:limit]

    for room in active_rooms:
        room.display_name = room.name.replace('-', ' ').title()

    return render(request, 'chat/index.html', {
        'active_rooms': active_rooms,
        'user': request.user
    })

def new_message(request):
    msg = request.POST.get('data')
    message = Message(content=msg)
    message.save()

def load_more_rooms(request):
    page = int(request.GET.get('page', 1))
    per_page = 10

    offset = 1000 if request.user.is_authenticated else 20
    rooms_qs = Room.objects.annotate(message_count=Count('messages')).order_by('-message_count')[offset:]

    paginator = Paginator(rooms_qs, per_page)
    rooms = paginator.get_page(page)

    room_data = [
        {
            'name': room.name,
            'display_name': room.name.replace('-', ' ').title(),
            'message_count': room.message_count
        } for room in rooms
    ]
    return JsonResponse({'rooms': room_data, 'has_next': rooms.has_next()})

@login_required
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

    # Pass data to template
    context = {
        'room_name': room_name,
        'room': room,
        'messages': messages,
        'username': request.user.username,
        'reactions': reactions,
        'can_delete': room.creator == request.user,
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

