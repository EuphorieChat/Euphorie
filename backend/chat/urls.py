# backend/chat/urls.py

from django.urls import path
from . import views

urlpatterns = [
    # ==================== MAIN PAGES ====================
    path('', views.explore_rooms, name='index'),  # room_list.html is now homepage
    path('room/<str:room_name>/', views.room, name='room'),
    path('home/', views.index, name='home'),  # Old homepage moved here
    path('create-room/', views.create_room, name='create_room'),
    path('search/', views.search_rooms, name='search_rooms'),
    
    # ==================== PROFILE URLS ====================
    path('profile/settings/', views.profile_settings, name='profile_settings'),
    path('profile/<str:username>/', views.user_profile, name='user_profile'),
    path('profile/<str:username>/edit/', views.edit_profile, name='edit_profile'),
    
    # ==================== FRIEND URLS ====================
    path('friends/', views.friends_list, name='friends_list'),
    path('friends/request/<str:username>/', views.send_friend_request, name='send_friend_request'),
    path('friends/respond/<int:friendship_id>/', views.respond_friend_request, name='respond_friend_request'),
    path('friends/remove/<str:username>/', views.remove_friend, name='remove_friend'),
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
    path('privacy-policy/', views.privacy_policy, name='privacy_policy'),
    path('terms-of-service/', views.terms_of_service, name='terms_of_service'),
    
    # ==================== AUTHENTICATION ====================
    path('login/', views.user_login, name='login'),
    path('signup/', views.user_signup, name='signup'),
    path('logout/', views.user_logout, name='account_logout'),
]