
from django.db import models
from django.contrib.auth.models import User
from django.utils.text import slugify

class Category(models.Model):
    name = models.CharField(max_length=50, unique=True)
    icon = models.CharField(max_length=50, blank=True, null=True)
    slug = models.SlugField(unique=True, blank=True)

    class Meta:
        verbose_name_plural = "categories"
        ordering = ['name']

    def save(self, *args, **kwargs):
        # Standardize name capitalization (Title Case)
        self.name = self.name.strip().title()

        # Auto-generate slug if not provided
        if not self.slug:
            self.slug = slugify(self.name)

        # Ensure slug uniqueness by appending a number if needed
        original_slug = self.slug
        counter = 1
        while Category.objects.filter(slug=self.slug).exclude(id=self.id).exists():
            self.slug = f"{original_slug}-{counter}"
            counter += 1

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.icon})" if self.icon else self.name

    @classmethod
    def get_default_categories(cls):
        """Returns a list of default categories with standardized names, icons, and slugs"""
        return [
            {'name': 'Technology', 'icon': '💻', 'slug': 'technology'},
            {'name': 'Social', 'icon': '👋', 'slug': 'social'},
            {'name': 'Creative', 'icon': '🎨', 'slug': 'creative'},
            {'name': 'Gaming', 'icon': '🎮', 'slug': 'gaming'},
            {'name': 'Education', 'icon': '📚', 'slug': 'education'},
            {'name': 'Health & Wellness', 'icon': '🧘', 'slug': 'health'},
            {'name': 'Music', 'icon': '🎵', 'slug': 'music'},
            {'name': 'Food & Cooking', 'icon': '🍕', 'slug': 'food'},
            {'name': 'Travel', 'icon': '✈️', 'slug': 'travel'},
            {'name': 'Finance', 'icon': '💰', 'slug': 'finance'},
            {'name': 'Sports', 'icon': '⚽', 'slug': 'sports'},
            {'name': 'Movies & TV', 'icon': '🎬', 'slug': 'media'},
            {'name': 'Books & Reading', 'icon': '📖', 'slug': 'books'},
            {'name': 'Science', 'icon': '🔬', 'slug': 'science'},
            {'name': 'Other', 'icon': '🌟', 'slug': 'other'},
        ]

    @classmethod
    def create_default_categories(cls):
        """Creates default categories if they don't exist, using exact name matching"""
        for category in cls.get_default_categories():
            # Use the exact name for consistency
            cls.objects.get_or_create(
                name=category['name'],
                defaults={'icon': category['icon'], 'slug': category['slug']}
            )
