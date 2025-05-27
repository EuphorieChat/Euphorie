from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from chat.models import UserProfile
import random
import json

class Command(BaseCommand):
    help = 'Create diverse users with realistic profiles'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=50,
            help='Number of users to create (default: 50)',
        )

    def handle(self, *args, **options):
        count = options['count']
        self.stdout.write(f'👥 Creating {count} diverse users...')

        # Realistic usernames and names
        user_data = [
            {'username': 'alex_dev', 'first_name': 'Alex', 'last_name': 'Chen'},
            {'username': 'sarah_designs', 'first_name': 'Sarah', 'last_name': 'Rodriguez'},
            {'username': 'mike_gamer', 'first_name': 'Michael', 'last_name': 'Johnson'},
            {'username': 'lisa_writes', 'first_name': 'Lisa', 'last_name': 'Thompson'},
            {'username': 'david_codes', 'first_name': 'David', 'last_name': 'Kim'},
            {'username': 'emma_artist', 'first_name': 'Emma', 'last_name': 'Wilson'},
            {'username': 'carlos_chef', 'first_name': 'Carlos', 'last_name': 'Martinez'},
            {'username': 'nina_travels', 'first_name': 'Nina', 'last_name': 'Patel'},
            {'username': 'tom_fitness', 'first_name': 'Thomas', 'last_name': 'Brown'},
            {'username': 'zoe_musician', 'first_name': 'Zoe', 'last_name': 'Davis'},
            {'username': 'ryan_student', 'first_name': 'Ryan', 'last_name': 'Miller'},
            {'username': 'maya_teacher', 'first_name': 'Maya', 'last_name': 'Singh'},
            {'username': 'joe_photographer', 'first_name': 'Joseph', 'last_name': 'Garcia'},
            {'username': 'anna_bookworm', 'first_name': 'Anna', 'last_name': 'Lee'},
            {'username': 'max_streamer', 'first_name': 'Maxwell', 'last_name': 'Taylor'},
            {'username': 'sophie_scientist', 'first_name': 'Sophie', 'last_name': 'Clark'},
            {'username': 'luke_entrepreneur', 'first_name': 'Luke', 'last_name': 'Anderson'},
            {'username': 'ava_dancer', 'first_name': 'Ava', 'last_name': 'White'},
            {'username': 'noah_builder', 'first_name': 'Noah', 'last_name': 'Harris'},
            {'username': 'grace_doctor', 'first_name': 'Grace', 'last_name': 'Martin'},
            {'username': 'ethan_engineer', 'first_name': 'Ethan', 'last_name': 'Lewis'},
            {'username': 'mia_lawyer', 'first_name': 'Mia', 'last_name': 'Walker'},
            {'username': 'jacob_athlete', 'first_name': 'Jacob', 'last_name': 'Hall'},
            {'username': 'chloe_nurse', 'first_name': 'Chloe', 'last_name': 'Young'},
            {'username': 'owen_mechanic', 'first_name': 'Owen', 'last_name': 'King'},
            {'username': 'lily_veterinarian', 'first_name': 'Lily', 'last_name': 'Wright'},
            {'username': 'aaron_architect', 'first_name': 'Aaron', 'last_name': 'Lopez'},
            {'username': 'ruby_journalist', 'first_name': 'Ruby', 'last_name': 'Hill'},
            {'username': 'cal_pilot', 'first_name': 'Calvin', 'last_name': 'Green'},
            {'username': 'ivy_therapist', 'first_name': 'Ivy', 'last_name': 'Adams'},
            {'username': 'finn_bartender', 'first_name': 'Finn', 'last_name': 'Baker'},
            {'username': 'hazel_librarian', 'first_name': 'Hazel', 'last_name': 'Nelson'},
            {'username': 'leo_firefighter', 'first_name': 'Leo', 'last_name': 'Carter'},
            {'username': 'sage_consultant', 'first_name': 'Sage', 'last_name': 'Mitchell'},
            {'username': 'quinn_designer', 'first_name': 'Quinn', 'last_name': 'Perez'},
            {'username': 'iris_psychologist', 'first_name': 'Iris', 'last_name': 'Roberts'},
            {'username': 'jude_musician', 'first_name': 'Jude', 'last_name': 'Turner'},
            {'username': 'nova_astronomer', 'first_name': 'Nova', 'last_name': 'Phillips'},
            {'username': 'kai_surfer', 'first_name': 'Kai', 'last_name': 'Campbell'},
            {'username': 'sage_chef2', 'first_name': 'Sage', 'last_name': 'Parker'},
            {'username': 'river_poet', 'first_name': 'River', 'last_name': 'Evans'},
            {'username': 'phoenix_hacker', 'first_name': 'Phoenix', 'last_name': 'Edwards'},
            {'username': 'storm_trader', 'first_name': 'Storm', 'last_name': 'Collins'},
            {'username': 'sage_yogi', 'first_name': 'Sage', 'last_name': 'Stewart'},
            {'username': 'atlas_explorer', 'first_name': 'Atlas', 'last_name': 'Sanchez'},
            {'username': 'luna_astrologer', 'first_name': 'Luna', 'last_name': 'Morris'},
            {'username': 'orion_gamer', 'first_name': 'Orion', 'last_name': 'Rogers'},
            {'username': 'echo_podcaster', 'first_name': 'Echo', 'last_name': 'Reed'},
            {'username': 'sage_minimalist', 'first_name': 'Sage', 'last_name': 'Cook'},
            {'username': 'zen_meditation', 'first_name': 'Zen', 'last_name': 'Morgan'},
        ]

        # Country codes for diversity
        country_codes = [
            'US', 'CA', 'GB', 'DE', 'FR', 'JP', 'AU', 'BR', 'IN', 'CN',
            'RU', 'IT', 'ES', 'MX', 'KR', 'NL', 'SE', 'NO', 'DK', 'FI',
            'SG', 'TH', 'PH', 'MY', 'ID', 'VN', 'TR', 'EG', 'ZA', 'NG',
            'KE', 'AR', 'CL', 'CO', 'PE', 'PL', 'CZ', 'HU', 'GR', 'PT'
        ]

        created_count = 0

        # Create users from predefined data first
        for user_info in user_data[:count]:
            if not User.objects.filter(username=user_info['username']).exists():
                user = User.objects.create_user(
                    username=user_info['username'],
                    first_name=user_info['first_name'],
                    last_name=user_info['last_name'],
                    email=f"{user_info['username']}@example.com",
                    password='demo123'  # Simple password for demo
                )

                # Create profile with random avatar and country
                from chat.views import generate_random_dicebear_avatar
                profile_data = generate_random_dicebear_avatar(user.username)
                random_country = random.choice(country_codes)

                UserProfile.objects.create(
                    user=user,
                    profile_picture_data=json.dumps(profile_data),
                    country_code=random_country
                )

                created_count += 1

                if created_count >= count:
                    break

        # If we need more users, generate them randomly
        if created_count < count:
            adjectives = ['Cool', 'Smart', 'Fast', 'Bright', 'Swift', 'Bold', 'Wise', 'Kind', 'Epic', 'Star']
            nouns = ['Coder', 'Artist', 'Gamer', 'Writer', 'Maker', 'Thinker', 'Creator', 'Builder', 'Dreamer', 'Explorer']

            for i in range(created_count, count):
                username = f"{random.choice(adjectives).lower()}{random.choice(nouns).lower()}{random.randint(100, 999)}"

                if not User.objects.filter(username=username).exists():
                    user = User.objects.create_user(
                        username=username,
                        first_name=random.choice(['Alex', 'Jordan', 'Casey', 'Taylor', 'Morgan', 'Jamie', 'Avery', 'Blake']),
                        last_name=random.choice(['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis']),
                        email=f"{username}@example.com",
                        password='demo123'
                    )

                    # Create profile
                    from chat.views import generate_random_dicebear_avatar
                    profile_data = generate_random_dicebear_avatar(user.username)
                    random_country = random.choice(country_codes)

                    UserProfile.objects.create(
                        user=user,
                        profile_picture_data=json.dumps(profile_data),
                        country_code=random_country
                    )

                    created_count += 1

        self.stdout.write(self.style.SUCCESS(f'✅ Created {created_count} users'))
        self.stdout.write('💡 All users have password: demo123')
