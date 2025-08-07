from django.core.management.base import BaseCommand
from django.db import connection

class Command(BaseCommand):
    help = 'Test the lite recommendation system'
    
    def handle(self, *args, **options):
        try:
            from chat.recs.recommender_lite import LiteRecommendationEngine
            from chat.models import Room, User
            
            self.stdout.write("Testing Lite Recommendation Engine...")
            
            engine = LiteRecommendationEngine()
            
            # Test with anonymous user
            recs = engine.get_recommendations_for_user(None, limit=5, strategy='popular')
            self.stdout.write(f"Popular rooms: {len(recs)} found")
            for room in recs[:3]:
                self.stdout.write(f"  - {room.display_name or room.name}")
            
            # Test with first user if exists
            users = User.objects.filter(is_active=True)[:1]
            if users:
                user = users[0]
                recs = engine.get_recommendations_for_user(user, limit=5, strategy='personalized')
                self.stdout.write(f"\nPersonalized for {user.username}: {len(recs)} found")
            
            # Memory usage
            with connection.cursor() as cursor:
                cursor.execute("SELECT COUNT(*) FROM chat_room")
                room_count = cursor.fetchone()[0]
            
            self.stdout.write(self.style.SUCCESS(
                f"\n✅ Recommendation system working! Total rooms: {room_count}"
            ))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {e}"))