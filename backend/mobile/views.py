from django.shortcuts import render
from django.views.decorators.csrf import ensure_csrf_cookie
from django.conf import settings

@ensure_csrf_cookie
def mobile_app_view(request):
    """Serve the mobile app shell"""
    context = {
        'STRIPE_PUBLISHABLE_KEY': settings.STRIPE_PUBLISHABLE_KEY,
        'DEBUG': settings.DEBUG,
        'is_mobile_app': True,
    }
    return render(request, 'mobile/app.html', context)