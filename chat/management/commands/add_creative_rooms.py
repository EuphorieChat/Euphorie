from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta, datetime
import random
import json
from chat.models import Room, Message, Category, Reaction, Meetup
from django.db import transaction

class Command(BaseCommand):
    help = 'Generate super engaging rooms and realistic chat history with creative content'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear-rooms',
            action='store_true',
            help='Clear existing rooms before generating new ones',
        )
        parser.add_argument(
            '--clear-categories',
            action='store_true',
            help='Clear existing categories before generating new ones',
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
            default=75,
            help='Number of conversations to generate per room (default: 75)',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('🚀 Adding CREATIVE rooms and content to your existing community...'))

        if options['clear_categories']:
            self.clear_existing_categories()

        if options['clear_rooms']:
            self.clear_existing_rooms()

        if not options['chat_only']:
            self.create_categories()
            self.create_super_creative_rooms()

        if not options['rooms_only']:
            self.generate_engaging_chat_history(options['num_conversations'])
            self.add_realistic_reactions()
            self.create_exciting_meetups()

        self.stdout.write(self.style.SUCCESS(f'✨ CREATIVE content added! Your community just got way more interesting! ✨'))

        # Count total rooms for user information
        total_rooms = Room.objects.filter(is_dm=False).count()
        self.stdout.write(self.style.SUCCESS(f'📊 Total rooms in your community: {total_rooms}'))

    def clear_existing_categories(self):
        """Clear existing categories"""
        self.stdout.write('🧹 Clearing existing categories...')
        Category.objects.all().delete()
        self.stdout.write(self.style.SUCCESS('✅ Existing categories cleared'))

    def clear_existing_rooms(self):
        """Clear existing rooms (except DM rooms)"""
        self.stdout.write('🧹 Clearing existing rooms...')
        Room.objects.filter(is_dm=False).delete()
        self.stdout.write(self.style.SUCCESS('✅ Existing rooms cleared'))

    def create_categories(self):
        """Create engaging categories"""
        self.stdout.write('📁 Setting up creative categories...')

        # Use the existing method and add more categories
        Category.create_default_categories()

        additional_categories = [
            {'name': 'Memes & Humor', 'slug': 'memes', 'icon': '😂'},
            {'name': 'Crypto & NFTs', 'slug': 'crypto', 'icon': '🚀'},
            {'name': 'Mental Health', 'slug': 'mental-health', 'icon': '🧠'},
            {'name': 'Pets & Animals', 'slug': 'pets', 'icon': '🐕'},
            {'name': 'Conspiracy Fun', 'slug': 'conspiracy', 'icon': '👁️'},
            {'name': 'Dating & Relationships', 'slug': 'dating', 'icon': '💝'},
            {'name': 'Productivity Hacks', 'slug': 'productivity', 'icon': '⚡'},
            {'name': 'Weird News', 'slug': 'weird-news', 'icon': '🤯'},
        ]

        for cat_data in additional_categories:
            try:
                category, created = Category.objects.get_or_create(
                    name=cat_data['name'],
                    defaults={
                        'slug': cat_data['slug'],
                        'icon': cat_data['icon']
                    }
                )
                if created:
                    self.stdout.write(f'📁 Created category: {cat_data["name"]} {cat_data["icon"]}')
            except Exception as e:
                self.stdout.write(f'⚠️  Category error: {str(e)}')

    def create_super_creative_rooms(self):
        """Create ultra-engaging and creative rooms"""
        users = list(User.objects.all())
        if len(users) < 10:
            self.stdout.write(self.style.WARNING('⚠️  You need more users for realistic rooms. Consider creating more users first.'))
            return

        created_count = 0
        skipped_count = 0

        # Super creative and trendy room ideas
        creative_rooms = [
            # Technology & Innovation
            {'name': 'ai-taking-over-help', 'display_name': 'AI is Taking Over... Help!', 'category': 'technology',
             'description': 'Discuss AI developments, share AI fails, and plan for our robot overlord future'},
            {'name': 'code-therapy-support-group', 'display_name': 'Code Therapy Support Group', 'category': 'technology',
             'description': 'For when your code makes you cry. We understand your pain.'},
            {'name': 'startup-graveyard', 'display_name': 'Startup Graveyard', 'category': 'business',
             'description': 'Share your failed startup ideas and learn from others disasters'},
            {'name': 'tiktok-vs-reality', 'display_name': 'TikTok vs Reality', 'category': 'social',
             'description': 'When social media meets real life - the chaos unfolds'},
            {'name': 'stackoverflow-confessions', 'display_name': 'Stack Overflow Confessions', 'category': 'technology',
             'description': 'Admit your copy-paste sins and find absolution among fellow developers'},

            # Gaming & Entertainment
            {'name': 'gaming-addiction-anonymous', 'display_name': 'Gaming Addiction Anonymous', 'category': 'gaming',
             'description': 'Hi, my name is... and I have 3000 hours in this game'},
            {'name': 'retro-nostalgia-feels', 'display_name': 'Retro Nostalgia Feels', 'category': 'gaming',
             'description': 'Remember when games came with actual manuals? Pepperidge Farm remembers.'},
            {'name': 'netflix-what-to-watch', 'display_name': 'Netflix: What to Watch?', 'category': 'entertainment',
             'description': 'Spend 2 hours deciding what to watch, then fall asleep 10 minutes in'},
            {'name': 'cringe-childhood-memories', 'display_name': 'Cringe Childhood Memories', 'category': 'social',
             'description': 'Share your most embarrassing childhood moments. We all have them.'},
            {'name': 'backlog-shame-spiral', 'display_name': 'Backlog Shame Spiral', 'category': 'gaming',
             'description': '400 games unplayed but let me buy this new one on sale'},

            # Lifestyle & Modern Life
            {'name': 'adulting-is-hard', 'display_name': 'Adulting is Hard', 'category': 'social',
             'description': 'Why did nobody teach us how to do taxes or make friends as adults?'},
            {'name': 'existential-crisis-3am', 'display_name': 'Existential Crisis at 3AM', 'category': 'mental-health',
             'description': 'For those deep 3AM thoughts about life, universe, and everything'},
            {'name': 'procrastination-station', 'display_name': 'Procrastination Station', 'category': 'productivity',
             'description': 'Ill do it tomorrow... said everyone here, probably'},
            {'name': 'plant-parent-struggles', 'display_name': 'Plant Parent Struggles', 'category': 'social',
             'description': 'RIP to all the plants we killed with love (and overwatering)'},
            {'name': 'social-battery-empty', 'display_name': 'Social Battery: Empty', 'category': 'mental-health',
             'description': 'When you want to socialize but also want to hide under a blanket forever'},

            # Finance & Crypto
            {'name': 'broke-millennial-club', 'display_name': 'Broke Millennial Club', 'category': 'business',
             'description': 'Avocado toast destroyed our house-buying dreams, apparently'},
            {'name': 'crypto-to-the-moon', 'display_name': '🚀 Crypto to the Moon', 'category': 'crypto',
             'description': 'Diamond hands, paper hands, and everything in between'},
            {'name': 'budgeting-for-dummies', 'display_name': 'Budgeting for Dummies', 'category': 'business',
             'description': 'Why is coffee so expensive and why do I keep buying it?'},
            {'name': 'nft-recovery-support', 'display_name': 'NFT Recovery Support', 'category': 'crypto',
             'description': 'That expensive JPEG was supposed to be our retirement fund...'},

            # Health & Wellness
            {'name': 'gym-motivation-needed', 'display_name': 'Gym Motivation Needed', 'category': 'health',
             'description': 'New year, new me... for the 47th time this year'},
            {'name': 'cooking-disasters-club', 'display_name': 'Cooking Disasters Club', 'category': 'food',
             'description': 'Burnt water? Set off smoke alarm making cereal? Youre home here.'},
            {'name': 'sleep-schedule-what-schedule', 'display_name': 'Sleep Schedule? What Schedule?', 'category': 'health',
             'description': 'Its 4AM and Im watching TikToks about productivity. Help.'},
            {'name': 'meditation-but-make-it-chaos', 'display_name': 'Meditation But Make It Chaos', 'category': 'health',
             'description': 'Mindfulness for people whose minds are never ful... wait, what?'},

            # Relationships & Dating
            {'name': 'dating-app-horror-stories', 'display_name': 'Dating App Horror Stories', 'category': 'dating',
             'description': 'Share your worst dating app experiences. Therapy through sharing.'},
            {'name': 'single-and-loving-it', 'display_name': 'Single and Loving It', 'category': 'dating',
             'description': 'Pizza never breaks your heart. Well, except your diet.'},
            {'name': 'relationship-advice-from-singles', 'display_name': 'Relationship Advice from Singles', 'category': 'dating',
             'description': 'The best relationship advice comes from people not in relationships'},
            {'name': 'toxic-trait-confessions', 'display_name': 'Toxic Trait Confessions', 'category': 'dating',
             'description': 'We all have them. Lets own them and work on them together.'},

            # Hobbies & Interests
            {'name': 'i-bought-it-never-used-it', 'display_name': 'I Bought It, Never Used It', 'category': 'social',
             'description': 'Share your impulse purchases gathering dust. Were all guilty.'},
            {'name': 'conspiracy-theories-for-fun', 'display_name': 'Conspiracy Theories for Fun', 'category': 'conspiracy',
             'description': 'Birds arent real, change my mind. (Keep it light and fun!)'},
            {'name': 'weird-news-of-the-day', 'display_name': 'Weird News of the Day', 'category': 'weird-news',
             'description': 'Florida man strikes again, and other bizarre news stories'},
            {'name': 'conspiracy-bingo-night', 'display_name': 'Conspiracy Bingo Night', 'category': 'conspiracy',
             'description': 'Finland doesnt exist, Wyoming is fake, birds are drones - BINGO!'},

            # Creative & Artistic
            {'name': 'creative-block-support', 'display_name': 'Creative Block Support', 'category': 'creative',
             'description': 'Staring at blank canvas/page/screen for 3 hours straight'},
            {'name': 'pinterest-reality-check', 'display_name': 'Pinterest vs Reality Check', 'category': 'creative',
             'description': 'Nailed it! ...or did we? Share your DIY disasters.'},
            {'name': 'art-therapy-session', 'display_name': 'Art Therapy Session', 'category': 'creative',
             'description': 'Create, share, and heal through artistic expression'},
            {'name': 'craft-supply-addiction', 'display_name': 'Craft Supply Addiction', 'category': 'creative',
             'description': 'I have 47 colors of the same paint but I NEED this new shade'},

            # Pets & Animals
            {'name': 'pets-judging-humans', 'display_name': 'Pets Judging Humans', 'category': 'pets',
             'description': 'That look your pet gives you when you talk to them like babies'},
            {'name': 'pet-tax-photos-required', 'display_name': 'Pet Tax (Photos Required)', 'category': 'pets',
             'description': 'You mentioned your pet, now you must pay the photo tax'},
            {'name': 'why-cats-are-plotting', 'display_name': 'Why Cats Are Plotting', 'category': 'pets',
             'description': 'Evidence that cats are planning world domination. Discuss.'},

            # Memes & Humor
            {'name': 'meme-lords-assemble', 'display_name': 'Meme Lords Assemble', 'category': 'memes',
             'description': 'Fresh memes, dank memes, and the occasional wholesome meme'},
            {'name': 'dad-jokes-anonymous', 'display_name': 'Dad Jokes Anonymous', 'category': 'memes',
             'description': 'Hi, Im dad. (And other jokes that make people groan)'},
            {'name': 'gen-z-explaining-things', 'display_name': 'Gen Z Explaining Things', 'category': 'social',
             'description': 'No cap, this slaps different. Translation services available.'},
            {'name': 'millennial-translator', 'display_name': 'Millennial Translator', 'category': 'social',
             'description': 'Explaining Gen Z slang to confused millennials since 2020'},

            # Work & Career
            {'name': 'corporate-buzzword-bingo', 'display_name': 'Corporate Buzzword Bingo', 'category': 'business',
             'description': 'Synergy! Paradigm shift! Circle back! *eye roll*'},
            {'name': 'work-from-home-reality', 'display_name': 'Work From Home Reality', 'category': 'productivity',
             'description': 'Professional on top, pajamas on bottom. We get it.'},
            {'name': 'job-interview-prep-panic', 'display_name': 'Job Interview Prep Panic', 'category': 'business',
             'description': 'Tell me about yourself... *internal screaming*'},
            {'name': 'meeting-that-should-be-email', 'display_name': 'Meeting That Should Be An Email', 'category': 'business',
             'description': 'Could have been solved in 2 sentences but here we are for an hour'},

            # Travel & Adventure
            {'name': 'travel-fails-and-wins', 'display_name': 'Travel Fails and Wins', 'category': 'travel',
             'description': 'Missed flights, amazing discoveries, and everything in between'},
            {'name': 'staycation-ideas', 'display_name': 'Staycation Ideas', 'category': 'travel',
             'description': 'Exploring your own city like a tourist. Hidden gems await!'},
            {'name': 'travel-anxiety-support', 'display_name': 'Travel Anxiety Support', 'category': 'travel',
             'description': 'What if I miss my flight? What if my luggage explodes? Lets panic together!'},

            # Science & Learning
            {'name': 'explain-like-im-five', 'display_name': 'Explain Like Im Five', 'category': 'science',
             'description': 'Complex topics made simple. No PhD required to understand!'},
            {'name': 'random-wikipedia-rabbit-holes', 'display_name': 'Random Wikipedia Rabbit Holes', 'category': 'learning',
             'description': 'Started reading about cats, ended up learning about medieval warfare'},
            {'name': 'shower-science-thoughts', 'display_name': 'Shower Science Thoughts', 'category': 'science',
             'description': 'Deep scientific thoughts that hit you while shampooing'},

            # Philosophy & Deep Thoughts
            {'name': 'shower-thoughts-central', 'display_name': 'Shower Thoughts Central', 'category': 'social',
             'description': 'Those random deep thoughts that hit you in the shower'},
            {'name': 'life-advice-from-strangers', 'display_name': 'Life Advice from Strangers', 'category': 'social',
             'description': 'Sometimes the best advice comes from people who dont know you'},
            {'name': 'overthinking-olympics', 'display_name': 'Overthinking Olympics', 'category': 'mental-health',
             'description': 'Competitive overthinking. Current record: 47 scenarios for one text message'},

            # Food & Cooking Adventures
            {'name': 'ramen-isn-t-a-food-group', 'display_name': 'Ramen Isnt A Food Group', 'category': 'food',
             'description': 'Adult nutrition advice for people who think cereal counts as dinner'},
            {'name': 'baking-show-vs-reality', 'display_name': 'Baking Show vs Reality', 'category': 'food',
             'description': 'They make it look so easy... narrator: it was not easy'},
            {'name': 'caffeine-dependency-support', 'display_name': 'Caffeine Dependency Support', 'category': 'food',
             'description': 'Step 1: Admit you have a problem. Step 2: Make coffee to think about it'},

            # Modern Life Struggles
            {'name': 'subscription-service-trapped', 'display_name': 'Subscription Service Trapped', 'category': 'business',
             'description': 'How did I end up paying for 17 services I forgot I had?'},
            {'name': 'password-manager-anxiety', 'display_name': 'Password Manager Anxiety', 'category': 'technology',
             'description': 'What if I forget the master password? WHAT THEN?'},
            {'name': 'notification-overwhelm', 'display_name': 'Notification Overwhelm', 'category': 'mental-health',
             'description': '47 unread notifications and each one gives me anxiety'},
        ]

        for room_data in creative_rooms:
            try:
                # Get or create category
                category = self.get_or_create_category(room_data['category'])
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
                    self.stdout.write(f'🏠✨ Created CREATIVE room: {room.display_name}')
                else:
                    self.stdout.write(f'🏠 Room already exists, skipping: {room.display_name}')

            except Exception as e:
                self.stdout.write(f'❌ Error creating room {room_data["name"]}: {str(e)}')

    def get_or_create_category(self, category_slug):
        """Helper to get or create category"""
        try:
            return Category.objects.get(slug=category_slug)
        except Category.DoesNotExist:
            # Map common slugs to category names
            category_mapping = {
                'technology': 'Technology',
                'business': 'Business',
                'gaming': 'Gaming',
                'entertainment': 'Movies & TV',
                'social': 'Social',
                'mental-health': 'Mental Health',
                'productivity': 'Productivity Hacks',
                'health': 'Health & Wellness',
                'food': 'Food & Cooking',
                'dating': 'Dating & Relationships',
                'conspiracy': 'Conspiracy Fun',
                'weird-news': 'Weird News',
                'creative': 'Creative',
                'pets': 'Pets & Animals',
                'memes': 'Memes & Humor',
                'crypto': 'Crypto & NFTs',
                'travel': 'Travel',
                'science': 'Science',
                'learning': 'Education',
            }

            category_name = category_mapping.get(category_slug, category_slug.title())

            # Try to get existing category by name first
            try:
                return Category.objects.get(name=category_name)
            except Category.DoesNotExist:
                # Create new category if it doesn't exist
                try:
                    return Category.objects.create(
                        name=category_name,
                        slug=category_slug,
                        icon='🌟'
                    )
                except Exception as e:
                    # If creation fails, try to find any similar category
                    similar_categories = Category.objects.filter(name__icontains=category_slug.replace('-', ' '))
                    if similar_categories.exists():
                        return similar_categories.first()
                    # Last resort: return a default category
                    return Category.objects.get_or_create(name='Other', defaults={'slug': 'other', 'icon': '🌟'})[0]

    def generate_engaging_chat_history(self, num_conversations):
        """Generate super realistic and engaging chat conversations"""
        self.stdout.write('💬 Generating ENGAGING chat conversations for new rooms...')

        users = list(User.objects.all())

        # Only get rooms created in the last few minutes (newly created ones)
        recent_time = timezone.now() - timedelta(minutes=5)
        new_rooms = list(Room.objects.filter(is_dm=False, created_at__gte=recent_time))

        # If no new rooms, get all rooms (fallback for existing command usage)
        if not new_rooms:
            new_rooms = list(Room.objects.filter(is_dm=False))
            self.stdout.write('💬 No new rooms detected, generating content for all rooms...')
        else:
            self.stdout.write(f'💬 Found {len(new_rooms)} newly created rooms to populate...')

        if not users or not new_rooms:
            self.stdout.write(self.style.WARNING('No users or rooms found!'))
            return

        # Enhanced conversation templates with modern, realistic content
        conversation_templates = {
            'technology': [
                ["Just saw ChatGPT write better code than me 😭", "Welcome to 2024, my friend", "At least it can't debug my life choices", "Give it time...", "AI: *takes notes*"],
                ["Anyone else getting imposter syndrome from all these AI tools?", "Every single day", "I feel like a fraud and I've been coding for 10 years", "Same! ChatGPT makes me question everything", "Maybe we should become AI prompt engineers instead 🤷‍♂️"],
                ["My code worked on the first try today", "Impossible", "Screenshot or it didn't happen", "What dark magic did you use?", "Plot twist: it was Hello World"],
                ["Spent 6 hours debugging. The problem was a missing semicolon.", "F in the chat", "This is why I have trust issues", "Classic! We've all been there", "Semicolons are the bane of my existence"],
                ["Just deployed to production on a Friday", "You absolute madman", "Say goodbye to your weekend", "Famous last words", "It's been nice knowing you 🪦"],
            ],
            'gaming': [
                ["Just spent 40 hours on this indie game and I'm emotionally destroyed", "Which one broke your heart this time?", "Probably something with pixel art and depression", "Let me guess... it made you cry?", "Why do the best games hurt the most? 😢"],
                ["My gaming backlog is longer than my life expectancy", "I have 400+ games on Steam and play the same 3", "The paradox of choice is real", "At least we're prepared for retirement", "Bold of you to assume we'll retire"],
                ["Raid night got cancelled because someone's dog ate their internet cable", "That's... oddly specific", "Dogs: the real raid bosses", "Better excuse than 'my mom made dinner'", "Plot twist: the dog is actually a gaming prodigy"],
                ["Finally beat that boss after 47 attempts", "CONGRATS! Which one finally fell?", "The one that haunts my dreams", "47? Those are rookie numbers 😏", "Time to celebrate with... the next impossible boss"],
                ["Anyone else feel personally attacked by tutorial levels?", "If I can't figure out basic jumping, I'm doomed", "When the tutorial is harder than the actual game", "Modern games: Press X to have an existential crisis", "At least we have YouTube guides for everything"],
            ],
            'social': [
                ["Why do I have social anxiety but also crave human interaction?", "The eternal paradox of our generation", "I want friends but also want to hide forever", "Social media makes it worse somehow", "Same energy: hungry but nothing sounds good"],
                ["Made eye contact with a stranger today. Almost said 'you too' when they said good morning", "Classic awkward human moment", "We're all just winging it, aren't we?", "Social skills.exe has stopped working", "At least you didn't finger-gun them"],
                ["My phone died and I had to make small talk with actual humans", "Thoughts and prayers", "How did people survive before smartphones?", "They probably had better social skills", "Breaking: Local millennial learns to converse without memes"],
                ["Realized I've been wearing my shirt inside out all day", "Fashion icon 💅", "That's called making a statement", "Been there! Confidence is key", "As long as you owned it"],
                ["Why do I overthink everything I say 0.3 seconds after saying it?", "Brain: 'That was weird, let's replay it 847 times'", "The anxiety spiral is real", "We're our own worst critics", "At least we're self-aware? ...right?"],
            ],
            'memes': [
                ["When you realize you're the comic relief in your friend group", "Better than being the dramatic one", "I'm the cautionary tale friend", "Every friend group needs a jester 🃏", "My life is basically a meme at this point"],
                ["POV: You're explaining a meme to your parents", "*internal screaming*", "It's not funny anymore when you have to explain it", "Mom: 'Why is the dog on fire?' Me: 'It's fine, this is fine'", "Generational humor gap is real"],
                ["That moment when a meme describes your life perfectly", "When did memes become so relatable?", "Memes are the language of our people", "Sometimes I communicate purely in meme references", "We're living in a simulation and memes are the code"],
                ["Just spent 2 hours scrolling through memes instead of being productive", "Those are rookie numbers", "Memes > adulting", "It's called research, thank you very much", "Productivity is overrated anyway"],
                ["When someone doesn't laugh at your meme reference 💀", "Uncultured swine", "Not everyone can appreciate high-quality content", "Their loss, honestly", "Time to find new friends"],
            ],
            'mental-health': [
                ["Friendly reminder that it's okay to not be okay", "Thank you, needed to hear this today ❤️", "Some days are just survival days", "Taking it one day at a time", "We're all doing our best with what we have"],
                ["Therapy is expensive, but so is staying broken", "Insurance really needs to cover this better", "Mental health should be a priority, not a luxury", "Investing in yourself is never wasted money", "Your future self will thank you"],
                ["Small wins today: I showered AND changed clothes", "That's actually huge! Proud of you", "Those days when basic self-care feels like climbing Everest", "Every small step counts 💙", "Self-care isn't selfish"],
                ["Anxiety brain: 'What if everyone secretly hates you?' Logic brain: 'That's statistically impossible'", "Why does anxiety brain always win the argument?", "My anxiety has anxiety at this point", "Rational thoughts? In THIS economy?", "Brain: 'Let me overthink this perfectly normal interaction'"],
                ["Anyone else feel like they're just pretending to be an adult?", "Fake it till you make it, right?", "We're all just kids in grown-up costumes", "Adulting is 90% googling how to do things", "When do we start feeling like real adults? Asking for a friend..."],
            ],
            'dating': [
                ["Dating apps are basically window shopping for humans", "And somehow I'm always in the clearance section", "Swipe right for existential dread", "Why is everyone either a gym enthusiast or loves hiking?", "My bio: 'Fluent in sarcasm, expert at overthinking'"],
                ["First date went well! We both forgot each other's names halfway through", "As long as you both forgot, it's fine 😂", "Modern romance at its finest", "Did you exchange numbers or just awkward stares?", "Plot twist: you're perfect for each other"],
                ["Being single is great until you need someone to kill a spider", "Or open a pickle jar", "Or reach something on a high shelf", "Or tell you if that text sounds too needy", "Single life: 90% independence, 10% mild terror"],
                ["My love language is memes and snacks", "Are you... me?", "Finally, someone who speaks my language", "Add Netflix and you've described my ideal relationship", "Where do I swipe right on this energy?"],
                ["Relationship status: committed to avoiding commitment", "The commitment to non-commitment is real", "Why choose when you can be confused forever?", "Freedom is just another word for 'eating cereal for dinner'", "Single and ready to... stay single"],
            ],
            'pets': [
                ["My cat judges me harder than my therapist", "Cats are just furry therapists who don't take insurance", "That disappointed cat stare hits different", "At least cats are honest about their opinions", "My cat's feedback is brutal but necessary"],
                ["Dog: *exists* Me: 'WHO'S A GOOD BOY?!'", "Dogs bring out our inner toddler", "Every dog is the best dog, don't @ me", "Dogs are proof that pure joy exists", "We don't deserve dogs but here we are"],
                ["Spent $200 on pet toys. Pet prefers the cardboard box.", "Cats have entered the chat", "Expensive toy < empty toilet paper roll", "They know exactly what they're doing", "Pets are basically expensive comedians"],
                ["My pet has more personality than most humans I know", "And better communication skills", "They're just honest about their needs", "No small talk, just vibes", "Pets: the ultimate life coaches"],
                ["Vet bill was more expensive than my car payment", "Pets: priceless. Also: literally priceless.", "Worth every penny though", "They own us, we just pay rent", "Love is expensive, apparently"],
            ],
            'food': [
                ["Cooked a meal without burning anything. I'm basically Gordon Ramsay now.", "Look at you, culinary genius! 👨‍🍳", "What's your secret? Asking for a friend who burns water", "Next step: not setting off the smoke alarm", "Careful, don't let the success go to your head"],
                ["Ordered takeout while standing in my fully stocked kitchen", "The audacity! ...also same", "Cooking requires effort, ordering requires apps", "Your kitchen looks nice though", "Sometimes supporting local business is more important 😏"],
                ["Made coffee so strong it made me question my life choices", "That's not coffee, that's rocket fuel", "When you can feel your heartbeat in your eyeballs", "Coffee: legal anxiety in a cup", "At least you're awake for your existential crisis"],
                ["Pinterest recipe: 30 minutes. Reality: 3 hours and a minor breakdown", "Pinterest lies to us all", "Where do they find these magical kitchens?", "Pinterest: Instagram for disappointment", "My kitchen disasters could have their own show"],
                ["Meal prep Sunday turned into 'eat cereal all week' Monday", "The struggle is real", "Planning vs. reality: there is no correlation", "Cereal is versatile! Breakfast, lunch, dinner...", "At least cereal doesn't judge your life choices"],
            ],
            'crypto': [
                ["Bought the dip. It kept dipping. Send help.", "Instructions unclear, bought more dip", "The dip has layers, like an onion", "Diamond hands or just really bad at timing?", "Plot twist: it's all dip"],
                ["Explaining crypto to my parents was harder than explaining memes", "Both are basically digital nonsense to them", "Dad: 'So it's imaginary money?' Me: 'Well...'", "Wait till they find out about NFTs", "Money is just a social construct anyway"],
                ["Portfolio down 80% but I'm still bullish", "This is fine 🔥🐶🔥", "HODL life chose me", "Can't lose money if you never sell *taps head*", "Crypto: teaching patience through suffering"],
                ["When lambo? Answer: Never lambo.", "Maybe bike? Bike is good too", "Lambo was the friends we made along the way", "Ramen tastes better when it's all you can afford", "The real treasure was the financial anxiety we gained"],
                ["Gas fees cost more than my transaction", "Ethereum miners eating lobster while we eat ramen", "Paying $50 to move $10 makes perfect sense", "Math was never my strong suit anyway", "It's not about the money, it's about the principle!"],
            ],
            'conspiracy': [
                ["Birds aren't real and you can't convince me otherwise", "Government drones everywhere!", "Have you ever seen a baby pigeon? Exactly.", "They charge on power lines, wake up sheeple", "Finally, someone who gets it! 🕊️🤖"],
                ["Finland doesn't exist, change my mind", "Just a conspiracy by Big Geography", "It's all just east Sweden and west Russia", "Nokia was made in east Sweden, obviously", "The Finnish 'language' is just gibberish they made up"],
                ["Wyoming isn't real. It's just a government rectangle", "Population: 3 people and some tumbleweeds", "Ever met anyone from Wyoming? Didn't think so", "It's where they keep the spare birds", "Wyoming: America's best kept non-secret"],
                ["Mattress stores are money laundering fronts", "How else do they stay in business?", "Who buys mattresses that often?", "Big Mattress is controlling our sleep", "They're in cahoots with Big Pillow"],
                ["The moon landing was filmed... on the moon", "Plot twist: it was real all along", "Stanley Kubrick was just really dedicated", "The conspiracy was making us think it was fake", "Reverse psychology at its finest"],
            ]
        }

        # Extended reaction emojis for more variety
        reaction_emojis = [
            '❤️', '👍', '😂', '😮', '😢', '🔥', '✨', '🎉', '👏', '💯',
            '🤔', '😍', '🤣', '💀', '☠️', '🫶', '💅', '✋', '👀', '🙈',
            '🤡', '👑', '💎', '🚀', '⚡', '🌟', '💫', '🎯', '🎭', '🎪'
        ]

        # Fun GIF messages with realistic context
        contextual_gifs = [
            {'url': 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif', 'title': 'Mind Blown', 'context': ['amazing fact', 'plot twist', 'realization']},
            {'url': 'https://media.giphy.com/media/5VKbvrjxpVJCM/giphy.gif', 'title': 'Applause', 'context': ['achievement', 'good news', 'success']},
            {'url': 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif', 'title': 'Great Job', 'context': ['encouragement', 'celebration']},
            {'url': 'https://media.giphy.com/media/1jkV5ifEE5ENHESRa/giphy.gif', 'title': 'Thinking', 'context': ['contemplation', 'confusion', 'planning']},
            {'url': 'https://media.giphy.com/media/l3q2K5jinAlChoCLS/giphy.gif', 'title': 'Crying Laughing', 'context': ['hilarious', 'too funny', 'peak comedy']},
            {'url': 'https://media.giphy.com/media/xT9IgHCTfp8CRshfQk/giphy.gif', 'title': 'This is Fine', 'context': ['disaster', 'chaos', 'everything wrong']},
        ]

        with transaction.atomic():
            total_messages = 0
            for room in new_rooms:
                try:
                    # Match room category for appropriate conversations
                    room_category = self.categorize_room(room)
                    templates = conversation_templates.get(room_category, conversation_templates['social'])

                    room_messages = 0
                    for i in range(num_conversations):
                        try:
                            # Pick conversation template
                            conversation = random.choice(templates)
                            conversation_users = random.sample(users, min(len(conversation), len(users)))

                            # Random time spread over last 45 days for more realistic distribution
                            base_time = timezone.now() - timedelta(days=random.randint(0, 45))

                            for j, message_text in enumerate(conversation):
                                user = conversation_users[j % len(conversation_users)]

                                # More realistic time gaps between messages
                                time_gap = random.choice([
                                    random.randint(1, 3),    # Quick responses (60%)
                                    random.randint(5, 15),   # Normal gap (30%)
                                    random.randint(30, 120)  # Longer gap (10%)
                                ])
                                timestamp = base_time + timedelta(minutes=j * time_gap)

                                # Occasionally add contextual GIFs (8% chance)
                                if random.random() < 0.08:
                                    # Pick a GIF based on message context
                                    suitable_gifs = [gif for gif in contextual_gifs
                                                   if any(context in message_text.lower() for context in gif['context'])]
                                    if suitable_gifs:
                                        gif = random.choice(suitable_gifs)
                                        message_text = f'[GIF:{{"url":"{gif["url"]}","title":"{gif["title"]}","id":"generated"}}]'

                                # Create message
                                Message.objects.create(
                                    user=user,
                                    room=room,
                                    content=message_text,
                                    timestamp=timestamp
                                )
                                room_messages += 1
                                total_messages += 1

                        except Exception as e:
                            self.stdout.write(f'⚠️  Error creating conversation {i+1} in {room.display_name}: {str(e)}')
                            continue

                    self.stdout.write(f'💬 Generated {room_messages} engaging messages for {room.display_name}')

                except Exception as e:
                    self.stdout.write(f'❌ Error processing room {room.display_name}: {str(e)}')
                    continue

            self.stdout.write(self.style.SUCCESS(f'✅ Generated {total_messages} total engaging messages!'))

    def categorize_room(self, room):
        """Determine conversation category for room"""
        room_name = room.name.lower()

        # Map room names to conversation categories
        if any(word in room_name for word in ['ai', 'code', 'tech', 'startup', 'crypto', 'wifi', 'password']):
            return 'technology'
        elif any(word in room_name for word in ['game', 'gaming', 'retro', 'netflix', 'backlog', 'rage']):
            return 'gaming'
        elif any(word in room_name for word in ['meme', 'dad-joke', 'cringe', 'conspiracy', 'gen-z', 'millennial']):
            return 'memes'
        elif any(word in room_name for word in ['mental', 'therapy', 'anxiety', 'existential', 'social-battery', 'overthinking']):
            return 'mental-health'
        elif any(word in room_name for word in ['dating', 'relationship', 'single', 'toxic-trait']):
            return 'dating'
        elif any(word in room_name for word in ['pet', 'dog', 'cat', 'animal', 'nonna']):
            return 'pets'
        elif any(word in room_name for word in ['food', 'cooking', 'coffee', 'ramen', 'curry', 'jollof', 'baguette', 'tacos', 'sushi', 'kimchi', 'leftovers']):
            # Check if it's a cultural food room
            if any(word in room_name for word in ['french', 'italian', 'korean', 'desi', 'jollof', 'lebanese', 'argentinian', 'ethiopian', 'polish', 'cuban', 'turkish', 'grandma', 'nonna', 'cultural']):
                return 'food-cultural'
            return 'food'
        elif any(word in room_name for word in ['crypto', 'moon', 'broke', 'nft', 'subscription']):
            return 'crypto'
        elif any(word in room_name for word in ['culture', 'expat', 'heritage', 'diaspora', 'translation', 'language', 'global', 'third-culture', 'homesick']):
            return 'social'  # Cultural rooms use social templates but could be enhanced
        else:
            return 'social'

    def add_realistic_reactions(self):
        """Add more realistic and varied reactions"""
        self.stdout.write('😊 Adding realistic reactions...')

        messages = Message.objects.all()
        users = list(User.objects.all())

        # More realistic emoji distribution with cultural elements
        common_emojis = ['❤️', '👍', '😂', '💯', '🔥']  # 60% of reactions
        uncommon_emojis = ['😮', '😢', '✨', '🎉', '👏', '🤔', '😍', '🤣', '💀', '🫶', '🍜', '🌮', '☕']  # 35%
        rare_emojis = ['☠️', '💅', '✋', '👀', '🙈', '🤡', '👑', '💎', '🚀', '⚡', '🌍', '🥺', '🤯']  # 5%

        reaction_count = 0

        # React to 45% of messages (more realistic)
        for message in random.sample(list(messages), min(len(messages), int(len(messages) * 0.45))):
            # Weighted emoji selection
            emoji_pool = (common_emojis * 12 + uncommon_emojis * 7 + rare_emojis * 1)

            # Each message gets 1-4 reactions (weighted toward fewer reactions)
            num_reactions = random.choices([1, 2, 3, 4], weights=[50, 30, 15, 5])[0]

            # Pick different users for reactions
            reacting_users = random.sample(users, min(num_reactions, len(users)))

            for user in reacting_users:
                emoji = random.choice(emoji_pool)

                # Avoid duplicate reactions
                if not Reaction.objects.filter(message=message, user=user, emoji=emoji).exists():
                    Reaction.objects.create(
                        message=message,
                        user=user,
                        emoji=emoji
                    )
                    reaction_count += 1

        self.stdout.write(self.style.SUCCESS(f'✅ Added {reaction_count} realistic reactions'))

    def create_exciting_meetups(self):
        """Create creative and engaging meetups"""
        self.stdout.write('📅 Creating exciting meetups...')

        rooms = list(Room.objects.filter(is_dm=False))
        users = list(User.objects.all())

        creative_meetup_templates = [
            # Original creative meetups
            {
                'title': 'Meme Creation Workshop',
                'location': 'Discord Voice Channel #creativity',
                'description': 'Learn to make dank memes! No artistic skills required, just terrible humor.'
            },
            {
                'title': 'Existential Crisis Coffee Hour',
                'location': 'Existential Café (Virtual)',
                'description': 'Discuss life, the universe, and why we chose computer science. Therapy not included.'
            },
            {
                'title': 'Pet Photo Contest & Show',
                'location': 'Pet Paradise Community Center',
                'description': 'Bring photos of your pets! Winner gets ultimate bragging rights and pet treats.'
            },
            {
                'title': 'Cooking Disaster Recovery Workshop',
                'location': 'Community Kitchen (Fire Extinguishers Ready)',
                'description': 'Learn to cook without burning down the kitchen. Results not guaranteed.'
            },
            {
                'title': 'Crypto Therapy Group Session',
                'location': 'The Dip Recovery Center',
                'description': 'Share your losses, celebrate small wins, plan for the next bull run.'
            },
            {
                'title': 'Adulting 101: Taxes and Tears',
                'location': 'Adult Learning Center',
                'description': 'Learn adult things our schools never taught us. Tissues provided.'
            },
            {
                'title': 'Gaming Tournament of Shame',
                'location': 'GameZone Arcade',
                'description': 'Compete in games you\'re terrible at. Winning is optional, fun is mandatory.'
            },
            {
                'title': 'Procrastination Support Meeting',
                'location': 'TBD (We\'ll figure it out later)',
                'description': 'Meet other professional procrastinators. We\'ll plan it... eventually.'
            },
            {
                'title': 'Plant Parent Anonymous',
                'location': 'Green Thumb Nursery',
                'description': 'Share your plant murder stories and learn to keep things alive.'
            },
            {
                'title': 'AI vs Humans: Trivia Night',
                'location': 'Tech Hub Community Room',
                'description': 'Can humans still beat machines at random knowledge? Let\'s find out!'
            },

            # NEW: Cultural and International Meetups
            {
                'title': 'International Potluck Disaster',
                'location': 'Global Community Kitchen',
                'description': 'Bring a dish from your culture! Or order takeout and pretend you made it.'
            },
            {
                'title': 'Language Exchange Speed Dating',
                'location': 'Polyglot Paradise Café',
                'description': '5 minutes per language. Learn pickup lines in 12 different cultures!'
            },
            {
                'title': 'Cultural Stereotype Roast Battle',
                'location': 'Comedy Club International',
                'description': 'Roast your own culture before anyone else can. Self-deprecation championship!'
            },
            {
                'title': 'Homesick Food Therapy Session',
                'location': 'Grandma\'s Kitchen (Virtual)',
                'description': 'Cook childhood comfort foods together via video call. Crying is encouraged.'
            },
            {
                'title': 'Third Culture Kids Support Circle',
                'location': 'Nowhere and Everywhere Lounge',
                'description': 'Where is home? Let\'s figure it out together over snacks from 5 different countries.'
            },
            {
                'title': 'Translation Fails Comedy Night',
                'location': 'Lost in Translation Theater',
                'description': 'Share your worst Google Translate moments. Laughter is universal... hopefully.'
            },
            {
                'title': 'Expat Survival Skills Workshop',
                'location': 'International Adaptation Center',
                'description': 'How to find your favorite snacks abroad and other essential life skills.'
            },
            {
                'title': 'Cultural Dance Battle Royale',
                'location': 'World Beat Dance Studio',
                'description': 'Bollywood vs Salsa vs K-Pop vs Traditional Folk. May the best moves win!'
            },
            {
                'title': 'International Karaoke Chaos',
                'location': 'Babel Karaoke Bar',
                'description': 'Sing songs in languages you don\'t speak. Confidence over accuracy!'
            },
            {
                'title': 'Global Street Food Tour',
                'location': 'Food Truck Festival Grounds',
                'description': 'Taste the world without leaving the city. Antacids provided.'
            },
            {
                'title': 'Passport Flex Contest',
                'location': 'Immigration Office Waiting Room (Simulated)',
                'description': 'Show off your stamp collection and share your border crossing horror stories.'
            },
            {
                'title': 'Cultural Miscommunication Bingo',
                'location': 'United Nations of Confusion',
                'description': 'Turn awkward cultural moments into a fun game. Everyone wins (eventually).'
            },

            # More diverse creative meetups
            {
                'title': 'Netflix & Actually Decide',
                'location': 'Cozy Movie Theater',
                'description': 'Watch something together instead of scrolling for 2 hours. Revolutionary concept.'
            },
            {
                'title': 'Social Anxiety Karaoke',
                'location': 'Safe Space Karaoke Bar',
                'description': 'Sing badly together in a judgment-free zone. Liquid courage optional.'
            },
            {
                'title': 'Conspiracy Theory Bingo Night',
                'location': 'The Truth is Out There Café',
                'description': 'Fun conspiracy theories only! Birds aren\'t real, Finland doesn\'t exist, etc.'
            },
            {
                'title': 'Dating App Horror Story Sharing',
                'location': 'Survivors Support Center',
                'description': 'Share your worst dating experiences. Therapy through laughter.'
            },
            {
                'title': 'Work-From-Home Fashion Show',
                'location': 'Virtual Runway (Zoom)',
                'description': 'Professional on top, pajamas on bottom. Strut your WFH style!'
            },
            {
                'title': 'Overthinking Olympics Opening Ceremony',
                'location': 'Anxiety Arena',
                'description': 'Competitive scenario planning. Current record: 47 outcomes for one text message.'
            }
        ]

        meetup_count = 0

        # Create 25-35 meetups
        for _ in range(random.randint(25, 35)):
            room = random.choice(rooms)
            template = random.choice(creative_meetup_templates)
            creator = random.choice(users)

            # Future dates (1-90 days from now for variety)
            future_date = timezone.now() + timedelta(days=random.randint(1, 90))
            # Realistic times (weekends more likely for fun events)
            if future_date.weekday() >= 5:  # Weekend
                hour = random.randint(10, 22)
            else:  # Weekday
                hour = random.choice([12, 17, 18, 19, 20])  # Lunch or evening

            future_date = future_date.replace(
                hour=hour,
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

            # Add realistic attendee count (2-12 people)
            num_attendees = random.randint(2, 12)
            attendees = random.sample(users, min(num_attendees, len(users)))
            if creator not in attendees:
                attendees.append(creator)

            meetup.attendees.set(attendees)
            meetup_count += 1

        self.stdout.write(self.style.SUCCESS(f'✅ Created {meetup_count} exciting meetups!'))
