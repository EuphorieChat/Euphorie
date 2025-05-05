from django.urls import path
from django.contrib.auth import views as auth_views
from . import views, admin_views, api_views
from .admin_views import admin_create_room, admin_user_settings
from chat import api_views

urlpatterns = [
    # Core views from first urls.py (priority)
    path('', views.index, name='index'),
    path('chat/<str:room_name>/', views.room, name='room'),
    path('create_room/', views.create_room, name='create_room'),
    path('delete_room/<str:room_name>/', views.delete_room, name='delete_room'),
    path('explore/', views.explore_rooms, name='explore_rooms'),
    path('friends/', views.friends_list, name='friends_list'),

    # Authentication views from first urls.py
    path('signup/', views.signup, name='signup'),
    path('login/', auth_views.LoginView.as_view(template_name='chat/login.html'), name='login'),
    path('logout/', auth_views.LogoutView.as_view(template_name='chat/logged_out.html'), name='logout'),

    # Password protection route from first urls.py
    path('room/<str:room_name>/password/', admin_views.room_password_check, name='room_password_check'),

    # Admin dashboard and management views from first urls.py
    path('manage/dashboard/', admin_views.admin_dashboard, name='admin_dashboard'),
    path('manage/rooms/', admin_views.admin_rooms, name='admin_rooms'),
    path('manage/room/<str:room_name>/', admin_views.admin_room_detail, name='admin_room_detail'),
    path('manage/rooms/create/', admin_create_room, name='admin_create_room'),
    path('manage/messages/', admin_views.admin_messages, name='admin_messages'),
    path('manage/user-activity/', admin_views.admin_user_activity, name='admin_user_activity'),
    path('manage/user-messages/<int:user_id>/', admin_views.admin_user_messages, name='admin_user_messages'),
    path('manage/user-settings/', admin_user_settings, name='admin_user_settings'),
    path('manage/export-users/', admin_views.admin_export_users, name='admin_export_users'),
    path('manage/export-user-data/', admin_views.admin_export_user_data, name='admin_export_user_data'),

    # Admin message and room management from first urls.py
    path('manage/delete-message/<int:message_id>/', admin_views.admin_delete_message, name='admin_delete_message'),
    path('manage/delete-selected-messages/', admin_views.admin_delete_selected_messages, name='admin_delete_selected_messages'),
    path('manage/clear-room/<str:room_name>/', admin_views.admin_clear_room, name='admin_clear_room'),
    path('manage/delete-room/<str:room_name>/', admin_views.admin_delete_room, name='admin_delete_room'),
    path('manage/delete-messages-ajax/', admin_views.admin_delete_messages_ajax, name='admin_delete_messages_ajax'),
    path('manage/delete-message-ajax/', admin_views.admin_delete_message_ajax, name='admin_delete_message_ajax'),
    path('manage/filter-messages/', admin_views.admin_filter_messages, name='admin_filter_messages'),
    path('manage/toggle-user-status-ajax/', admin_views.admin_toggle_user_status_ajax, name='admin_toggle_user_status_ajax'),
    path('manage/export-chat/<str:room_name>/', admin_views.admin_export_chat, name='admin_export_chat'),

    # API endpoints: Announcements from first urls.py
    path('api/announcement/<int:announcement_id>/mark_read/', admin_views.mark_announcement_read, name='mark_announcement_read'),
    path('api/room/<str:room_name>/create_announcement/', admin_views.create_announcement, name='create_announcement'),

    # API endpoints: General from first urls.py
    path('api/upload_media/', views.upload_media, name='upload_media'),
    path('api/load_more_rooms/', views.load_more_rooms, name='load_more_rooms'),
    path('api/search_rooms/', views.search_rooms, name='search_rooms'),

    # API endpoints: Messages from first urls.py
    path('api/room/<str:room_name>/send_message/', views.send_message, name='send_message'),
    path('api/message/<int:message_id>/add_reaction/', views.add_reaction, name='add_reaction'),
    path('api/message/<int:message_id>/reactions/<str:emoji>/', views.get_reaction_users, name='get_reaction_users'),

    # API endpoints: Room-specific from first urls.py
    path('api/room/<str:room_name>/active_users/', views.get_active_users, name='get_active_users'),
    path('api/room/<str:room_name>/media/', views.get_room_media, name='get_room_media'),
    path('api/room/<str:room_name>/create_meetup/', views.create_meetup, name='create_meetup'),
    path('api/room/<str:room_name>/whiteboard_update/', views.whiteboard_update, name='whiteboard_update'),

    # API endpoints: Friends functionality from first urls.py
    path('api/friend_request/', api_views.send_friend_request, name='send_friend_request'),
    path('api/friend_response/', api_views.respond_to_friend_request, name='respond_to_friend_request'),
    path('api/remove_friend/', api_views.remove_friend, name='remove_friend'),
    path('api/friend_suggestions/', api_views.get_friend_suggestions_ajax, name='get_friend_suggestions_ajax'),
    path('api/online_friends/', api_views.get_online_friends_api, name='get_online_friends'),

    # API endpoints: Recommendations from first urls.py
    path('api/recommended_rooms/', api_views.get_recommended_rooms, name='get_recommended_rooms'),

    # Unique paths from second urls.py (non-conflicting)
    path('dm/<str:username>/', views.direct_message, name='direct_message'),
    path('api/toggle_bookmark_room/', api_views.toggle_bookmark_room, name='toggle_bookmark_room'),

]
