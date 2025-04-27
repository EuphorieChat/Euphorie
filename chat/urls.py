from django.urls import path
from django.contrib.auth import views as auth_views
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('chat/<str:room_name>/', views.room, name='room'),
    path('create_room/', views.create_room, name='create_room'),
    path('delete_room/<str:room_name>/', views.delete_room, name='delete_room'),

    path('signup/', views.signup, name='signup'),
    path('login/', auth_views.LoginView.as_view(template_name='chat/login.html'), name='login'),
    path('logout/', auth_views.LogoutView.as_view(template_name='chat/logged_out.html'), name='logout'),

    # API endpoints
    path('api/upload_media/', views.upload_media, name='upload_media'),
    path('api/load_more_rooms/', views.load_more_rooms, name='load_more_rooms'),
    path('api/search_rooms/', views.search_rooms, name='search_rooms'),

    # Message endpoints
    path('api/room/<str:room_name>/send_message/', views.send_message, name='send_message'),
    path('api/message/<int:message_id>/add_reaction/', views.add_reaction, name='add_reaction'),
    path('api/message/<int:message_id>/reactions/<str:emoji>/', views.get_reaction_users, name='get_reaction_users'),

    # Room-specific endpoints
    path('api/room/<str:room_name>/active_users/', views.get_active_users, name='get_active_users'),
    path('api/room/<str:room_name>/media/', views.get_room_media, name='get_room_media'),
    path('api/room/<str:room_name>/create_meetup/', views.create_meetup, name='create_meetup'),
    path('api/room/<str:room_name>/whiteboard_update/', views.whiteboard_update, name='whiteboard_update'),
]
