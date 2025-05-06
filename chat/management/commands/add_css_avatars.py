from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from chat.models import UserProfile
import json
import random

class Command(BaseCommand):
    help = 'Add CSS-based animated avatars to existing users'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=19,
            help='Number of users to update with animated avatars'
        )

    def generate_avatar(self, username):
        """Generate CSS-based avatar data for a user"""

        # Avatar types that work well with CSS
        avatar_types = [
            'gradient',      # Animated gradient background
            'pulse',         # Pulsing circle avatar
            'spinner',       # Rotating spinner avatar
            'border',        # Animated border avatar
            'shine'          # Shine effect avatar
        ]

        # Colors selection - Tailwind-inspired color palette
        colors = [
            # Red variants
            ['bg-red-500', 'bg-rose-500'],
            ['bg-rose-400', 'bg-pink-500'],
            # Blue variants
            ['bg-blue-500', 'bg-indigo-500'],
            ['bg-sky-400', 'bg-blue-600'],
            # Green variants
            ['bg-green-500', 'bg-emerald-500'],
            ['bg-teal-400', 'bg-green-600'],
            # Purple variants
            ['bg-purple-500', 'bg-violet-500'],
            ['bg-indigo-400', 'bg-purple-600'],
            # Yellow/Orange variants
            ['bg-amber-400', 'bg-orange-600'],
            ['bg-yellow-400', 'bg-amber-600'],
            # Pink/Cyan variants
            ['bg-pink-400', 'bg-purple-600'],
            ['bg-cyan-400', 'bg-blue-600']
        ]

        # Select avatar type based on the first letter of username for consistency
        seed = sum(ord(c) for c in username) if username else random.randint(0, 100)
        random.seed(seed)

        avatar_type = avatar_types[seed % len(avatar_types)]
        color_scheme = random.choice(colors)

        # Base avatar data with user's initials
        avatar_data = {
            'type': avatar_type,
            'initials': username[0:2].upper() if username else "U",
        }

        # Add type-specific properties
        if avatar_type == 'gradient':
            avatar_data.update({
                'colors': color_scheme,
                'animation_duration': f"{random.randint(3, 8)}s",
                'animation_type': random.choice(['slide', 'rotate']),
                'text_color': 'text-white'
            })

        elif avatar_type == 'pulse':
            avatar_data.update({
                'background': color_scheme[0],
                'animation_duration': f"{random.randint(2, 5)}s",
                'text_color': 'text-white'
            })

        elif avatar_type == 'spinner':
            avatar_data.update({
                'background': color_scheme[0],
                'spinner_color': color_scheme[1].replace('bg-', 'border-'),
                'animation_duration': f"{random.randint(3, 8)}s",
                'text_color': 'text-white'
            })

        elif avatar_type == 'border':
            avatar_data.update({
                'background': color_scheme[0],
                'border_color': color_scheme[1].replace('bg-', 'border-'),
                'border_width': f"{random.randint(2, 5)}px",
                'animation_duration': f"{random.randint(3, 6)}s",
                'text_color': 'text-white'
            })

        elif avatar_type == 'shine':
            avatar_data.update({
                'background': color_scheme[0],
                'shine_color': color_scheme[1],
                'animation_duration': f"{random.randint(3, 8)}s",
                'text_color': 'text-white'
            })

        return avatar_data

    def handle(self, *args, **options):
        count = options['count']

        # Get users
        users = User.objects.all()[:count]

        updated_count = 0

        for user in users:
            # Get or create profile
            profile, created = UserProfile.objects.get_or_create(user=user)

            # Generate avatar data
            avatar_data = self.generate_avatar(user.username)

            # Update profile
            profile.profile_picture_data = json.dumps(avatar_data)
            profile.save()

            updated_count += 1
            self.stdout.write(f"Created CSS avatar for user: {user.username}")

        self.stdout.write(self.style.SUCCESS(f'Successfully updated {updated_count} user avatars'))
