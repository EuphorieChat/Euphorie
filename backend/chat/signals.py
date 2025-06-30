# backend/chat/signals.py

from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from django.utils import timezone
from .models import (
    UserProfile, Message, Room, Friendship, 
    UserActivity, FriendSuggestion
)


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    """Automatically create user profile when user is created"""
    if created:
        UserProfile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    """Ensure user profile exists and is saved"""
    profile, created = UserProfile.objects.get_or_create(user=instance)
    if not created:
        profile.save()


@receiver(post_save, sender=Message)
def update_room_activity(sender, instance, created, **kwargs):
    """Update room activity when new message is posted"""
    if created and not instance.is_deleted:
        # Update room message count and last activity
        room = instance.room
        room.message_count += 1
        room.last_activity = timezone.now()
        room.save(update_fields=['message_count', 'last_activity'])
        
        # Update user profile message count
        profile, created = UserProfile.objects.get_or_create(user=instance.user)
        profile.total_messages += 1
        profile.save(update_fields=['total_messages'])
        
        # Create user activity (but not for every message to avoid spam)
        # Only create activity for first message in room or milestone messages
        user_messages_in_room = Message.objects.filter(
            room=room, 
            user=instance.user,
            is_deleted=False
        ).count()
        
        if user_messages_in_room == 1:  # First message in this room
            UserActivity.objects.create(
                user=instance.user,
                activity_type='sent_message',
                description=f'Started chatting in "{room.display_name}"',
                room=room,
                is_public=True
            )


@receiver(post_save, sender=Friendship)
def handle_friendship_changes(sender, instance, created, **kwargs):
    """Handle friendship creation and updates"""
    if created and instance.status == 'accepted':
        # Generate friend suggestions for both users
        generate_mutual_friend_suggestions(instance.user, instance.friend)
        generate_mutual_friend_suggestions(instance.friend, instance.user)
    
    elif instance.status == 'accepted' and not created:
        # Friendship was just accepted
        # Update mutual friends count for both users
        update_mutual_friends_count(instance.user)
        update_mutual_friends_count(instance.friend)


def generate_mutual_friend_suggestions(user, new_friend):
    """Generate friend suggestions based on mutual friends"""
    # Get mutual friends of the new friend
    mutual_friends = User.objects.filter(
        friendships__friend=new_friend,
        friendships__status='accepted'
    ).exclude(
        id=user.id  # Exclude self
    ).exclude(
        friendships__friend=user  # Exclude existing friends
    )
    
    for potential_friend in mutual_friends[:5]:  # Limit to 5 suggestions
        # Count mutual friends
        mutual_count = User.objects.filter(
            friendships__friend=user,
            friendships__status='accepted',
            friend_of__user=potential_friend,
            friend_of__status='accepted'
        ).count()
        
        # Create or update suggestion
        suggestion, created = FriendSuggestion.objects.get_or_create(
            user=user,
            suggested_user=potential_friend,
            defaults={
                'suggestion_type': 'mutual_friends',
                'mutual_friends': mutual_count,
                'score': mutual_count * 10.0  # Base score on mutual friends
            }
        )
        
        if not created:
            suggestion.mutual_friends = mutual_count
            suggestion.score = mutual_count * 10.0
            suggestion.save()


def update_mutual_friends_count(user):
    """Update mutual friends count for user's friendships"""
    friendships = Friendship.objects.filter(user=user, status='accepted')
    
    for friendship in friendships:
        mutual_count = User.objects.filter(
            friendships__friend=user,
            friendships__status='accepted',
            friend_of__user=friendship.friend,
            friend_of__status='accepted'
        ).count()
        
        friendship.mutual_friends_count = mutual_count
        friendship.save(update_fields=['mutual_friends_count'])


@receiver(post_save, sender=Room)
def handle_room_creation(sender, instance, created, **kwargs):
    """Handle room creation activities"""
    if created:
        # Update creator's profile
        profile, created_profile = UserProfile.objects.get_or_create(user=instance.creator)
        profile.rooms_created += 1
        profile.save(update_fields=['rooms_created'])


@receiver(post_delete, sender=Message)
def handle_message_deletion(sender, instance, **kwargs):
    """Handle message deletion - update counts"""
    if not instance.is_deleted:  # Only if actually deleted, not soft deleted
        # Update room message count
        room = instance.room
        if room.message_count > 0:
            room.message_count -= 1
            room.save(update_fields=['message_count'])
        
        # Update user profile message count
        profile = UserProfile.objects.filter(user=instance.user).first()
        if profile and profile.total_messages > 0:
            profile.total_messages -= 1
            profile.save(update_fields=['total_messages'])


@receiver(pre_save, sender=UserProfile)
def handle_profile_updates(sender, instance, **kwargs):
    """Handle profile updates and achievements"""
    if instance.pk:  # Only for existing profiles
        try:
            old_profile = UserProfile.objects.get(pk=instance.pk)
            
            # Check for achievement milestones
            achievements_earned = []
            
            # Message milestones
            message_milestones = [10, 50, 100, 500, 1000, 5000]
            for milestone in message_milestones:
                if (old_profile.total_messages < milestone <= instance.total_messages):
                    achievements_earned.append(f'messenger_{milestone}')
            
            # Room creation milestones
            room_milestones = [1, 5, 10, 25]
            for milestone in room_milestones:
                if (old_profile.rooms_created < milestone <= instance.rooms_created):
                    achievements_earned.append(f'creator_{milestone}')
            
            # Add new achievements
            if achievements_earned:
                current_achievements = instance.achievements or []
                for achievement in achievements_earned:
                    if achievement not in current_achievements:
                        current_achievements.append(achievement)
                        
                        # Create activity for achievement
                        UserActivity.objects.create(
                            user=instance.user,
                            activity_type='earned_achievement',
                            description=f'Earned achievement: {achievement.replace("_", " ").title()}',
                            metadata={'achievement': achievement},
                            is_public=True
                        )
                
                instance.achievements = current_achievements
        
        except UserProfile.DoesNotExist:
            pass


# Room-based friend suggestions
@receiver(post_save, sender=Message)
def generate_room_based_suggestions(sender, instance, created, **kwargs):
    """Generate friend suggestions based on shared room activity"""
    if not created or instance.is_deleted:
        return
    
    # Only process every 10th message to avoid performance issues
    if instance.id % 10 != 0:
        return
    
    room = instance.room
    user = instance.user
    
    # Find other active users in this room
    other_users = User.objects.filter(
        messages__room=room,
        messages__timestamp__gte=timezone.now() - timezone.timedelta(days=7)
    ).exclude(
        id=user.id
    ).exclude(
        friendships__friend=user,
        friendships__status='accepted'
    ).distinct()
    
    for other_user in other_users[:3]:  # Limit to 3 per room
        # Count shared rooms
        shared_rooms = Room.objects.filter(
            messages__user=user,
            messages__user=other_user
        ).distinct().count()
        
        # Create or update suggestion
        suggestion, created = FriendSuggestion.objects.get_or_create(
            user=user,
            suggested_user=other_user,
            defaults={
                'suggestion_type': 'same_rooms',
                'shared_rooms': shared_rooms,
                'score': shared_rooms * 5.0  # Base score on shared rooms
            }
        )
        
        if not created and suggestion.suggestion_type == 'same_rooms':
            suggestion.shared_rooms = shared_rooms
            suggestion.score = shared_rooms * 5.0
            suggestion.save()


# Clean up old activities periodically
@receiver(post_save, sender=UserActivity)
def cleanup_old_activities(sender, instance, created, **kwargs):
    """Clean up old activities to prevent database bloat"""
    if created:
        # Delete activities older than 30 days for this user
        old_activities = UserActivity.objects.filter(
            user=instance.user,
            created_at__lt=timezone.now() - timezone.timedelta(days=30)
        )
        
        # Keep only the most recent 100 activities per user
        if old_activities.count() > 100:
            activities_to_delete = old_activities.order_by('-created_at')[100:]
            UserActivity.objects.filter(
                id__in=[a.id for a in activities_to_delete]
            ).delete()