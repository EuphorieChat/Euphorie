import os

# 👇 MUST be set before anything else
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')

# 👇 Setup Django *before* importing anything Django-related
import django
django.setup()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.core.asgi import get_asgi_application
import chat.routing

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            chat.routing.websocket_urlpatterns
        )
    ),
})
