from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from chat.models import Room, Message
from django.utils import timezone
import random
import datetime

class Command(BaseCommand):
    help = 'Adds recent messages to existing rooms to make them trending'

    def handle(self, *args, **options):
        # Get all rooms
        all_rooms = list(Room.objects.all())

        if not all_rooms:
            self.stdout.write(self.style.ERROR('No rooms found. Please create rooms first.'))
            return

        # Get all users
        users = list(User.objects.all())

        if not users:
            self.stdout.write(self.style.ERROR('No users found. Please create users first.'))
            return

        # Select up to 10 rooms to make trending
        trending_count = min(10, len(all_rooms))
        trending_rooms = random.sample(all_rooms, trending_count)

        rooms_updated = 0
        messages_added = 0

        # Very simple message templates
        simple_messages = [
            "This is getting interesting!",
            "I just joined this trending room.",
            "Lots of activity here today!",
            "This topic is blowing up right now.",
            "Everyone's talking about this.",
            "Just saw this room is trending.",
            "This conversation is on fire! 🔥",
            "So many people joining this discussion!",
            "This is the hot topic of the day.",
            "Can't believe how active this room is!"
        ]

        for room in trending_rooms:
            try:
                # Add 30-50 very recent messages
                message_count = random.randint(30, 50)

                # Add messages from progressively more recent times
                for i in range(message_count):
                    # Create messages from the last 2 hours (120 minutes)
                    minutes_ago = int(120 * (1 - (i / message_count)))
                    message_time = timezone.now() - datetime.timedelta(minutes=minutes_ago)

                    # Pick a random message and user
                    message_content = random.choice(simple_messages)
                    user = random.choice(users)

                    # Add random emoji occasionally
                    if random.random() < 0.3:
                        emojis = ["😊", "👍", "🎉", "🙌", "💯", "👏", "🔥", "💪", "🤔", "😄"]
                        message_content += " " + random.choice(emojis)

                    # Create the message
                    Message.objects.create(
                        user=user,
                        room=room,
                        content=message_content,
                        timestamp=message_time
                    )

                    messages_added += 1

                self.stdout.write(f"Added {message_count} recent messages to '{room.display_name}'")
                rooms_updated += 1

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error updating room '{room.display_name}': {e}"))

        self.stdout.write(self.style.SUCCESS(
            f"Successfully updated {rooms_updated} rooms with {messages_added} trending messages"
        ))

# Usage:
# python manage.py simple_trending_rooms
