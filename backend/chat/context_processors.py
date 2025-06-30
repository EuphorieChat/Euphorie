# backend/chat/context_processors.py

from django.conf import settings

def global_context(request):
    """Add global context variables to all templates"""
    
    context = {
        'EUPHORIE_VERSION': '1.0.0',
        'EUPHORIE_SETTINGS': getattr(settings, 'EUPHORIE_SETTINGS', {}),
        'DEBUG': settings.DEBUG,
    }
    
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
    except:
        # Models don't exist yet (before migration)
        context['categories'] = []
        if request.user.is_authenticated:
            context.update({
                'pending_friend_requests_count': 0,
                'user_profile': None,
            })
    
    return context