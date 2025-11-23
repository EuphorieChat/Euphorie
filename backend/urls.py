"""
URL Configuration for Euphorie AI Backend
All routes in one file - simple and clean!
"""

from django.contrib import admin
from django.urls import path
from . import views
from . import auth_views

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # Health check
    path('health', views.health_check, name='health_check'),
    path('api/health', views.health_check, name='api_health_check'),
    
    # 🔑 Authentication endpoints
    path('api/auth/register/', auth_views.register, name='register'),
    path('api/auth/login/', auth_views.login, name='login'),
    path('api/auth/apple/', auth_views.apple_sign_in, name='apple_sign_in'),
    path('api/auth/google/', auth_views.google_sign_in, name='google_sign_in'),
    path('api/auth/microsoft/', auth_views.microsoft_sign_in, name='microsoft_sign_in'),
    path('api/auth/refresh/', auth_views.refresh_token, name='refresh_token'),
    path('api/auth/profile/', auth_views.user_profile, name='user_profile'),
    path('api/auth/logout/', auth_views.logout_view, name='logout'),
    
    # Vision API
    path('api/vision/analyze', views.analyze_vision, name='analyze_vision'),
    path('api/vision/quick-analysis', views.quick_analysis, name='quick_analysis'),
]