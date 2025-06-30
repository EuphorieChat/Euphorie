# backend/chat/middleware.py

from django.utils import timezone
from django.contrib.auth.models import AnonymousUser
from django.http import HttpResponseForbidden
from django.core.cache import cache
from django.conf import settings
import time
import json

class UserActivityMiddleware:
    """Middleware to track user activity and update last seen"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.process_request(request)
        if response:
            return response
        
        response = self.get_response(request)
        return response
    
    def process_request(self, request):
        if request.user.is_authenticated:
            # Update user's last seen time
            try:
                profile = request.user.profile
                profile.last_seen = timezone.now()
                profile.save(update_fields=['last_seen'])
            except AttributeError:
                # Profile doesn't exist yet, will be created by signal
                pass
        
        return None


class RateLimitMiddleware:
    """Simple rate limiting middleware"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.rate_limits = {
            'room_creation': {'limit': 5, 'window': 3600},  # 5 rooms per hour
            'message_sending': {'limit': 100, 'window': 60},  # 100 messages per minute
            'friend_requests': {'limit': 10, 'window': 3600},  # 10 friend requests per hour
        }
    
    def __call__(self, request):
        # Check rate limits for specific endpoints
        if self.should_rate_limit(request):
            rate_limit_key = self.get_rate_limit_key(request)
            if rate_limit_key and self.is_rate_limited(request, rate_limit_key):
                return HttpResponseForbidden("Rate limit exceeded. Please try again later.")
        
        response = self.get_response(request)
        return response
    
    def should_rate_limit(self, request):
        """Determine if request should be rate limited"""
        rate_limited_paths = [
            '/create-room/',
            '/friends/request/',
            '/api/avatar/update/',
        ]
        
        return any(request.path.startswith(path) for path in rate_limited_paths)
    
    def get_rate_limit_key(self, request):
        """Get rate limit key based on request path"""
        if request.path.startswith('/create-room/'):
            return 'room_creation'
        elif request.path.startswith('/friends/request/'):
            return 'friend_requests'
        elif request.path.startswith('/api/avatar/update/'):
            return 'avatar_update'
        return None
    
    def is_rate_limited(self, request, rate_limit_key):
        """Check if user has exceeded rate limit"""
        if not request.user.is_authenticated:
            # Use IP for anonymous users
            identifier = self.get_client_ip(request)
        else:
            identifier = f"user_{request.user.id}"
        
        cache_key = f"rate_limit_{rate_limit_key}_{identifier}"
        rate_limit = self.rate_limits.get(rate_limit_key)
        
        if not rate_limit:
            return False
        
        current_requests = cache.get(cache_key, [])
        now = time.time()
        
        # Remove old requests outside the window
        current_requests = [req_time for req_time in current_requests 
                          if now - req_time < rate_limit['window']]
        
        # Check if limit exceeded
        if len(current_requests) >= rate_limit['limit']:
            return True
        
        # Add current request
        current_requests.append(now)
        cache.set(cache_key, current_requests, rate_limit['window'])
        
        return False
    
    def get_client_ip(self, request):
        """Get client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class SecurityHeadersMiddleware:
    """Add security headers to responses"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Add security headers
        if not settings.DEBUG:
            response['X-Content-Type-Options'] = 'nosniff'
            response['X-Frame-Options'] = 'DENY'
            response['X-XSS-Protection'] = '1; mode=block'
            response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        return response


class ModerationMiddleware:
    """Middleware to check if user is banned or muted"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        if request.user.is_authenticated:
            # Check for active bans
            from .models import UserModerationAction
            
            active_ban = UserModerationAction.objects.filter(
                user=request.user,
                action='ban',
                is_active=True
            ).first()
            
            if active_ban:
                # Check if ban has expired
                if active_ban.expires_at and active_ban.expires_at <= timezone.now():
                    active_ban.is_active = False
                    active_ban.save()
                else:
                    # User is banned, block access to most features
                    blocked_paths = ['/room/', '/create-room/', '/api/']
                    if any(request.path.startswith(path) for path in blocked_paths):
                        return HttpResponseForbidden("Your account has been banned.")
        
        response = self.get_response(request)
        return response


class ContentFilterMiddleware:
    """Middleware for content filtering and spam detection"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.spam_patterns = [
            r'(.)\1{10,}',  # Repeated characters
            r'[A-Z\s]{20,}',  # All caps
            r'https?://[^\s]+',  # URLs (basic detection)
        ]
    
    def __call__(self, request):
        # Pre-process POST data for content filtering
        if request.method == 'POST' and request.content_type == 'application/json':
            try:
                data = json.loads(request.body)
                if 'content' in data:
                    if self.is_spam(data['content']):
                        return HttpResponseForbidden("Message appears to be spam.")
            except (json.JSONDecodeError, UnicodeDecodeError):
                pass
        
        response = self.get_response(request)
        return response
    
    def is_spam(self, content):
        """Basic spam detection"""
        import re
        
        # Check for repeated characters
        if re.search(r'(.)\1{10,}', content):
            return True
        
        # Check for excessive caps
        if len(content) > 20 and content.isupper():
            return True
        
        # Check for excessive URLs
        urls = re.findall(r'https?://[^\s]+', content)
        if len(urls) > 3:
            return True
        
        return False


class PerformanceMiddleware:
    """Middleware to monitor performance and add metrics"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        start_time = time.time()
        
        response = self.get_response(request)
        
        # Calculate response time
        response_time = time.time() - start_time
        
        # Add performance headers in debug mode
        if settings.DEBUG:
            response['X-Response-Time'] = f"{response_time:.3f}s"
        
        # Log slow requests
        if response_time > 2.0:  # Log requests taking more than 2 seconds
            import logging
            logger = logging.getLogger('chat')
            logger.warning(f"Slow request: {request.path} took {response_time:.3f}s")
        
        return response


class APIVersionMiddleware:
    """Middleware to handle API versioning"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Set default API version
        if request.path.startswith('/api/'):
            api_version = request.META.get('HTTP_API_VERSION', '1.0')
            request.api_version = api_version
        
        response = self.get_response(request)
        
        # Add API version to response headers
        if hasattr(request, 'api_version'):
            response['API-Version'] = request.api_version
        
        return response


class WebSocketAuthMiddleware:
    """Middleware for WebSocket authentication"""
    
    def __init__(self, inner):
        self.inner = inner
    
    async def __call__(self, scope, receive, send):
        # Extract session from cookies for WebSocket connections
        if scope['type'] == 'websocket':
            # Get session key from cookies
            cookies = dict(scope.get('headers', []))
            session_cookie = cookies.get(b'sessionid')
            
            if session_cookie:
                from django.contrib.sessions.models import Session
                from django.contrib.auth.models import User
                
                try:
                    session_key = session_cookie.decode()
                    session = Session.objects.get(session_key=session_key)
                    session_data = session.get_decoded()
                    user_id = session_data.get('_auth_user_id')
                    
                    if user_id:
                        user = User.objects.get(id=user_id)
                        scope['user'] = user
                    else:
                        scope['user'] = AnonymousUser()
                except (Session.DoesNotExist, User.DoesNotExist, UnicodeDecodeError):
                    scope['user'] = AnonymousUser()
            else:
                scope['user'] = AnonymousUser()
        
        return await self.inner(scope, receive, send)