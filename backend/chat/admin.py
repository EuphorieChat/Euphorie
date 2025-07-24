# backend/chat/admin.py

from datetime import timedelta

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from django.db.models import Count, Q
from django.urls import reverse
from django.utils import timezone
from django.utils.html import format_html

# Updated imports - using streamlined models
from .models import (
    SubscriptionPlan, UserSubscription, Payment, PaymentAttempt, Room, UserProfile,
    RoomCategory, RoomMembership, Message, MessageReport, Friendship, 
    RoomBookmark, UserActivity, NationalityStats, FriendRequest,
    ScreenShare, ScreenShareViewer
)


# Inline admin classes
class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Profile'
    fields = (
        'display_name', 'bio', 'location', 'website',
        'nationality', 'auto_detected_country', 'show_nationality',
        'theme', 'status', 'profile_visibility',
        'allow_friend_requests', 'show_online_status',
        'total_messages', 'rooms_created', 'last_seen'
    )
    readonly_fields = ('total_messages', 'rooms_created', 'last_seen', 'auto_detected_country')


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    max_num = 10
    fields = ['user', 'content', 'message_type', 'user_nationality_at_time', 'timestamp']
    readonly_fields = ['user_nationality_at_time', 'timestamp']
    ordering = ['-timestamp']


class RoomMembershipInline(admin.TabularInline):
    model = RoomMembership
    extra = 0
    fields = ('user', 'role', 'is_active', 'joined_at', 'nickname')
    readonly_fields = ('joined_at',)


# Custom User Admin
class UserAdmin(BaseUserAdmin):
    inlines = (UserProfileInline,)
    list_display = ['username', 'email', 'first_name', 'last_name', 'is_staff', 'get_nationality', 'get_last_seen', 'get_message_count']
    list_filter = BaseUserAdmin.list_filter + ('profile__status', 'profile__theme', 'profile__nationality')
    
    def get_nationality(self, obj):
        if hasattr(obj, 'profile') and obj.profile:
            nationality = obj.profile.get_display_nationality()
            if nationality and nationality != 'UN':
                country_name = obj.profile.get_country_name()
                flag_url = f"https://flagcdn.com/w20/{nationality.lower()}.png"
                return format_html(
                    '<img src="{}" alt="{}" style="width: 20px; height: 14px; margin-right: 5px;"> {}',
                    flag_url, nationality, country_name
                )
            return 'Unknown'
        return 'No Profile'
    get_nationality.short_description = 'Nationality'
    
    def get_last_seen(self, obj):
        if hasattr(obj, 'profile') and obj.profile.last_seen:
            time_diff = timezone.now() - obj.profile.last_seen
            if time_diff < timedelta(minutes=5):
                return format_html('<span style="color: green;">●</span> Online')
            elif time_diff < timedelta(hours=1):
                return format_html('<span style="color: orange;">●</span> {} minutes ago', int(time_diff.seconds / 60))
            else:
                return format_html('<span style="color: gray;">●</span> {}', obj.profile.last_seen.strftime('%Y-%m-%d %H:%M'))
        return 'Never'
    get_last_seen.short_description = 'Last Seen'
    
    def get_message_count(self, obj):
        return getattr(obj.profile, 'total_messages', 0) if hasattr(obj, 'profile') else 0
    get_message_count.short_description = 'Messages'


# Re-register User admin
admin.site.unregister(User)
admin.site.register(User, UserAdmin)


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'display_name', 'get_nationality_display', 'status', 'total_messages', 'rooms_created', 'last_seen']
    list_filter = ['status', 'theme', 'profile_visibility', 'nationality', 'show_nationality', 'created_at']
    search_fields = ['user__username', 'user__email', 'display_name', 'bio', 'location']
    readonly_fields = ['auto_detected_country', 'total_messages', 'rooms_created', 'created_at', 'updated_at']
    
    fieldsets = (
        ('User Information', {
            'fields': ('user', 'display_name', 'bio', 'location', 'website')
        }),
        ('Nationality & Location', {
            'fields': ('nationality', 'auto_detected_country', 'show_nationality'),
            'description': 'Nationality settings and flag display preferences'
        }),
        ('Preferences', {
            'fields': ('theme', 'status', 'status_message')
        }),
        ('Privacy Settings', {
            'fields': ('profile_visibility', 'show_online_status', 'allow_friend_requests', 'email_notifications', 'allow_room_invites')
        }),
        ('Statistics', {
            'fields': ('total_messages', 'rooms_created', 'achievements'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('last_seen', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_nationality_display(self, obj):
        nationality = obj.get_display_nationality()
        if nationality and nationality != 'UN':
            country_name = obj.get_country_name()
            flag_url = f"https://flagcdn.com/w20/{nationality.lower()}.png"
            status = "🔹 Manual" if obj.nationality else "🔸 Auto-detected"
            return format_html(
                '<img src="{}" alt="{}" style="width: 20px; height: 14px; margin-right: 5px;"> {} {}',
                flag_url, nationality, country_name, status
            )
        return 'Unknown'
    get_nationality_display.short_description = 'Nationality'
    
    actions = ['update_nationality_stats', 'reset_nationality', 'enable_nationality_display', 'disable_nationality_display']
    
    def update_nationality_stats(self, request, queryset):
        NationalityStats.update_stats()
        self.message_user(request, "Nationality statistics updated successfully.")
    update_nationality_stats.short_description = "Update nationality statistics"
    
    def reset_nationality(self, request, queryset):
        queryset.update(nationality=None)
        self.message_user(request, f"Reset nationality for {queryset.count()} users.")
    reset_nationality.short_description = "Reset nationality to auto-detect"
    
    def enable_nationality_display(self, request, queryset):
        queryset.update(show_nationality=True)
        self.message_user(request, f"Enabled nationality display for {queryset.count()} users.")
    enable_nationality_display.short_description = "Enable nationality display"
    
    def disable_nationality_display(self, request, queryset):
        queryset.update(show_nationality=False)
        self.message_user(request, f"Disabled nationality display for {queryset.count()} users.")
    disable_nationality_display.short_description = "Disable nationality display"


@admin.register(NationalityStats)
class NationalityStatsAdmin(admin.ModelAdmin):
    list_display = ['get_nationality_display', 'user_count', 'message_count', 'rooms_created', 'last_updated']
    list_filter = ['last_updated']
    search_fields = ['nationality']
    readonly_fields = ['last_updated']
    ordering = ['-user_count']
    
    def get_nationality_display(self, obj):
        if obj.nationality and obj.nationality != 'UN':
            from .models import UserChoices
            country_dict = dict(UserChoices.COUNTRY_CHOICES)
            country_name = country_dict.get(obj.nationality, 'Unknown')
            flag_url = f"https://flagcdn.com/w20/{obj.nationality.lower()}.png"
            return format_html(
                '<img src="{}" alt="{}" style="width: 20px; height: 14px; margin-right: 5px;"> {} ({})',
                flag_url, country_name, obj.nationality
            )
        return 'Unknown'
    get_nationality_display.short_description = 'Country'
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser
    
    actions = ['refresh_stats']
    
    def refresh_stats(self, request, queryset):
        NationalityStats.update_stats()
        self.message_user(request, "Nationality statistics refreshed successfully.")
    refresh_stats.short_description = "Refresh nationality statistics"


@admin.register(RoomCategory)
class RoomCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'icon', 'color_display', 'is_active', 'sort_order', 'room_count']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'description']
    prepopulated_fields = {'slug': ('name',)}
    ordering = ['sort_order', 'name']
    
    def color_display(self, obj):
        return format_html(
            '<span style="background-color: {}; padding: 2px 8px; border-radius: 3px; color: white;">{}</span>',
            obj.color, obj.color
        )
    color_display.short_description = 'Color'
    
    def room_count(self, obj):
        return obj.room_set.count()
    room_count.short_description = 'Rooms'


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ['name', 'display_name', 'category', 'creator', 'is_public', 'max_users', 'payment_required_display', 'message_count', 'get_nationality_diversity', 'last_activity']
    list_filter = ['is_public', 'is_featured', 'requires_payment', 'category', 'created_at']
    search_fields = ['name', 'display_name', 'description', 'tags']
    readonly_fields = ['message_count', 'active_users_count', 'created_at', 'updated_at']
    inlines = [MessageInline, RoomMembershipInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'display_name', 'description', 'creator', 'category')
        }),
        ('Settings', {
            'fields': ('is_public', 'is_featured', 'max_users', 'require_approval')
        }),
        ('Payment & Access', {
            'fields': ('requires_payment', 'required_subscription_level'),
            'classes': ('collapse',)
        }),
        ('Discovery', {
            'fields': ('tags', 'language')
        }),
        ('Statistics', {
            'fields': ('message_count', 'active_users_count', 'last_activity'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def payment_required_display(self, obj):
        if obj.requires_payment_check():
            required_level = obj.get_required_subscription_level()
            colors = {'basic': 'green', 'premium': '#FF6B35', 'enterprise': '#6f42c1'}
            color = colors.get(required_level, '#FF6B35')
            return format_html(
                '<span style="color: {}; font-weight: bold;">👑 {}</span>',
                color, required_level.title()
            )
        return format_html('<span style="color: green;">Free</span>')
    payment_required_display.short_description = 'Access Type'
    
    def get_nationality_diversity(self, obj):
        try:
            nationalities = obj.get_user_nationalities()
            unique_countries = len(nationalities)
            total_users = sum(nationalities.values())
            
            if unique_countries > 0:
                # Show top 3 countries with flags
                top_countries = sorted(nationalities.items(), key=lambda x: x[1], reverse=True)[:3]
                flags_html = ""
                for country, count in top_countries:
                    if country != 'UN':
                        flag_url = f"https://flagcdn.com/w16/{country.lower()}.png"
                        flags_html += f'<img src="{flag_url}" alt="{country}" style="width: 16px; height: 12px; margin-right: 2px;" title="{country}: {count} users">'
                
                return format_html(
                    '{} {} countries ({})',
                    flags_html,
                    unique_countries,
                    total_users
                )
            return 'No activity'
        except:
            return 'Error'
    get_nationality_diversity.short_description = 'Nationality Diversity'
    
    actions = ['make_featured', 'remove_featured', 'make_public', 'make_private', 'analyze_demographics']
    
    def make_featured(self, request, queryset):
        queryset.update(is_featured=True)
    make_featured.short_description = "Mark selected rooms as featured"
    
    def remove_featured(self, request, queryset):
        queryset.update(is_featured=False)
    remove_featured.short_description = "Remove featured status from selected rooms"
    
    def make_public(self, request, queryset):
        queryset.update(is_public=True)
    make_public.short_description = "Make selected rooms public"
    
    def make_private(self, request, queryset):
        queryset.update(is_public=False)
    make_private.short_description = "Make selected rooms private"
    
    def analyze_demographics(self, request, queryset):
        total_diversity = 0
        for room in queryset:
            nationalities = room.get_user_nationalities()
            total_diversity += len(nationalities)
        
        avg_diversity = total_diversity / queryset.count() if queryset.count() > 0 else 0
        self.message_user(request, f"Average nationality diversity: {avg_diversity:.1f} countries per room")
    analyze_demographics.short_description = "Analyze nationality demographics"


@admin.register(RoomMembership)
class RoomMembershipAdmin(admin.ModelAdmin):
    list_display = ('user', 'room', 'role', 'is_active', 'joined_at', 'nickname')
    list_filter = ('role', 'is_active', 'joined_at')
    search_fields = ('user__username', 'room__name', 'nickname')
    readonly_fields = ('joined_at', 'left_at', 'rejoined_at')
    
    fieldsets = (
        ('Membership Information', {
            'fields': ('room', 'user', 'role', 'is_active', 'is_banned')
        }),
        ('Settings', {
            'fields': ('nickname', 'notification_level')
        }),
        ('Management', {
            'fields': ('added_by', 'removed_by'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('joined_at', 'left_at', 'rejoined_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['user', 'room', 'content_preview', 'message_type', 'get_user_nationality', 'is_edited', 'timestamp']
    list_filter = ['message_type', 'is_edited', 'is_deleted', 'user_nationality_at_time', 'timestamp']
    search_fields = ['content', 'user__username', 'room__name']
    readonly_fields = ['user_nationality_at_time', 'timestamp', 'edited_at']
    date_hierarchy = 'timestamp'
    
    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Content'
    
    def get_user_nationality(self, obj):
        nationality = obj.user_nationality_at_time
        if nationality and nationality != 'UN':
            from .models import UserChoices
            country_dict = dict(UserChoices.COUNTRY_CHOICES)
            country_name = country_dict.get(nationality, 'Unknown')
            flag_url = f"https://flagcdn.com/w16/{nationality.lower()}.png"
            return format_html(
                '<img src="{}" alt="{}" style="width: 16px; height: 12px; margin-right: 5px;"> {}',
                flag_url, nationality, country_name
            )
        return 'Unknown'
    get_user_nationality.short_description = 'User Nationality'
    
    actions = ['soft_delete_messages', 'restore_messages', 'update_nationality_context']
    
    def soft_delete_messages(self, request, queryset):
        queryset.update(is_deleted=True)
    soft_delete_messages.short_description = "Soft delete selected messages"
    
    def restore_messages(self, request, queryset):
        queryset.update(is_deleted=False)
    restore_messages.short_description = "Restore selected messages"
    
    def update_nationality_context(self, request, queryset):
        updated = 0
        for message in queryset:
            if hasattr(message.user, 'profile'):
                nationality = message.user.profile.get_display_nationality()
                if nationality != message.user_nationality_at_time:
                    message.user_nationality_at_time = nationality
                    message.save(update_fields=['user_nationality_at_time'])
                    updated += 1
        self.message_user(request, f"Updated nationality context for {updated} messages.")
    update_nationality_context.short_description = "Update nationality context"


@admin.register(MessageReport)
class MessageReportAdmin(admin.ModelAdmin):
    list_display = ['message_preview', 'reporter', 'reason', 'status', 'created_at', 'reviewed_by']
    list_filter = ['reason', 'status', 'created_at']
    search_fields = ['message__content', 'reporter__username', 'description']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Report Information', {
            'fields': ('message', 'reporter', 'reason', 'description')
        }),
        ('Moderation', {
            'fields': ('status', 'reviewed_by', 'reviewed_at', 'moderation_notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def message_preview(self, obj):
        return obj.message.content[:50] + '...' if len(obj.message.content) > 50 else obj.message.content
    message_preview.short_description = 'Message'
    
    actions = ['mark_resolved', 'mark_dismissed']
    
    def mark_resolved(self, request, queryset):
        queryset.update(status='resolved', reviewed_by=request.user, reviewed_at=timezone.now())
    mark_resolved.short_description = "Mark selected reports as resolved"
    
    def mark_dismissed(self, request, queryset):
        queryset.update(status='dismissed', reviewed_by=request.user, reviewed_at=timezone.now())
    mark_dismissed.short_description = "Mark selected reports as dismissed"


@admin.register(FriendRequest)
class FriendRequestAdmin(admin.ModelAdmin):
    list_display = ['from_user', 'to_user', 'status', 'created_at', 'responded_at']
    list_filter = ['status', 'created_at', 'responded_at']
    search_fields = ['from_user__username', 'to_user__username', 'message']
    readonly_fields = ['created_at', 'updated_at', 'responded_at']
    
    fieldsets = (
        ('Request Information', {
            'fields': ('from_user', 'to_user', 'message', 'status')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'responded_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['approve_requests', 'decline_requests']
    
    def approve_requests(self, request, queryset):
        approved = 0
        for friend_request in queryset.filter(status='pending'):
            try:
                friend_request.accept()
                approved += 1
            except:
                pass
        self.message_user(request, f"Approved {approved} friend requests.")
    approve_requests.short_description = "Approve selected friend requests"
    
    def decline_requests(self, request, queryset):
        declined = queryset.filter(status='pending').count()
        for friend_request in queryset.filter(status='pending'):
            friend_request.decline()
        self.message_user(request, f"Declined {declined} friend requests.")
    decline_requests.short_description = "Decline selected friend requests"


@admin.register(Friendship)
class FriendshipAdmin(admin.ModelAdmin):
    list_display = ['user', 'friend', 'status', 'nickname', 'is_favorite', 'mutual_friends_count', 'created_at']
    list_filter = ['status', 'is_favorite', 'created_at']
    search_fields = ['user__username', 'friend__username', 'nickname']
    readonly_fields = ['mutual_friends_count', 'created_at', 'updated_at']
    
    actions = ['block_friendships', 'unblock_friendships', 'calculate_mutual_friends']
    
    def block_friendships(self, request, queryset):
        queryset.update(status='blocked')
        self.message_user(request, f"Blocked {queryset.count()} friendships.")
    block_friendships.short_description = "Block selected friendships"
    
    def unblock_friendships(self, request, queryset):
        queryset.update(status='accepted')
        self.message_user(request, f"Unblocked {queryset.count()} friendships.")
    unblock_friendships.short_description = "Unblock selected friendships"
    
    def calculate_mutual_friends(self, request, queryset):
        updated = 0
        for friendship in queryset:
            # Calculate mutual friends count
            user_friends = set(Friendship.objects.filter(
                user=friendship.user, status='accepted'
            ).values_list('friend_id', flat=True))
            
            friend_friends = set(Friendship.objects.filter(
                user=friendship.friend, status='accepted'
            ).values_list('friend_id', flat=True))
            
            mutual_count = len(user_friends.intersection(friend_friends))
            
            if friendship.mutual_friends_count != mutual_count:
                friendship.mutual_friends_count = mutual_count
                friendship.save(update_fields=['mutual_friends_count'])
                updated += 1
        
        self.message_user(request, f"Updated mutual friends count for {updated} friendships.")
    calculate_mutual_friends.short_description = "Calculate mutual friends count"


@admin.register(UserActivity)
class UserActivityAdmin(admin.ModelAdmin):
    list_display = ['user', 'activity_type', 'description', 'is_public', 'created_at']
    list_filter = ['activity_type', 'is_public', 'created_at']
    search_fields = ['user__username', 'description']
    readonly_fields = ['created_at']
    date_hierarchy = 'created_at'
    
    def has_add_permission(self, request):
        return False  # Activities are created automatically
    
    def has_change_permission(self, request, obj=None):
        return False  # Activities shouldn't be changed


@admin.register(RoomBookmark)
class RoomBookmarkAdmin(admin.ModelAdmin):
    list_display = ['user', 'room', 'notes', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__username', 'room__name', 'notes']
    readonly_fields = ['created_at']


# ==================== PAYMENT & SUBSCRIPTION ADMIN ====================

@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ('name', 'display_name', 'price_display', 'max_users_per_room', 'max_rooms_display', 'is_active', 'is_popular')
    list_filter = ('is_active', 'is_popular', 'name')
    search_fields = ('name', 'display_name', 'description')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Plan Information', {
            'fields': ('name', 'display_name', 'description', 'price')
        }),
        ('Limits', {
            'fields': ('max_users_per_room', 'max_rooms')
        }),
        ('Features', {
            'fields': ('features',),
            'description': 'Enter features as a JSON list'
        }),
        ('Stripe Integration', {
            'fields': ('stripe_price_id',),
            'classes': ('collapse',)
        }),
        ('Settings', {
            'fields': ('is_active', 'is_popular')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def price_display(self, obj):
        if obj.price == 0:
            return format_html('<span style="color: green; font-weight: bold;">FREE</span>')
        return f"${obj.price}/month"
    price_display.short_description = 'Price'
    
    def max_rooms_display(self, obj):
        return obj.get_room_limit_display()
    max_rooms_display.short_description = 'Max Rooms'


@admin.register(UserSubscription)
class UserSubscriptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'plan', 'status_display', 'days_remaining_display', 'created_at', 'expires_at', 'stripe_customer_link')
    list_filter = ('is_active', 'plan', 'created_at')
    search_fields = ('user__username', 'user__email', 'stripe_customer_id')
    readonly_fields = ('stripe_customer_id', 'stripe_subscription_id', 'created_at', 'updated_at', 'days_remaining')
    raw_id_fields = ('user',)
    
    fieldsets = (
        ('Subscription Information', {
            'fields': ('user', 'plan', 'is_active')
        }),
        ('Stripe Integration', {
            'fields': ('stripe_customer_id', 'stripe_subscription_id'),
            'classes': ('collapse',)
        }),
        ('Dates', {
            'fields': ('started_at', 'expires_at', 'cancelled_at')
        }),
        ('Billing', {
            'fields': ('last_payment_date', 'next_payment_date'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def status_display(self, obj):
        if obj.is_active:
            if obj.is_expired:
                return format_html('<span style="color: #dc3545; font-weight: bold;">Expired</span>')
            return format_html('<span style="color: #28a745; font-weight: bold;">Active</span>')
        return format_html('<span style="color: #6c757d; font-weight: bold;">Inactive</span>')
    status_display.short_description = 'Status'
    
    def days_remaining_display(self, obj):
        days = obj.days_remaining
        if days > 30:
            return format_html('<span style="color: green;">{} days</span>', days)
        elif days > 7:
            return format_html('<span style="color: orange;">{} days</span>', days)
        elif days > 0:
            return format_html('<span style="color: red;">{} days</span>', days)
        else:
            return format_html('<span style="color: #dc3545;">Expired</span>')
    days_remaining_display.short_description = 'Days Remaining'
    
    def stripe_customer_link(self, obj):
        if obj.stripe_customer_id:
            url = f"https://dashboard.stripe.com/customers/{obj.stripe_customer_id}"
            return format_html('<a href="{}" target="_blank">View in Stripe</a>', url)
        return '-'
    stripe_customer_link.short_description = 'Stripe Customer'


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('user', 'plan', 'amount_display', 'status_display', 'payment_method', 'created_at', 'stripe_payment_link')
    list_filter = ('status', 'payment_method', 'plan', 'created_at')
    search_fields = ('user__username', 'user__email', 'stripe_payment_intent_id')
    readonly_fields = ('stripe_payment_intent_id', 'stripe_charge_id', 'amount_dollars', 'created_at', 'completed_at', 'failed_at')
    raw_id_fields = ('user',)
    
    fieldsets = (
        ('Payment Information', {
            'fields': ('user', 'plan', 'amount_cents', 'currency', 'status', 'payment_method')
        }),
        ('Stripe Details', {
            'fields': ('stripe_payment_intent_id', 'stripe_charge_id'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('description', 'metadata'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'completed_at', 'failed_at'),
            'classes': ('collapse',)
        })
    )
    
    def amount_display(self, obj):
        return f"${obj.amount_dollars:.2f}"
    amount_display.short_description = 'Amount'
    
    def status_display(self, obj):
        colors = {
            'pending': '#856404',
            'processing': '#0d6efd',
            'succeeded': '#155724',
            'failed': '#721c24',
            'canceled': '#6c757d',
            'refunded': '#e83e8c'
        }
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.status.title()
        )
    status_display.short_description = 'Status'
    
    def stripe_payment_link(self, obj):
        if obj.stripe_payment_intent_id:
            url = f"https://dashboard.stripe.com/payments/{obj.stripe_payment_intent_id}"
            return format_html('<a href="{}" target="_blank">View in Stripe</a>', url)
        return '-'
    stripe_payment_link.short_description = 'Stripe Payment'


@admin.register(PaymentAttempt)
class PaymentAttemptAdmin(admin.ModelAdmin):
    list_display = ('user', 'plan', 'amount_dollars_display', 'success_display', 'payment_method', 'created_at')
    list_filter = ('success', 'payment_method', 'created_at')
    search_fields = ('user__username', 'error_message')
    readonly_fields = ('created_at',)
    
    def amount_dollars_display(self, obj):
        return f"${obj.amount_cents / 100:.2f}"
    amount_dollars_display.short_description = 'Amount'
    
    def success_display(self, obj):
        if obj.success:
            return format_html('<span style="color: green; font-weight: bold;">✓ Success</span>')
        else:
            return format_html('<span style="color: red; font-weight: bold;">✗ Failed</span>')
    success_display.short_description = 'Result'


# ==================== SCREEN SHARING ADMIN ====================

@admin.register(ScreenShare)
class ScreenShareAdmin(admin.ModelAdmin):
    list_display = ('sharer', 'room', 'status', 'projection_mode', 'quality', 'started_at', 'duration_display')
    list_filter = ('status', 'projection_mode', 'quality', 'started_at')
    search_fields = ('sharer__username', 'room__name', 'session_id')
    readonly_fields = ('session_id', 'started_at', 'stopped_at', 'duration_seconds', 'total_viewers', 'max_concurrent_viewers')
    
    def duration_display(self, obj):
        if obj.duration_seconds > 0:
            minutes = obj.duration_seconds // 60
            seconds = obj.duration_seconds % 60
            return f"{minutes}m {seconds}s"
        return "Active" if obj.status == 'active' else "N/A"
    duration_display.short_description = 'Duration'


@admin.register(ScreenShareViewer)
class ScreenShareViewerAdmin(admin.ModelAdmin):
    list_display = ('viewer', 'get_sharer', 'get_room', 'is_active', 'joined_at', 'left_at')
    list_filter = ('is_active', 'joined_at')
    search_fields = ('viewer__username', 'screen_share__sharer__username')
    readonly_fields = ('joined_at', 'left_at')
    
    def get_sharer(self, obj):
        return obj.screen_share.sharer.username
    get_sharer.short_description = 'Sharer'
    
    def get_room(self, obj):
        return obj.screen_share.room.name
    get_room.short_description = 'Room'


# ==================== CUSTOM ADMIN ACTIONS ====================

def bulk_update_nationality_stats(modeladmin, request, queryset):
    """Update nationality statistics for all countries"""
    NationalityStats.update_stats()
    modeladmin.message_user(request, "Successfully updated nationality statistics for all countries.")
bulk_update_nationality_stats.short_description = "Update nationality statistics"


def export_nationality_report(modeladmin, request, queryset):
    """Export nationality report"""
    import csv
    from django.http import HttpResponse
    
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="nationality_report.csv"'
    
    writer = csv.writer(response)
    writer.writerow(['Country Code', 'Country Name', 'User Count', 'Message Count', 'Rooms Created'])
    
    stats = NationalityStats.objects.all().order_by('-user_count')
    from .models import UserChoices
    country_dict = dict(UserChoices.COUNTRY_CHOICES)
    
    for stat in stats:
        writer.writerow([
            stat.nationality,
            country_dict.get(stat.nationality, 'Unknown'),
            stat.user_count,
            stat.message_count,
            stat.rooms_created
        ])
    
    return response
export_nationality_report.short_description = "Export nationality report (CSV)"


# Add bulk actions to UserProfile admin
UserProfileAdmin.actions.extend([bulk_update_nationality_stats, export_nationality_report])


# ==================== ADMIN SITE CUSTOMIZATION ====================

admin.site.site_header = 'Euphorie Administration'
admin.site.site_title = 'Euphorie Admin'
admin.site.index_title = 'Welcome to Euphorie Administration'


# Custom admin dashboard info
class AdminDashboardInfo:
    """Custom dashboard information for nationality and subscription statistics"""
    
    @staticmethod
    def get_nationality_summary():
        """Get summary of nationality statistics"""
        total_users = User.objects.count()
        users_with_nationality = UserProfile.objects.exclude(
            nationality__isnull=True, auto_detected_country__isnull=True
        ).count()
        
        coverage_percentage = (users_with_nationality / total_users * 100) if total_users > 0 else 0
        
        top_countries = NationalityStats.objects.order_by('-user_count')[:5]
        
        return {
            'total_users': total_users,
            'users_with_nationality': users_with_nationality,
            'coverage_percentage': coverage_percentage,
            'top_countries': top_countries,
            'unique_countries': NationalityStats.objects.count()
        }
    
    @staticmethod
    def get_subscription_summary():
        """Get summary of subscription statistics"""
        total_subscriptions = UserSubscription.objects.count()
        active_subscriptions = UserSubscription.objects.filter(is_active=True).count()
        premium_subscriptions = UserSubscription.objects.filter(
            is_active=True, 
            plan__name__in=['premium', 'enterprise']
        ).count()
        
        return {
            'total_subscriptions': total_subscriptions,
            'active_subscriptions': active_subscriptions,
            'premium_subscriptions': premium_subscriptions,
            'conversion_rate': (premium_subscriptions / total_subscriptions * 100) if total_subscriptions > 0 else 0
        }


# Custom admin site index template context
def admin_index_context(request):
    """Add nationality and subscription statistics to admin index"""
    if request.user.is_staff:
        context = {
            'nationality_summary': AdminDashboardInfo.get_nationality_summary(),
            'subscription_summary': AdminDashboardInfo.get_subscription_summary(),
        }
        return context
    return {}