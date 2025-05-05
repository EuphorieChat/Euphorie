from django.urls import path
from django.contrib.auth import views as auth_views
from . import views
from . import admin_views

urlpatterns = [
    path('', views.index, name='index'),
    path('chat/<str:room_name>/', views.room, name='room'),
    path('create_room/', views.create_room, name='create_room'),
    path('delete_room/<str:room_name>/', views.delete_room, name='delete_room'),

    # Password protection route
    path('room/<str:room_name>/password/', admin_views.room_password_check, name='room_password_check'),

    # Announcements API routes
    path('api/announcement/<int:announcement_id>/mark_read/', admin_views.mark_announcement_read, name='mark_announcement_read'),
    path('api/room/<str:room_name>/create_announcement/', admin_views.create_announcement, name='create_announcement'),

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

    # Room management URLs
    path('manage/dashboard/', admin_views.admin_dashboard, name='admin_dashboard'),
    path('manage/rooms/', admin_views.admin_rooms, name='admin_rooms'),
    path('manage/room/<str:room_name>/', admin_views.admin_room_detail, name='admin_room_detail'),
    path('manage/delete-message/<int:message_id>/', admin_views.admin_delete_message, name='admin_delete_message'),
    path('manage/delete-selected-messages/', admin_views.admin_delete_selected_messages, name='admin_delete_selected_messages'),
    path('manage/clear-room/<str:room_name>/', admin_views.admin_clear_room, name='admin_clear_room'),
    path('manage/delete-room/<str:room_name>/', admin_views.admin_delete_room, name='admin_delete_room'),
    path('manage/messages/', admin_views.admin_messages, name='admin_messages'),
    path('manage/delete-messages-ajax/', admin_views.admin_delete_messages_ajax, name='admin_delete_messages_ajax'),
    path('manage/filter-messages/', admin_views.admin_filter_messages, name='admin_filter_messages'),
    path('manage/user-activity/', admin_views.admin_user_activity, name='admin_user_activity'),
    path('manage/user-messages/<int:user_id>/', admin_views.admin_user_messages, name='admin_user_messages'),
    path('manage/export-chat/<str:room_name>/', admin_views.admin_export_chat, name='admin_export_chat'),
]
