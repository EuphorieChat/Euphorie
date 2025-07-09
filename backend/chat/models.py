# backend/chat/models.py

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.validators import RegexValidator, URLValidator
from django.core.exceptions import ValidationError
from django.utils.text import slugify
from django.db.models import Q
from django.core.cache import cache
import json
import requests

class UserProfile(models.Model):
    """Enhanced user profile with 3D avatar customization and nationality"""
    
    THEME_CHOICES = [
        ('light', 'Light'),
        ('dark', 'Dark'),
        ('auto', 'Auto'),
        ('high_contrast', 'High Contrast'),
    ]
    
    STATUS_CHOICES = [
        ('online', 'Online'),
        ('away', 'Away'),
        ('busy', 'Busy'),
        ('invisible', 'Invisible'),
    ]
    
    PRIVACY_CHOICES = [
        ('public', 'Public'),
        ('friends', 'Friends Only'),
        ('private', 'Private'),
    ]
    
    # Common country codes for validation
    COUNTRY_CHOICES = [
        ('US', 'United States'), ('CA', 'Canada'), ('GB', 'United Kingdom'),
        ('DE', 'Germany'), ('FR', 'France'), ('JP', 'Japan'), ('AU', 'Australia'),
        ('BR', 'Brazil'), ('IN', 'India'), ('CN', 'China'), ('KR', 'South Korea'),
        ('RU', 'Russia'), ('MX', 'Mexico'), ('IT', 'Italy'), ('ES', 'Spain'),
        ('NL', 'Netherlands'), ('SE', 'Sweden'), ('NO', 'Norway'), ('FI', 'Finland'),
        ('DK', 'Denmark'), ('BE', 'Belgium'), ('CH', 'Switzerland'), ('AT', 'Austria'),
        ('PL', 'Poland'), ('TR', 'Turkey'), ('GR', 'Greece'), ('PT', 'Portugal'),
        ('IE', 'Ireland'), ('CZ', 'Czech Republic'), ('HU', 'Hungary'), ('RO', 'Romania'),
        ('BG', 'Bulgaria'), ('HR', 'Croatia'), ('SK', 'Slovakia'), ('SI', 'Slovenia'),
        ('LT', 'Lithuania'), ('LV', 'Latvia'), ('EE', 'Estonia'), ('AR', 'Argentina'),
        ('CL', 'Chile'), ('PE', 'Peru'), ('CO', 'Colombia'), ('VE', 'Venezuela'),
        ('UY', 'Uruguay'), ('PY', 'Paraguay'), ('BO', 'Bolivia'), ('EC', 'Ecuador'),
        ('ZA', 'South Africa'), ('EG', 'Egypt'), ('MA', 'Morocco'), ('NG', 'Nigeria'),
        ('KE', 'Kenya'), ('GH', 'Ghana'), ('TH', 'Thailand'), ('VN', 'Vietnam'),
        ('PH', 'Philippines'), ('ID', 'Indonesia'), ('MY', 'Malaysia'), ('SG', 'Singapore'),
        ('UN', 'Unknown'),
    ]
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    # Avatar & Appearance
    avatar_customization = models.JSONField(
        default=dict,
        help_text="3D avatar appearance settings"
    )
    display_name = models.CharField(max_length=50, blank=True)
    
    # Nationality & Location
    nationality = models.CharField(
        max_length=2, 
        choices=COUNTRY_CHOICES,
        blank=True, 
        null=True,
        help_text="User-selected nationality (2-letter country code)"
    )
    auto_detected_country = models.CharField(
        max_length=2, 
        choices=COUNTRY_CHOICES,
        blank=True, 
        null=True,
        help_text="Auto-detected country from IP address"
    )
    location = models.CharField(max_length=100, blank=True)
    show_nationality = models.BooleanField(default=True, help_text="Show nationality flag on avatar")
    
    # Profile Information
    bio = models.TextField(max_length=300, blank=True)
    website = models.URLField(blank=True, validators=[URLValidator()])
    
    # Preferences
    theme = models.CharField(max_length=20, choices=THEME_CHOICES, default='light')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='online')
    status_message = models.CharField(max_length=100, blank=True)
    
    # Privacy Settings
    profile_visibility = models.CharField(max_length=20, choices=PRIVACY_CHOICES, default='public')
    show_online_status = models.BooleanField(default=True)
    allow_friend_requests = models.BooleanField(default=True)
    
    # Activity Tracking
    total_messages = models.PositiveIntegerField(default=0)
    rooms_created = models.PositiveIntegerField(default=0)
    last_seen = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Achievements
    achievements = models.JSONField(default=list, help_text="List of earned achievements")
    
    def __str__(self):
        return f"{self.user.username}'s Profile"
    
    @property
    def display_username(self):
        """Return display name if set, otherwise username"""
        return self.display_name or self.user.username
    
    def get_display_nationality(self):
        """Returns user-set nationality or auto-detected as fallback"""
        if self.show_nationality:
            return self.nationality or self.auto_detected_country or 'UN'
        return None
    
    def get_country_name(self):
        """Get full country name from nationality code"""
        country_dict = dict(self.COUNTRY_CHOICES)
        nationality = self.get_display_nationality()
        return country_dict.get(nationality, 'Unknown') if nationality else None
    
    def get_flag_url(self):
        """Get flag image URL for the user's nationality"""
        nationality = self.get_display_nationality()
        if nationality and nationality != 'UN':
            return f"https://flagcdn.com/w40/{nationality.lower()}.png"
        return None
    
    def update_nationality(self, nationality):
        """Update user's nationality and save"""
        if nationality in dict(self.COUNTRY_CHOICES):
            self.nationality = nationality
            self.save(update_fields=['nationality'])
            return True
        return False
    
    def auto_detect_country(self, ip_address):
        """Auto-detect country from IP address"""
        try:
            # Check cache first
            cached_country = cache.get(f'country_{ip_address}')
            if cached_country:
                self.auto_detected_country = cached_country
                self.save(update_fields=['auto_detected_country'])
                return cached_country
            
            # Try external API
            response = requests.get(f'https://ipapi.co/{ip_address}/country_code/', timeout=5)
            if response.status_code == 200:
                country = response.text.strip().upper()
                if country in dict(self.COUNTRY_CHOICES):
                    self.auto_detected_country = country
                    self.save(update_fields=['auto_detected_country'])
                    cache.set(f'country_{ip_address}', country, 86400)  # Cache for 24 hours
                    return country
        except:
            pass
        
        # Fallback to unknown
        self.auto_detected_country = 'UN'
        self.save(update_fields=['auto_detected_country'])
        return 'UN'
    
    def get_avatar_settings(self):
        """Get avatar customization with defaults"""
        defaults = {
            'hair_style': 'short',
            'hair_color': '#8B4513',
            'skin_tone': '#FDBCB4',
            'shirt_color': '#FF6B6B',
            'pants_color': '#4ECDC4',
            'eye_color': '#4A90E2',
        }
        settings = {**defaults, **self.avatar_customization}
        
        # Add nationality info for avatar system
        nationality = self.get_display_nationality()
        if nationality:
            settings['nationality'] = nationality
            settings['country_name'] = self.get_country_name()
            settings['flag_url'] = self.get_flag_url()
        
        return settings


class RoomCategory(models.Model):
    """Enhanced room categories with better organization"""
    
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=50, unique=True)
    description = models.TextField(max_length=200, blank=True)
    icon = models.CharField(max_length=20, default='💬')
    color = models.CharField(max_length=7, default='#6366f1')
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['sort_order', 'name']
        verbose_name_plural = "Room Categories"
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Room(models.Model):
    """Enhanced room model with better discovery features"""
    
    name = models.CharField(max_length=255, unique=True)
    display_name = models.CharField(max_length=255, blank=True)
    category = models.ForeignKey(RoomCategory, on_delete=models.SET_NULL, null=True, blank=True)
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_rooms')
    
    # Room Settings
    description = models.TextField(max_length=500, blank=True)
    is_public = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    max_users = models.PositiveIntegerField(default=50)
    require_approval = models.BooleanField(default=False)
    
    # Discovery & Search
    tags = models.CharField(max_length=200, blank=True, help_text="Comma-separated tags")
    language = models.CharField(max_length=10, default='en')
    
    # Activity Tracking
    message_count = models.PositiveIntegerField(default=0)
    active_users_count = models.PositiveIntegerField(default=0)
    last_activity = models.DateTimeField(auto_now=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-last_activity', '-created_at']
    
    def __str__(self):
        return self.display_name or self.name
    
    @property
    def category_slug(self):
        return self.category.slug if self.category else 'general'
    
    def get_tags_list(self):
        """Return tags as a list"""
        if not self.tags:
            return []
        return [tag.strip() for tag in self.tags.split(',') if tag.strip()]
    
    def is_trending(self):
        """Check if room is trending based on recent activity"""
        return self.message_count > 20 and self.active_users_count > 5
    
    def get_scene_preset_display(self):
        """Return a human-readable scene preset name"""
        scene_presets = {
            'modern_office': 'Modern Office',
            'cyberpunk_city': 'Cyberpunk City', 
            'forest_clearing': 'Forest Clearing',
            'space_station': 'Space Station',
            'cozy_library': 'Cozy Library',
            'beach_resort': 'Beach Resort',
        }
        return scene_presets.get(getattr(self, 'scene_preset', 'modern_office'), 'Modern Office')
    
    def get_user_nationalities(self):
        """Get nationality distribution of active users in this room"""
        from django.db.models import Count
        
        # Get recent messages to find active users
        recent_messages = self.messages.filter(
            timestamp__gte=timezone.now() - timezone.timedelta(hours=24)
        ).select_related('user__profile')
        
        nationalities = {}
        for message in recent_messages:
            if hasattr(message.user, 'profile'):
                nationality = message.user.profile.get_display_nationality()
                if nationality:
                    nationalities[nationality] = nationalities.get(nationality, 0) + 1
        
        return nationalities


class Message(models.Model):
    """Enhanced message model with nationality context"""
    
    MESSAGE_TYPES = [
        ('text', 'Text'),
        ('system', 'System'),
        ('emotion', 'Emotion'),
        ('interaction', 'Interaction'),
    ]
    
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='messages')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPES, default='text')
    
    # 3D Position for avatar messages
    avatar_position = models.JSONField(default=dict, help_text="3D position when message was sent")
    
    # User context at time of message (for historical accuracy)
    user_nationality_at_time = models.CharField(max_length=2, blank=True, null=True)
    
    # Message metadata
    is_edited = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    
    # Timestamps
    timestamp = models.DateTimeField(auto_now_add=True)
    edited_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['timestamp']
    
    def __str__(self):
        return f"{self.user.username}: {self.content[:50]}"
    
    def save(self, *args, **kwargs):
        # Store user's nationality at time of message
        if not self.user_nationality_at_time and hasattr(self.user, 'profile'):
            self.user_nationality_at_time = self.user.profile.get_display_nationality()
        super().save(*args, **kwargs)
    
    def get_user_flag_url(self):
        """Get flag URL for the user at the time of message"""
        nationality = self.user_nationality_at_time
        if nationality and nationality != 'UN':
            return f"https://flagcdn.com/w40/{nationality.lower()}.png"
        return None


class MessageReport(models.Model):
    """Report system for inappropriate messages"""
    
    REASON_CHOICES = [
        ('spam', 'Spam'),
        ('harassment', 'Harassment'),
        ('inappropriate', 'Inappropriate Content'),
        ('hate_speech', 'Hate Speech'),
        ('violence', 'Violence'),
        ('other', 'Other'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('reviewed', 'Reviewed'),
        ('resolved', 'Resolved'),
        ('dismissed', 'Dismissed'),
    ]
    
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='reports')
    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='message_reports')
    reason = models.CharField(max_length=20, choices=REASON_CHOICES)
    description = models.TextField(max_length=500, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Moderation
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_reports')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    moderation_notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['message', 'reporter']
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Report: {self.message.content[:30]} by {self.reporter.username}"


class FriendRequest(models.Model):
    """Friend request system - separate from accepted friendships"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
        ('cancelled', 'Cancelled'),
    ]
    
    from_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_friend_requests')
    to_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_friend_requests')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    message = models.TextField(max_length=200, blank=True, help_text="Optional message with friend request")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    responded_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ['from_user', 'to_user']
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Friend request from {self.from_user.username} to {self.to_user.username} ({self.status})"
    
    def accept(self):
        """Accept the friend request and create friendship"""
        if self.status != 'pending':
            raise ValueError("Can only accept pending friend requests")
            
        self.status = 'accepted'
        self.responded_at = timezone.now()
        self.save()
        
        # Create bidirectional friendship
        Friendship.objects.get_or_create(
            user=self.from_user, 
            friend=self.to_user,
            defaults={'status': 'accepted'}
        )
        Friendship.objects.get_or_create(
            user=self.to_user, 
            friend=self.from_user,
            defaults={'status': 'accepted'}
        )
        
        # Create activity logs
        UserActivity.objects.create(
            user=self.from_user,
            activity_type='made_friend',
            description=f"Became friends with {self.to_user.username}",
            friend=self.to_user
        )
        UserActivity.objects.create(
            user=self.to_user,
            activity_type='made_friend',
            description=f"Became friends with {self.from_user.username}",
            friend=self.from_user
        )
    
    def decline(self):
        """Decline the friend request"""
        if self.status != 'pending':
            raise ValueError("Can only decline pending friend requests")
            
        self.status = 'declined'
        self.responded_at = timezone.now()
        self.save()
    
    def cancel(self):
        """Cancel the friend request (by sender)"""
        if self.status != 'pending':
            raise ValueError("Can only cancel pending friend requests")
            
        self.status = 'cancelled'
        self.responded_at = timezone.now()
        self.save()


class Friendship(models.Model):
    """Enhanced friendship model with rich features"""
    
    STATUS_CHOICES = [
        ('accepted', 'Accepted'),
        ('blocked', 'Blocked'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='friendships')
    friend = models.ForeignKey(User, on_delete=models.CASCADE, related_name='friend_of')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='accepted')
    
    # Enhanced features
    nickname = models.CharField(max_length=50, blank=True, help_text="Custom nickname for this friend")
    is_favorite = models.BooleanField(default=False)
    notes = models.TextField(max_length=300, blank=True)
    
    # Mutual discovery
    mutual_friends_count = models.PositiveIntegerField(default=0)
    rooms_met_in = models.JSONField(default=list, help_text="Rooms where these users have chatted")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['user', 'friend']
        ordering = ['-is_favorite', '-updated_at']
    
    def __str__(self):
        return f"{self.user.username} -> {self.friend.username} ({self.status})"
    
    @property
    def display_name(self):
        """Return nickname if set, otherwise friend's display name"""
        if self.nickname:
            return self.nickname
        try:
            return self.friend.profile.display_username
        except:
            return self.friend.username
    
    @classmethod
    def are_friends(cls, user1, user2):
        """Check if two users are friends"""
        return cls.objects.filter(
            Q(user=user1, friend=user2) | Q(user=user2, friend=user1),
            status='accepted'
        ).exists()
    
    @classmethod
    def get_friends(cls, user):
        """Get all friends for a user"""
        friend_ids = cls.objects.filter(
            user=user, status='accepted'
        ).values_list('friend_id', flat=True)
        
        return User.objects.filter(id__in=friend_ids).select_related('profile')


class FriendSuggestion(models.Model):
    """Smart friend suggestions based on mutual connections and activity"""
    
    SUGGESTION_TYPES = [
        ('mutual_friends', 'Mutual Friends'),
        ('same_rooms', 'Same Rooms'),
        ('similar_interests', 'Similar Interests'),
        ('location_based', 'Location Based'),
        ('same_nationality', 'Same Nationality'),  # New suggestion type
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='friend_suggestions')
    suggested_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='suggested_to')
    suggestion_type = models.CharField(max_length=20, choices=SUGGESTION_TYPES)
    score = models.FloatField(default=0.0, help_text="Suggestion relevance score")
    
    # Metadata
    mutual_friends = models.PositiveIntegerField(default=0)
    shared_rooms = models.PositiveIntegerField(default=0)
    is_dismissed = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['user', 'suggested_user']
        ordering = ['-score', '-created_at']
    
    def __str__(self):
        return f"Suggest {self.suggested_user.username} to {self.user.username}"


class RoomBookmark(models.Model):
    """Allow users to bookmark favorite rooms"""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookmarked_rooms')
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='bookmarks')
    notes = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['user', 'room']
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} bookmarked {self.room.name}"


class UserModerationAction(models.Model):
    """Track moderation actions taken on users"""
    
    ACTION_CHOICES = [
        ('warning', 'Warning'),
        ('mute', 'Mute'),
        ('kick', 'Kick'),
        ('ban', 'Ban'),
        ('unban', 'Unban'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='moderation_actions')
    moderator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='moderation_performed')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    reason = models.TextField(max_length=500)
    
    # Duration for temporary actions
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    # Context
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True)
    related_message = models.ForeignKey(Message, on_delete=models.SET_NULL, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.action} on {self.user.username} by {self.moderator.username}"
    
    def is_expired(self):
        """Check if temporary action has expired"""
        if not self.expires_at:
            return False
        return timezone.now() > self.expires_at


class WordFilter(models.Model):
    """Automatic content filtering system"""
    
    SEVERITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('severe', 'Severe'),
    ]
    
    ACTION_CHOICES = [
        ('flag', 'Flag for Review'),
        ('replace', 'Replace with Asterisks'),
        ('block', 'Block Message'),
        ('auto_warn', 'Auto Warning'),
    ]
    
    word = models.CharField(max_length=100, unique=True)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='medium')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES, default='flag')
    replacement = models.CharField(max_length=20, default='***', blank=True)
    is_active = models.BooleanField(default=True)
    
    # Pattern matching
    is_regex = models.BooleanField(default=False)
    case_sensitive = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Filter: {self.word} ({self.severity})"


class UserActivity(models.Model):
    """Track user activities for the timeline"""
    
    ACTIVITY_TYPES = [
        ('joined_room', 'Joined Room'),
        ('created_room', 'Created Room'),
        ('sent_message', 'Sent Message'),
        ('made_friend', 'Made Friend'),
        ('earned_achievement', 'Earned Achievement'),
        ('customized_avatar', 'Customized Avatar'),
        ('updated_nationality', 'Updated Nationality'),  # New activity type
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities')
    activity_type = models.CharField(max_length=20, choices=ACTIVITY_TYPES)
    description = models.CharField(max_length=200)
    
    # Related objects
    room = models.ForeignKey(Room, on_delete=models.CASCADE, null=True, blank=True)
    friend = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='friend_activities')
    
    # Metadata
    metadata = models.JSONField(default=dict, help_text="Additional activity data")
    is_public = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name_plural = "User Activities"
    
    def __str__(self):
        return f"{self.user.username}: {self.description}"


class NationalityStats(models.Model):
    """Track nationality statistics for analytics"""
    
    nationality = models.CharField(max_length=2, unique=True)
    user_count = models.PositiveIntegerField(default=0)
    message_count = models.PositiveIntegerField(default=0)
    rooms_created = models.PositiveIntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name_plural = "Nationality Statistics"
        ordering = ['-user_count']
    
    def __str__(self):
        country_dict = dict(UserProfile.COUNTRY_CHOICES)
        country_name = country_dict.get(self.nationality, 'Unknown')
        return f"{country_name} ({self.nationality}): {self.user_count} users"
    
    @classmethod
    def update_stats(cls):
        """Update nationality statistics"""
        from django.db.models import Count
        
        # Get nationality counts
        nationality_counts = UserProfile.objects.values('nationality', 'auto_detected_country').annotate(
            count=Count('id')
        )
        
        # Update or create stats
        for item in nationality_counts:
            nationality = item['nationality'] or item['auto_detected_country']
            if nationality:
                stats, created = cls.objects.get_or_create(
                    nationality=nationality,
                    defaults={'user_count': item['count']}
                )
                if not created:
                    stats.user_count = item['count']
                    stats.save()


# Signal to create UserProfile when User is created
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()


# Utility function to get client IP
def get_client_ip(request):
    """Get client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip