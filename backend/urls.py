"""
Euphorie v3 URL Configuration
"""
from django.contrib import admin
from django.urls import path
from . import views
from . import auth_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('health', views.health_check, name='health_check'),
    path('api/health', views.health_check, name='api_health_check'),

    # Auth (existing)
    path('api/auth/register/', auth_views.register, name='register'),
    path('api/auth/login/', auth_views.login, name='login'),
    path('api/auth/apple/', auth_views.apple_sign_in, name='apple_sign_in'),
    path('api/auth/apple/callback/', auth_views.apple_web_callback, name='apple_web_callback'),
    path('api/auth/google/', auth_views.google_sign_in, name='google_sign_in'),
    path('api/auth/microsoft/', auth_views.microsoft_sign_in, name='microsoft_sign_in'),
    path('api/auth/refresh/', auth_views.refresh_token, name='refresh_token'),
    path('api/auth/profile/', auth_views.user_profile, name='user_profile'),
    path('api/auth/logout/', auth_views.logout_view, name='logout'),

    # v3 Core
    path('api/v1/interact/', views.interact, name='interact'),
    path('api/v1/credits/', views.get_credits, name='get_credits'),
    path('api/v1/credits/purchase/', views.create_checkout, name='create_checkout'),
    path('api/v1/webhooks/stripe/', views.stripe_webhook, name='stripe_webhook'),
    path('api/v1/history/', views.interaction_history, name='interaction_history'),
]
