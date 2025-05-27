from django import template
import os

register = template.Library()

@register.filter
def split(value, separator):
    """Split a string by separator"""
    return str(value).split(separator)

@register.filter
def last(value):
    """Get the last item from a list"""
    if value:
        return value[-1]
    return value

@register.filter
def dict_key(dictionary, key):
    """Get value from dictionary by key"""
    if dictionary and key:
        return dictionary.get(str(key), {})
    return {}

@register.filter
def filename(value):
    """Extract filename from a path or URL"""
    return os.path.basename(str(value))

@register.filter(name='slice')
def slice_filter(value, arg):
    """Slice filter that works like Python's slice notation"""
    try:
        parts = arg.split(':')
        if len(parts) == 1:
            return value[int(parts[0])]
        elif len(parts) == 2:
            start = int(parts[0]) if parts[0] else None
            end = int(parts[1]) if parts[1] else None
            return value[start:end]
        elif len(parts) == 3:
            start = int(parts[0]) if parts[0] else None
            end = int(parts[1]) if parts[1] else None
            step = int(parts[2]) if parts[2] else None
            return value[start:end:step]
    except (ValueError, TypeError):
        return value

# ADD THIS NEW FILTER:
@register.filter(name='display_name')
def display_name(room_name):
    """
    Convert room name from URL format to display format
    Usage: {{ room_name|display_name }}
    """
    if not room_name:
        return room_name

    # Replace hyphens and underscores with spaces
    clean_name = room_name.replace('-', ' ').replace('_', ' ')

    # Split into words for smart capitalization
    words = []
    for word in clean_name.split():
        word_lower = word.lower()

        # Keep common words lowercase (except first word)
        if word_lower in ['and', 'or', 'the', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by']:
            words.append(word_lower)
        # Keep tech acronyms uppercase
        elif word_lower in ['ai', 'ui', 'ux', 'api', 'html', 'css', 'js', 'php', 'sql', 'ios', 'android', 'ml', 'ar', 'vr']:
            words.append(word.upper())
        # Normal title case
        else:
            words.append(word.capitalize())

    # Always capitalize first word
    if words:
        words[0] = words[0].capitalize()

    return ' '.join(words)
