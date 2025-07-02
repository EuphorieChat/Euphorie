# backend/chat/models.py

from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from django.core.validators import RegexValidator, URLValidator
from django.core.exceptions import ValidationError
from django.utils.text import slugify
import json

class UserProfile(models.Model):
    """Enhanced user profile with 3D avatar customization"""
    
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
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    
    # Avatar & Appearance
    avatar_customization = models.JSONField(
        default=dict,
        help_text="3D avatar appearance settings"
    )
    display_name = models.CharField(max_length=50, blank=True)
    
    # Profile Information
    bio = models.TextField(max_length=300, blank=True)
    location = models.CharField(max_length=100, blank=True)
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
        return {**defaults, **self.avatar_customization}


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


class Message(models.Model):
    """Enhanced message model"""
    
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


# FIXED: Friend Request System
class FriendRequest(models.Model):
    """Model to handle friend requests between users"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
        ('cancelled', 'Cancelled'),
    ]
    
    from_user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='sent_friend_requests',
        help_text="User who sent the friend request"
    )
    
    to_user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='received_friend_requests',
        help_text="User who received the friend request"
    )
    
    status = models.CharField(
        max_length=10, 
        choices=STATUS_CHOICES, 
        default='pending',
        help_text="Current status of the friend request"
    )
    
    created_at = models.DateTimeField(
        default=timezone.now,
        help_text="When the friend request was created"
    )
    
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="When the friend request was last updated"
    )
    
    class Meta:
        unique_together = ('from_user', 'to_user')
        ordering = ['-created_at']
        verbose_name = "Friend Request"
        verbose_name_plural = "Friend Requests"
        indexes = [
            models.Index(fields=['from_user', 'status']),
            models.Index(fields=['to_user', 'status']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.from_user.username} → {self.to_user.username} ({self.status})"
    
    def accept(self):
        """Accept the friend request and create friendship"""
        self.status = 'accepted'
        self.save()
        
        # Create friendship entries
        Friendship.objects.get_or_create(user=self.from_user, friend=self.to_user)
        Friendship.objects.get_or_create(user=self.to_user, friend=self.from_user)
    
    def decline(self):
        """Decline the friend request"""
        self.status = 'declined'
        self.save()
    
    def cancel(self):
        """Cancel the friend request (for sender only)"""
        self.status = 'cancelled'
        self.save()


class Friendship(models.Model):
    """Enhanced friendship model with rich features"""
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('declined', 'Declined'),
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
        return self.nickname or self.friend.profile.display_username
    
    @classmethod
    def are_friends(cls, user1, user2):
        """Check if two users are friends"""
        return cls.objects.filter(
            models.Q(user=user1, friend=user2) |
            models.Q(user=user2, friend=user1),
            status='accepted'
        ).exists()
    
    @classmethod
    def get_friends(cls, user):
        """Get all friends of a user"""
        friend_ids = list(cls.objects.filter(user=user, status='accepted').values_list('friend', flat=True))
        return User.objects.filter(id__in=friend_ids).select_related('profile')


class FriendSuggestion(models.Model):
    """Smart friend suggestions based on mutual connections and activity"""
    
    SUGGESTION_TYPES = [
        ('mutual_friends', 'Mutual Friends'),
        ('same_rooms', 'Same Rooms'),
        ('similar_interests', 'Similar Interests'),
        ('location_based', 'Location Based'),
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