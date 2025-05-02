from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify

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
