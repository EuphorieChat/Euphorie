# Standard Library
import json
import uuid
from decimal import Decimal

# Third-party
import stripe
import requests

# Django Core
from django.conf import settings
from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator, URLValidator
from django.db import models
from django.db.models import Q, Count, F
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone, text

# ==================== CHOICES CONSTANTS ====================

class UserChoices:
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

class PaymentChoices:
    PLAN_CHOICES = [
        ('basic', 'Basic'),
        ('premium', 'Premium'),
        ('enterprise', 'Enterprise'),
    ]

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

class ActivityChoices:
    ACTIVITY_TYPES = [
        ('joined_room', 'Joined Room'),
        ('created_room', 'Created Room'),
        ('sent_message', 'Sent Message'),
        ('made_friend', 'Made Friend'),
        ('earned_achievement', 'Earned Achievement'),
        ('customized_avatar', 'Customized Avatar'),
        ('updated_nationality', 'Updated Nationality'),
        ('subscription_upgraded', 'Subscription Upgraded'),
        ('subscription_cancelled', 'Subscription Cancelled'),
        ('data_downloaded', 'Data Downloaded'),
        ('activities_cleared', 'Activities Cleared'),
        ('account_deactivated', 'Account Deactivated'),
        ('started_screen_share', 'Started Screen Share'),
        ('stopped_screen_share', 'Stopped Screen Share'),
    ]

class ModerationChoices:
    REPORT_REASON_CHOICES = [
        ('spam', 'Spam'),
        ('harassment', 'Harassment'),
        ('inappropriate', 'Inappropriate Content'),
        ('hate_speech', 'Hate Speech'),
        ('violence', 'Violence'),
        ('other', 'Other'),
    ]

    REPORT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('reviewed', 'Reviewed'),
        ('resolved', 'Resolved'),
        ('dismissed', 'Dismissed'),
    ]

# ==================== MIXINS ====================

class NationalityMixin(models.Model):
    """Mixin for nationality-related functionality"""
    
    nationality = models.CharField(
        max_length=2,
        choices=UserChoices.COUNTRY_CHOICES,
        blank=True,
        null=True,
        help_text="User-selected nationality (2-letter country code)"
    )
    auto_detected_country = models.CharField(
        max_length=2,
        choices=UserChoices.COUNTRY_CHOICES,
        blank=True,
        null=True,
        help_text="Auto-detected country from IP address"
    )
    show_nationality = models.BooleanField(default=True, help_text="Show nationality flag")

    class Meta:
        abstract = True

    def get_display_nationality(self):
        if self.show_nationality:
            return self.nationality or self.auto_detected_country or 'UN'
        return None

    def get_country_name(self):
        country_dict = dict(UserChoices.COUNTRY_CHOICES)
        nationality = self.get_display_nationality()
        return country_dict.get(nationality, 'Unknown') if nationality else None

    def get_flag_url(self):
        nationality = self.get_display_nationality()
        if nationality and nationality != 'UN':
            return f"https://flagcdn.com/w40/{nationality.lower()}.png"
        return None

    def update_nationality(self, nationality):
        if nationality in dict(UserChoices.COUNTRY_CHOICES):
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
                if country in dict(UserChoices.COUNTRY_CHOICES):
                    self.auto_detected_country = country
                    self.save(update_fields=['auto_detected_country'])
                    cache.set(f'country_{ip_address}', country, 86400)
                    return country
        except:
            pass

        self.auto_detected_country = 'UN'
        self.save(update_fields=['auto_detected_country'])
        return 'UN'

class TimestampMixin(models.Model):
    """Mixin for created_at and updated_at timestamps"""
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

# ==================== CORE MODELS ====================

class UserProfile(NationalityMixin, TimestampMixin):
    """Enhanced user profile with 3D avatar customization and privacy settings"""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')

    # Avatar & Appearance
    avatar_customization = models.JSONField(default=dict, help_text="3D avatar appearance settings")
    display_name = models.CharField(max_length=50, blank=True)

    # Location & Contact
    location = models.CharField(max_length=100, blank=True)
    bio = models.TextField(max_length=300, blank=True)
    website = models.URLField(blank=True, validators=[URLValidator()])

    # Preferences
    theme = models.CharField(max_length=20, choices=UserChoices.THEME_CHOICES, default='light')
    status = models.CharField(max_length=20, choices=UserChoices.STATUS_CHOICES, default='online')
    status_message = models.CharField(max_length=100, blank=True)

    # Privacy Settings
    profile_visibility = models.CharField(
        max_length=20,
        choices=UserChoices.PRIVACY_CHOICES,
        default='public',
        help_text="Control who can see your profile"
    )
    show_online_status = models.BooleanField(default=True)
    allow_friend_requests = models.BooleanField(default=True)
    email_notifications = models.BooleanField(default=True)
    allow_room_invites = models.BooleanField(default=True)

    # Activity Tracking
    total_messages = models.PositiveIntegerField(default=0)
    rooms_created = models.PositiveIntegerField(default=0)
    last_seen = models.DateTimeField(auto_now=True)

    # Achievements
    achievements = models.JSONField(default=list, help_text="List of earned achievements")

    def __str__(self):
        return f"{self.user.username}'s Profile"

    @property
    def display_username(self):
        return self.display_name or self.user.username

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


class RoomCategory(TimestampMixin):
    """Room categories with organization features"""
    
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=50, unique=True)
    description = models.TextField(max_length=200, blank=True)
    icon = models.CharField(max_length=20, default='💬')
    color = models.CharField(max_length=7, default='#6366f1')
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
    
    class Meta:
        ordering = ['sort_order', 'name']
        verbose_name_plural = "Room Categories"
    
    def __str__(self):
        return self.name


# ==================== SUBSCRIPTION/PAYMENT MODELS (CONSOLIDATED) ====================

class SubscriptionPlan(TimestampMixin):
    """Unified subscription plan model"""
    
    name = models.CharField(max_length=20, choices=PaymentChoices.PLAN_CHOICES, unique=True)
    display_name = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Plan limits
    max_users_per_room = models.PositiveIntegerField(default=10)
    max_rooms = models.PositiveIntegerField(default=3, help_text="0 means unlimited")
    
    # Features (stored as JSON)
    features = models.JSONField(default=list, help_text="List of features included in this plan")
    
    # Stripe configuration
    stripe_price_id = models.CharField(max_length=100, blank=True)
    
    # Plan settings
    is_active = models.BooleanField(default=True)
    is_popular = models.BooleanField(default=False, help_text="Mark as popular plan")
    
    class Meta:
        ordering = ['price']
    
    def __str__(self):
        return f"{self.display_name} (${self.price}/month)"
    
    @property
    def price_cents(self):
        return int(self.price * 100)
    
    @property
    def price_dollars(self):
        return float(self.price)
    
    def get_name_display(self):
        return dict(PaymentChoices.PLAN_CHOICES).get(self.name, self.name.title())
    
    def get_features_list(self):
        if isinstance(self.features, list):
            return self.features
        elif isinstance(self.features, str):
            try:
                return json.loads(self.features)
            except json.JSONDecodeError:
                return []
        return []
    
    def is_unlimited_rooms(self):
        return self.max_rooms == 0
    
    def get_room_limit_display(self):
        return "Unlimited" if self.is_unlimited_rooms() else str(self.max_rooms)


class UserSubscription(TimestampMixin):
    """User subscription tracking"""
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='subscription')
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.PROTECT)
    
    # Subscription status
    is_active = models.BooleanField(default=False)
    
    # Stripe integration
    stripe_customer_id = models.CharField(max_length=100, blank=True)
    stripe_subscription_id = models.CharField(max_length=100, blank=True)
    
    # Subscription dates
    started_at = models.DateTimeField(default=timezone.now)
    expires_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    
    # Billing
    last_payment_date = models.DateTimeField(null=True, blank=True)
    next_payment_date = models.DateTimeField(null=True, blank=True)
    
    def __str__(self):
        return f"{self.user.username} - {self.plan.display_name}"
    
    @property
    def is_expired(self):
        if not self.expires_at:
            return False
        return timezone.now() > self.expires_at
    
    @property
    def days_remaining(self):
        if not self.expires_at or self.is_expired:
            return 0
        delta = self.expires_at - timezone.now()
        return delta.days
    
    def days_until_expiry(self):
        return self.days_remaining
    
    def can_create_room(self, max_users):
        if not self.is_active or self.is_expired:
            from django.conf import settings
            free_limit = getattr(settings, 'PAYMENT_SETTINGS', {}).get('FREE_TIER_MAX_USERS', 10)
            return max_users <= free_limit
        
        return max_users <= self.plan.max_users_per_room
    
    def can_access_room(self, room):
        if not room.requires_payment_check():
            return True
        
        if not self.is_active or self.is_expired:
            return False
        
        required_level = room.get_required_subscription_level()
        user_level = self.plan.name
        
        levels = {'basic': 0, 'premium': 1, 'enterprise': 2}
        return levels.get(user_level, 0) >= levels.get(required_level, 0)
    
    def cancel_subscription(self):
        self.is_active = False
        self.cancelled_at = timezone.now()
        self.save()


class Payment(TimestampMixin):
    """Payment records"""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='payments')
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.CASCADE)
    stripe_payment_intent_id = models.CharField(max_length=100, unique=True)
    stripe_charge_id = models.CharField(max_length=100, blank=True)
    
    # Payment details
    amount_cents = models.IntegerField()
    currency = models.CharField(max_length=3, default='USD')
    payment_method = models.CharField(max_length=20, choices=PaymentChoices.PAYMENT_METHOD_CHOICES, default='card')
    status = models.CharField(max_length=20, choices=PaymentChoices.PAYMENT_STATUS_CHOICES, default='pending')
    
    # Metadata
    description = models.TextField(blank=True)
    metadata = models.JSONField(default=dict)
    
    # Timestamps
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
        self.status = 'succeeded'
        self.completed_at = timezone.now()
        self.save()
    
    def mark_as_failed(self, reason=None):
        self.status = 'failed'
        self.failed_at = timezone.now()
        if reason:
            self.metadata['failure_reason'] = reason
        self.save()


class PaymentAttempt(TimestampMixin):
    """Track payment attempts for analytics"""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.CASCADE)
    amount_cents = models.IntegerField()
    payment_method = models.CharField(max_length=20)
    success = models.BooleanField(default=False)
    error_message = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        status = "Success" if self.success else "Failed"
        return f"{self.user.username} - {status} - ${self.amount_cents/100:.2f}"


# ==================== ROOM MODELS ====================

class Room(TimestampMixin):
    """Enhanced room model with membership support and payment system"""
    
    name = models.CharField(max_length=255, unique=True)
    display_name = models.CharField(max_length=255, blank=True)
    category = models.ForeignKey(RoomCategory, on_delete=models.SET_NULL, null=True, blank=True)
    creator = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_rooms')
    
    # Room Membership
    members = models.ManyToManyField(
        User, 
        through='RoomMembership',
        through_fields=('room', 'user'),
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
    
    # Payment System Fields
    requires_payment = models.BooleanField(
        default=False,
        help_text="Whether this room requires a premium subscription to join"
    )
    required_subscription_level = models.CharField(
        max_length=20,
        choices=PaymentChoices.PLAN_CHOICES,
        default='basic',
        help_text="Minimum subscription level required to access this room"
    )
    
    # Discovery & Search
    tags = models.CharField(max_length=200, blank=True, help_text="Comma-separated tags")
    language = models.CharField(max_length=10, default='en')
    
    # Activity Tracking
    message_count = models.PositiveIntegerField(default=0)
    active_users_count = models.PositiveIntegerField(default=0)
    last_activity = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-last_activity', '-created_at']
    
    def __str__(self):
        return self.display_name or self.name
    
    @property
    def category_slug(self):
        return self.category.slug if self.category else 'general'
    
    def get_tags_list(self):
        if not self.tags:
            return []
        return [tag.strip() for tag in self.tags.split(',') if tag.strip()]
    
    def is_trending(self):
        return self.message_count > 20 and self.active_users_count > 5
    
    def get_user_nationalities(self):
        from django.db.models import Count
        from datetime import timedelta
        
        recent_messages = self.messages.filter(
            timestamp__gte=timezone.now() - timedelta(hours=24)
        ).select_related('user__profile')
        
        nationalities = {}
        for message in recent_messages:
            if hasattr(message.user, 'profile'):
                nationality = message.user.profile.get_display_nationality()
                if nationality:
                    nationalities[nationality] = nationalities.get(nationality, 0) + 1
        
        return nationalities
    
    # ==================== PAYMENT SYSTEM METHODS ====================
    
    def requires_payment_check(self):
        if self.requires_payment:
            return True
        
        from django.conf import settings
        payment_settings = getattr(settings, 'PAYMENT_SETTINGS', {})
        free_tier_limit = payment_settings.get('FREE_TIER_MAX_USERS', 10)
        
        return self.max_users > free_tier_limit
    
    def get_required_subscription_level(self):
        if not self.requires_payment_check():
            return 'basic'
        
        if self.required_subscription_level != 'basic':
            return self.required_subscription_level
        
        from django.conf import settings
        payment_settings = getattr(settings, 'PAYMENT_SETTINGS', {})
        
        premium_limit = payment_settings.get('PREMIUM_TIER_MAX_USERS', 50)
        enterprise_limit = payment_settings.get('ENTERPRISE_TIER_MAX_USERS', 200)
        
        if self.max_users > premium_limit:
            return 'enterprise'
        elif self.max_users > payment_settings.get('FREE_TIER_MAX_USERS', 10):
            return 'premium'
        else:
            return 'basic'
    
    def can_user_access(self, user):
        # Public room accessibility check
        if not self.is_public and not user.is_authenticated:
            return False
        
        # Creator always has access
        if user.is_authenticated and self.creator == user:
            return True
        
        # Check membership for private rooms
        if not self.is_public:
            if not user.is_authenticated:
                return False
            if not self.roommembership_set.filter(user=user, is_active=True).exists():
                return False
        
        # Check payment requirements
        if self.requires_payment_check():
            if not user.is_authenticated:
                return False
            
            try:
                subscription = user.subscription
                if not subscription.is_active or subscription.is_expired:
                    return False
                
                required_level = self.get_required_subscription_level()
                user_level = subscription.plan.name
                
                levels = {'basic': 0, 'premium': 1, 'enterprise': 2}
                return levels.get(user_level, 0) >= levels.get(required_level, 0)
                
            except AttributeError:
                return False
        
        return True
    
    def user_can_access_legacy(self, user):
        """Legacy method for backwards compatibility"""
        if self.is_public:
            return True
        
        if not user.is_authenticated:
            return False
        
        if self.creator == user:
            return True
        
        return self.roommembership_set.filter(user=user, is_active=True).exists()
    
    def user_can_join(self, user):
        if not user.is_authenticated:
            return False
        
        if not self.can_user_access(user):
            return False
        
        if self.user_can_access_legacy(user):
            return False
        
        if self.roommembership_set.filter(is_active=True).count() >= self.max_users:
            return False
        
        return True
    
    def save(self, *args, **kwargs):
        # Auto-set requires_payment based on max_users if not explicitly set
        if not self.pk:  # New room
            from django.conf import settings
            payment_settings = getattr(settings, 'PAYMENT_SETTINGS', {})
            free_tier_limit = payment_settings.get('FREE_TIER_MAX_USERS', 10)
            
            if self.max_users > free_tier_limit and not self.requires_payment:
                self.requires_payment = True
                
                # Auto-set subscription level
                premium_limit = payment_settings.get('PREMIUM_TIER_MAX_USERS', 50)
                if self.max_users > premium_limit:
                    self.required_subscription_level = 'enterprise'
                else:
                    self.required_subscription_level = 'premium'
        
        super().save(*args, **kwargs)


class RoomMembership(TimestampMixin):
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
        if self.nickname:
            return self.nickname
        return self.user.profile.display_username if hasattr(self.user, 'profile') else self.user.username


# ==================== MESSAGE MODELS ====================

class Message(TimestampMixin):
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
        if not self.user_nationality_at_time and hasattr(self.user, 'profile'):
            self.user_nationality_at_time = self.user.profile.get_display_nationality()
        super().save(*args, **kwargs)
    
    def get_user_flag_url(self):
        nationality = self.user_nationality_at_time
        if nationality and nationality != 'UN':
            return f"https://flagcdn.com/w40/{nationality.lower()}.png"
        return None


class MessageReport(TimestampMixin):
    """Report system for inappropriate messages"""
    
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='reports')
    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='message_reports')
    reason = models.CharField(max_length=20, choices=ModerationChoices.REPORT_REASON_CHOICES)
    description = models.TextField(max_length=500, blank=True)
    status = models.CharField(max_length=20, choices=ModerationChoices.REPORT_STATUS_CHOICES, default='pending')
    
    # Moderation
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_reports')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    moderation_notes = models.TextField(blank=True)
    
    class Meta:
        unique_together = ['message', 'reporter']
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Report: {self.message.content[:30]} by {self.reporter.username}"


# ==================== FRIEND SYSTEM MODELS ====================

class FriendRequest(TimestampMixin):
    """Friend request system"""
    
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
    
    responded_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        unique_together = ['from_user', 'to_user']
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Friend request from {self.from_user.username} to {self.to_user.username} ({self.status})"
    
    def accept(self):
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
    
    def decline(self):
        if self.status != 'pending':
            raise ValueError("Can only decline pending friend requests")
            
        self.status = 'declined'
        self.responded_at = timezone.now()
        self.save()
    
    def cancel(self):
        if self.status != 'pending':
            raise ValueError("Can only cancel pending friend requests")
            
        self.status = 'cancelled'
        self.responded_at = timezone.now()
        self.save()


class Friendship(TimestampMixin):
    """Enhanced friendship model"""
    
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
    
    class Meta:
        unique_together = ['user', 'friend']
        ordering = ['-is_favorite', '-updated_at']
    
    def __str__(self):
        return f"{self.user.username} -> {self.friend.username} ({self.status})"
    
    @property
    def display_name(self):
        if self.nickname:
            return self.nickname
        try:
            return self.friend.profile.display_username
        except:
            return self.friend.username
    
    @classmethod
    def are_friends(cls, user1, user2):
        return cls.objects.filter(
            Q(user=user1, friend=user2) | Q(user=user2, friend=user1),
            status='accepted'
        ).exists()
    
    @classmethod
    def get_friends(cls, user):
        friend_ids = cls.objects.filter(
            user=user, status='accepted'
        ).values_list('friend_id', flat=True)
        
        return User.objects.filter(id__in=friend_ids).select_related('profile')


# ==================== ACTIVITY & STATISTICS MODELS ====================

class UserActivity(TimestampMixin):
    """Track user activities for the timeline"""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities')
    activity_type = models.CharField(max_length=30, choices=ActivityChoices.ACTIVITY_TYPES)
    description = models.CharField(max_length=200)
    
    # Related objects
    room = models.ForeignKey(Room, on_delete=models.CASCADE, null=True, blank=True)
    friend = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='friend_activities')
    
    # Metadata
    metadata = models.JSONField(default=dict, help_text="Additional activity data")
    is_public = models.BooleanField(default=True)
    
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
        country_dict = dict(UserChoices.COUNTRY_CHOICES)
        country_name = country_dict.get(self.nationality, 'Unknown')
        return f"{country_name} ({self.nationality}): {self.user_count} users"
    
    @classmethod
    def update_stats(cls):
        from django.db.models import Count
        
        nationality_counts = UserProfile.objects.values('nationality', 'auto_detected_country').annotate(
            count=Count('id')
        )
        
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


# ==================== SCREEN SHARING MODELS ====================

class ScreenShare(TimestampMixin):
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
        unique_together = ['room', 'status']
    
    def __str__(self):
        return f"{self.sharer.username} sharing in {self.room.name} ({self.status})"
    
    def get_active_viewers(self):
        return self.viewers.filter(screenshareviewer__is_active=True).count()
    
    def stop_sharing(self):
        self.status = 'stopped'
        self.stopped_at = timezone.now()
        
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


# ==================== UTILITY MODELS ====================

class RoomBookmark(TimestampMixin):
    """Allow users to bookmark favorite rooms"""
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookmarked_rooms')
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='bookmarks')
    notes = models.CharField(max_length=200, blank=True)
    
    class Meta:
        unique_together = ['user', 'room']
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} bookmarked {self.room.name}"


# ==================== SIGNAL HANDLERS ====================

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    if hasattr(instance, 'profile'):
        instance.profile.save()

@receiver(post_save, sender=User)
def create_user_subscription(sender, instance, created, **kwargs):
    """Create a basic subscription for new users"""
    if created:
        try:
            basic_plan, _ = SubscriptionPlan.objects.get_or_create(
                name='basic',
                defaults={
                    'display_name': 'Basic',
                    'description': 'Free tier with basic features',
                    'price': Decimal('0.00'),
                    'max_users_per_room': 10,
                    'max_rooms': 3,
                    'features': [
                        'Up to 10 users per room',
                        'Basic 3D environments',
                        'Text and voice chat',
                        'Public room creation',
                        'Basic avatar customization',
                        'Community support'
                    ]
                }
            )
            
            UserSubscription.objects.create(
                user=instance,
                plan=basic_plan,
                is_active=True,
                started_at=timezone.now()
            )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Failed to create subscription for user {instance.username}: {e}")

# ==================== UTILITY FUNCTIONS ====================

def get_client_ip(request):
    """Get client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


# ==================== SETUP DEFAULT PLANS ====================

def create_default_plans():
    """Create default subscription plans"""
    plans = [
        {
            'name': 'basic',
            'display_name': 'Basic',
            'description': 'Perfect for getting started',
            'price': Decimal('0.00'),
            'max_users_per_room': 10,
            'max_rooms': 3,
            'features': [
                'Up to 10 users per room',
                'Basic 3D environments',
                'Text and voice chat',
                'Public room creation',
                'Basic avatar customization',
                'Community support'
            ],
            'is_popular': False,
        },
        {
            'name': 'premium',
            'display_name': 'Premium',
            'description': 'Enhanced features for power users',
            'price': Decimal('9.99'),
            'max_users_per_room': 50,
            'max_rooms': 25,
            'features': [
                'Up to 50 users per room',
                'Advanced 3D environments',
                'HD voice and video chat',
                'Private room creation',
                'Advanced avatar customization',
                'Custom room themes',
                'Screen sharing',
                'Room analytics',
                'Priority support'
            ],
            'is_popular': True,
        },
        {
            'name': 'enterprise',
            'display_name': 'Enterprise',
            'description': 'Complete solution for organizations',
            'price': Decimal('29.99'),
            'max_users_per_room': 200,
            'max_rooms': 0,
            'features': [
                'Up to 200 users per room',
                'Premium 3D environments',
                '4K video conferencing',
                'Unlimited private rooms',
                'Custom avatar uploads',
                'White-label branding',
                'Advanced moderation tools',
                'API access',
                'Custom integrations',
                'Dedicated account manager',
                '24/7 priority support'
            ],
            'is_popular': False,
        }
    ]
    
    for plan_data in plans:
        SubscriptionPlan.objects.get_or_create(
            name=plan_data['name'],
            defaults=plan_data
        )