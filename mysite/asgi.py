import os
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 👇 MUST be set before anything else
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mysite.settings')

logger.info("Setting up ASGI application...")

# 👇 Setup Django *before* importing anything Django-related
import django
django.setup()

logger.info("Django setup complete, importing routing...")

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.core.asgi import get_asgi_application
import chat.routing

logger.info("Creating ProtocolTypeRouter...")

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(
            chat.routing.websocket_urlpatterns
        )
    ),
})

logger.info("ASGI application initialized successfully!")
