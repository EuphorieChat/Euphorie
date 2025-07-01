# backend/euphorie_project/urls.py

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.auth import views as auth_views
from django.views.generic import TemplateView
from django.shortcuts import redirect
# REMOVED: from . import views  # This was causing the error!


def redirect_to_app(request):
    """Redirect legacy URLs to new structure"""
    return redirect('index')

urlpatterns = [
    # ==================== ADMIN ====================
    path('admin/', admin.site.urls),
    path('auth/', include('allauth.urls')),
    
    # ==================== AUTHENTICATION URLS ====================
    # Django built-in auth views with custom templates
    path('accounts/login/', auth_views.LoginView.as_view(
        template_name='registration/login.html',
        redirect_authenticated_user=True,
        next_page='index'
    ), name='auth_login'),
    
    path('accounts/logout/', auth_views.LogoutView.as_view(
        next_page='index'
    ), name='auth_logout'),
    
    path('accounts/signup/', TemplateView.as_view(
        template_name='registration/signup.html'
    ), name='auth_signup'),
    
    # Password reset views
    path('accounts/password-reset/', auth_views.PasswordResetView.as_view(
        template_name='registration/password_reset.html',
        email_template_name='registration/password_reset_email.html',
        subject_template_name='registration/password_reset_subject.txt',
        success_url='/accounts/password-reset/done/'
    ), name='password_reset'),
    
    path('accounts/password-reset/done/', auth_views.PasswordResetDoneView.as_view(
        template_name='registration/password_reset_done.html'
    ), name='password_reset_done'),
    
    path('accounts/reset/<uidb64>/<token>/', auth_views.PasswordResetConfirmView.as_view(
        template_name='registration/password_reset_confirm.html',
        success_url='/accounts/reset/done/'
    ), name='password_reset_confirm'),
    
    path('accounts/reset/done/', auth_views.PasswordResetCompleteView.as_view(
        template_name='registration/password_reset_complete.html'
    ), name='password_reset_complete'),
    
    # ==================== STATIC PAGES ====================
    # NOTE: Privacy policy is now handled by the chat app, so we removed the duplicate
    # The chat app's privacy_policy view will handle /privacy/
    
    path('terms/', TemplateView.as_view(
        template_name='pages/terms_of_service.html'
    ), name='static_terms'),
    
    path('about/', TemplateView.as_view(
        template_name='pages/about.html'
    ), name='about'),
    
    path('help/', TemplateView.as_view(
        template_name='pages/help.html'
    ), name='help'),
    
    path('contact/', TemplateView.as_view(
        template_name='pages/contact.html'
    ), name='contact'),
    
    # ==================== LEGACY REDIRECTS ====================
    # Redirect common legacy URLs
    path('home/', redirect_to_app, name='legacy_home'),
    path('rooms/', redirect_to_app, name='legacy_rooms'),
    path('explore/', redirect_to_app, name='legacy_explore'),
    
    # ==================== MAIN CHAT APPLICATION ====================
    # All main functionality handled by chat app (including privacy policy)
    path('', include('chat.urls')),
    
    # ==================== API ENDPOINTS (Future) ====================
    # Placeholder for future REST API
    # path('api/v1/', include('chat.api.v1.urls')),
    
    # ==================== HEALTH CHECK ====================
    path('health/', TemplateView.as_view(
        template_name='pages/health.html'
    ), name='health_check'),
]

# ==================== MEDIA & STATIC FILES ====================
# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    
    # Add debug toolbar if available
    try:
        import debug_toolbar
        urlpatterns = [
            path('__debug__/', include(debug_toolbar.urls)),
        ] + urlpatterns
    except ImportError:
        pass

# ==================== CUSTOM ERROR HANDLERS ====================
# Custom error pages (optional - can be enabled later)
# handler404 = 'chat.views.custom_404'
# handler500 = 'chat.views.custom_500'
# handler403 = 'chat.views.custom_403'
# handler400 = 'chat.views.custom_400'

# ==================== SITEMAPS (Future) ====================
# from django.contrib.sitemaps.views import sitemap
# from chat.sitemaps import RoomSitemap, StaticViewSitemap
# 
# sitemaps = {
#     'rooms': RoomSitemap,
#     'static': StaticViewSitemap,
# }
# 
# urlpatterns += [
#     path('sitemap.xml', sitemap, {'sitemaps': sitemaps},
#          name='django.contrib.sitemaps.views.sitemap'),
# ]

# ==================== ROBOTS.TXT (Future) ====================
# urlpatterns += [
#     path('robots.txt', TemplateView.as_view(
#         template_name='robots.txt',
#         content_type='text/plain'
#     )),
# ]