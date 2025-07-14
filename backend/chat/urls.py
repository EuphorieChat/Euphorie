# backend/chat/urls.py

from django.urls import path
from . import views

urlpatterns = [
    # ==================== MAIN PAGES ====================
    path('', views.index, name='index'),  # Enhanced room discovery as homepage
    path('room/<str:room_name>/', views.room, name='room'),
    path('quickstart/', views.index, name='home'),  # Original homepage moved to quickstart
    path('create-room/', views.create_room, name='create_room'),
    path('search/', views.search_rooms, name='search_rooms'),  # ✅ Now available to all users
    path('explore/', views.explore_rooms, name='explore_rooms'),  # ✅ Now available to all users
    path('dashboard/', views.dashboard, name='dashboard'),
    
    # ==================== PROFILE URLS ====================
    path('profile/settings/', views.profile_settings, name='profile_settings'),
    path('profile/<str:username>/', views.user_profile, name='user_profile'),
    path('profile/<str:username>/edit/', views.edit_profile, name='edit_profile'),
    path('settings/', views.user_settings, name='user_settings'),
    path('settings/ajax-update/', views.ajax_update_setting, name='ajax_update_setting'),
    path('settings/download-data/', views.download_user_data, name='download_user_data'),
    path('settings/clear-activities/', views.clear_user_activities, name='clear_user_activities'),
    path('settings/deactivate/', views.deactivate_account, name='deactivate_account'),
    
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
    path('rooms/demographics/', views.room_demographics, name='room_demographics'),  # New: nationality demographics
    
    # ==================== ADMIN URLS ====================
    path('manage/', views.admin_dashboard, name='admin_dashboard'),
    path('manage/messages/', views.admin_messages, name='admin_messages'),
    path('manage/users/', views.admin_users, name='admin_users'),
    path('manage/users/activity/', views.admin_user_activity, name='admin_user_activity'),
    path('manage/rooms/', views.admin_rooms, name='admin_rooms'),
    path('manage/settings/', views.admin_user_settings, name='admin_user_settings'),
    path('manage/nationality-stats/', views.admin_nationality_stats, name='admin_nationality_stats'),  # New: nationality analytics
    
    # ==================== API ENDPOINTS ====================
    path('api/profile/', views.api_user_profile, name='api_user_profile'),
    path('api/avatar/update/', views.api_update_avatar, name='api_update_avatar'),
    path('api/friends/online/', views.api_friends_online, name='api_friends_online'),
    path('api/rooms/load-more/', views.api_load_more_rooms, name='api_load_more_rooms'),  # ✅ Now available to all users
    path('api/search/rooms/', views.api_search_rooms, name='api_search_rooms'),  # ✅ Now available to all users
    path('api/public-search/', views.public_search_api, name='public_search_api'),  # ✅ NEW: Public-only search endpoint
    
    # ==================== NATIONALITY API ENDPOINTS ====================
    path('api/user-country/', views.api_get_user_country, name='api_get_user_country'),
    path('api/update-nationality/', views.api_update_nationality, name='api_update_nationality'),
    path('api/nationality/detect/', views.api_detect_nationality, name='api_detect_nationality'),
    path('api/nationality/countries/', views.api_get_countries, name='api_get_countries'),
    path('api/nationality/stats/', views.api_nationality_stats, name='api_nationality_stats'),
    path('api/user-profile-extended/', views.api_user_profile_extended, name='api_user_profile_extended'),
    
    # ==================== ROOM NATIONALITY ENDPOINTS ====================
    path('api/room/<int:room_id>/demographics/', views.api_room_demographics, name='api_room_demographics'),
    path('api/room/<int:room_id>/users-by-country/', views.api_room_users_by_country, name='api_room_users_by_country'),
    
    # ==================== FRIEND NATIONALITY ENDPOINTS ====================
    path('api/friends/by-nationality/', views.api_friends_by_nationality, name='api_friends_by_nationality'),
    path('api/friends/suggestions/nationality/', views.api_nationality_friend_suggestions, name='api_nationality_friend_suggestions'),
    
    # ==================== UTILITY PAGES ====================
    path('privacy/', views.privacy_policy, name='privacy_policy'),
    path('terms/', views.terms_of_service, name='terms_of_service'),
    
    # ==================== DEBUG ====================
    path('debug/rooms/', views.debug_rooms, name='debug_rooms'),
    path('debug/nationality/', views.debug_nationality, name='debug_nationality'),  # New: nationality debugging
]