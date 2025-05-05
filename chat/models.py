from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify
from django.contrib.auth.hashers import make_password, check_password

class Category(models.Model):
    name = models.CharField(max_length=50, unique=True)
    icon = models.CharField(max_length=50, blank=True, null=True)  # For storing emoji icons
    slug = models.SlugField(unique=True, blank=True)  # Added for URL-friendly names

    class Meta:
        verbose_name_plural = "categories"
        ordering = ['name']  # Default ordering by name

    def save(self, *args, **kwargs):
        # Auto-generate slug if not provided
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    @classmethod
    def get_default_categories(cls):
        """Returns a list of default categories with icons"""
        return [
            {'name': 'Technology', 'icon': '💻', 'value': 'tech'},
            {'name': 'Social', 'icon': '👋', 'value': 'social'},
            {'name': 'Creative', 'icon': '🎨', 'value': 'creative'},
            {'name': 'Gaming', 'icon': '🎮', 'value': 'gaming'},
            {'name': 'Education', 'icon': '📚', 'value': 'education'},
            {'name': 'Health & Wellness', 'icon': '🧘', 'value': 'health'},
            {'name': 'Music', 'icon': '🎵', 'value': 'music'},
            {'name': 'Food & Cooking', 'icon': '🍕', 'value': 'food'},
            {'name': 'Travel', 'icon': '✈️', 'value': 'travel'},
            {'name': 'Finance', 'icon': '💰', 'value': 'finance'},
            {'name': 'Sports', 'icon': '⚽', 'value': 'sports'},
            {'name': 'Movies & TV', 'icon': '🎬', 'value': 'media'},
            {'name': 'Books & Reading', 'icon': '📖', 'value': 'books'},
            {'name': 'Science', 'icon': '🔬', 'value': 'science'},
            {'name': 'Other', 'icon': '🌟', 'value': 'other'},
        ]

    @classmethod
    def create_default_categories(cls):
        """Creates default categories if they don't exist"""
        for category in cls.get_default_categories():
            cls.objects.get_or_create(
                name=category['name'],
                defaults={'icon': category['icon'], 'slug': category['value']}
            )


class Room(models.Model):
    name = models.SlugField(unique=True)
    display_name = models.CharField(max_length=100, blank=True)  # Added for better UI display
    creator = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='rooms')

    # New fields for password protection
    is_protected = models.BooleanField(default=False)
    password = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        ordering = ['-created_at']  # Default ordering by newest first

    def save(self, *args, **kwargs):
        # Auto-generate display_name if not provided
        if not self.display_name:
            self.display_name = self.name.replace('-', ' ').title()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name

    @property
    def message_count(self):
        """Returns the count of messages in this room"""
        return self.messages.count()

    def set_password(self, raw_password):
        """Set a hashed password for the room"""
        if raw_password:
            self.password = make_password(raw_password)
            self.is_protected = True
        else:
            self.password = None
            self.is_protected = False

    def check_password(self, raw_password):
        """Check if the provided password is correct"""
        if not self.is_protected:
            return True
        return check_password(raw_password, self.password)


class Message(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='messages')
    media = models.FileField(upload_to='chat_media/', blank=True, null=True)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']  # Order by timestamp ascending for conversation flow

    def __str__(self):
        return f"[{self.timestamp}] {self.user.username}: {self.content[:50]}"


class Reaction(models.Model):
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='reactions')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    emoji = models.CharField(max_length=10)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('message', 'user', 'emoji')
        ordering = ['created_at']

    def __str__(self):
        return f"{self.user.username} reacted {self.emoji} to message {self.message.id}"


class Meetup(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    datetime = models.DateTimeField()
    location = models.CharField(max_length=255)
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='meetups')
    creator = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    attendees = models.ManyToManyField(User, related_name='attending_meetups', blank=True)

    class Meta:
        ordering = ['datetime']  # Order by upcoming date first

    def __str__(self):
        return f"{self.title} at {self.location} on {self.datetime}"


class Announcement(models.Model):
    """Model for admin announcements in chat rooms"""
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='announcements')
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_announcements')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Announcement in {self.room.name} by {self.creator.username}"


class AnnouncementReadStatus(models.Model):
    """Tracks which users have read which announcements"""
    announcement = models.ForeignKey(Announcement, on_delete=models.CASCADE, related_name='read_statuses')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='announcement_reads')
    read_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('announcement', 'user')

    def __str__(self):
        return f"{self.user.username} read {self.announcement.id} at {self.read_at}"
class UserSettings(models.Model):
    """
    Model for storing global user settings configuration
    This is a singleton model - only one instance should exist
    """
    # Registration settings
    allow_registration = models.BooleanField(default=True,
                                            help_text="Allow new user registrations")
    require_email_verification = models.BooleanField(default=True,
                                                   help_text="Require email verification before account activation")
    default_user_role = models.CharField(max_length=20, default='user',
                                        help_text="Default role for new users")
    welcome_message = models.TextField(blank=True,
                                      help_text="Message sent to new users after registration")

    # Permission settings
    allow_room_creation = models.BooleanField(default=True,
                                             help_text="Allow regular users to create chat rooms")
    allow_file_uploads = models.BooleanField(default=True,
                                            help_text="Allow users to upload files in chat")
    allow_image_uploads = models.BooleanField(default=True,
                                             help_text="Allow users to upload images in chat")
    allow_private_rooms = models.BooleanField(default=True,
                                             help_text="Allow users to create private chat rooms")
    allow_profile_customization = models.BooleanField(default=True,
                                                    help_text="Allow users to customize their profiles")

    # Moderation settings
    content_filtering = models.CharField(max_length=20, default='medium',
                                        help_text="Level of automatic content filtering")
    moderation_queue = models.BooleanField(default=False,
                                          help_text="Flag potentially problematic messages for review")
    auto_ban_threshold = models.IntegerField(default=0,
                                            help_text="Number of violations before automatic ban (0 = disabled)")
    custom_filter_words = models.TextField(blank=True,
                                         help_text="Custom words to filter (comma separated)")

    # Cleanup settings
    inactive_user_period = models.IntegerField(default=0,
                                              help_text="Days of inactivity before account removal (0 = never)")

    # System settings
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "User Settings"
        verbose_name_plural = "User Settings"

    def __str__(self):
        return "Global User Settings"
