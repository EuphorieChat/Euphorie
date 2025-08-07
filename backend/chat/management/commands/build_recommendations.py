# chat/management/commands/build_recommendations.py
from django.core.management.base import BaseCommand
from django.db import transaction
import logging

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Build or rebuild the room recommendation index'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--rebuild',
            action='store_true',
            help='Force rebuild even if index exists',
        )
    
    def handle(self, *args, **options):
        # Try to import the appropriate recommendation engine
        engine = None
        engine_type = "unknown"
        
        try:
            # Try full ML engine first
            from chat.recs.recommender import RoomRecommendationEngine
            engine = RoomRecommendationEngine()
            engine_type = "ML"
            self.stdout.write(self.style.SUCCESS('Using ML recommendation engine'))
        except ImportError as e:
            self.stdout.write(f'ML engine not available: {e}')
            try:
                # Fall back to lite engine
                from chat.recs.recommender_lite import LiteRecommendationEngine
                engine = LiteRecommendationEngine()
                engine_type = "Lite"
                self.stdout.write(self.style.SUCCESS('Using Lite recommendation engine'))
            except ImportError as e2:
                self.stdout.write(self.style.ERROR(f'No recommendation engine available: {e2}'))
                return
        
        # Check if there are rooms to index
        from chat.models import Room
        room_count = Room.objects.filter(is_public=True).count()
        
        if room_count == 0:
            self.stdout.write(self.style.WARNING('No public rooms found'))
            return
        
        self.stdout.write(f'Found {room_count} public rooms')
        
        # Build index if the engine supports it
        if hasattr(engine, 'build_index'):
            try:
                self.stdout.write('Building recommendation index...')
                with transaction.atomic():
                    engine.build_index(force_rebuild=options.get('rebuild', False))
                self.stdout.write(
                    self.style.SUCCESS(f'Successfully built {engine_type} recommendation index')
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error building index: {e}')
                )
        else:
            self.stdout.write(
                self.style.SUCCESS(f'{engine_type} engine ready (no index required)')
            )
        
        # Test the engine
        try:
            self.stdout.write('\nTesting recommendation engine...')
            test_recs = engine.get_recommendations_for_user(None, limit=3, strategy='popular')
            self.stdout.write(f'Test successful! Got {len(test_recs)} recommendations:')
            for room in test_recs[:3]:
                self.stdout.write(f'  - {room.display_name or room.name}')
        except Exception as e:
            self.stdout.write(self.style.WARNING(f'Test failed: {e}'))