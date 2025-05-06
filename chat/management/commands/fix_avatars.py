from django import template
import json

register = template.Library()

@register.filter
def parse_avatar_data(profile_picture_data):
    """Parse avatar data from JSON string"""
    try:
        if profile_picture_data:
            return json.loads(profile_picture_data)
        return None
    except (ValueError, TypeError):
        return None

@register.filter
def get_avatar_class(avatar_data):
    """Get the CSS class for an avatar based on its data"""
    if not avatar_data or not isinstance(avatar_data, dict):
        return "avatar-pink"  # Default fallback

    avatar_type = avatar_data.get('type')

    if avatar_type == 'gradient':
        return f"avatar-gradient avatar-gradient-{avatar_data.get('animation_type', 'slide')}"
    elif avatar_type == 'pulse':
        return "avatar-pulse"
    elif avatar_type == 'spinner':
        return "avatar-spinner"
    elif avatar_type == 'border':
        return "avatar-border"
    elif avatar_type == 'shine':
        return "avatar-shine"
    else:
        return "avatar-pink"  # Default fallback

@register.filter
def get_avatar_style(avatar_data):
    """Get the inline styles for an avatar based on its data"""
    if not avatar_data or not isinstance(avatar_data, dict):
        return ""

    styles = []
    avatar_type = avatar_data.get('type')

    # Animation duration
    if 'animation_duration' in avatar_data:
        styles.append(f"--animation-duration: {avatar_data['animation_duration']}")

    # Specific styles for each type
    if avatar_type == 'gradient':
        if 'colors' in avatar_data and len(avatar_data['colors']) >= 2:
            bg_from = f"var(--{avatar_data['colors'][0]})"
            bg_to = f"var(--{avatar_data['colors'][1]})"
            styles.append(f"background: linear-gradient(135deg, {bg_from}, {bg_to})")

    elif avatar_type == 'pulse':
        if 'background' in avatar_data:
            styles.append(f"background-color: var(--{avatar_data['background']})")

    elif avatar_type == 'spinner':
        if 'background' in avatar_data:
            styles.append(f"background-color: var(--{avatar_data['background']})")
        if 'spinner_color' in avatar_data:
            styles.append(f"--spinner-color: var(--{avatar_data['spinner_color']})")

    elif avatar_type == 'border':
        if 'background' in avatar_data:
            styles.append(f"background-color: var(--{avatar_data['background']})")
        if 'border_color' in avatar_data:
            styles.append(f"--border-color: var(--{avatar_data['border_color']})")
        if 'border_width' in avatar_data:
            styles.append(f"--border-width: {avatar_data['border_width']}")

    elif avatar_type == 'shine':
        if 'background' in avatar_data:
            styles.append(f"background-color: var(--{avatar_data['background']})")

    return "; ".join(styles)
