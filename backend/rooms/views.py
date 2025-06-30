from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from ..models import Room

def room_list(request):
    """List all available rooms"""
    rooms = Room.objects.filter(is_active=True, room_type='public')[:10]
    return render(request, 'chat/room_list.html', {'rooms': rooms})

def room_3d(request, room_id):
    """3D room view"""
    room = get_object_or_404(Room, id=room_id, is_active=True)
    
    context = {
        'room': room,
        'websocket_url': 'ws://localhost:8080',
        'user_id': request.user.id if request.user.is_authenticated else None,
    }
    
    return render(request, 'chat/room_3d.html', context)