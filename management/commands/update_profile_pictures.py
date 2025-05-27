from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from chat.models import UserProfile
import json
import random
import hashlib
from urllib.parse import quote


class Command(BaseCommand):
    help = 'Update user profile pictures with various free avatar services'

    def add_arguments(self, parser):
        parser.add_argument(
            '--style',
            type=str,
            default='dicebear',
            choices=[
                'dicebear', 'gravatar', 'ui-avatars', 'robohash',
                'adorable', 'initials', 'geometric', 'multiavatar', 'random'
            ],
            help='Avatar style to use'
        )
        parser.add_argument(
            '--users',
            type=str,
            nargs='*',
            help='Specific usernames to update (if not provided, updates all users)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes'
        )

    def handle(self, *args, **options):
        style = options['style']
        specific_users = options['users']
        dry_run = options['dry_run']

        # Get users to update
        if specific_users:
            users = User.objects.filter(username__in=specific_users)
            if not users.exists():
                self.stdout.write(
                    self.style.ERROR(f'No users found with usernames: {specific_users}')
                )
                return
        else:
            users = User.objects.all()

        self.stdout.write(f'Processing {users.count()} users with {style} avatars...')

        styles = [
            'dicebear', 'gravatar', 'ui-avatars', 'robohash',
            'adorable', 'initials', 'geometric', 'multiavatar'
        ] if style == 'random' else [style]

        updated_count = 0
        for user in users:
            # Randomly choose style if 'random' is selected
            selected_style = random.choice(styles) if style == 'random' else style

            if dry_run:
                self.stdout.write(f'Would update {user.username} with {selected_style} style')
                continue

            try:
                profile_data = self.generate_profile_data(user, selected_style)

                # Get or create user profile
                profile, created = UserProfile.objects.get_or_create(user=user)
                profile.profile_picture_data = json.dumps(profile_data)
                profile.save()

                updated_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Updated {user.username} with {selected_style} avatar')
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Failed to update {user.username}: {str(e)}')
                )

        if not dry_run:
            self.stdout.write(
                self.style.SUCCESS(f'Successfully updated {updated_count} user profiles')
            )

    def generate_profile_data(self, user, style):
        """Generate profile picture data based on style"""
        if style == 'dicebear':
            return self.generate_dicebear_avatar(user)
        elif style == 'gravatar':
            return self.generate_gravatar_avatar(user)
        elif style == 'ui-avatars':
            return self.generate_ui_avatars(user)
        elif style == 'robohash':
            return self.generate_robohash_avatar(user)
        elif style == 'adorable':
            return self.generate_adorable_avatar(user)
        elif style == 'multiavatar':
            return self.generate_multiavatar(user)
        elif style == 'initials':
            return self.generate_enhanced_initials(user)
        elif style == 'geometric':
            return self.generate_geometric_avatar(user)
        else:
            return self.get_default_gradient(user.username)

    def generate_dicebear_avatar(self, user):
        """Generate DiceBear avatar URL (no API key required)"""
        # DiceBear 7.x styles (free, no API key needed)
        styles = [
            'adventurer', 'adventurer-neutral', 'avataaars', 'avataaars-neutral',
            'big-ears', 'big-ears-neutral', 'big-smile', 'bottts', 'bottts-neutral',
            'croodles', 'croodles-neutral', 'fun-emoji', 'icons', 'identicon',
            'initials', 'lorelei', 'lorelei-neutral', 'micah', 'miniavs',
            'open-peeps', 'personas', 'pixel-art', 'pixel-art-neutral',
            'shapes', 'thumbs'
        ]

        avatar_style = random.choice(styles)
        seed = user.username

        # Generate consistent colors based on username
        colors = self.get_user_colors(user.username)

        # Build URL
        url = f"https://api.dicebear.com/7.x/{avatar_style}/svg?seed={quote(seed)}&size=200"

        # Add background color for some styles
        if avatar_style in ['initials', 'shapes', 'identicon']:
            bg_color = colors['bg'].replace('#', '')
            url += f"&backgroundColor={bg_color}"

        return {
            'type': 'avatar_url',
            'url': url,
            'service': 'dicebear',
            'style': avatar_style,
            'seed': seed
        }

    def generate_gravatar_avatar(self, user):
        """Generate Gravatar avatar URL"""
        # Use email if available, otherwise create one from username
        email = user.email if user.email else f"{user.username}@example.com"
        email_hash = hashlib.md5(email.lower().encode()).hexdigest()

        # Gravatar fallback options (no API key needed)
        fallbacks = ['identicon', 'monsterid', 'wavatar', 'retro', 'robohash', 'blank']
        fallback = random.choice(fallbacks)

        url = f"https://www.gravatar.com/avatar/{email_hash}?s=200&d={fallback}&r=pg"

        return {
            'type': 'avatar_url',
            'url': url,
            'service': 'gravatar',
            'fallback': fallback,
            'hash': email_hash
        }

    def generate_ui_avatars(self, user):
        """Generate UI Avatars (free service)"""
        # Get initials
        if user.first_name and user.last_name:
            name = f"{user.first_name} {user.last_name}"
            initials = f"{user.first_name[0]}{user.last_name[0]}"
        elif user.first_name:
            name = user.first_name
            initials = user.first_name[:2]
        else:
            name = user.username
            initials = user.username[:2]

        colors = self.get_user_colors(user.username)

        # UI Avatars URL format
        bg_color = colors['bg'].replace('#', '')
        text_color = colors['text'].replace('#', '')

        url = f"https://ui-avatars.com/api/?name={quote(name)}&size=200&background={bg_color}&color={text_color}&bold=true&rounded=true"

        return {
            'type': 'avatar_url',
            'url': url,
            'service': 'ui-avatars',
            'name': name,
            'initials': initials.upper(),
            'background': colors['bg'],
            'text_color': colors['text']
        }

    def generate_robohash_avatar(self, user):
        """Generate RoboHash avatar"""
        # RoboHash sets (different robot styles)
        sets = ['set1', 'set2', 'set3', 'set4']  # Different robot designs
        selected_set = random.choice(sets)

        # Generate based on username
        text = user.username

        url = f"https://robohash.org/{quote(text)}.png?size=200x200&set={selected_set}"

        return {
            'type': 'avatar_url',
            'url': url,
            'service': 'robohash',
            'set': selected_set,
            'text': text
        }

    def generate_adorable_avatar(self, user):
        """Generate Adorable Avatars (cute cartoon faces)"""
        # Adorable avatars based on username hash
        user_hash = abs(hash(user.username)) % 10000000

        url = f"https://api.adorable.io/avatars/200/{user_hash}.png"

        return {
            'type': 'avatar_url',
            'url': url,
            'service': 'adorable',
            'hash': user_hash
        }

    def generate_multiavatar(self, user):
        """Generate Multiavatar (12 billion unique avatars)"""
        # Multiavatar based on username
        seed = user.username

        url = f"https://api.multiavatar.com/{quote(seed)}.svg?apikey=BiKEhlgXvPdQbD"

        return {
            'type': 'avatar_url',
            'url': url,
            'service': 'multiavatar',
            'seed': seed
        }

    def generate_enhanced_initials(self, user):
        """Generate enhanced initials avatar with better styling"""
        # Get initials
        if user.first_name and user.last_name:
            initials = f"{user.first_name[0]}{user.last_name[0]}".upper()
        elif user.first_name:
            initials = user.first_name[:2].upper()
        else:
            initials = user.username[:2].upper()

        colors = self.get_user_colors(user.username)

        # Choose random styling
        patterns = ['solid', 'gradient', 'pattern']
        pattern = random.choice(patterns)

        fonts = ['Arial', 'Helvetica', 'Georgia', 'Verdana', 'Tahoma']
        font = random.choice(fonts)

        return {
            'type': 'enhanced_initials',
            'initials': initials,
            'background': colors['bg'],
            'text_color': colors['text'],
            'pattern': pattern,
            'accent_color': colors['accent'],
            'font_family': font,
            'font_weight': random.choice(['normal', 'bold', '600']),
            'border_radius': random.choice(['0', '10px', '50%']),
            'shadow': random.choice([True, False])
        }

    def generate_geometric_avatar(self, user):
        """Generate geometric pattern avatar"""
        colors = self.get_user_colors(user.username)

        patterns = [
            'triangles', 'hexagons', 'circles', 'squares',
            'diamonds', 'waves', 'stripes', 'dots', 'zigzag'
        ]

        return {
            'type': 'geometric',
            'pattern': random.choice(patterns),
            'primary_color': colors['bg'],
            'secondary_color': colors['accent'],
            'tertiary_color': colors['text'],
            'complexity': random.choice(['low', 'medium', 'high']),
            'seed': abs(hash(user.username)) % 1000,
            'rotation': random.choice([0, 45, 90, 135, 180])
        }

    def get_user_colors(self, username):
        """Generate consistent colors based on username"""
        # Create a hash from username for consistency
        hash_val = abs(hash(username))

        # Define beautiful color palettes
        palettes = [
            {'bg': '#FF6B6B', 'accent': '#4ECDC4', 'text': '#FFFFFF'},  # Red-Teal
            {'bg': '#4ECDC4', 'accent': '#45B7D1', 'text': '#FFFFFF'},  # Teal-Blue
            {'bg': '#45B7D1', 'accent': '#96CEB4', 'text': '#FFFFFF'},  # Blue-Green
            {'bg': '#96CEB4', 'accent': '#FECA57', 'text': '#2C3E50'},  # Green-Yellow
            {'bg': '#FECA57', 'accent': '#FF9FF3', 'text': '#2C3E50'},  # Yellow-Pink
            {'bg': '#FF9FF3', 'accent': '#54A0FF', 'text': '#FFFFFF'},  # Pink-Blue
            {'bg': '#54A0FF', 'accent': '#5F27CD', 'text': '#FFFFFF'},  # Blue-Purple
            {'bg': '#5F27CD', 'accent': '#00D2D3', 'text': '#FFFFFF'},  # Purple-Cyan
            {'bg': '#00D2D3', 'accent': '#FF9F43', 'text': '#2C3E50'},  # Cyan-Orange
            {'bg': '#FF9F43', 'accent': '#10AC84', 'text': '#FFFFFF'},  # Orange-Green
            {'bg': '#10AC84', 'accent': '#EE5A24', 'text': '#FFFFFF'},  # Green-Orange
            {'bg': '#EE5A24', 'accent': '#0984E3', 'text': '#FFFFFF'},  # Orange-Blue
            {'bg': '#A55EEA', 'accent': '#26C6DA', 'text': '#FFFFFF'},  # Purple-Cyan
            {'bg': '#26C6DA', 'accent': '#FFA726', 'text': '#2C3E50'},  # Cyan-Amber
            {'bg': '#FFA726', 'accent': '#66BB6A', 'text': '#FFFFFF'},  # Amber-Green
        ]

        return palettes[hash_val % len(palettes)]

    def get_default_gradient(self, username):
        """Fallback to gradient similar to existing system"""
        gradients = [
            'from-pink-400 to-purple-400',
            'from-blue-400 to-indigo-400',
            'from-green-400 to-teal-400',
            'from-purple-400 to-pink-400',
            'from-yellow-400 to-orange-400',
            'from-red-400 to-pink-400',
            'from-cyan-400 to-blue-400',
            'from-emerald-400 to-green-500'
        ]

        hash_value = abs(hash(username))
        return {
            'type': 'gradient',
            'gradient': gradients[hash_value % len(gradients)]
        }
