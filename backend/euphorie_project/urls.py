# backend/euphorie_project/urls.py

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.auth import views as auth_views
from django.views.generic import TemplateView

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # Authentication URLs
    path('accounts/login/', auth_views.LoginView.as_view(
        template_name='registration/login.html',
        redirect_authenticated_user=True
    ), name='login'),
    
    path('accounts/logout/', auth_views.LogoutView.as_view(), name='logout'),
    
    path('accounts/signup/', TemplateView.as_view(
        template_name='registration/signup.html'
    ), name='signup'),
    
    path('accounts/password-reset/', auth_views.PasswordResetView.as_view(
        template_name='registration/password_reset.html',
        email_template_name='registration/password_reset_email.html',
        subject_template_name='registration/password_reset_subject.txt'
    ), name='password_reset'),
    
    path('accounts/password-reset/done/', auth_views.PasswordResetDoneView.as_view(
        template_name='registration/password_reset_done.html'
    ), name='password_reset_done'),
    
    path('accounts/reset/<uidb64>/<token>/', auth_views.PasswordResetConfirmView.as_view(
        template_name='registration/password_reset_confirm.html'
    ), name='password_reset_confirm'),
    
    path('accounts/reset/done/', auth_views.PasswordResetCompleteView.as_view(
        template_name='registration/password_reset_complete.html'
    ), name='password_reset_complete'),
    
    # Main chat application
    path('', include('chat.urls')),
    
    # Static pages
    path('privacy/', TemplateView.as_view(
        template_name='pages/privacy_policy.html'
    ), name='privacy_policy'),
    
    path('terms/', TemplateView.as_view(
        template_name='pages/terms_of_service.html'
    ), name='terms_of_service'),
    
    path('about/', TemplateView.as_view(
        template_name='pages/about.html'
    ), name='about'),
    
    path('help/', TemplateView.as_view(
        template_name='pages/help.html'
    ), name='help'),
    
    # API endpoints (if you want to add DRF API later)
    # path('api/v1/', include('chat.api.v1.urls')),
]

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

# Custom error handlers - temporarily disabled
# handler404 = 'chat.views.custom_404'
# handler500 = 'chat.views.custom_500'