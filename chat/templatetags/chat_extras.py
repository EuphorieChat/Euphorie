# chat/templatetags/chat_extras.py
from django import template
from django.db.models import Count
from ..models import Reaction

register = template.Library()

@register.filter
def dict_key(dictionary, key):
    """Get values from a dictionary by key"""
    if not dictionary:
        return {}

    if str(key) not in dictionary:
        return {}

    return dictionary.get(str(key), {})
