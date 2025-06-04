from allauth.account.adapter import DefaultAccountAdapter
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from django.shortcuts import resolve_url
from django.conf import settings


class CustomAccountAdapter(DefaultAccountAdapter):
    """Custom account adapter to prevent unwanted redirects"""

    def get_login_redirect_url(self, request):
        """Override login redirect"""
        url = getattr(settings, "LOGIN_REDIRECT_URL", None)
        if url:
            return resolve_url(url)
        return "/"

    def is_open_for_signup(self, request):
        """Allow signups"""
        return True


class CustomSocialAccountAdapter(DefaultSocialAccountAdapter):
    """Custom social account adapter to prevent auto-redirects"""

    def is_auto_signup_allowed(self, request, sociallogin):
        """Prevent automatic signup - always show choice"""
        return False

    def get_login_redirect_url(self, request):
        """Override social login redirect"""
        url = getattr(settings, "LOGIN_REDIRECT_URL", None)
        if url:
            return resolve_url(url)
        return "/"

    def pre_social_login(self, request, sociallogin):
        """Called before social login"""
        # Don't auto-connect social accounts
        pass

    def save_user(self, request, sociallogin, form=None):
        """Override user saving to prevent auto-signup"""
        user = super().save_user(request, sociallogin, form)
        return user
