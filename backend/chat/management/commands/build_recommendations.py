"""
Django management command to build recommendation index
"""
from django.core.management.base import BaseCommand
from chat.recs.recommender import RoomRecommendationEngine

class Command(BaseCommand):
    help = 'Build or rebuild the room recommendation index'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--rebuild',
            action='store_true',
            help='Force rebuild even if index exists',
        )
    
    def handle(self, *args, **options):
        self.stdout.write('Building recommendation index...')
        
        engine = RoomRecommendationEngine()
        engine.build_index(force_rebuild=options.get('rebuild', False))
        
        self.stdout.write(
            self.style.SUCCESS('Successfully built recommendation index')
        )