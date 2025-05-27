from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta, datetime
import random
import json
from chat.models import Room, Message, Category, Reaction, Meetup
from django.db import transaction

class Command(BaseCommand):
    help = 'Generate engaging rooms and realistic chat history'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear-rooms',
            action='store_true',
            help='Clear existing rooms before generating new ones',
        )
        parser.add_argument(
            '--rooms-only',
            action='store_true',
            help='Only create rooms, no chat history',
        )
        parser.add_argument(
            '--chat-only',
            action='store_true',
            help='Only generate chat history for existing rooms',
        )
        parser.add_argument(
            '--num-conversations',
            type=int,
            default=50,
            help='Number of conversations to generate per room (default: 50)',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('🚀 Starting chat content generation...'))

        if options['clear_rooms']:
            self.clear_existing_rooms()

        if not options['chat_only']:
            self.create_categories()
            self.create_engaging_rooms()

        if not options['rooms_only']:
            self.generate_chat_history(options['num_conversations'])
            self.add_reactions_to_messages()
            self.create_meetups()

        self.stdout.write(self.style.SUCCESS('✅ Chat content generation completed!'))

    def clear_existing_rooms(self):
        """Clear existing rooms (except DM rooms)"""
        self.stdout.write('🧹 Clearing existing rooms...')
        Room.objects.filter(is_dm=False).delete()
        self.stdout.write(self.style.SUCCESS('✅ Existing rooms cleared'))

    def create_categories(self):
        """Create engaging categories"""
        categories_data = [
            {'name': 'Technology', 'slug': 'technology', 'icon': '💻'},
            {'name': 'Gaming', 'slug': 'gaming', 'icon': '🎮'},
            {'name': 'Creative', 'slug': 'creative', 'icon': '🎨'},
            {'name': 'Social', 'slug': 'social', 'icon': '👋'},
            {'name': 'Learning', 'slug': 'learning', 'icon': '📚'},
            {'name': 'Health & Fitness', 'slug': 'health', 'icon': '🧘'},
            {'name': 'Music', 'slug': 'music', 'icon': '🎵'},
            {'name': 'Food & Cooking', 'slug': 'food', 'icon': '🍕'},
            {'name': 'Travel', 'slug': 'travel', 'icon': '✈️'},
            {'name': 'Sports', 'slug': 'sports', 'icon': '⚽'},
            {'name': 'Movies & TV', 'slug': 'entertainment', 'icon': '🎬'},
            {'name': 'Books', 'slug': 'books', 'icon': '📖'},
            {'name': 'Science', 'slug': 'science', 'icon': '🔬'},
            {'name': 'Business', 'slug': 'business', 'icon': '💼'},
            {'name': 'Random', 'slug': 'random', 'icon': '🎲'},
        ]

        for cat_data in categories_data:
            category, created = Category.objects.get_or_create(
                slug=cat_data['slug'],
                defaults={
                    'name': cat_data['name'],
                    'icon': cat_data['icon']
                }
            )
            if created:
                self.stdout.write(f'📁 Created category: {cat_data["name"]}')

    def create_engaging_rooms(self):
        """Create a variety of engaging rooms"""
        # Get random users to be room creators
        users = list(User.objects.all())
        if len(users) < 10:
            self.stdout.write(self.style.WARNING('⚠️  You need more users for realistic rooms. Consider creating more users first.'))
            return

        rooms_data = [
            # Technology Rooms
            {'name': 'ai-and-machine-learning', 'display_name': 'AI & Machine Learning', 'category': 'technology',
             'description': 'Discuss the latest in artificial intelligence, machine learning, and deep learning'},
            {'name': 'web-development-hub', 'display_name': 'Web Development Hub', 'category': 'technology',
             'description': 'Frontend, backend, full-stack - all web dev discussions welcome'},
            {'name': 'mobile-app-development', 'display_name': 'Mobile App Development', 'category': 'technology',
             'description': 'iOS, Android, React Native, Flutter - mobile development chat'},
            {'name': 'cybersecurity-lounge', 'display_name': 'Cybersecurity Lounge', 'category': 'technology',
             'description': 'Security professionals discussing threats, tools, and best practices'},

            # Gaming Rooms
            {'name': 'battle-royale-central', 'display_name': 'Battle Royale Central', 'category': 'gaming',
             'description': 'Fortnite, Apex Legends, PUBG, and all battle royale games'},
            {'name': 'retro-gaming-arcade', 'display_name': 'Retro Gaming Arcade', 'category': 'gaming',
             'description': 'Classic games, vintage consoles, and nostalgic gaming memories'},
            {'name': 'indie-game-spotlight', 'display_name': 'Indie Game Spotlight', 'category': 'gaming',
             'description': 'Discover and discuss amazing independent games'},
            {'name': 'esports-arena', 'display_name': 'Esports Arena', 'category': 'gaming',
             'description': 'Professional gaming, tournaments, and competitive play'},

            # Creative Rooms
            {'name': 'digital-art-studio', 'display_name': 'Digital Art Studio', 'category': 'creative',
             'description': 'Share your digital artwork, get feedback, and learn new techniques'},
            {'name': 'photography-darkroom', 'display_name': 'Photography Darkroom', 'category': 'creative',
             'description': 'Camera gear, composition tips, and stunning photo shares'},
            {'name': 'creative-writing-corner', 'display_name': 'Creative Writing Corner', 'category': 'creative',
             'description': 'Writers sharing stories, poems, and getting constructive feedback'},
            {'name': 'diy-and-crafts', 'display_name': 'DIY & Crafts', 'category': 'creative',
             'description': 'Handmade projects, crafting tips, and creative inspiration'},

            # Social Rooms
            {'name': 'coffee-chat-lounge', 'display_name': 'Coffee Chat Lounge', 'category': 'social',
             'description': 'Casual conversations over virtual coffee'},
            {'name': 'random-thoughts', 'display_name': 'Random Thoughts', 'category': 'random',
             'description': 'Share whatever is on your mind - no topic too random'},
            {'name': 'good-vibes-only', 'display_name': 'Good Vibes Only', 'category': 'social',
             'description': 'Positive energy, uplifting stories, and feel-good content'},
            {'name': 'debate-club', 'display_name': 'Debate Club', 'category': 'social',
             'description': 'Respectful debates on various topics - keep it civil!'},

            # Learning Rooms
            {'name': 'language-exchange', 'display_name': 'Language Exchange', 'category': 'learning',
             'description': 'Practice languages with native speakers from around the world'},
            {'name': 'study-buddy-central', 'display_name': 'Study Buddy Central', 'category': 'learning',
             'description': 'Find study partners and share learning resources'},
            {'name': 'code-review-circle', 'display_name': 'Code Review Circle', 'category': 'learning',
             'description': 'Get your code reviewed and help others improve theirs'},

            # Health & Fitness
            {'name': 'fitness-motivation', 'display_name': 'Fitness Motivation', 'category': 'health',
             'description': 'Workout tips, progress sharing, and fitness accountability'},
            {'name': 'mindfulness-meditation', 'display_name': 'Mindfulness & Meditation', 'category': 'health',
             'description': 'Mental health, mindfulness practices, and meditation techniques'},
            {'name': 'healthy-cooking', 'display_name': 'Healthy Cooking', 'category': 'food',
             'description': 'Nutritious recipes, meal prep, and healthy eating tips'},

            # Entertainment
            {'name': 'movie-night-suggestions', 'display_name': 'Movie Night Suggestions', 'category': 'entertainment',
             'description': 'Movie recommendations, reviews, and watch party planning'},
            {'name': 'binge-watching-club', 'display_name': 'Binge Watching Club', 'category': 'entertainment',
             'description': 'TV series discussions, no spoilers without warnings!'},
            {'name': 'music-discovery', 'display_name': 'Music Discovery', 'category': 'music',
             'description': 'Share new music finds and get personalized recommendations'},

            # Niche Interests
            {'name': 'space-and-astronomy', 'display_name': 'Space & Astronomy', 'category': 'science',
             'description': 'Explore the cosmos, latest space news, and stargazing tips'},
            {'name': 'cryptocurrency-trading', 'display_name': 'Cryptocurrency Trading', 'category': 'business',
             'description': 'Crypto market analysis, trading strategies, and blockchain tech'},
            {'name': 'sustainable-living', 'display_name': 'Sustainable Living', 'category': 'social',
             'description': 'Eco-friendly lifestyle tips and environmental consciousness'},
            {'name': 'pet-lovers-unite', 'display_name': 'Pet Lovers Unite', 'category': 'social',
             'description': 'Share photos of your pets and get advice from fellow pet parents'},
            {'name': 'travel-planning-hub', 'display_name': 'Travel Planning Hub', 'category': 'travel',
             'description': 'Trip planning, destination recommendations, and travel stories'},

            # Fun & Quirky
            {'name': 'meme-central', 'display_name': 'Meme Central', 'category': 'random',
             'description': 'The freshest memes and internet humor'},
            {'name': 'conspiracy-theories', 'display_name': 'Conspiracy Theories', 'category': 'random',
             'description': 'Discuss alternative theories - keep it fun and respectful'},
            {'name': 'shower-thoughts', 'display_name': 'Shower Thoughts', 'category': 'random',
             'description': 'Those deep thoughts that hit you in the shower'},
        ]

        for room_data in rooms_data:
            try:
                category = Category.objects.get(slug=room_data['category'])
                creator = random.choice(users)

                room, created = Room.objects.get_or_create(
                    name=room_data['name'],
                    defaults={
                        'display_name': room_data['display_name'],
                        'category': category,
                        'creator': creator,
                        'is_dm': False
                    }
                )

                if created:
                    self.stdout.write(f'🏠 Created room: {room.display_name}')

            except Category.DoesNotExist:
                self.stdout.write(f'⚠️  Category not found: {room_data["category"]}')

    def generate_chat_history(self, num_conversations):
        """Generate realistic chat conversations"""
        self.stdout.write('💬 Generating chat conversations...')

        users = list(User.objects.all())
        rooms = list(Room.objects.filter(is_dm=False))

        if not users or not rooms:
            self.stdout.write(self.style.WARNING('No users or rooms found!'))
            return

        # Conversation templates organized by room type
        conversation_templates = {
            'technology': [
                ["Just deployed my first microservice architecture!", "Nice! What tech stack did you use?", "Docker, Kubernetes, Node.js and PostgreSQL", "That's a solid choice. How's the performance?"],
                ["Anyone else excited about the new AI announcements?", "Which ones specifically?", "GPT-4 and the new Vision API", "The vision capabilities are mind-blowing!", "I'm already planning to integrate it into my app"],
                ["Quick question: React or Vue for a new project?", "Depends on your team's experience", "I'd go with React, larger community", "Vue has a gentler learning curve though", "Both are great, flip a coin! 😄"],
                ["DevOps folks, what's your favorite CI/CD tool?", "GitHub Actions for small projects", "Jenkins for enterprise stuff", "GitLab CI is underrated", "Azure DevOps is pretty solid too"],
            ],
            'gaming': [
                ["Just finished Baldur's Gate 3, what a masterpiece!", "Right? The character development is incredible", "I'm only on Act 2, no spoilers please!", "Take your time, it's worth savoring", "The voice acting is phenomenal"],
                ["Anyone up for some ranked matches tonight?", "What game?", "Valorant, I'm stuck in Gold", "I can duo with you", "Let's do it! Add me: ProGamer2023"],
                ["Indie game recommendation: Pizza Tower", "Never heard of it, what's it like?", "Think Wario Land meets Tony Hawk", "That... actually sounds amazing", "Just bought it, thanks for the rec!"],
                ["Retro gaming question: best console ever?", "SNES, hands down", "PlayStation 2 had the best library", "Can't beat the original Nintendo", "Genesis does what Nintendon't! 😎"],
            ],
            'creative': [
                ["Working on a new portrait series, any feedback?", "The lighting in the second one is perfect", "Love the color palette you chose", "Maybe try a different angle on the third?", "Thanks everyone, this is so helpful!"],
                ["Writer's block is killing me", "What genre are you working on?", "Sci-fi short story about time travel", "Try writing the ending first", "Or switch to a different scene for now", "Good ideas, I'll try that!"],
                ["Just finished my first oil painting!", "Congrats! What's the subject?", "A landscape from my hometown", "Oil is so forgiving for landscapes", "You should be proud, first ones are always special"],
                ["Anyone know good resources for learning digital art?", "Proko on YouTube is fantastic", "Ctrl+Paint has great fundamentals", "Don't forget to practice fundamentals", "Thanks! I'll check these out"],
            ],
            'social': [
                ["How's everyone's Monday going?", "Could use more coffee ☕", "Same here! Just got my third cup", "Monday blues are real", "At least it's almost lunch time"],
                ["What's the best thing that happened to you today?", "Found $20 in my old jacket!", "My cat finally let me pet her belly", "Got a compliment from a stranger", "These small wins matter so much!"],
                ["Random thought: why do we say 'after dark' when it's actually during dark?", "English is weird like that", "Same energy as 'why is abbreviated such a long word'", "Language evolution is fascinating", "Now I can't stop thinking about this"],
                ["Anyone else procrastinating right now?", "Yes! I have 3 assignments due tomorrow", "I'm supposed to be cleaning my room", "Procrastination is the thief of time", "But here we are, chatting instead 😅"],
            ],
            'learning': [
                ["Struggling with calculus, any tips?", "Khan Academy saved my life", "Practice, practice, practice", "Try to understand the concepts, not just memorize", "Happy to help if you have specific questions!"],
                ["Learning Python, what project should I build?", "Start with a simple calculator", "Web scraper is always fun", "Build something you'd actually use", "Todo app teaches you the basics well"],
                ["Book club update: we're reading 'Atomic Habits'", "Great choice! Very practical", "Already changed how I approach goals", "The 2-minute rule is genius", "Can't wait for our discussion next week"],
                ["Language exchange: I teach English, need Spanish help", "I can help! Native Spanish speaker here", "Perfect! When works for you?", "DM me, we can set up a schedule", "This community is so helpful!"],
            ],
        }

        # GIF messages for variety
        gif_messages = [
            '[GIF:{"url":"https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif","title":"Mind Blown","id":"3o7abKhOpu0NwenH3O"}]',
            '[GIF:{"url":"https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif","title":"Applause","id":"5VKbvrjxpVJCM"}]',
            '[GIF:{"url":"https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif","title":"Great Job","id":"26ufdipQqU2lhNA4g"}]',
            '[GIF:{"url":"https://media.giphy.com/media/1jkV5ifEE5EENHESRa/giphy.gif","title":"Thinking","id":"1jkV5ifEE5ENHESRa"}]',
        ]

        with transaction.atomic():
            total_messages = 0
            for room in rooms:
                # Determine room category for conversation templates
                room_category = 'social'  # default
                if room.category:
                    category_slug = room.category.slug
                    if category_slug in conversation_templates:
                        room_category = category_slug
                    elif 'tech' in category_slug.lower():
                        room_category = 'technology'
                    elif 'game' in category_slug.lower() or 'gaming' in category_slug.lower():
                        room_category = 'gaming'
                    elif 'creative' in category_slug.lower() or 'art' in category_slug.lower():
                        room_category = 'creative'
                    elif 'learn' in category_slug.lower() or 'education' in category_slug.lower():
                        room_category = 'learning'

                templates = conversation_templates.get(room_category, conversation_templates['social'])

                # Generate conversations for this room
                room_messages = 0
                for i in range(num_conversations):
                    # Pick a random conversation template
                    conversation = random.choice(templates)

                    # Pick random users for this conversation
                    conversation_users = random.sample(users, min(len(conversation), len(users)))

                    # Generate timestamps (spread over last 30 days)
                    base_time = timezone.now() - timedelta(days=random.randint(0, 30))

                    for j, message_text in enumerate(conversation):
                        user = conversation_users[j % len(conversation_users)]
                        timestamp = base_time + timedelta(minutes=j * random.randint(1, 10))

                        # Occasionally add a GIF message
                        if random.random() < 0.05:  # 5% chance
                            message_text = random.choice(gif_messages)

                        Message.objects.create(
                            user=user,
                            room=room,
                            content=message_text,
                            timestamp=timestamp
                        )
                        room_messages += 1
                        total_messages += 1

                self.stdout.write(f'💬 Generated {room_messages} messages for {room.display_name}')

            self.stdout.write(self.style.SUCCESS(f'✅ Generated {total_messages} total messages'))

    def add_reactions_to_messages(self):
        """Add realistic reactions to messages"""
        self.stdout.write('😊 Adding reactions to messages...')

        messages = Message.objects.all()
        users = list(User.objects.all())

        # Common emoji reactions
        emojis = ['❤️', '👍', '😂', '😮', '😢', '🔥', '✨', '🎉', '👏', '💯']

        reaction_count = 0

        # Add reactions to random messages (about 30% of messages get reactions)
        for message in random.sample(list(messages), min(len(messages), int(len(messages) * 0.3))):
            # Each message gets 1-5 reactions
            num_reactions = random.randint(1, 5)

            for _ in range(num_reactions):
                user = random.choice(users)
                emoji = random.choice(emojis)

                # Avoid duplicate reactions (same user, same emoji, same message)
                if not Reaction.objects.filter(message=message, user=user, emoji=emoji).exists():
                    Reaction.objects.create(
                        message=message,
                        user=user,
                        emoji=emoji
                    )
                    reaction_count += 1

        self.stdout.write(self.style.SUCCESS(f'✅ Added {reaction_count} reactions'))

    def create_meetups(self):
        """Create some meetups for rooms"""
        self.stdout.write('📅 Creating meetups...')

        rooms = list(Room.objects.filter(is_dm=False))
        users = list(User.objects.all())

        meetup_templates = [
            {
                'title': 'Coffee Chat Meetup',
                'location': 'Central Perk Café, Downtown',
                'description': 'Casual coffee meetup for the community! Come chat and meet fellow members.'
            },
            {
                'title': 'Game Night Tournament',
                'location': 'GameHub Gaming Lounge',
                'description': 'Board games, video games, and friendly competition. All skill levels welcome!'
            },
            {
                'title': 'Tech Talk & Networking',
                'location': 'Innovation Center, Tech District',
                'description': 'Lightning talks, networking, and discussions about the latest in tech.'
            },
            {
                'title': 'Art Gallery Walkthrough',
                'location': 'Metropolitan Art Museum',
                'description': 'Guided tour of the contemporary art exhibition. Meet other art enthusiasts!'
            },
            {
                'title': 'Book Club Discussion',
                'location': 'Cozy Corner Bookstore',
                'description': 'Monthly book discussion in a relaxed atmosphere. This month: "The Midnight Library"'
            },
            {
                'title': 'Hiking Adventure',
                'location': 'Pine Ridge Trail',
                'description': 'Moderate 5-mile hike with scenic views. Bring water and good shoes!'
            },
            {
                'title': 'Cooking Workshop',
                'location': 'Community Kitchen',
                'description': 'Learn to make homemade pasta! All ingredients provided.'
            },
        ]

        meetup_count = 0

        # Create 15-20 meetups across different rooms
        for _ in range(random.randint(15, 20)):
            room = random.choice(rooms)
            template = random.choice(meetup_templates)
            creator = random.choice(users)

            # Future dates (1-60 days from now)
            future_date = timezone.now() + timedelta(days=random.randint(1, 60))
            # Random time (10 AM to 8 PM)
            future_date = future_date.replace(
                hour=random.randint(10, 20),
                minute=random.choice([0, 15, 30, 45]),
                second=0,
                microsecond=0
            )

            meetup = Meetup.objects.create(
                title=template['title'],
                description=template['description'],
                datetime=future_date,
                location=template['location'],
                room=room,
                creator=creator
            )

            # Add some attendees (including creator)
            attendees = random.sample(users, random.randint(2, 8))
            if creator not in attendees:
                attendees.append(creator)

            meetup.attendees.set(attendees)
            meetup_count += 1

        self.stdout.write(self.style.SUCCESS(f'✅ Created {meetup_count} meetups'))
