from django.core.management.base import BaseCommand
from backend.models import CreditPack

PACKS = [
    {'name': 'Starter (50)', 'credits': 50, 'price_cents': 499, 'sort_order': 1},
    {'name': 'Standard (150)', 'credits': 150, 'price_cents': 999, 'sort_order': 2},
    {'name': 'Pro (500)', 'credits': 500, 'price_cents': 2499, 'sort_order': 3},
]

class Command(BaseCommand):
    help = 'Create initial credit packs'

    def handle(self, *args, **options):
        for pack_data in PACKS:
            pack, created = CreditPack.objects.get_or_create(
                name=pack_data['name'], defaults=pack_data,
            )
            if created:
                self.stdout.write(self.style.SUCCESS(
                    f"  Created: {pack.name} - {pack.credits} credits @ ${pack.price_cents / 100:.2f}"
                ))
            else:
                self.stdout.write(f"  Exists: {pack.name}")
        self.stdout.write(self.style.SUCCESS('Credit packs ready!'))
