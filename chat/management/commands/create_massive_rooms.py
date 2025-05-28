from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta, datetime
import random
import json
from chat.models import Room, Message, Category, Reaction, Meetup
from django.db import transaction

class Command(BaseCommand):
    help = 'Generate 100+ additional creative, cultural, and lifestyle rooms'

    def add_arguments(self, parser):
        parser.add_argument(
            '--num-conversations',
            type=int,
            default=50,
            help='Number of conversations to generate per room (default: 50)',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('🌍 Creating MASSIVE room collection...'))

        self.create_additional_categories()
        self.create_all_rooms()
        self.generate_diverse_chat_history(options['num_conversations'])
        self.add_diverse_reactions()
        self.create_themed_meetups()

        total_rooms = Room.objects.filter(is_dm=False).count()
        self.stdout.write(self.style.SUCCESS(f'🎉 MASSIVE room expansion complete! Total community rooms: {total_rooms}'))

    def create_additional_categories(self):
        """Create all missing categories"""
        self.stdout.write('📁 Setting up all categories...')

        additional_categories = [
            {'name': 'International', 'slug': 'international', 'icon': '🌍'},
            {'name': 'Cultural Exchange', 'slug': 'cultural', 'icon': '🤝'},
            {'name': 'Language Learning', 'slug': 'language', 'icon': '🗣️'},
            {'name': 'Global Food', 'slug': 'global-food', 'icon': '🍜'},
            {'name': 'Philosophy', 'slug': 'philosophy', 'icon': '🤯'},
            {'name': 'Identity & Community', 'slug': 'identity', 'icon': '💕'},
            {'name': 'Modern Society', 'slug': 'society', 'icon': '🌍'},
            {'name': 'Lifestyle Hacks', 'slug': 'lifestyle', 'icon': '🛋️'},
            {'name': 'Pop Culture', 'slug': 'pop-culture', 'icon': '🔥'},
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

    def create_all_rooms(self):
        """Create 100+ amazing rooms from all categories"""
        users = list(User.objects.all())
        if len(users) < 5:
            self.stdout.write(self.style.WARNING('⚠️  Creating default users for room creators...'))
            default_users = ['global_nomad', 'culture_mixer', 'food_explorer', 'language_learner', 'world_traveler', 'tech_guru', 'creative_soul', 'productivity_ninja', 'philosophy_student', 'community_builder']
            for username in default_users:
                User.objects.get_or_create(username=username, defaults={'password': 'temp123!'})
            users = list(User.objects.all())

        created_count = 0

        # COMPREHENSIVE ROOM COLLECTION 🌟
        all_rooms = [
            # Modern Life Essentials
            {'name': 'wifi-went-out-again', 'display_name': 'WiFi Went Out Again', 'category': 'technology',
             'description': 'Digital nomad nightmares and internet dependency support group'},
            {'name': 'unread-email-hoarders', 'display_name': 'Unread Email Hoarders', 'category': 'technology',
             'description': '47,000 unread emails and counting. We understand the anxiety.'},
            {'name': 'adulting-level-expert', 'display_name': 'Adulting Level: Expert', 'category': 'social',
             'description': 'For those who finally figured out taxes and laundry in the same week'},
            {'name': 'who-ate-my-leftovers', 'display_name': 'Who Ate My Leftovers?', 'category': 'food',
             'description': 'Roommate betrayal, office fridge crimes, and food theft justice'},
            {'name': 'calendar-chaos-club', 'display_name': 'Calendar Chaos Club', 'category': 'productivity',
             'description': 'Double-booked disasters and scheduling anxiety support'},
            {'name': 'can-i-nap-here', 'display_name': 'Can I Nap Here?', 'category': 'health',
             'description': 'Searching for socially acceptable napping locations worldwide'},
            {'name': 'take-my-money-again', 'display_name': 'Take My Money Again', 'category': 'business',
             'description': 'Impulse purchases and subscription service regret support'},
            {'name': 'digital-detox-fantasies', 'display_name': 'Digital Detox Fantasies', 'category': 'mental-health',
             'description': 'Dreaming of life without notifications, never actually doing it'},
            {'name': 'minimalism-failed-me', 'display_name': 'Minimalism Failed Me', 'category': 'lifestyle',
             'description': 'Marie Kondo said it would spark joy. It sparked anxiety instead.'},
            {'name': 'wardrobe-identity-crisis', 'display_name': 'Wardrobe Identity Crisis', 'category': 'lifestyle',
             'description': 'Closet full of clothes, nothing to wear, existential fashion questions'},

            # Productivity & Self-Help 🎯
            {'name': 'goal-setting-squad', 'display_name': 'Goal Setting Squad', 'category': 'productivity',
             'description': 'New year, new goals, same procrastination patterns'},
            {'name': 'procrastination-rehab', 'display_name': 'Procrastination Rehab', 'category': 'productivity',
             'description': 'Step 1: Admit you have a problem. Step 2: Do it tomorrow.'},
            {'name': 'notion-addicts-anonymous', 'display_name': 'Notion Addicts Anonymous', 'category': 'productivity',
             'description': 'Spent 6 hours organizing productivity system, got nothing done'},
            {'name': 'morning-routine-flops', 'display_name': 'Morning Routine Flops', 'category': 'productivity',
             'description': '5 AM club turned into 11 AM disaster club'},
            {'name': 'deep-work-dojo', 'display_name': 'Deep Work Dojo', 'category': 'productivity',
             'description': 'Training to focus for more than 15 minutes straight'},
            {'name': 'sunday-scaries-support', 'display_name': 'Sunday Scaries Support', 'category': 'mental-health',
             'description': 'That Sunday evening anxiety about Monday morning reality'},
            {'name': 'bullet-journal-hype', 'display_name': 'Bullet Journal Hype', 'category': 'productivity',
             'description': 'Beautiful spreads, chaotic life. The aesthetic vs reality gap.'},
            {'name': 'dopamine-detox-lounge', 'display_name': 'Dopamine Detox Lounge', 'category': 'mental-health',
             'description': 'Trying to rewire our reward systems in a dopamine-addicted world'},
            {'name': '5am-club-dropouts', 'display_name': '5AM Club Dropouts', 'category': 'productivity',
             'description': 'We tried. We failed. We accept our night owl destiny.'},
            {'name': 'time-blocking-wizards', 'display_name': 'Time Blocking Wizards', 'category': 'productivity',
             'description': 'Color-coded calendars and the illusion of control over time'},

            # Thought-Provoking & Existential 🤯
            {'name': 'philosophy-for-breakfast', 'display_name': 'Philosophy for Breakfast', 'category': 'philosophy',
             'description': 'Deep thoughts served with your morning coffee'},
            {'name': 'time-is-a-social-construct', 'display_name': 'Time is a Social Construct', 'category': 'philosophy',
             'description': 'Questioning everything about our relationship with time'},
            {'name': 'what-even-is-consciousness', 'display_name': 'What Even Is Consciousness?', 'category': 'philosophy',
             'description': 'Are we just complex biological machines? Discuss.'},
            {'name': 'quantum-confusion-club', 'display_name': 'Quantum Confusion Club', 'category': 'science',
             'description': 'Schrödinger\'s cat walked into a bar... or did it?'},
            {'name': 'my-brain-won-t-shut-up', 'display_name': 'My Brain Won\'t Shut Up', 'category': 'mental-health',
             'description': 'Racing thoughts, midnight epiphanies, and mental chatter support'},
            {'name': 'future-anxiety-lounge', 'display_name': 'Future Anxiety Lounge', 'category': 'mental-health',
             'description': 'Worrying about tomorrow while forgetting to live today'},
            {'name': 'are-we-in-a-simulation', 'display_name': 'Are We in a Simulation?', 'category': 'philosophy',
             'description': 'Matrix theories, glitch reports, and existential simulation dread'},
            {'name': 'ethics-over-easy', 'display_name': 'Ethics Over Easy', 'category': 'philosophy',
             'description': 'Moral dilemmas served simple, but never actually simple'},
            {'name': 'metaphysical-musings', 'display_name': 'Metaphysical Musings', 'category': 'philosophy',
             'description': 'Reality, existence, and other light breakfast topics'},
            {'name': 'deep-thoughts-over-snacks', 'display_name': 'Deep Thoughts Over Snacks', 'category': 'philosophy',
             'description': 'Philosophy tastes better with cheese and crackers'},

            # Gaming & Tech 🎮
            {'name': 'patch-notes-and-popcorn', 'display_name': 'Patch Notes and Popcorn', 'category': 'gaming',
             'description': 'Reading game updates like they\'re blockbuster movie plots'},
            {'name': 'indie-dev-jam', 'display_name': 'Indie Dev Jam', 'category': 'technology',
             'description': 'Small studios, big dreams, and the indie game development grind'},
            {'name': 'late-night-grind-session', 'display_name': 'Late Night Grind Session', 'category': 'gaming',
             'description': '3 AM gaming sessions where time ceases to exist'},
            {'name': 'bug-squash-brigade', 'display_name': 'Bug Squash Brigade', 'category': 'technology',
             'description': 'Hunting digital bugs with the persistence of actual exterminators'},
            {'name': 'sandbox-society', 'display_name': 'Sandbox Society', 'category': 'gaming',
             'description': 'Building virtual worlds when the real one gets overwhelming'},
            {'name': 'speedrun-theory-hub', 'display_name': 'Speedrun Theory Hub', 'category': 'gaming',
             'description': 'Frame-perfect optimization and the pursuit of digital perfection'},
            {'name': 'ai-npcs-are-watching', 'display_name': 'AI NPCs Are Watching', 'category': 'gaming',
             'description': 'When video game characters start feeling too real...'},
            {'name': 'ragequit-confessional', 'display_name': 'Ragequit Confessional', 'category': 'gaming',
             'description': 'Safe space for admitting your most embarrassing gaming meltdowns'},
            {'name': 'boss-fight-buddies', 'display_name': 'Boss Fight Buddies', 'category': 'gaming',
             'description': 'Moral support for impossible gaming challenges'},
            {'name': 'inventory-overload', 'display_name': 'Inventory Overload', 'category': 'gaming',
             'description': 'Hoarding virtual items like they\'re actual treasure'},

            # Creativity & Hobbies 💡
            {'name': 'digital-minimalist-designers', 'display_name': 'Digital Minimalist Designers', 'category': 'creative',
             'description': 'Less is more, but making less look good is surprisingly hard'},
            {'name': 'unfinished-projects-club', 'display_name': 'Unfinished Projects Club', 'category': 'creative',
             'description': '47 started projects, 0 completed. We understand the struggle.'},
            {'name': 'art-block-busters', 'display_name': 'Art Block Busters', 'category': 'creative',
             'description': 'Breaking through creative walls with community support'},
            {'name': 'from-scribbles-to-masterpieces', 'display_name': 'From Scribbles to Masterpieces', 'category': 'creative',
             'description': 'Every artist started with terrible doodles. We celebrate the journey.'},
            {'name': 'hobby-hop-express', 'display_name': 'Hobby Hop Express', 'category': 'creative',
             'description': 'Knitting to pottery to coding to watercolors - all aboard!'},
            {'name': 'journaling-over-judging', 'display_name': 'Journaling Over Judging', 'category': 'creative',
             'description': 'Writing our thoughts without the inner critic commentary'},
            {'name': 'sketchbook-confessions', 'display_name': 'Sketchbook Confessions', 'category': 'creative',
             'description': 'Sharing the weird, wonderful world of personal art journals'},
            {'name': 'fanfic-dungeon', 'display_name': 'Fanfic Dungeon', 'category': 'creative',
             'description': 'Where beloved characters live their alternative lives'},
            {'name': 'sticker-hoarders-unite', 'display_name': 'Sticker Hoarders Unite', 'category': 'creative',
             'description': 'Too pretty to use, too awesome to throw away'},
            {'name': 'diy-or-die-trying', 'display_name': 'DIY or Die Trying', 'category': 'creative',
             'description': 'Pinterest projects vs reality - the eternal struggle'},

            # Chill & Community 🛋️
            {'name': 'introvert-corner', 'display_name': 'Introvert Corner', 'category': 'social',
             'description': 'Quiet space for people who recharge in solitude'},
            {'name': 'weekend-reset-lounge', 'display_name': 'Weekend Reset Lounge', 'category': 'lifestyle',
             'description': 'Sunday prep for conquering another week'},
            {'name': 'tea-spill-coven', 'display_name': 'Tea Spill Coven', 'category': 'social',
             'description': 'Gentle gossip and warm beverage appreciation'},
            {'name': 'chaos-cozy-zone', 'display_name': 'Chaos Cozy Zone', 'category': 'lifestyle',
             'description': 'Finding comfort in controlled disorder'},
            {'name': 'virtual-hammock-hangout', 'display_name': 'Virtual Hammock Hangout', 'category': 'lifestyle',
             'description': 'Digital space for mental relaxation and lazy conversations'},
            {'name': 'soundscape-sanctuary', 'display_name': 'Soundscape Sanctuary', 'category': 'lifestyle',
             'description': 'Ambient music, rain sounds, and audio therapy appreciation'},
            {'name': 'late-night-rant-space', 'display_name': 'Late Night Rant Space', 'category': 'social',
             'description': '2 AM thoughts that need to be shared with someone, anyone'},
            {'name': '3am-epiphany-lounge', 'display_name': '3AM Epiphany Lounge', 'category': 'philosophy',
             'description': 'Those profound midnight realizations that seem less profound at dawn'},
            {'name': 'vibe-check-room', 'display_name': 'Vibe Check Room', 'category': 'social',
             'description': 'Daily mood reports and emotional weather updates'},
            {'name': 'extrovert-energy-boost', 'display_name': 'Extrovert Energy Boost', 'category': 'social',
             'description': 'High-energy social charging station for people-powered humans'},

            # Trending Topics & Culture 🔥
            {'name': 'pop-culture-chaos', 'display_name': 'Pop Culture Chaos', 'category': 'pop-culture',
             'description': 'Celebrity drama, viral trends, and cultural zeitgeist discussion'},
            {'name': 'cancel-culture-discussion-den', 'display_name': 'Cancel Culture Discussion Den', 'category': 'pop-culture',
             'description': 'Nuanced conversations about accountability and redemption'},
            {'name': 'spoiler-alert-zone', 'display_name': 'Spoiler Alert Zone', 'category': 'entertainment',
             'description': 'Safe space for discussing plot twists and season finales'},
            {'name': 'the-algorithm-got-me', 'display_name': 'The Algorithm Got Me', 'category': 'technology',
             'description': 'How social media algorithms shape our reality and recommendations'},
            {'name': 'bops-or-flops', 'display_name': 'Bops or Flops', 'category': 'music',
             'description': 'Musical hot takes and song rating debates'},
            {'name': 'hot-takes-only', 'display_name': 'Hot Takes Only', 'category': 'pop-culture',
             'description': 'Controversial opinions served piping hot'},
            {'name': 'fandom-feud-zone', 'display_name': 'Fandom Feud Zone', 'category': 'pop-culture',
             'description': 'Passionate discussions between rival fan communities'},
            {'name': 'influencer-irl-support', 'display_name': 'Influencer IRL Support', 'category': 'social',
             'description': 'Reality check for social media vs actual life expectations'},
            {'name': 'new-album-reaction', 'display_name': 'New Album Reaction', 'category': 'music',
             'description': 'First listen experiences and musical discovery sharing'},
            {'name': 'reality-tv-survivors', 'display_name': 'Reality TV Survivors', 'category': 'entertainment',
             'description': 'Processing the emotional trauma of reality television'},

            # Money & Hustle 💸
            {'name': 'side-hustle-hub', 'display_name': 'Side Hustle Hub', 'category': 'business',
             'description': 'Multiple income streams and the entrepreneurial grind'},
            {'name': 'broke-but-creative', 'display_name': 'Broke But Creative', 'category': 'business',
             'description': 'Making art on a budget, resourcefulness over resources'},
            {'name': 'money-memes-monday', 'display_name': 'Money Memes Monday', 'category': 'memes',
             'description': 'Financial anxiety expressed through humor therapy'},
            {'name': 'dream-job-lab', 'display_name': 'Dream Job Lab', 'category': 'business',
             'description': 'Designing careers that don\'t feel like work'},
            {'name': 'passive-income-panic', 'display_name': 'Passive Income Panic', 'category': 'business',
             'description': 'Chasing financial freedom while managing financial anxiety'},
            {'name': 'freelancer-therapy', 'display_name': 'Freelancer Therapy', 'category': 'business',
             'description': 'Irregular income, irregular sleep, irregular sanity'},
            {'name': 'zero-to-one-crew', 'display_name': 'Zero to One Crew', 'category': 'business',
             'description': 'Building something from nothing with community support'},
            {'name': 'budget-wizards', 'display_name': 'Budget Wizards', 'category': 'business',
             'description': 'Making money magic happen with spreadsheet sorcery'},
            {'name': 'overworked-underpaid-union', 'display_name': 'Overworked Underpaid Union', 'category': 'business',
             'description': 'Solidarity in the struggle for fair compensation'},
            {'name': 'sell-me-this-chatroom', 'display_name': 'Sell Me This Chatroom', 'category': 'business',
             'description': 'Practice your pitch, perfect your persuasion skills'},

            # Relationships & Identity 💕
            {'name': 'introvert-dating-help', 'display_name': 'Introvert Dating Help', 'category': 'dating',
             'description': 'Romance advice for socially anxious hearts'},
            {'name': 'meet-cute-museum', 'display_name': 'Meet Cute Museum', 'category': 'dating',
             'description': 'Collecting stories of how people actually met their person'},
            {'name': 'found-family-feels', 'display_name': 'Found Family Feels', 'category': 'identity',
             'description': 'Celebrating chosen families and created connections'},
            {'name': 'neurodivergent-nation', 'display_name': 'Neurodivergent Nation', 'category': 'identity',
             'description': 'Celebrating different ways of thinking and being'},
            {'name': 'identity-explorers', 'display_name': 'Identity Explorers', 'category': 'identity',
             'description': 'Safe space for questioning, discovering, and becoming'},
            {'name': 'love-is-weird-club', 'display_name': 'Love is Weird Club', 'category': 'dating',
             'description': 'Navigating the beautiful strangeness of human connection'},
            {'name': 'chosen-family-hangout', 'display_name': 'Chosen Family Hangout', 'category': 'identity',
             'description': 'Where blood doesn\'t determine belonging'},
            {'name': 'lgbtqia-space-capsule', 'display_name': 'LGBTQIA+ Space Capsule', 'category': 'identity',
             'description': 'Queer community floating through the universe together'},
            {'name': 'unfiltered-friendships', 'display_name': 'Unfiltered Friendships', 'category': 'social',
             'description': 'Real talk about the work and worth of deep friendships'},
            {'name': 'love-languages-in-action', 'display_name': 'Love Languages in Action', 'category': 'dating',
             'description': 'Learning to speak and receive love in all its forms'},

            # World & Society 🌍
            {'name': 'modern-life-crisis', 'display_name': 'Modern Life Crisis', 'category': 'society',
             'description': 'Questioning everything about how we\'re supposed to live'},
            {'name': 'news-but-make-it-chaotic', 'display_name': 'News But Make It Chaotic', 'category': 'society',
             'description': 'Current events with a side of existential confusion'},
            {'name': 'late-stage-capitalism-lounge', 'display_name': 'Late Stage Capitalism Lounge', 'category': 'society',
             'description': 'Economic anxiety and system critique support group'},
            {'name': 'eco-anxiety-support', 'display_name': 'Eco Anxiety Support', 'category': 'society',
             'description': 'Climate feelings and environmental overwhelm therapy'},
            {'name': 'future-of-work-watch', 'display_name': 'Future of Work Watch', 'category': 'society',
             'description': 'Monitoring how AI and technology reshape human labor'},
            {'name': 'cultural-curiosity-club', 'display_name': 'Cultural Curiosity Club', 'category': 'cultural',
             'description': 'Learning about different ways people live and think'},
            {'name': 'slow-living-movement', 'display_name': 'Slow Living Movement', 'category': 'lifestyle',
             'description': 'Intentional pace in a speed-obsessed world'},
            {'name': 'urban-survival-guide', 'display_name': 'Urban Survival Guide', 'category': 'society',
             'description': 'City living tips for maintaining sanity and community'},
            {'name': 'the-dystopia-diaries', 'display_name': 'The Dystopia Diaries', 'category': 'society',
             'description': 'Living through interesting times with dark humor'},
            {'name': 'planet-b-doesn-t-exist', 'display_name': 'Planet B Doesn\'t Exist', 'category': 'society',
             'description': 'Environmental reality check and action planning'},

            # Cultural & International Rooms 🌍
            {'name': 'french-toast-debates', 'display_name': 'French Toast Debates', 'category': 'global-food',
             'description': 'Pain perdu vs French toast vs eggy bread - the eternal breakfast debate'},
            {'name': 'italian-grandma-energy', 'display_name': 'Italian Grandma Energy', 'category': 'global-food',
             'description': 'Bringing that protective, food-pushing, life-advice-giving nonna vibe'},
            {'name': 'british-weather-complaints', 'display_name': 'British Weather Complaints', 'category': 'international',
             'description': 'It\'s raining again. Shocking. Absolutely shocking.'},
            {'name': 'german-efficiency-club', 'display_name': 'German Efficiency Club', 'category': 'productivity',
             'description': 'Organized chaos and productivity tips with Teutonic precision'},
            {'name': 'chaotic-brazilian-groupchat', 'display_name': 'Chaotic Brazilian Group Chat', 'category': 'international',
             'description': 'Pure energy, music, and joy with a side of beautiful chaos'},
            {'name': 'korean-drama-emergency', 'display_name': 'Korean Drama Emergency', 'category': 'entertainment',
             'description': 'Second lead syndrome, plot twists, and emotional breakdowns over fictional characters'},
            {'name': 'desi-chaat-room', 'display_name': 'Desi Chaat Room', 'category': 'global-food',
             'description': 'Spicy gossip, spicier food, and the warmest community vibes'},
            {'name': 'aussie-slang-decoder', 'display_name': 'Aussie Slang Decoder', 'category': 'language',
             'description': 'Fair dinkum translation services for non-Aussie speakers'},
            {'name': 'jollof-wars-commence', 'display_name': 'Jollof Wars Commence', 'category': 'global-food',
             'description': 'Nigerian vs Ghanaian vs Senegalese - may the best rice win'},
            {'name': 'scandinavian-simplicity', 'display_name': 'Scandinavian Simplicity', 'category': 'lifestyle',
             'description': 'Hygge, lagom, and the art of cozy minimalist living'},

            # More Cultural Rooms
            {'name': 'ramen-religion', 'display_name': 'Ramen Religion', 'category': 'global-food',
             'description': 'Tonkotsu vs miso vs shoyu - finding spiritual enlightenment in broth'},
            {'name': 'tacos-vs-burritos-showdown', 'display_name': 'Tacos vs Burritos Showdown', 'category': 'global-food',
             'description': 'The great Mexican food format debate - choose your fighter'},
            {'name': 'baguette-defenders-unite', 'display_name': 'Baguette Defenders Unite', 'category': 'global-food',
             'description': 'Protecting the honor of French bread and butter simplicity'},
            {'name': 'curry-confessions', 'display_name': 'Curry Confessions', 'category': 'global-food',
             'description': 'Thai, Indian, Japanese, Malaysian - sharing curry secrets and spice tolerance'},
            {'name': 'poutine-and-pride', 'display_name': 'Poutine and Pride', 'category': 'global-food',
             'description': 'Canadian comfort food and eh-ing our way through life'},
            {'name': 'lebanese-mezze-magic', 'display_name': 'Lebanese Mezze Magic', 'category': 'global-food',
             'description': 'Small plates, big flavors, and endless hospitality'},
            {'name': 'argentinian-steak-squad', 'display_name': 'Argentinian Steak Squad', 'category': 'global-food',
             'description': 'Asado wisdom and the perfect empanada discussion'},
            {'name': 'ethiopian-food-is-life', 'display_name': 'Ethiopian Food is Life', 'category': 'global-food',
             'description': 'Injera appreciation and berbere spice blend worship'},
            {'name': 'k-pop-and-kimchi', 'display_name': 'K-Pop and Kimchi', 'category': 'entertainment',
             'description': 'Fermented cabbage and fermented fan energy - equally intense'},
            {'name': 'sushi-snobs-sanctuary', 'display_name': 'Sushi Snobs Sanctuary', 'category': 'global-food',
             'description': 'Omakase appreciation and California roll judgment'},

            # Lifestyle & Cultural Experiences
            {'name': 'greek-wedding-survivors', 'display_name': 'Greek Wedding Survivors', 'category': 'cultural',
             'description': 'If you\'ve survived Greek family gatherings, you can survive anything'},
            {'name': 'scottish-accent-appreciation', 'display_name': 'Scottish Accent Appreciation', 'category': 'cultural',
             'description': 'Bonnie lads and lassies welcome - bring your best Highland banter'},
            {'name': 'irish-storytellers-union', 'display_name': 'Irish Storytellers Union', 'category': 'cultural',
             'description': 'Grand tales, greater craic, and the gift of the gab'},
            {'name': 'polish-grandma-recipes', 'display_name': 'Polish Grandma Recipes', 'category': 'global-food',
             'description': 'Babcia knows best - pierogi wisdom and unconditional love'},
            {'name': 'cuban-coffee-addicts', 'display_name': 'Cuban Coffee Addicts', 'category': 'global-food',
             'description': 'Cafecito culture and conversations that flow like café con leche'},
            {'name': 'turkish-tea-time', 'display_name': 'Turkish Tea Time', 'category': 'global-food',
             'description': 'Çay, conversation, and the art of Turkish hospitality'},
            {'name': 'tokyo-night-owls', 'display_name': 'Tokyo Night Owls', 'category': 'international',
             'description': 'Neon lights, convenience store meals, and 3 AM karaoke sessions'},
            {'name': 'cairo-chaos-club', 'display_name': 'Cairo Chaos Club', 'category': 'international',
             'description': 'Organized chaos, haggling skills, and pyramid-level endurance'},
            {'name': 'new-zealand-yes-mate', 'display_name': 'New Zealand Yes Mate', 'category': 'international',
             'description': 'Kiwi culture, sheep jokes, and Middle Earth appreciation'},
            {'name': 'dutch-directness-zone', 'display_name': 'Dutch Directness Zone', 'category': 'cultural',
             'description': 'Brutally honest feedback delivered with a smile and stroopwafels'},

            # Expat & Global Experiences
            {'name': 'third-culture-kids-lounge', 'display_name': 'Third Culture Kids Lounge', 'category': 'cultural',
             'description': 'Where is home? Everywhere and nowhere, we get it.'},
            {'name': 'lost-in-translation-club', 'display_name': 'Lost in Translation Club', 'category': 'language',
             'description': 'When Google Translate fails you and cultural confusion ensues'},
            {'name': 'expats-anonymous', 'display_name': 'Expats Anonymous', 'category': 'international',
             'description': 'Missing home while loving adventure - the eternal expat struggle'},
            {'name': 'reverse-culture-shock', 'display_name': 'Reverse Culture Shock', 'category': 'cultural',
             'description': 'Coming home and feeling like a stranger in your own country'},
            {'name': 'where-am-i-even-from', 'display_name': 'Where Am I Even From?', 'category': 'identity',
             'description': 'Identity crisis for globally nomadic souls'},
            {'name': 'national-anthem-jam-session', 'display_name': 'National Anthem Jam Session', 'category': 'cultural',
             'description': 'Patriotic songs from around the world - sing along if you know the words'},
            {'name': 'confused-heritage-hub', 'display_name': 'Confused Heritage Hub', 'category': 'identity',
             'description': 'Mixed heritage, multiple passports, infinite identity questions'},
            {'name': 'cultural-blend-cafe', 'display_name': 'Cultural Blend Café', 'category': 'cultural',
             'description': 'Where different cultures mix and create something new'},
            {'name': 'diaspora-dialogues', 'display_name': 'Diaspora Dialogues', 'category': 'cultural',
             'description': 'Connecting cultures across oceans and generations'},
            {'name': 'homesick-but-funny', 'display_name': 'Homesick But Funny', 'category': 'cultural',
             'description': 'Laughing through the tears of missing home cooking'},

            # Cultural Traditions & Fun
            {'name': 'holiday-traditions-gone-wrong', 'display_name': 'Holiday Traditions Gone Wrong', 'category': 'cultural',
             'description': 'When cultural celebrations meet reality - disaster stories welcome'},
            {'name': 'foreign-family-groupchat', 'display_name': 'Foreign Family Group Chat', 'category': 'cultural',
             'description': 'Mom sends voice messages in three languages, chaos ensues'},
            {'name': 'emoji-meaning-war', 'display_name': 'Emoji Meaning War', 'category': 'language',
             'description': '🇯🇵 vs 🇺🇸 vs 🇧🇷 - when emojis mean different things globally'},
            {'name': 'passport-stamps-and-chaos', 'display_name': 'Passport Stamps and Chaos', 'category': 'travel',
             'description': 'Border crossing stories and immigration adventures'},
            {'name': 'translation-fails-lounge', 'display_name': 'Translation Fails Lounge', 'category': 'language',
             'description': 'When lost in translation becomes found in comedy gold'},
            {'name': 'nonna-said-no', 'display_name': 'Nonna Said No', 'category': 'global-food',
             'description': 'Italian grandmother wisdom trumps all arguments, always'},
            {'name': 'momos-not-dumplings', 'display_name': 'Momos Not Dumplings', 'category': 'global-food',
             'description': 'Tibetan food appreciation and proper terminology matters'},
            {'name': 'spicy-means-different-things', 'display_name': 'Spicy Means Different Things', 'category': 'global-food',
             'description': 'Your medium is my mild, your mild is my water'},
            {'name': 'language-switchers-unite', 'display_name': 'Language Switchers Unite', 'category': 'language',
             'description': 'Code-switching mid-sentence like a linguistic superhero'},
            {'name': 'global-gossip-corner', 'display_name': 'Global Gossip Corner', 'category': 'cultural',
             'description': 'International tea spilling with cultural context included'},
        ]

        for room_data in all_rooms:
            try:
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
                    self.stdout.write(f'🏠✨ Created: {room.display_name}')
                    created_count += 1
                else:
                    self.stdout.write(f'🏠 Exists: {room.display_name}')

            except Exception as e:
                self.stdout.write(f'❌ Error creating room {room_data["name"]}: {str(e)}')

        self.stdout.write(self.style.SUCCESS(f'🌟 Created {created_count} new rooms!'))

    def get_or_create_category(self, category_slug):
        """Helper to get or create category with better error handling"""
        try:
            return Category.objects.get(slug=category_slug)
        except Category.DoesNotExist:
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
                'philosophy': 'Philosophy',
                'identity': 'Identity & Community',
                'society': 'Modern Society',
                'lifestyle': 'Lifestyle Hacks',
                'pop-culture': 'Pop Culture',
                'international': 'International',
                'cultural': 'Cultural Exchange',
                'language': 'Language Learning',
                'global-food': 'Global Food',
            }

            category_name = category_mapping.get(category_slug, category_slug.title())

            try:
                return Category.objects.get(name=category_name)
            except Category.DoesNotExist:
                try:
                    return Category.objects.create(
                        name=category_name,
                        slug=category_slug,
                        icon='🌟'
                    )
                except Exception:
                    return Category.objects.get_or_create(name='Other', defaults={'slug': 'other', 'icon': '🌟'})[0]

    def generate_diverse_chat_history(self, num_conversations):
        """Generate conversations for newly created rooms"""
        self.stdout.write('💬 Generating HIGHLY RELEVANT conversations...')

        users = list(User.objects.all())

        # Get recently created rooms (last 5 minutes)
        recent_time = timezone.now() - timedelta(minutes=5)
        new_rooms = list(Room.objects.filter(is_dm=False, created_at__gte=recent_time))

        if not new_rooms:
            new_rooms = list(Room.objects.filter(is_dm=False))
            self.stdout.write(f'💬 Generating content for all {len(new_rooms)} rooms...')

        if not users or not new_rooms:
            self.stdout.write(self.style.WARNING('No users or rooms found!'))
            return

        # HIGHLY SPECIFIC conversation templates for each room type
        conversation_templates = {
            # Cultural & International Specific
            'korean-drama': [
                ["Second lead syndrome is destroying my mental health", "Why do I always fall for the second lead?", "The main guy is boring compared to second lead", "K-drama writers know exactly what they're doing", "My heart can't handle this emotional manipulation"],
                ["Just finished Crash Landing On You and I'm not okay", "That show ruined me emotionally", "Swiss tourism board owes them money", "Hyun Bin can crash land anywhere he wants", "The chicken and beer scene though 😭"],
                ["Why do all K-dramas have the same truck of doom?", "Truck-kun claims another victim", "Most dangerous vehicles in Seoul", "Plot device or actual menace?", "I flinch every time I see a truck now"],
            ],
            'jollof-wars': [
                ["Nigerian Jollof supremacy, don't @ me", "Ghanaian Jollof has entered the chat", "Y'all both wrong, Senegalese Jollof is the original", "Can we agree all Jollof is delicious?", "This is why we can't have nice things"],
                ["My grandmother's Jollof recipe vs your grandmother's", "Secret ingredients: love and generational trauma", "Some recipes die with their makers", "The audacity of measuring love", "Nah, that's not how you make Jollof"],
                ["Party Jollof hits different than home Jollof", "The smoky bottom layer is pure gold", "Fighting for the burnt rice at the bottom", "That's where all the flavor lives", "Party Jollof or don't invite me"],
            ],
            'italian-grandma': [
                ["Nonna saw me add garlic powder and disowned me", "Fresh garlic or death, apparently", "Some traditions are not negotiable", "I can feel her disappointment from heaven", "Shortcuts are for the weak"],
                ["Made pasta sauce from a jar. Nonna is rolling", "The ancestors are crying", "Some sins cannot be forgiven", "Store-bought sauce? In THIS house?", "At least hide the evidence"],
                ["She said 'mangia' 47 times during one meal", "Love language: aggressive feeding", "You're not full until Nonna says you're full", "Third plate is when you're getting started", "Starvation is not allowed in Italian households"],
            ],
            'british-weather': [
                ["It's raining again. Shocking.", "Absolutely shocking, who could have predicted", "Weather app says sunny. Weather app lies.", "Umbrella or not umbrella, that is the question", "British summer: 3 sunny days maximum"],
                ["Proper British queue for the bus in the rain", "Queue discipline in adverse weather", "We're civilized even when soggy", "Rain doesn't stop proper queuing etiquette", "This is why we conquered the world"],
                ["Tea consumption increases 400% during rain", "Correlation or causation?", "Emergency tea supplies activated", "Rain = tea time = life purpose fulfilled", "The kettle is already on"],
            ],
            'productivity-systems': [
                ["Spent 6 hours setting up my productivity system", "Got absolutely nothing else done", "The irony is not lost on me", "At least it looks aesthetically pleasing", "Productivity theater at its finest"],
                ["Notion templates are my drug of choice", "Just bought another productivity course", "I have 47 different systems and use none", "The perfect system doesn't exist", "But maybe this next one will work"],
                ["Monday: New system! Friday: Back to chaos", "The productivity cycle of life", "Optimistic Monday me vs Realistic Friday me", "Systems work until life happens", "Controlled chaos is still productivity"],
            ],
            'philosophy-deep': [
                ["If a tree falls in the metaverse, does it make a sound?", "Modern philosophy hits different", "Digital existence vs physical reality", "Are we just NPCs in someone else's simulation?", "The tree might be an NFT anyway"],
                ["Consciousness is wild when you really think about it", "Are we experiencing reality or creating it?", "The observer effect but for everyday life", "What if we're all just dreaming the same dream?", "Philosophy at 3 AM hits different"],
                ["Free will vs determinism while choosing what to eat", "Am I choosing pizza or did the universe decide?", "Existential crisis in the cereal aisle", "Decision fatigue meets philosophical questioning", "Maybe the pizza chose me"],
            ],
            'crypto-recovery': [
                ["Bought the dip. It kept dipping. Send help.", "Instructions unclear, bought more dip", "The dip has infinite layers", "Diamond hands or just poor timing?", "At this point it's all dip"],
                ["My NFT portfolio is worth less than the gas fees", "Paid $200 to lose $500 efficiently", "Math was never my strong suit", "The JPEG was supposed to be our future", "At least I own a receipt"],
                ["Explaining crypto losses to my therapist", "It's digital money, but also not money", "The volatility is a feature, not a bug", "Therapist adding crypto to their specialty list", "Some wounds need professional help"],
            ],
            'dating-app-horror': [
                ["His bio said 6'2, reality said 5'8", "Height inflation is real", "Why do people lie about measurable things?", "I brought a measuring tape to be sure", "The audacity is breathtaking"],
                ["She was a catfish, but like, a really committed one", "Photoshop skills were impressive tbh", "When reality meets Instagram filters", "I respect the dedication to the craft", "False advertising should be illegal"],
                ["First date: great! Second date: MLM pitch", "Essential oils cure everything apparently", "Red flags I missed: retrospective analysis", "Love bombing then product bombing", "Block button has never been used faster"],
            ],
            'plant-parent': [
                ["RIP to my succulent. Apparently they CAN die.", "Overwatering strikes again", "I killed the unkillable plant", "My plant parenting license is revoked", "How do you murder a cactus?"],
                ["My plant has more followers than me on IG", "Plant influencer lifestyle", "Photogenic leaves get more likes", "I'm the plant's social media manager", "Living for the aesthetic validation"],
                ["Talking to plants: science or insanity?", "They're excellent listeners", "My plants know all my secrets", "Cheaper than therapy, same results", "Judge-free zone with good vibes"],
            ],
            'wifi-crisis': [
                ["WiFi died mid-Zoom call, boss thinks I quit", "The frozen face of technical difficulties", "Can you hear me now? Apparently not.", "Internet gods have forsaken me", "Ethernet cable is my only salvation"],
                ["Nomad life: strong WiFi or strong coffee, pick one", "Can't have both apparently", "Choosing between productivity and caffeine", "The eternal digital nomad struggle", "Priorities: WiFi > Food > Sleep"],
                ["Router restart #47 today", "Have you tried turning it off and on again?", "IT support is just institutionalized frustration", "The magic of percussive maintenance", "Why does hitting it actually work sometimes?"],
            ],
            'overthinking-olympics': [
                ["Analyzed one text message for 3 hours straight", "Professional overthinking at its finest", "Current record: 47 interpretations of 'k'", "The subtext has subtext", "I should compete professionally"],
                ["Overthought my overthinking about overthinking", "Meta-overthinking is my specialty", "Inception levels of analysis paralysis", "My brain has too many browser tabs open", "Recursive thought loops are exhausting"],
                ["Spent more time planning than doing", "Analysis paralysis is my superpower", "Perfect plan, zero execution", "Planning the plan to make a plan", "Productivity through procrastination"],
            ],
            'subscription-trapped': [
                ["Found 17 subscriptions I forgot about", "Monthly financial autopilot was a mistake", "Free trial to financial commitment pipeline", "Cancel button is apparently decorative", "My bank account is bleeding monthly"],
                ["Netflix, Hulu, Disney+... broke but entertained", "Content abundance, wallet emptiness", "Streaming wars claimed another victim", "I own nothing and I'm not happy", "Digital hoarding has real costs"],
                ["Gym membership: active. Gym attendance: zero", "Paying for guilt and good intentions", "Most expensive coat rack membership", "January optimism, December reality", "At least I'm financially supporting fitness"],
            ],
            'email-hoarders': [
                ["47,000 unread emails and counting", "Inbox zero is a myth for other people", "Email bankruptcy might be necessary", "My notification badge gave up counting", "Digital hoarding is a real condition"],
                ["Newsletter subscriptions have gained sentience", "They multiply when I'm not looking", "Unsubscribe leads to more subscriptions", "Email hydra situation", "They know where I live digitally"],
                ["Important email buried in promotional chaos", "Signal to noise ratio: catastrophic", "Search function is my only hope", "Email archaeology is a real skill", "Ctrl+F for salvation"],
            ],
            'adult-level-expert': [
                ["Adulted successfully: paid bills AND did laundry", "Peak performance achievement unlocked", "Rare combination of basic responsibilities", "This deserves celebration", "I'm basically a functioning human"],
                ["Cooked dinner, didn't order takeout", "Character development arc completed", "Actually used those cooking utensils", "Fresh ingredients, not expired", "Adulting level: intermediate"],
                ["Filed taxes without crying", "Emotional regulation during bureaucracy", "Math anxiety conquered temporarily", "Government forms make sense suddenly", "Professional adult status: confirmed"],
            ],
            'minimalism-failed': [
                ["Marie Kondo'd my life, chaos returned immediately", "Joy sparking is apparently temporary", "Minimalism met maximalist tendencies", "The stuff reproduces when I'm not looking", "Organized chaos is still chaos"],
                ["Bought organizing supplies to organize supplies", "The irony is purchasing organization", "Container store addiction is real", "Organized hoarding is still hoarding", "Maybe I need more bins"],
                ["Minimalist aesthetic, maximalist heart", "Instagram vs reality gap", "Clean spaces, cluttered soul", "Aesthetic minimalism, emotional maximalism", "The contradiction is exhausting"],
            ],
            'global-food': [
                ["Spice tolerance is cultural currency", "Your mild is my water seasoning", "Heat levels transcend borders", "Capsaicin diplomacy in action", "Respect all spice preferences"],
                ["Comfort food means different things globally", "Rice vs bread vs corn base debates", "Carbs unite all cultures", "Starch solidarity across continents", "Universal love language: carbohydrates"],
                ["Street food > restaurant food, fight me", "Authenticity comes from necessity", "Best meals come from carts", "Michelin stars vs street credibility", "Real flavor has no fancy address"],
            ],
            'expat-life': [
                ["Home is wherever my suitcase currently is", "Nomadic heart, geographic confusion", "Passport stamps > possessions", "Location independence, emotional dependence", "Everywhere and nowhere simultaneously"],
                ["Explaining where I'm from requires a map", "It's complicated: geographic edition", "Third culture identity crisis", "Home is a feeling, not a place", "GPS for the soul needed"],
                ["Banking in 5 countries, belonging in none", "Financial internationalism", "Currency confusion is daily reality", "Exchange rates affect life decisions", "Money has no nationality"],
            ]
        }

        with transaction.atomic():
            total_messages = 0
            for room in new_rooms:
                try:
                    # Get the most specific conversation template for this room
                    room_key = self.get_specific_room_key(room.name)
                    templates = conversation_templates.get(room_key, conversation_templates.get('global-food', [
                        ["This room has such good vibes", "Really enjoying the community here", "Found my people!", "Great conversations in this space", "Love the energy everyone brings"]
                    ]))

                    room_messages = 0
                    for i in range(num_conversations):
                        try:
                            conversation = random.choice(templates)
                            conversation_users = random.sample(users, min(len(conversation), len(users)))

                            # Spread conversations over last 30 days
                            base_time = timezone.now() - timedelta(days=random.randint(0, 30))

                            for j, message_text in enumerate(conversation):
                                user = conversation_users[j % len(conversation_users)]
                                time_gap = random.choice([
                                    random.randint(1, 3),    # Quick responses
                                    random.randint(5, 15),   # Normal gap
                                    random.randint(30, 120)  # Longer gap
                                ])
                                timestamp = base_time + timedelta(minutes=j * time_gap)

                                Message.objects.create(
                                    user=user,
                                    room=room,
                                    content=message_text,
                                    timestamp=timestamp
                                )
                                room_messages += 1
                                total_messages += 1

                        except Exception as e:
                            continue

                    self.stdout.write(f'💬 Generated {room_messages} RELEVANT messages for {room.display_name}')

                except Exception as e:
                    self.stdout.write(f'❌ Error processing room {room.display_name}: {str(e)}')
                    continue

            self.stdout.write(self.style.SUCCESS(f'✅ Generated {total_messages} highly relevant messages'))

    def get_specific_room_key(self, room_name):
        """Get the most specific conversation template key for a room"""
        room_name_lower = room_name.lower()

        # Highly specific room matching
        if 'korean-drama' in room_name_lower or 'k-drama' in room_name_lower:
            return 'korean-drama'
        elif 'jollof' in room_name_lower:
            return 'jollof-wars'
        elif 'italian-grandma' in room_name_lower or 'nonna' in room_name_lower:
            return 'italian-grandma'
        elif 'british-weather' in room_name_lower:
            return 'british-weather'
        elif 'notion' in room_name_lower or 'productivity' in room_name_lower or 'time-block' in room_name_lower:
            return 'productivity-systems'
        elif 'philosophy' in room_name_lower or 'consciousness' in room_name_lower or 'existential' in room_name_lower:
            return 'philosophy-deep'
        elif 'crypto' in room_name_lower or 'nft' in room_name_lower:
            return 'crypto-recovery'
        elif 'dating-app' in room_name_lower or 'dating' in room_name_lower:
            return 'dating-app-horror'
        elif 'plant' in room_name_lower:
            return 'plant-parent'
        elif 'wifi' in room_name_lower:
            return 'wifi-crisis'
        elif 'overthinking' in room_name_lower:
            return 'overthinking-olympics'
        elif 'subscription' in room_name_lower:
            return 'subscription-trapped'
        elif 'email' in room_name_lower:
            return 'email-hoarders'
        elif 'adulting-level' in room_name_lower:
            return 'adult-level-expert'
        elif 'minimalism' in room_name_lower:
            return 'minimalism-failed'
        elif 'expat' in room_name_lower or 'third-culture' in room_name_lower:
            return 'expat-life'
        elif any(food_word in room_name_lower for food_word in ['food', 'curry', 'ramen', 'spicy', 'mezze', 'steak']):
            return 'global-food'
        else:
            return 'global-food'  # Default fallback

    def add_diverse_reactions(self):
        """Add culturally diverse reactions"""
        self.stdout.write('😊 Adding diverse reactions...')

        messages = Message.objects.all()
        users = list(User.objects.all())

        # Diverse emoji set including cultural elements
        diverse_emojis = [
            '❤️', '👍', '😂', '💯', '🔥', '✨', '🎉', '👏', '🤔', '😍',
            '🌍', '🌮', '🍜', '☕', '🫶', '💀', '🙈', '👀', '🚀', '⚡'
        ]

        reaction_count = 0
        for message in random.sample(list(messages), min(len(messages), int(len(messages) * 0.4))):
            num_reactions = random.choices([1, 2, 3], weights=[60, 30, 10])[0]
            reacting_users = random.sample(users, min(num_reactions, len(users)))

            for user in reacting_users:
                emoji = random.choice(diverse_emojis)
                if not Reaction.objects.filter(message=message, user=user, emoji=emoji).exists():
                    Reaction.objects.create(message=message, user=user, emoji=emoji)
                    reaction_count += 1

        self.stdout.write(self.style.SUCCESS(f'✅ Added {reaction_count} diverse reactions'))

    def create_themed_meetups(self):
        """Create diverse themed meetups"""
        self.stdout.write('📅 Creating themed meetups...')

        rooms = list(Room.objects.filter(is_dm=False))
        users = list(User.objects.all())

        diverse_meetup_templates = [
            {
                'title': 'Global Coffee Culture Exchange',
                'location': 'International Coffee House',
                'description': 'Taste coffee traditions from around the world. Bring your cultural brewing methods!'
            },
            {
                'title': 'Productivity Systems Anonymous',
                'location': 'Organization Station',
                'description': 'Share your productivity failures and wins. No judgment, just understanding.'
            },
            {
                'title': 'Philosophy Café Midnight Edition',
                'location': 'The Thinking Space',
                'description': 'Deep thoughts over deeper coffee. Existential crisis optional but welcome.'
            },
            {
                'title': 'International Comfort Food Potluck',
                'location': 'Global Kitchen Community Center',
                'description': 'Bring a dish that reminds you of home. Stories included.'
            },
            {
                'title': 'Digital Detox Support Circle',
                'location': 'Analog Life Café',
                'description': 'Real-world meeting for screen-tired souls. Phones in basket at door.'
            },
            {
                'title': 'Creative Block Breaker Session',
                'location': 'Inspiration Station',
                'description': 'Collaborative creativity to unstick stuck artists. All mediums welcome.'
            }
        ]

        meetup_count = 0
        for _ in range(random.randint(20, 30)):
            room = random.choice(rooms)
            template = random.choice(diverse_meetup_templates)
            creator = random.choice(users)

            future_date = timezone.now() + timedelta(days=random.randint(1, 60))
            hour = random.randint(10, 20)
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

            attendees = random.sample(users, random.randint(3, 10))
            if creator not in attendees:
                attendees.append(creator)

            meetup.attendees.set(attendees)
            meetup_count += 1

        self.stdout.write(self.style.SUCCESS(f'✅ Created {meetup_count} themed meetups'))
