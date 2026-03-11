from django.contrib import admin
from django.contrib.auth.models import User
from .models import UserCredits, Interaction, CreditPack, CreditPurchase

class UserCreditsInline(admin.StackedInline):
    model = UserCredits
    can_delete = False

class UserAdmin(admin.ModelAdmin):
    list_display = ('email', 'date_joined', 'is_active', 'get_credits')
    list_filter = ('is_active', 'date_joined')
    search_fields = ('email', 'username')
    ordering = ('-date_joined',)
    inlines = [UserCreditsInline]

    def get_credits(self, obj):
        try:
            return obj.credits.balance
        except UserCredits.DoesNotExist:
            return 0
    get_credits.short_description = 'Credits'

class InteractionAdmin(admin.ModelAdmin):
    list_display = ('user', 'ai_model', 'tokens_used', 'processing_time_ms', 'created_at')
    list_filter = ('ai_model', 'created_at')
    ordering = ('-created_at',)
    readonly_fields = ('user', 'user_text', 'ai_response', 'ai_model', 'tokens_used', 'processing_time_ms', 'image_sent', 'created_at')

class CreditPackAdmin(admin.ModelAdmin):
    list_display = ('name', 'credits', 'price_cents', 'is_active', 'sort_order')

class CreditPurchaseAdmin(admin.ModelAdmin):
    list_display = ('user', 'pack', 'credits_added', 'amount_cents', 'created_at')
    ordering = ('-created_at',)

admin.site.unregister(User)
admin.site.register(User, UserAdmin)
admin.site.register(Interaction, InteractionAdmin)
admin.site.register(CreditPack, CreditPackAdmin)
admin.site.register(CreditPurchase, CreditPurchaseAdmin)

admin.site.site_header = 'Euphorie Admin'
admin.site.site_title = 'Euphorie'
admin.site.index_title = 'Dashboard'
