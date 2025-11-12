"""
URL Configuration for Euphorie AI Backend
All routes in one file - simple and clean!
"""

from django.contrib import admin
from django.urls import path
from . import views

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # Health check
    path('health', views.health_check, name='health_check'),
    path('api/health', views.health_check, name='api_health_check'),
    
    # Vision API
    path('api/vision/analyze', views.analyze_vision, name='analyze_vision'),
    path('api/vision/quick-analysis', views.quick_analysis, name='quick_analysis'),
]