import random
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from chat.models import UserProfile


class Command(BaseCommand):
    help = 'Assign random countries to existing user profiles'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be done without making changes',
        )

    def handle(self, *args, **options):
        # List of popular country codes
        country_codes = [
            'US', 'CA', 'GB', 'DE', 'FR', 'JP', 'AU', 'BR', 'IN', 'CN',
            'RU', 'IT', 'ES', 'MX', 'KR', 'NL', 'SE', 'NO', 'DK', 'FI',
            'SG', 'TH', 'PH', 'MY', 'ID', 'VN', 'TR', 'EG', 'ZA', 'NG',
            'KE', 'AR', 'CL', 'CO', 'PE', 'PL', 'CZ', 'HU', 'GR', 'PT',
            'IE', 'AT', 'CH', 'BE', 'LU', 'IS', 'EE', 'LV', 'LT', 'SK'
        ]

        # Get all users
        users = User.objects.all()

        if not users.exists():
            self.stdout.write(self.style.WARNING('No users found in database'))
            return

        updated_count = 0
        created_count = 0

        for user in users:
            # Get or create user profile
            profile, created = UserProfile.objects.get_or_create(user=user)

            if created:
                created_count += 1
                self.stdout.write(f'Created profile for user: {user.username}')

            # Only assign country if not already set
            if not profile.country_code:
                random_country = random.choice(country_codes)

                if options['dry_run']:
                    self.stdout.write(
                        f'[DRY RUN] Would assign {random_country} to {user.username}'
                    )
                else:
                    profile.country_code = random_country
                    profile.save()

                    # Get the flag emoji for display
                    flag_emoji = profile.country_flag_emoji
                    country_name = profile.country_name

                    self.stdout.write(
                        self.style.SUCCESS(
                            f'Assigned {random_country} ({flag_emoji} {country_name}) to {user.username}'
                        )
                    )
                    updated_count += 1
            else:
                flag_emoji = profile.country_flag_emoji
                country_name = profile.country_name
                self.stdout.write(
                    f'User {user.username} already has country: {profile.country_code} ({flag_emoji} {country_name})'
                )

        if options['dry_run']:
            self.stdout.write(
                self.style.WARNING(
                    f'DRY RUN: Would update {len([u for u in users if not hasattr(u, "profile") or not u.profile.country_code])} users'
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully processed {users.count()} users:\n'
                    f'- Created {created_count} new profiles\n'
                    f'- Updated {updated_count} users with countries'
                )
            )

        # Show some statistics
        self.stdout.write('\n' + '='*50)
        self.stdout.write('COUNTRY DISTRIBUTION:')
        self.stdout.write('='*50)

        if not options['dry_run']:
            from django.db.models import Count
            country_stats = UserProfile.objects.values('country_code').annotate(
                count=Count('country_code')
            ).order_by('-count')

            for stat in country_stats[:10]:  # Show top 10
                if stat['country_code']:
                    profile = UserProfile(country_code=stat['country_code'])
                    flag = profile.country_flag_emoji
                    name = profile.country_name
                    self.stdout.write(f'{flag} {stat["country_code"]} ({name}): {stat["count"]} users')
