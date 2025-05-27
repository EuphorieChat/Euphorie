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
