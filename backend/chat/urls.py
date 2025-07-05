# backend/chat/urls.py

from django.urls import path
from . import views

urlpatterns = [
    # ==================== MAIN PAGES ====================
    path('', views.index, name='index'),  # Enhanced room discovery as homepage
    path('room/<str:room_name>/', views.room, name='room'),
    path('quickstart/', views.index, name='home'),  # Original homepage moved to quickstart
    path('create-room/', views.create_room, name='create_room'),
    path('search/', views.search_rooms, name='search_rooms'),
    path('explore/', views.explore_rooms, name='explore_rooms'),
    path('dashboard/', views.dashboard, name='dashboard'),
    
    # ==================== PROFILE URLS ====================
    path('profile/settings/', views.profile_settings, name='profile_settings'),
    path('profile/<str:username>/', views.user_profile, name='user_profile'),
    path('profile/<str:username>/edit/', views.edit_profile, name='edit_profile'),
    path('settings/', views.user_settings, name='user_settings'),
    
    # ==================== FRIEND URLS ====================
    path('friends/', views.friends_list, name='friends_list'),
    path('friends/request/<int:user_id>/', views.send_friend_request, name='send_friend_request'),
    path('friends/request/username/<str:username>/', views.send_friend_request_by_username, name='send_friend_request_by_username'),
    path('friends/accept/<int:request_id>/', views.accept_friend_request, name='accept_friend_request'),
    path('friends/decline/<int:request_id>/', views.decline_friend_request, name='decline_friend_request'),
    path('friends/cancel/<int:request_id>/', views.cancel_friend_request, name='cancel_friend_request'),
    path('friends/remove/<int:user_id>/', views.remove_friend, name='remove_friend'),
    path('friends/remove/username/<str:username>/', views.remove_friend_by_username, name='remove_friend_by_username'),
    path('friends/suggestions/', views.friend_suggestions, name='friend_suggestions'),
    
    # ==================== MODERATION URLS ====================
    path('moderation/', views.moderation_dashboard, name='moderation_dashboard'),
    path('report/message/<int:message_id>/', views.report_message, name='report_message'),
    path('report/user/<str:username>/', views.report_user, name='report_user'),
    
    # ==================== ROOM ACTIONS ====================
    path('bookmark/room/<int:room_id>/', views.bookmark_room, name='bookmark_room'),
    path('rooms/categories/', views.room_categories, name='room_categories'),
    path('rooms/trending/', views.trending_rooms, name='trending_rooms'),
    
    # ==================== ADMIN URLS ====================
    path('admin/dashboard/', views.admin_dashboard, name='admin_dashboard'),
    path('admin/rooms/', views.admin_rooms, name='admin_rooms'),
    path('admin/messages/', views.admin_messages, name='admin_messages'),
    path('admin/users/', views.admin_user_activity, name='admin_user_activity'),
    path('admin/settings/', views.admin_user_settings, name='admin_user_settings'),
    
    # ==================== API ENDPOINTS ====================
    path('api/profile/', views.api_user_profile, name='api_user_profile'),
    path('api/avatar/update/', views.api_update_avatar, name='api_update_avatar'),
    path('api/friends/online/', views.api_friends_online, name='api_friends_online'),
    path('api/rooms/load-more/', views.api_load_more_rooms, name='api_load_more_rooms'),
    path('api/search/rooms/', views.api_search_rooms, name='api_search_rooms'),
    
    # ==================== UTILITY PAGES ====================
    path('privacy/', views.privacy_policy, name='privacy_policy'),
    path('terms/', views.terms_of_service, name='terms_of_service'),
    
    # ==================== DEBUG ====================
    path('debug/rooms/', views.debug_rooms, name='debug_rooms'),
]