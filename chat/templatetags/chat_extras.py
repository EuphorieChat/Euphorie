from django import template
register = template.Library()

@register.filter
def dict_key(d, key):
    """Get a value from a dictionary by key"""
    try:
        if isinstance(d, dict):
            return d.get(key, {})
        return {}
    except:
        return {}
