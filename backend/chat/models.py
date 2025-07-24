# backend/chat/models.py

import json
import stripe
import requests

from django.conf import settings
from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator, URLValidator
from django.db import models
from django.db.models import Q
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone, text

class UserProfile(models.Model):
    """Enhanced user profile with 3D avatar customization, nationality, and privacy settings"""

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
    avatar_customization = models.JSONField(default=dict, help_text="3D avatar appearance settings")
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
    profile_visibility = models.CharField(
        max_length=20,
        choices=PRIVACY_CHOICES,
        default='public',
        help_text="Control who can see your profile"
    )
    show_online_status = models.BooleanField(default=True)
    allow_friend_requests = models.BooleanField(default=True)
    email_notifications = models.BooleanField(
        default=True,
        help_text="Receive email notifications for messages and mentions"
    )
    allow_room_invites = models.BooleanField(
        default=True,
        help_text="Allow others to invite you to rooms"
    )

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

    def save(self, *args, **kwargs):
        if not self.last_seen:
            self.last_seen = timezone.now()
        super().save(*args, **kwargs)

    @property
    def display_username(self):
        return self.display_name or self.user.username

    def get_display_nationality(self):
        if self.show_nationality:
            return self.nationality or self.auto_detected_country or 'UN'
        return None

    def get_country_name(self):
        country_dict = dict(self.COUNTRY_CHOICES)
        nationality = self.get_display_nationality()
        return country_dict.get(nationality, 'Unknown') if nationality else None

    def get_flag_url(self):
        nationality = self.get_display_nationality()
        if nationality and nationality != 'UN':
            return f"https://flagcdn.com/w40/{nationality.lower()}.png"
        return None

    def update_nationality(self, nationality):
        if nationality in dict(self.COUNTRY_CHOICES):
            self.nationality = nationality
            self.save(update_fields=['nationality'])
            return True
        return False

    def auto_detect_country(self, ip_address):
        try:
            cached_country = cache.get(f'country_{ip_address}')
            if cached_country:
                self.auto_detected_country = cached_country
                self.save(update_fields=['auto_detected_country'])
                return cached_country

            response = requests.get(f'https://ipapi.co/{ip_address}/country_code/', timeout=5)
            if response.status_code == 200:
                country = response.text.strip().upper()
                if country in dict(self.COUNTRY_CHOICES):
                    self.auto_detected_country = country
                    self.save(update_fields=['auto_detected_country'])
                    cache.set(f'country_{ip_address}', country, 86400)
                    return country
        except:
            pass

        self.auto_detected_country = 'UN'
        self.save(update_fields=['auto_detected_country'])
        return 'UN'

    def get_avatar_settings(self):
        defaults = {
            'hair_style': 'short',
            'hair_color': '#8B4513',
            'skin_tone': '#FDBCB4',
            'shirt_color': '#FF6B6B',
            'pants_color': '#4ECDC4',
            'eye_color': '#4A90E2',
        }
        settings = {**defaults, **self.avatar_customization}

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
    """Enhanced room model with membership support and better discovery features"""
    
    name = models.CharField(max_length=255, unique=True)
    display_name = models.CharField(max_length=255, blank=True)
    category = models.ForeignKey(RoomCategory, on_delete=models.SET_NULL, null=True, blank=True)
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_rooms')
    
    # Room Membership - Many-to-Many relationship with users
    members = models.ManyToManyField(
        User, 
        through='RoomMembership',
        through_fields=('room', 'user'),  # Specify which fields to use
        related_name='joined_rooms',
        blank=True,
        help_text="Users who are members of this room"
    )
    
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
    
    def user_can_access(self, user):
        """Check if a user can access this room"""
        if self.is_public:
            return True
        
        if not user.is_authenticated:
            return False
        
        # Creator always has access
        if self.creator == user:
            return True
        
        # Check if user is a member
        return self.roommembership_set.filter(user=user, is_active=True).exists()
    
    def user_can_join(self, user):
        """Check if a user can join this room"""
        if not user.is_authenticated:
            return False
        
        # Already a member
        if self.user_can_access(user):
            return False
        
        # Check if room is at capacity
        if self.roommembership_set.filter(is_active=True).count() >= self.max_users:
            return False
        
        return True
    
    def add_member(self, user, role='member', added_by=None):
        """Add a user as a member of this room"""
        membership, created = RoomMembership.objects.get_or_create(
            room=self,
            user=user,
            defaults={
                'role': role,
                'added_by': added_by or self.creator,
                'is_active': True
            }
        )
        
        if not created and not membership.is_active:
            # Reactivate existing membership
            membership.is_active = True
            membership.role = role
            membership.rejoined_at = timezone.now()
            membership.save()
        
        return membership
    
    def remove_member(self, user, removed_by=None):
        """Remove a user from room membership"""
        try:
            membership = self.roommembership_set.get(user=user, is_active=True)
            membership.is_active = False
            membership.left_at = timezone.now()
            membership.removed_by = removed_by
            membership.save()
            return True
        except RoomMembership.DoesNotExist:
            return False
    
    def get_active_members(self):
        """Get all active members of this room"""
        return User.objects.filter(
            roommembership__room=self,
            roommembership__is_active=True
        ).select_related('profile')
    
    def get_member_count(self):
        """Get count of active members"""
        return self.roommembership_set.filter(is_active=True).count()


class RoomMembership(models.Model):
    """Through model for Room-User membership with additional metadata"""
    
    ROLE_CHOICES = [
        ('member', 'Member'),
        ('moderator', 'Moderator'),
        ('admin', 'Admin'),
    ]
    
    room = models.ForeignKey(Room, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='member')
    
    # Membership status
    is_active = models.BooleanField(default=True)
    is_banned = models.BooleanField(default=False)
    
    # Membership metadata
    added_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='added_memberships'
    )
    removed_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='removed_memberships'
    )
    
    # Custom settings for this member in this room
    nickname = models.CharField(max_length=50, blank=True, help_text="Custom nickname in this room")
    notification_level = models.CharField(
        max_length=20,
        choices=[
            ('all', 'All Messages'),
            ('mentions', 'Mentions Only'),
            ('none', 'None'),
        ],
        default='all'
    )
    
    # Timestamps
    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(null=True, blank=True)
    rejoined_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ['room', 'user']
        ordering = ['-joined_at']
    
    def __str__(self):
        status = "Active" if self.is_active else "Inactive"
        return f"{self.user.username} in {self.room.name} ({self.role}, {status})"
    
    @property
    def display_name(self):
        """Get display name for this user in this room"""
        if self.nickname:
            return self.nickname
        return self.user.profile.display_username if hasattr(self.user, 'profile') else self.user.username
    
    def can_moderate(self):
        """Check if this member can moderate the room"""
        return self.role in ['moderator', 'admin'] and self.is_active
    
    def can_admin(self):
        """Check if this member can admin the room"""
        return self.role == 'admin' and self.is_active


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

class ScreenShare(models.Model):
    """Track active screen sharing sessions"""
    
    PROJECTION_MODES = [
        ('ceiling', 'Ceiling'),
        ('wall', 'Wall'),
        ('floating', 'Floating'),
    ]
    
    QUALITY_LEVELS = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('stopped', 'Stopped'),
        ('paused', 'Paused'),
    ]
    
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='screen_shares')
    sharer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='screen_shares')
    
    # Screen sharing configuration
    projection_mode = models.CharField(max_length=20, choices=PROJECTION_MODES, default='ceiling')
    quality = models.CharField(max_length=20, choices=QUALITY_LEVELS, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    # Session metadata
    session_id = models.CharField(max_length=100, unique=True)
    webrtc_room_id = models.CharField(max_length=100, blank=True, null=True)
    
    # Viewer tracking
    viewers = models.ManyToManyField(User, through='ScreenShareViewer', related_name='viewing_shares')
    
    # Timestamps
    started_at = models.DateTimeField(auto_now_add=True)
    stopped_at = models.DateTimeField(null=True, blank=True)
    last_activity = models.DateTimeField(auto_now=True)
    
    # Statistics
    total_viewers = models.PositiveIntegerField(default=0)
    max_concurrent_viewers = models.PositiveIntegerField(default=0)
    duration_seconds = models.PositiveIntegerField(default=0)
    
    class Meta:
        ordering = ['-started_at']
        unique_together = ['room', 'status']  # Only one active share per room
    
    def __str__(self):
        return f"{self.sharer.username} sharing in {self.room.name} ({self.status})"
    
    def get_active_viewers(self):
        """Get currently active viewers"""
        return self.viewers.filter(
            screenshareviewer__is_active=True
        ).count()
    
    def add_viewer(self, user):
        """Add a viewer to the screen share"""
        viewer, created = ScreenShareViewer.objects.get_or_create(
            screen_share=self,
            viewer=user,
            defaults={'is_active': True}
        )
        if not created:
            viewer.is_active = True
            viewer.joined_at = timezone.now()
            viewer.save()
        
        # Update statistics
        current_viewers = self.get_active_viewers()
        if current_viewers > self.max_concurrent_viewers:
            self.max_concurrent_viewers = current_viewers
            self.save()
        
        return viewer
    
    def remove_viewer(self, user):
        """Remove a viewer from the screen share"""
        try:
            viewer = ScreenShareViewer.objects.get(
                screen_share=self,
                viewer=user,
                is_active=True
            )
            viewer.is_active = False
            viewer.left_at = timezone.now()
            viewer.save()
            return True
        except ScreenShareViewer.DoesNotExist:
            return False
    
    def stop_sharing(self):
        """Stop the screen sharing session"""
        self.status = 'stopped'
        self.stopped_at = timezone.now()
        
        # Calculate duration
        if self.started_at:
            duration = self.stopped_at - self.started_at
            self.duration_seconds = int(duration.total_seconds())
        
        self.save()
        
        # Deactivate all viewers
        ScreenShareViewer.objects.filter(
            screen_share=self,
            is_active=True
        ).update(is_active=False, left_at=timezone.now())


class ScreenShareViewer(models.Model):
    """Track viewers of screen sharing sessions"""
    
    screen_share = models.ForeignKey(ScreenShare, on_delete=models.CASCADE)
    viewer = models.ForeignKey(User, on_delete=models.CASCADE)
    
    # Viewer state
    is_active = models.BooleanField(default=True)
    has_control = models.BooleanField(default=False)
    
    # Timestamps
    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(null=True, blank=True)
    
    # Quality settings for this viewer
    quality_preference = models.CharField(max_length=20, default='auto')
    
    class Meta:
        unique_together = ['screen_share', 'viewer']
    
    def __str__(self):
        return f"{self.viewer.username} viewing {self.screen_share.sharer.username}'s share"
    


# Configure Stripe
stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', '')

class PaymentPlan(models.Model):
    """Payment plans for premium room access"""
    
    PLAN_CHOICES = [
        ('basic', 'Basic (≤10 users)'),
        ('premium', 'Premium (11-50 users)'),
        ('enterprise', 'Enterprise (51+ users)'),
    ]
    
    name = models.CharField(max_length=50, choices=PLAN_CHOICES, unique=True)
    max_users = models.IntegerField()
    price_cents = models.IntegerField(help_text="Price in cents")
    stripe_price_id = models.CharField(max_length=100, blank=True)
    description = models.TextField(blank=True)
    features = models.JSONField(default=list, help_text="List of plan features")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['price_cents']
    
    def __str__(self):
        return f"{self.get_name_display()} - ${self.price_cents/100:.2f}"
    
    @property
    def price_dollars(self):
        return self.price_cents / 100
    
    def get_features_list(self):
        """Get features as a list"""
        if isinstance(self.features, list):
            return self.features
        return []


class UserSubscription(models.Model):
    """User subscription model"""
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='subscription')
    plan = models.ForeignKey(PaymentPlan, on_delete=models.CASCADE)
    stripe_customer_id = models.CharField(max_length=100, blank=True)
    stripe_subscription_id = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=False)
    auto_renew = models.BooleanField(default=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.plan.name} ({'Active' if self.is_active else 'Inactive'})"
    
    def can_join_room(self, room_max_users):
        """Check if user can join a room based on their subscription"""
        if not self.is_active or self.is_expired():
            return room_max_users <= 10  # Free tier limit
        return room_max_users <= self.plan.max_users
    
    def get_max_room_size(self):
        """Get maximum room size user can join"""
        if not self.is_active or self.is_expired():
            return 10  # Free tier
        return self.plan.max_users
    
    def is_expired(self):
        """Check if subscription has expired"""
        if not self.expires_at:
            return False
        return timezone.now() > self.expires_at
    
    def days_until_expiry(self):
        """Get days until subscription expires"""
        if not self.expires_at:
            return None
        delta = self.expires_at - timezone.now()
        return max(0, delta.days)
    
    def cancel_subscription(self):
        """Cancel the subscription"""
        self.is_active = False
        self.cancelled_at = timezone.now()
        self.save()
        
        # Cancel in Stripe if exists
        if self.stripe_subscription_id:
            try:
                stripe.Subscription.delete(self.stripe_subscription_id)
            except stripe.error.StripeError:
                pass  # Handle Stripe errors silently


class Payment(models.Model):
    """Payment records"""
    
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('succeeded', 'Succeeded'),
        ('failed', 'Failed'),
        ('canceled', 'Canceled'),
        ('refunded', 'Refunded'),
    ]
    
    PAYMENT_METHOD_CHOICES = [
        ('card', 'Credit/Debit Card'),
        ('bank_transfer', 'Bank Transfer'),
        ('paypal', 'PayPal'),
        ('crypto', 'Cryptocurrency'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments')
    plan = models.ForeignKey(PaymentPlan, on_delete=models.CASCADE)
    stripe_payment_intent_id = models.CharField(max_length=100, unique=True)
    stripe_charge_id = models.CharField(max_length=100, blank=True)
    
    # Payment details
    amount_cents = models.IntegerField()
    currency = models.CharField(max_length=3, default='USD')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, default='card')
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    
    # Metadata
    description = models.TextField(blank=True)
    metadata = models.JSONField(default=dict)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    failed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['status']),
            models.Index(fields=['stripe_payment_intent_id']),
        ]
    
    def __str__(self):
        return f"{self.user.username} - ${self.amount_cents/100:.2f} - {self.status}"
    
    @property
    def amount_dollars(self):
        return self.amount_cents / 100
    
    def mark_as_succeeded(self):
        """Mark payment as succeeded"""
        self.status = 'succeeded'
        self.completed_at = timezone.now()
        self.save()
    
    def mark_as_failed(self, reason=None):
        """Mark payment as failed"""
        self.status = 'failed'
        self.failed_at = timezone.now()
        if reason:
            self.metadata['failure_reason'] = reason
        self.save()


class PaymentAttempt(models.Model):
    """Track payment attempts for analytics"""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    plan = models.ForeignKey(PaymentPlan, on_delete=models.CASCADE)
    amount_cents = models.IntegerField()
    payment_method = models.CharField(max_length=20)
    success = models.BooleanField(default=False)
    error_message = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        status = "Success" if self.success else "Failed"
        return f"{self.user.username} - {status} - ${self.amount_cents/100:.2f}"


# Update the existing Room model - add this method to your Room class
def update_room_model():
    """Add this to your existing Room model"""
    
    # Add this field to your Room model
    requires_payment = models.BooleanField(default=False, help_text="Requires premium subscription to join")
    
    def save(self, *args, **kwargs):
        # Auto-set payment requirement for rooms over 10 users
        if self.max_users > 10:
            self.requires_payment = True
        else:
            self.requires_payment = False
        super().save(*args, **kwargs)
    
    def can_user_join(self, user):
        """Check if user can join this room based on subscription"""
        if not user.is_authenticated:
            return not self.requires_payment and self.max_users <= 10
        
        if not self.requires_payment:
            return True
        
        try:
            subscription = user.subscription
            return subscription.can_join_room(self.max_users)
        except UserSubscription.DoesNotExist:
            return False  # No subscription for paid room
    
    def get_required_plan(self):
        """Get the minimum plan required for this room"""
        if self.max_users <= 10:
            return None
        elif self.max_users <= 50:
            return PaymentPlan.objects.filter(name='premium', is_active=True).first()
        else:
            return PaymentPlan.objects.filter(name='enterprise', is_active=True).first()
    
    def get_upgrade_url(self):
        """Get URL to upgrade for this room"""
        from django.urls import reverse
        return reverse('pricing') + f'?required_users={self.max_users}'


# Signal handlers for payment events
from django.db.models.signals import post_save
from django.dispatch import receiver

@receiver(post_save, sender=Payment)
def handle_successful_payment(sender, instance, **kwargs):
    """Handle successful payment to update subscription"""
    if instance.status == 'succeeded' and instance.completed_at:
        # Create or update subscription
        subscription, created = UserSubscription.objects.get_or_create(
            user=instance.user,
            defaults={
                'plan': instance.plan,
                'is_active': True,
                'expires_at': timezone.now() + timezone.timedelta(days=30),
            }
        )
        
        if not created:
            # Update existing subscription
            subscription.plan = instance.plan
            subscription.is_active = True
            subscription.expires_at = timezone.now() + timezone.timedelta(days=30)
            subscription.save()
        
        # Create activity log
        try:
            UserActivity.objects.create(
                user=instance.user,
                activity_type='subscription_upgraded',
                description=f"Upgraded to {instance.plan.get_name_display()}",
                metadata={
                    'plan': instance.plan.name,
                    'amount': instance.amount_dollars,
                    'payment_id': instance.id
                }
            )
        except:
            pass  # UserActivity might not exist


@receiver(post_save, sender=UserSubscription)
def update_user_subscription_stats(sender, instance, created, **kwargs):
    """Update user stats when subscription changes"""
    if created and instance.is_active:
        # Log new subscription
        try:
            UserActivity.objects.create(
                user=instance.user,
                activity_type='subscription_created',
                description=f"Subscribed to {instance.plan.get_name_display()}",
                metadata={'plan': instance.plan.name}
            )
        except:
            pass