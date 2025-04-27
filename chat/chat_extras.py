from django import template

register = template.Library()

@register.filter(name='dict_key')
def dict_key(d, key):
    """
    Returns the value from a dictionary for a given key.
    Usage: {{ my_dict|dict_key:key_var }}
    """
    if not d:
        return {}

    if str(key) in d:
        return d[str(key)]
    return {}
