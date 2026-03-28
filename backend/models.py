"""
Euphorie v3 Models — Credit-based AI interaction system
"""
from django.db import models
from django.contrib.auth.models import User


class CreditPack(models.Model):
    class Meta:
        app_label = "backend"
    name = models.CharField(max_length=100)
    credits = models.IntegerField()
    price_cents = models.IntegerField()
    stripe_price_id = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['sort_order', 'price_cents']

    def __str__(self):
        return f"{self.name} - ${self.price_cents / 100:.2f}"

    @property
    def price_dollars(self):
        return self.price_cents / 100


class UserCredits(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='credits')
    balance = models.IntegerField(default=0)
    stripe_customer_id = models.CharField(max_length=100, blank=True)
    total_purchased = models.IntegerField(default=0)
    total_used = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "User credits"

    def __str__(self):
        return f"{self.user.email} - {self.balance} credits"

    def deduct(self):
        if self.balance <= 0:
            return False
        self.balance -= 1
        self.total_used += 1
        self.save(update_fields=['balance', 'total_used', 'updated_at'])
        return True

    def add(self, amount):
        self.balance += amount
        self.total_purchased += amount
        self.save(update_fields=['balance', 'total_purchased', 'updated_at'])


class Interaction(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='interactions')
    user_text = models.TextField()
    image_sent = models.BooleanField(default=False)
    ai_response = models.TextField()
    ai_model = models.CharField(max_length=50, default='gemini-2.0-flash')
    tokens_used = models.IntegerField(default=0)
    processing_time_ms = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} @ {self.created_at:%Y-%m-%d %H:%M}"


class CreditPurchase(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('succeeded', 'Succeeded'),
        ('failed', 'Failed'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='purchases')
    pack = models.ForeignKey(CreditPack, on_delete=models.CASCADE)
    stripe_session_id = models.CharField(max_length=200, blank=True)
    stripe_payment_intent_id = models.CharField(max_length=200, blank=True)
    amount_cents = models.IntegerField()
    credits_added = models.IntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.credits_added} credits ({self.status})"


# ============================================================
# Nexus — Procurement Intelligence Models
# ============================================================

class ProcurementRun(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='procurement_runs')
    query = models.TextField()
    category = models.CharField(max_length=200, blank=True)
    budget_max = models.FloatField(null=True, blank=True)
    seats = models.IntegerField(null=True, blank=True)
    must_have_features = models.JSONField(default=list)
    compliance_requirements = models.JSONField(default=list)
    current_vendor = models.CharField(max_length=200, blank=True)
    current_spend = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=20, default='pending', choices=[
        ('pending', 'Pending'), ('running', 'Running'),
        ('completed', 'Completed'), ('failed', 'Failed'),
    ])
    clones_spawned = models.IntegerField(default=0)
    best_pick = models.CharField(max_length=200, blank=True)
    estimated_savings = models.FloatField(default=0)
    summary = models.TextField(blank=True)
    recommendations = models.JSONField(default=list)
    intelligence = models.JSONField(default=dict)
    processing_time_seconds = models.FloatField(default=0)
    credits_used = models.IntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        app_label = 'backend'

    def __str__(self):
        return f"{self.user.email} - {self.category} ({self.status})"
