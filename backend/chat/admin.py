# backend/chat/admin.py

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.models import User
from django.utils.html import format_html
from django.urls import reverse
from django.utils import timezone
from datetime import timedelta

from .models import (
    UserProfile, Room, RoomCategory, Message, MessageReport,
    Friendship, FriendSuggestion, RoomBookmark, UserModerationAction,
    WordFilter, UserActivity
)


# Inline admin classes
class UserProfileInline(admin.StackedInline):
    model = UserProfile
    can_delete = False
    verbose_name_plural = 'Profile'
    fields = [
        'display_name', 'bio', 'location', 'website',
        'theme', 'status', 'status_message',
        'profile_visibility', 'show_online_status', 'allow_friend_requests',
        'total_messages', 'rooms_created', 'last_seen'
    ]
    readonly_fields = ['total_messages', 'rooms_created', 'last_seen']


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    max_num = 10
    fields = ['user', 'content', 'message_type', 'timestamp']
    readonly_fields = ['timestamp']
    ordering = ['-timestamp']


# Custom User Admin
class UserAdmin(BaseUserAdmin):
    inlines = (UserProfileInline,)
    list_display = ['username', 'email', 'first_name', 'last_name', 'is_staff', 'get_last_seen', 'get_message_count']
    list_filter = BaseUserAdmin.list_filter + ('profile__status', 'profile__theme')
    
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
    list_display = ['user', 'display_name', 'status', 'total_messages', 'rooms_created', 'last_seen']
    list_filter = ['status', 'theme', 'profile_visibility', 'created_at']
    search_fields = ['user__username', 'user__email', 'display_name', 'bio']
    readonly_fields = ['total_messages', 'rooms_created', 'created_at', 'updated_at']
    
    fieldsets = (
        ('User Information', {
            'fields': ('user', 'display_name', 'bio', 'location', 'website')
        }),
        ('Preferences', {
            'fields': ('theme', 'status', 'status_message')
        }),
        ('Privacy Settings', {
            'fields': ('profile_visibility', 'show_online_status', 'allow_friend_requests')
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
    list_display = ['name', 'display_name', 'category', 'creator', 'is_public', 'message_count', 'last_activity']
    list_filter = ['is_public', 'is_featured', 'category', 'created_at']
    search_fields = ['name', 'display_name', 'description', 'tags']
    readonly_fields = ['message_count', 'active_users_count', 'created_at', 'updated_at']
    inlines = [MessageInline]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'display_name', 'description', 'creator', 'category')
        }),
        ('Settings', {
            'fields': ('is_public', 'is_featured', 'max_users', 'require_approval')
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
    
    actions = ['make_featured', 'remove_featured', 'make_public', 'make_private']
    
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


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['user', 'room', 'content_preview', 'message_type', 'is_edited', 'timestamp']
    list_filter = ['message_type', 'is_edited', 'is_deleted', 'timestamp']
    search_fields = ['content', 'user__username', 'room__name']
    readonly_fields = ['timestamp', 'edited_at']
    date_hierarchy = 'timestamp'
    
    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Content'
    
    actions = ['soft_delete_messages', 'restore_messages']
    
    def soft_delete_messages(self, request, queryset):
        queryset.update(is_deleted=True)
    soft_delete_messages.short_description = "Soft delete selected messages"
    
    def restore_messages(self, request, queryset):
        queryset.update(is_deleted=False)
    restore_messages.short_description = "Restore selected messages"


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


@admin.register(Friendship)
class FriendshipAdmin(admin.ModelAdmin):
    list_display = ['user', 'friend', 'status', 'nickname', 'is_favorite', 'created_at']
    list_filter = ['status', 'is_favorite', 'created_at']
    search_fields = ['user__username', 'friend__username', 'nickname']
    readonly_fields = ['mutual_friends_count', 'created_at', 'updated_at']
    
    actions = ['approve_requests', 'block_friendships']
    
    def approve_requests(self, request, queryset):
        queryset.filter(status='pending').update(status='accepted')
    approve_requests.short_description = "Approve selected friend requests"
    
    def block_friendships(self, request, queryset):
        queryset.update(status='blocked')
    block_friendships.short_description = "Block selected friendships"


@admin.register(UserModerationAction)
class UserModerationActionAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'moderator', 'reason_preview', 'expires_at', 'is_active', 'created_at']
    list_filter = ['action', 'is_active', 'created_at', 'expires_at']
    search_fields = ['user__username', 'moderator__username', 'reason']
    readonly_fields = ['created_at']
    date_hierarchy = 'created_at'
    
    def reason_preview(self, obj):
        return obj.reason[:50] + '...' if len(obj.reason) > 50 else obj.reason
    reason_preview.short_description = 'Reason'
    
    actions = ['deactivate_actions', 'extend_duration']
    
    def deactivate_actions(self, request, queryset):
        queryset.update(is_active=False)
    deactivate_actions.short_description = "Deactivate selected actions"


@admin.register(WordFilter)
class WordFilterAdmin(admin.ModelAdmin):
    list_display = ['word', 'severity', 'action', 'is_active', 'case_sensitive', 'is_regex']
    list_filter = ['severity', 'action', 'is_active', 'case_sensitive', 'is_regex']
    search_fields = ['word']
    
    actions = ['activate_filters', 'deactivate_filters']
    
    def activate_filters(self, request, queryset):
        queryset.update(is_active=True)
    activate_filters.short_description = "Activate selected filters"
    
    def deactivate_filters(self, request, queryset):
        queryset.update(is_active=False)
    deactivate_filters.short_description = "Deactivate selected filters"


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


@admin.register(FriendSuggestion)
class FriendSuggestionAdmin(admin.ModelAdmin):
    list_display = ['user', 'suggested_user', 'suggestion_type', 'score', 'mutual_friends', 'is_dismissed']
    list_filter = ['suggestion_type', 'is_dismissed', 'created_at']
    search_fields = ['user__username', 'suggested_user__username']
    readonly_fields = ['created_at']
    
    actions = ['dismiss_suggestions']
    
    def dismiss_suggestions(self, request, queryset):
        queryset.update(is_dismissed=True)
    dismiss_suggestions.short_description = "Dismiss selected suggestions"


@admin.register(RoomBookmark)
class RoomBookmarkAdmin(admin.ModelAdmin):
    list_display = ['user', 'room', 'notes', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user__username', 'room__name', 'notes']
    readonly_fields = ['created_at']


# Admin site customization
admin.site.site_header = 'Euphorie Administration'
admin.site.site_title = 'Euphorie Admin'
admin.site.index_title = 'Welcome to Euphorie Administration'