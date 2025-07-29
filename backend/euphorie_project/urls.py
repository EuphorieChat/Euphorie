# backend/euphorie_project/urls.py

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import TemplateView
from django.shortcuts import redirect
from django.http import HttpResponse
from chat.views import grok_chat


def redirect_to_app(request):
    """Redirect legacy URLs to new structure"""
    return redirect('index')

def robots_txt(request):
    """Generate robots.txt dynamically"""
    lines = [
        "User-agent: *",
        "Allow: /",
        "Disallow: /admin/",
        "Disallow: /api/",
        "Disallow: /accounts/",
        "Disallow: /webhooks/",  # Added webhook protection
        "Disallow: /manage/",    # Added admin protection
        "",
        f"Sitemap: {request.build_absolute_uri('/sitemap.xml')}"
    ]
    return HttpResponse("\n".join(lines), content_type="text/plain")

urlpatterns = [
    # ==================== ADMIN ====================
    path('admin/', admin.site.urls),
    
    # ==================== AUTHENTICATION URLS ====================
    # Use allauth for ALL authentication - this handles /accounts/login/, /accounts/signup/, etc.
    path('accounts/', include('allauth.urls')),
    
    # ==================== MAIN CHAT APPLICATION ====================
    # All main functionality handled by chat app (including payments and screen sharing)
    path('', include('chat.urls')),
    
    # ==================== STATIC PAGES ====================
    path('about/', TemplateView.as_view(
        template_name='pages/about.html',
        extra_context={
            'page_title': 'About Euphorie - 3D Chat Platform',
            'meta_description': 'Learn about Euphorie, the next-generation 3D chat platform revolutionizing online communication'
        }
    ), name='about'),
    
    path('help/', TemplateView.as_view(
        template_name='pages/help.html',
        extra_context={
            'page_title': 'Help & Support - Euphorie',
            'meta_description': 'Get help with Euphorie - tutorials, FAQs, and support resources'
        }
    ), name='help'),
    
    path('contact/', TemplateView.as_view(
        template_name='pages/contact.html',
        extra_context={
            'page_title': 'Contact Us - Euphorie',
            'meta_description': 'Get in touch with the Euphorie team',
            'contact_email': 'euphorieinc@gmail.com'
        }
    ), name='contact'),
    
    path('features/', TemplateView.as_view(
        template_name='pages/features.html',
        extra_context={
            'page_title': 'Features - Euphorie 3D Chat',
            'meta_description': 'Discover Euphorie\'s innovative features: 3D rooms, avatar customization, and more'
        }
    ), name='features'),
    
    # Remove pricing from here since it's now handled by chat app with payment logic
    # path('pricing/', ...) - now handled by chat.urls
    
    # ==================== LEGAL PAGES ====================
    path('terms/', TemplateView.as_view(
        template_name='pages/terms_of_service.html',
        extra_context={
            'page_title': 'Terms of Service - Euphorie',
            'meta_description': 'Terms of Service for Euphorie chat platform',
            'last_updated': 'December 2024'
        }
    ), name='terms_of_service_static'),  # Renamed to avoid conflict with chat app
    
    # Privacy policy is handled by chat app to include dynamic content
    
    # ==================== SEO & DISCOVERY ====================
    path('robots.txt', robots_txt, name='robots_txt'),
    
    # ==================== API DOCUMENTATION ====================
    path('api/docs/', TemplateView.as_view(
        template_name='pages/api_docs.html',
        extra_context={
            'page_title': 'API Documentation - Euphorie',
            'meta_description': 'Euphorie API documentation for developers'
        }
    ), name='api_docs'),
    
    # ==================== STATUS & MONITORING ====================
    path('status/', TemplateView.as_view(
        template_name='pages/status.html',
        extra_context={
            'page_title': 'System Status - Euphorie',
            'meta_description': 'Current system status and uptime for Euphorie platform'
        }
    ), name='status'),
    
    path('health/', lambda request: HttpResponse(
        "OK", 
        content_type="text/plain",
        status=200
    ), name='health_check'),
    
    # ==================== PAYMENT HEALTH CHECK ====================
    # Simple endpoint to verify payment system is ready
    path('payment-health/', lambda request: HttpResponse(
        "Payment System Ready" if hasattr(settings, 'STRIPE_PUBLISHABLE_KEY') and settings.STRIPE_PUBLISHABLE_KEY else "Payment System Not Configured",
        content_type="text/plain",
        status=200 if hasattr(settings, 'STRIPE_PUBLISHABLE_KEY') and settings.STRIPE_PUBLISHABLE_KEY else 503
    ), name='payment_health_check'),
    
    # ==================== LEGACY REDIRECTS ====================
    # Redirect common legacy URLs to maintain SEO
    path('home/', redirect_to_app, name='legacy_home'),
    path('rooms/', redirect_to_app, name='legacy_rooms'),
    path('explore/', redirect_to_app, name='legacy_explore'),
    path('chat/', redirect_to_app, name='legacy_chat'),
    
    # Add these URL aliases for template compatibility
    path('login/', lambda request: redirect('/accounts/login/'), name='login'),
    path('signup/', lambda request: redirect('/accounts/signup/'), name='signup'),
    path('register/', lambda request: redirect('/accounts/signup/'), name='register'),

    # ==================== Grok Chat URL ====================
    path('mobile/', include('mobile.urls')),

    # ==================== Grok Chat URL ====================
    path('api/grok-chat/', grok_chat, name='grok_chat'),

    # ==================== SOCIAL MEDIA REDIRECTS ====================
    path('twitter/', lambda request: redirect('https://twitter.com/euphorieinc'), name='social_twitter'),
    path('discord/', lambda request: redirect('https://discord.gg/euphorie'), name='social_discord'),
    path('github/', lambda request: redirect('https://github.com/euphorie'), name='social_github'),
    
    # ==================== DOWNLOAD LINKS ====================
    path('download/', TemplateView.as_view(
        template_name='pages/download.html',
        extra_context={
            'page_title': 'Download Euphorie Apps',
            'meta_description': 'Download Euphorie mobile and desktop apps for the best experience'
        }
    ), name='download'),
    
    path('download/android/', lambda request: redirect('https://play.google.com/store/apps/details?id=com.euphorie.app'), name='download_android'),
    path('download/ios/', lambda request: redirect('https://apps.apple.com/app/euphorie/id123456789'), name='download_ios'),
    path('download/desktop/', lambda request: redirect('https://github.com/euphorie/desktop/releases'), name='download_desktop'),
    
    # ==================== COMMUNITY LINKS ====================
    path('community/', TemplateView.as_view(
        template_name='pages/community.html',
        extra_context={
            'page_title': 'Community - Euphorie',
            'meta_description': 'Join the Euphorie community - forums, events, and user groups'
        }
    ), name='community'),
    
    path('blog/', TemplateView.as_view(
        template_name='pages/blog.html',
        extra_context={
            'page_title': 'Blog - Euphorie',
            'meta_description': 'Latest news and updates from the Euphorie team'
        }
    ), name='blog'),
    
    # ==================== DEVELOPER RESOURCES ====================
    path('developers/', TemplateView.as_view(
        template_name='pages/developers.html',
        extra_context={
            'page_title': 'Developers - Euphorie',
            'meta_description': 'Resources for developers building with Euphorie'
        }
    ), name='developers'),
    
    # ==================== BUSINESS PAGES ====================
    path('enterprise/', TemplateView.as_view(
        template_name='pages/enterprise.html',
        extra_context={
            'page_title': 'Enterprise Solutions - Euphorie',
            'meta_description': 'Euphorie enterprise solutions for businesses and organizations'
        }
    ), name='enterprise'),
    
    path('partnerships/', TemplateView.as_view(
        template_name='pages/partnerships.html',
        extra_context={
            'page_title': 'Partnerships - Euphorie',
            'meta_description': 'Partner with Euphorie - integration and collaboration opportunities'
        }
    ), name='partnerships'),
    
    # ==================== SPECIAL CAMPAIGNS ====================
    path('beta/', TemplateView.as_view(
        template_name='pages/beta.html',
        extra_context={
            'page_title': 'Beta Program - Euphorie',
            'meta_description': 'Join the Euphorie beta program and get early access to new features'
        }
    ), name='beta_program'),
    
    path('referrals/', TemplateView.as_view(
        template_name='pages/referrals.html',
        extra_context={
            'page_title': 'Refer Friends - Euphorie',
            'meta_description': 'Invite friends to Euphorie and earn rewards'
        }
    ), name='referrals'),
    
    # ==================== PAYMENT SUCCESS REDIRECTS ====================
    # Additional success pages for different payment flows
    path('welcome/premium/', lambda request: redirect('/subscription/?welcome=premium'), name='welcome_premium'),
    path('welcome/enterprise/', lambda request: redirect('/subscription/?welcome=enterprise'), name='welcome_enterprise'),
    
    # ==================== STRIPE WEBHOOK ENDPOINT ====================
    # Alternative webhook URL for better organization (optional)
    # The main webhook is handled in chat.urls, but this provides an alternative
    path('stripe/webhook/', lambda request: redirect('/webhooks/stripe/'), name='stripe_webhook_redirect'),
]

# ==================== ERROR HANDLERS ====================
# Custom error pages (optional - uncomment to enable)
# handler400 = 'chat.views.custom_400'
# handler403 = 'chat.views.custom_403'
# handler404 = 'chat.views.custom_404'
# handler500 = 'chat.views.custom_500'

# ==================== MEDIA & STATIC FILES ====================
# Serve media and static files in development
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

# ==================== ADMIN CUSTOMIZATION ====================
# Customize admin site
admin.site.site_header = getattr(settings, 'ADMIN_SITE_HEADER', 'Euphorie Administration')
admin.site.site_title = getattr(settings, 'ADMIN_SITE_TITLE', 'Euphorie Admin Portal')
admin.site.index_title = getattr(settings, 'ADMIN_INDEX_TITLE', 'Welcome to Euphorie Administration')

# ==================== SITEMAPS (Future Enhancement) ====================
# Uncomment and configure when ready to add sitemaps
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

# ==================== API VERSIONING (Future Enhancement) ====================
# Uncomment when API is ready
# urlpatterns += [
#     path('api/v1/', include('chat.api.v1.urls')),
#     path('api/v2/', include('chat.api.v2.urls')),  # Future version
# ]

# ==================== WEBHOOKS (Future Enhancement) ====================
# Additional webhooks can be added here if needed
# urlpatterns += [
#     path('webhooks/github/', include('chat.webhooks.github_urls')),
#     path('webhooks/discord/', include('chat.webhooks.discord_urls')),
# ]