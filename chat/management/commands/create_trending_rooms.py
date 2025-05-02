from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from chat.models import Room, Message
from django.utils import timezone
import random
import datetime

class Command(BaseCommand):
    help = 'Adds recent messages to select rooms to make them trending'

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

        # Select 1-2 rooms from each category to make trending
        categories = {}
        for room in all_rooms:
            if room.category:
                category_name = room.category.name
                if category_name not in categories:
                    categories[category_name] = []
                categories[category_name].append(room)

        trending_rooms = []
        for category, rooms in categories.items():
            # Select 1-2 rooms from each category
            num_to_select = min(2, len(rooms))
            if num_to_select > 0:
                selected_rooms = random.sample(rooms, num_to_select)
                trending_rooms.extend(selected_rooms)

        # Ensure we have at least 10 trending rooms
        if len(trending_rooms) < 10 and all_rooms:
            remaining_rooms = [r for r in all_rooms if r not in trending_rooms]
            num_to_add = min(10 - len(trending_rooms), len(remaining_rooms))
            if num_to_add > 0:
                trending_rooms.extend(random.sample(remaining_rooms, num_to_add))

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
            "Can't believe how active this room is!",
            "Has anyone seen the latest news about this?",
            "I've been following this topic all day.",
            "What do you all think about this trending topic?",
            "First time here, seems like a popular room!",
            "This room is getting a lot of attention today.",
            "Interesting conversation happening here.",
            "I've learned so much from this discussion.",
            "This is exactly what I wanted to talk about!",
            "Great points being made in this room.",
            "Glad I found this trending conversation."
        ]

        # Add responses to make conversations feel more natural
        responses = [
            "I agree with what you said earlier.",
            "That's an interesting perspective!",
            "I hadn't thought about it that way before.",
            "Thanks for sharing that insight.",
            "Good point, I think you're right.",
            "I've had a similar experience.",
            "That makes a lot of sense.",
            "I see what you mean now.",
            "I was thinking the same thing!",
            "That's exactly what I was wondering about.",
            "Has anyone else noticed this trend?",
            "I'm still trying to understand this fully.",
            "Could you explain that in more detail?",
            "This is why I love this community!",
            "I've learned something new today."
        ]

        rooms_updated = 0
        messages_added = 0

        for room in trending_rooms:
            try:
                # Add 80-120 very recent messages to each trending room
                message_count = random.randint(80, 120)

                # Create a more natural conversation flow
                for i in range(message_count):
                    # Create messages from the last 7 days, with most in the last few hours
                    # This follows a power curve - more recent = more messages
                    power = 3  # Higher = more concentrated in recent time
                    random_factor = random.random() ** power  # This creates a power distribution
                    minutes_ago = int(10080 * random_factor)  # 10080 = minutes in 7 days

                    # Ensure the most recent messages are very recent (within the last hour)
                    if i >= message_count - 20:
                        minutes_ago = random.randint(0, 60)

                    message_time = timezone.now() - datetime.timedelta(minutes=minutes_ago)

                    # Choose message type - for natural conversation flow
                    if i == 0 or random.random() < 0.7:
                        # New topic or thought
                        message_content = random.choice(simple_messages)
                    else:
                        # Response to previous message
                        message_content = random.choice(responses)

                    # Add random emoji occasionally
                    if random.random() < 0.3:
                        emojis = ["😊", "👍", "🎉", "🙌", "💯", "👏", "🔥", "💪", "🤔", "😄"]
                        message_content += " " + random.choice(emojis)

                    # Create the message
                    Message.objects.create(
                        user=random.choice(users),
                        room=room,
                        content=message_content,
                        timestamp=message_time
                    )

                    messages_added += 1

                self.stdout.write(f"Added {message_count} recent messages to '{room.display_name}' in {room.category.name if room.category else 'uncategorized'} category")
                rooms_updated += 1

            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error updating room '{room.display_name}': {e}"))

        self.stdout.write(self.style.SUCCESS(
            f"Successfully updated {rooms_updated} rooms with {messages_added} trending messages"
        ))

# Usage:
# python manage.py create_trending_rooms
