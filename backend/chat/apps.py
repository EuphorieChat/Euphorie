# backend/chat/apps.py

from django.apps import AppConfig

class ChatConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'chat'
    
    # No ready() method for now to avoid import issues