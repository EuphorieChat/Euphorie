# backend/chat/context_processors.py

from django.conf import settings
from django.templatetags.static import static

def favicon_context(request):
    """
    Add favicon URLs to template context so they're available everywhere
    This makes favicon paths available as template variables
    """
    return {
        'favicon_ico': static('css/favicon.ico'),
        'favicon_16': static('css/favicon-16x16.png'),
        'favicon_32': static('css/favicon-32x32.png'),
        'apple_touch_icon': static('css/apple-touch-icon-180x180.png'),
    }

def global_context(request):
    """Add global context variables to all templates"""
    
    context = {
        'EUPHORIE_VERSION': '1.2.0',  # Updated version
        'EUPHORIE_SETTINGS': getattr(settings, 'EUPHORIE_SETTINGS', {}),
        'DEBUG': settings.DEBUG,
    }
    
    # Add favicon URLs to global context
    context.update({
        'favicon_ico': static('css/favicon.ico'),
        'favicon_16': static('css/favicon-16x16.png'),
        'favicon_32': static('css/favicon-32x32.png'),
        'apple_touch_icon': static('css/apple-touch-icon-180x180.png'),
    })
    
    # Only add categories if the model exists (after migration)
    try:
        from .models import RoomCategory, Friendship
        
        # Add categories for all pages
        context['categories'] = RoomCategory.objects.filter(is_active=True).order_by('sort_order', 'name')
        
        # Add user-specific context for authenticated users
        if request.user.is_authenticated:
            # Pending friend requests count
            pending_requests_count = Friendship.objects.filter(
                friend=request.user,
                status='pending'
            ).count()
            
            context.update({
                'pending_friend_requests_count': pending_requests_count,
                'user_profile': getattr(request.user, 'profile', None),
            })
            
            # Staff-specific context
            if request.user.is_staff:
                from .models import MessageReport
                # Pending moderation reports
                pending_reports_count = MessageReport.objects.filter(
                    status='pending'
                ).count()
                
                context.update({
                    'pending_reports_count': pending_reports_count,
                })
        else:
            context.update({
                'pending_friend_requests_count': 0,
                'user_profile': None,
            })
    except:
        # Models don't exist yet (before migration)
        context['categories'] = []
        if request.user.is_authenticated:
            context.update({
                'pending_friend_requests_count': 0,
                'user_profile': None,
            })
        else:
            context.update({
                'pending_friend_requests_count': 0,
                'user_profile': None,
            })
    
    return context