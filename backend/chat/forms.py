# backend/chat/forms.py

from django import forms
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.utils.text import slugify
import re

# Updated imports - using streamlined models
from .models import (
    Room, RoomCategory, UserProfile, MessageReport, 
    Friendship, FriendRequest, Message, UserActivity, 
    SubscriptionPlan, UserChoices, PaymentChoices
)


class RoomCreationForm(forms.ModelForm):
    """Enhanced room creation form with validation"""
    
    category = forms.ModelChoiceField(
        queryset=RoomCategory.objects.filter(is_active=True),
        required=False,
        empty_label="Select a category",
        widget=forms.Select(attrs={
            'class': 'input',
            'id': 'room-category-select'
        })
    )
    
    tags = forms.CharField(
        max_length=200,
        required=False,
        help_text="Comma-separated tags (e.g., gaming, music, art)",
        widget=forms.TextInput(attrs={
            'class': 'input',
            'placeholder': 'gaming, music, art'
        })
    )
    
    class Meta:
        model = Room
        fields = ['name', 'display_name', 'description', 'category', 'tags', 'is_public', 'max_users']
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'input input-with-icon-left',
                'placeholder': 'Enter room name...',
                'maxlength': 100
            }),
            'display_name': forms.TextInput(attrs={
                'class': 'input',
                'placeholder': 'Display name (optional)',
                'maxlength': 255
            }),
            'description': forms.Textarea(attrs={
                'class': 'input',
                'placeholder': 'Room description...',
                'rows': 3,
                'maxlength': 500
            }),
            'is_public': forms.CheckboxInput(attrs={
                'class': 'checkbox'
            }),
            'max_users': forms.NumberInput(attrs={
                'class': 'input',
                'min': 2,
                'max': 200,
                'value': 50
            })
        }
        
        help_texts = {
            'max_users': 'Rooms with 11+ users require premium subscription',
        }
    
    def clean_name(self):
        name = self.cleaned_data['name'].strip()
        
        # Validate length
        if len(name) < 3:
            raise ValidationError("Room name must be at least 3 characters long.")
        
        if len(name) > 100:
            raise ValidationError("Room name must be less than 100 characters.")
        
        # Validate characters (allow letters, numbers, spaces, hyphens, underscores)
        if not re.match(r'^[a-zA-Z0-9\s\-_]+$', name):
            raise ValidationError("Room name can only contain letters, numbers, spaces, hyphens, and underscores.")
        
        # Check uniqueness
        if Room.objects.filter(name=name).exists():
            raise ValidationError("A room with this name already exists.")
        
        return name
    
    def clean_tags(self):
        tags = self.cleaned_data['tags']
        if tags:
            # Split and clean tags
            tag_list = [tag.strip().lower() for tag in tags.split(',') if tag.strip()]
            
            # Validate individual tags
            for tag in tag_list:
                if len(tag) > 20:
                    raise ValidationError("Each tag must be less than 20 characters.")
                if not re.match(r'^[a-zA-Z0-9\-_]+$', tag):
                    raise ValidationError("Tags can only contain letters, numbers, hyphens, and underscores.")
            
            # Limit number of tags
            if len(tag_list) > 10:
                raise ValidationError("Maximum 10 tags allowed.")
            
            return ', '.join(tag_list)
        
        return tags


class UserProfileForm(forms.ModelForm):
    """Enhanced user profile form with nationality support"""
    
    # Nationality fields
    nationality = forms.ChoiceField(
        choices=[('', 'Select your nationality')] + UserChoices.COUNTRY_CHOICES,
        required=False,
        widget=forms.Select(attrs={
            'class': 'input nationality-select',
            'id': 'nationality-select'
        }),
        help_text="Your nationality will be displayed on your avatar as a flag"
    )
    
    show_nationality = forms.BooleanField(
        required=False,
        initial=True,
        widget=forms.CheckboxInput(attrs={
            'class': 'checkbox',
            'id': 'show-nationality-checkbox'
        }),
        help_text="Show your nationality flag on your avatar"
    )
    
    # Avatar customization fields
    hair_style = forms.ChoiceField(
        choices=[
            ('short', 'Short'),
            ('long', 'Long'),
            ('curly', 'Curly'),
            ('braids', 'Braids'),
            ('ponytail', 'Ponytail'),
            ('bald', 'Bald'),
            ('buzz', 'Buzz Cut'),
            ('mohawk', 'Mohawk'),
        ],
        required=False,
        widget=forms.Select(attrs={'class': 'input avatar-select'})
    )
    
    hair_color = forms.CharField(
        max_length=7,
        required=False,
        widget=forms.TextInput(attrs={
            'type': 'color',
            'class': 'color-input avatar-color-picker',
            'value': '#8B4513'
        })
    )
    
    skin_tone = forms.CharField(
        max_length=7,
        required=False,
        widget=forms.TextInput(attrs={
            'type': 'color',
            'class': 'color-input avatar-color-picker',
            'value': '#FDBCB4'
        })
    )
    
    shirt_color = forms.CharField(
        max_length=7,
        required=False,
        widget=forms.TextInput(attrs={
            'type': 'color',
            'class': 'color-input avatar-color-picker',
            'value': '#FF6B6B'
        })
    )
    
    pants_color = forms.CharField(
        max_length=7,
        required=False,
        widget=forms.TextInput(attrs={
            'type': 'color',
            'class': 'color-input avatar-color-picker',
            'value': '#4ECDC4'
        })
    )
    
    eye_color = forms.CharField(
        max_length=7,
        required=False,
        widget=forms.TextInput(attrs={
            'type': 'color',
            'class': 'color-input avatar-color-picker',
            'value': '#4A90E2'
        })
    )
    
    eye_shape = forms.ChoiceField(
        choices=[
            ('normal', 'Normal'),
            ('large', 'Large'),
            ('small', 'Small'),
            ('almond', 'Almond'),
        ],
        required=False,
        widget=forms.Select(attrs={'class': 'input avatar-select'})
    )
    
    class Meta:
        model = UserProfile
        fields = [
            'display_name', 'bio', 'location', 'website',
            'nationality', 'show_nationality',
            'theme', 'status_message', 'profile_visibility',
            'show_online_status', 'allow_friend_requests',
            'email_notifications', 'allow_room_invites'
        ]
        widgets = {
            'display_name': forms.TextInput(attrs={
                'class': 'input',
                'placeholder': 'Your display name',
                'maxlength': 50
            }),
            'bio': forms.Textarea(attrs={
                'class': 'input',
                'placeholder': 'Tell us about yourself...',
                'rows': 4,
                'maxlength': 300
            }),
            'location': forms.TextInput(attrs={
                'class': 'input',
                'placeholder': 'Your location',
                'maxlength': 100
            }),
            'website': forms.URLInput(attrs={
                'class': 'input',
                'placeholder': 'https://your-website.com'
            }),
            'theme': forms.Select(attrs={'class': 'input'}),
            'status_message': forms.TextInput(attrs={
                'class': 'input',
                'placeholder': 'What\'s on your mind?',
                'maxlength': 100
            }),
            'profile_visibility': forms.Select(attrs={'class': 'input'}),
            'show_online_status': forms.CheckboxInput(attrs={'class': 'checkbox'}),
            'allow_friend_requests': forms.CheckboxInput(attrs={'class': 'checkbox'}),
            'email_notifications': forms.CheckboxInput(attrs={'class': 'checkbox'}),
            'allow_room_invites': forms.CheckboxInput(attrs={'class': 'checkbox'}),
        }
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Pre-populate avatar fields from existing customization
        if self.instance and self.instance.avatar_customization:
            avatar_data = self.instance.avatar_customization
            
            for field_name in ['hair_style', 'hair_color', 'skin_tone', 'shirt_color', 'pants_color', 'eye_color', 'eye_shape']:
                if field_name in avatar_data:
                    self.fields[field_name].initial = avatar_data[field_name]
    
    def clean_display_name(self):
        display_name = self.cleaned_data['display_name'].strip()
        
        if display_name and len(display_name) < 2:
            raise ValidationError("Display name must be at least 2 characters long.")
        
        # Check for inappropriate characters
        if display_name and not re.match(r'^[a-zA-Z0-9\s\-_\.]+$', display_name):
            raise ValidationError("Display name can only contain letters, numbers, spaces, hyphens, underscores, and periods.")
        
        return display_name
    
    def clean_website(self):
        website = self.cleaned_data['website']
        
        if website and not website.startswith(('http://', 'https://')):
            website = 'https://' + website
        
        return website
    
    def clean_nationality(self):
        nationality = self.cleaned_data.get('nationality')
        
        if nationality:
            # Validate nationality code
            valid_countries = [code for code, name in UserChoices.COUNTRY_CHOICES]
            if nationality not in valid_countries:
                raise ValidationError("Invalid nationality selected.")
        
        return nationality
    
    def clean(self):
        cleaned_data = super().clean()
        
        # Validate color codes
        color_fields = ['hair_color', 'skin_tone', 'eye_color', 'shirt_color', 'pants_color']
        
        for field in color_fields:
            color = cleaned_data.get(field)
            if color and not re.match(r'^#[0-9A-Fa-f]{6}$', color):
                raise ValidationError(f"Invalid color code for {field.replace('_', ' ')}")
        
        return cleaned_data
    
    def save(self, commit=True):
        profile = super().save(commit=False)
        
        # Save avatar customization
        avatar_data = {
            'hair_style': self.cleaned_data.get('hair_style', 'short'),
            'hair_color': self.cleaned_data.get('hair_color', '#8B4513'),
            'skin_tone': self.cleaned_data.get('skin_tone', '#FDBCB4'),
            'shirt_color': self.cleaned_data.get('shirt_color', '#FF6B6B'),
            'pants_color': self.cleaned_data.get('pants_color', '#4ECDC4'),
            'eye_color': self.cleaned_data.get('eye_color', '#4A90E2'),
            'eye_shape': self.cleaned_data.get('eye_shape', 'normal'),
        }
        
        # Update existing avatar customization or create new
        current_avatar = profile.avatar_customization or {}
        current_avatar.update(avatar_data)
        profile.avatar_customization = current_avatar
        
        if commit:
            profile.save()
            
            # Create activity log for nationality update
            if self.cleaned_data.get('nationality') != self.instance.nationality:
                UserActivity.objects.create(
                    user=profile.user,
                    activity_type='updated_nationality',
                    description=f"Updated nationality to {profile.get_country_name()}",
                    metadata={
                        'old_nationality': self.instance.nationality,
                        'new_nationality': self.cleaned_data.get('nationality')
                    }
                )
        
        return profile


class NationalitySelectionForm(forms.Form):
    """Standalone form for nationality selection"""
    
    nationality = forms.ChoiceField(
        choices=[('', 'Select your nationality')] + UserChoices.COUNTRY_CHOICES,
        required=True,
        widget=forms.Select(attrs={
            'class': 'input nationality-select',
            'id': 'nationality-modal-select'
        })
    )
    
    def clean_nationality(self):
        nationality = self.cleaned_data.get('nationality')
        
        if not nationality:
            raise ValidationError("Please select your nationality.")
        
        # Validate nationality code
        valid_countries = [code for code, name in UserChoices.COUNTRY_CHOICES]
        if nationality not in valid_countries:
            raise ValidationError("Invalid nationality selected.")
        
        return nationality


class MessageReportForm(forms.ModelForm):
    """Form for reporting inappropriate messages"""
    
    class Meta:
        model = MessageReport
        fields = ['reason', 'description']
        widgets = {
            'reason': forms.Select(attrs={
                'class': 'input',
                'required': True
            }),
            'description': forms.Textarea(attrs={
                'class': 'input',
                'placeholder': 'Please provide additional details...',
                'rows': 3,
                'maxlength': 500
            })
        }
    
    def clean_description(self):
        description = self.cleaned_data['description'].strip()
        
        if len(description) > 500:
            raise ValidationError("Description must be less than 500 characters.")
        
        return description


class FriendRequestForm(forms.ModelForm):
    """Form for sending friend requests with optional message"""
    
    class Meta:
        model = FriendRequest
        fields = ['message']
        widgets = {
            'message': forms.Textarea(attrs={
                'class': 'input',
                'placeholder': 'Say something nice... (optional)',
                'rows': 2,
                'maxlength': 200
            })
        }
    
    def __init__(self, from_user=None, to_user=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.from_user = from_user
        self.to_user = to_user
    
    def save(self, commit=True):
        friend_request = super().save(commit=False)
        if self.from_user:
            friend_request.from_user = self.from_user
        if self.to_user:
            friend_request.to_user = self.to_user
        if commit:
            friend_request.save()
        return friend_request


class FriendRequestByUsernameForm(forms.Form):
    """Form for sending friend requests by username"""
    
    username = forms.CharField(
        max_length=150,
        widget=forms.TextInput(attrs={
            'class': 'input',
            'placeholder': 'Enter username...',
            'autocomplete': 'off'
        })
    )
    
    message = forms.CharField(
        max_length=200,
        required=False,
        widget=forms.Textarea(attrs={
            'class': 'input',
            'placeholder': 'Optional message...',
            'rows': 2
        })
    )
    
    def clean_username(self):
        username = self.cleaned_data['username'].strip()
        
        # Check if user exists
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise ValidationError("User with this username does not exist.")
        
        return username


class RoomCategoryForm(forms.ModelForm):
    """Form for creating/editing room categories"""
    
    class Meta:
        model = RoomCategory
        fields = ['name', 'description', 'icon', 'color', 'is_active', 'sort_order']
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'input',
                'placeholder': 'Category name',
                'maxlength': 50
            }),
            'description': forms.Textarea(attrs={
                'class': 'input',
                'placeholder': 'Category description...',
                'rows': 3,
                'maxlength': 200
            }),
            'icon': forms.TextInput(attrs={
                'class': 'input',
                'placeholder': '💬',
                'maxlength': 20
            }),
            'color': forms.TextInput(attrs={
                'type': 'color',
                'class': 'color-input',
                'value': '#6366f1'
            }),
            'is_active': forms.CheckboxInput(attrs={'class': 'checkbox'}),
            'sort_order': forms.NumberInput(attrs={
                'class': 'input',
                'min': 0,
                'value': 0
            })
        }
    
    def clean_name(self):
        name = self.cleaned_data['name'].strip()
        
        if len(name) < 2:
            raise ValidationError("Category name must be at least 2 characters long.")
        
        return name


class SearchForm(forms.Form):
    """Enhanced search form with nationality filtering"""
    
    query = forms.CharField(
        max_length=200,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'search-input',
            'placeholder': 'Search rooms...',
            'autocomplete': 'off'
        })
    )
    
    category = forms.ModelChoiceField(
        queryset=RoomCategory.objects.filter(is_active=True),
        required=False,
        empty_label="All Categories",
        widget=forms.Select(attrs={'class': 'input'})
    )
    
    nationality = forms.ChoiceField(
        choices=[('', 'All Nationalities')] + UserChoices.COUNTRY_CHOICES,
        required=False,
        widget=forms.Select(attrs={
            'class': 'input nationality-filter',
            'id': 'nationality-filter'
        }),
        help_text="Filter by nationality"
    )
    
    tags = forms.CharField(
        max_length=100,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'input',
            'placeholder': 'Filter by tags...'
        })
    )
    
    sort_by = forms.ChoiceField(
        choices=[
            ('activity', 'Recent Activity'),
            ('created', 'Newest'),
            ('popular', 'Most Popular'),
            ('name', 'Name A-Z'),
            ('diverse', 'Most Diverse'),
        ],
        required=False,
        initial='activity',
        widget=forms.Select(attrs={'class': 'input'})
    )


class BulkModerationForm(forms.Form):
    """Form for bulk moderation actions"""
    
    ACTION_CHOICES = [
        ('delete_messages', 'Delete Selected Messages'),
        ('warn_users', 'Warn Message Authors'),
        ('mute_users', 'Mute Message Authors'),
        ('resolve_reports', 'Mark Reports as Resolved'),
        ('update_nationality', 'Update User Nationalities'),
    ]
    
    action = forms.ChoiceField(
        choices=ACTION_CHOICES,
        widget=forms.Select(attrs={'class': 'input'})
    )
    
    reason = forms.CharField(
        max_length=500,
        widget=forms.Textarea(attrs={
            'class': 'input',
            'placeholder': 'Reason for bulk action...',
            'rows': 3
        })
    )
    
    selected_items = forms.CharField(
        widget=forms.HiddenInput()
    )
    
    # For nationality updates
    new_nationality = forms.ChoiceField(
        choices=[('', 'Select nationality')] + UserChoices.COUNTRY_CHOICES,
        required=False,
        widget=forms.Select(attrs={
            'class': 'input nationality-bulk-select',
            'id': 'bulk-nationality-select'
        })
    )
    
    def clean_selected_items(self):
        selected = self.cleaned_data['selected_items']
        
        if not selected:
            raise ValidationError("No items selected for bulk action.")
        
        try:
            item_ids = [int(x) for x in selected.split(',') if x.strip()]
        except ValueError:
            raise ValidationError("Invalid selection format.")
        
        if len(item_ids) > 100:
            raise ValidationError("Maximum 100 items can be processed at once.")
        
        return item_ids
    
    def clean(self):
        cleaned_data = super().clean()
        action = cleaned_data.get('action')
        new_nationality = cleaned_data.get('new_nationality')
        
        if action == 'update_nationality' and not new_nationality:
            raise ValidationError("Please select a nationality for the update action.")
        
        return cleaned_data


class AvatarCustomizationForm(forms.Form):
    """Standalone avatar customization form with nationality"""
    
    HAIR_STYLES = [
        ('short', 'Short'),
        ('long', 'Long'),
        ('curly', 'Curly'),
        ('braids', 'Braids'),
        ('ponytail', 'Ponytail'),
        ('bald', 'Bald'),
        ('buzz', 'Buzz Cut'),
        ('mohawk', 'Mohawk'),
    ]
    
    EYE_SHAPES = [
        ('normal', 'Normal'),
        ('large', 'Large'),
        ('small', 'Small'),
        ('almond', 'Almond'),
    ]
    
    hair_style = forms.ChoiceField(
        choices=HAIR_STYLES,
        widget=forms.Select(attrs={'class': 'avatar-select'})
    )
    
    hair_color = forms.CharField(
        max_length=7,
        widget=forms.TextInput(attrs={
            'type': 'color',
            'class': 'avatar-color-picker'
        })
    )
    
    skin_tone = forms.CharField(
        max_length=7,
        widget=forms.TextInput(attrs={
            'type': 'color',
            'class': 'avatar-color-picker'
        })
    )
    
    eye_color = forms.CharField(
        max_length=7,
        widget=forms.TextInput(attrs={
            'type': 'color',
            'class': 'avatar-color-picker'
        })
    )
    
    eye_shape = forms.ChoiceField(
        choices=EYE_SHAPES,
        widget=forms.Select(attrs={'class': 'avatar-select'})
    )
    
    shirt_color = forms.CharField(
        max_length=7,
        widget=forms.TextInput(attrs={
            'type': 'color',
            'class': 'avatar-color-picker'
        })
    )
    
    pants_color = forms.CharField(
        max_length=7,
        widget=forms.TextInput(attrs={
            'type': 'color',
            'class': 'avatar-color-picker'
        })
    )
    
    # Nationality field
    nationality = forms.ChoiceField(
        choices=[('', 'Select nationality')] + UserChoices.COUNTRY_CHOICES,
        required=False,
        widget=forms.Select(attrs={
            'class': 'avatar-select nationality-avatar-select',
            'id': 'avatar-nationality-select'
        })
    )
    
    show_nationality = forms.BooleanField(
        required=False,
        initial=True,
        widget=forms.CheckboxInput(attrs={
            'class': 'checkbox avatar-nationality-checkbox',
            'id': 'avatar-show-nationality'
        })
    )
    
    def clean(self):
        cleaned_data = super().clean()
        
        # Validate color codes
        color_fields = ['hair_color', 'skin_tone', 'eye_color', 'shirt_color', 'pants_color']
        
        for field in color_fields:
            color = cleaned_data.get(field)
            if color and not re.match(r'^#[0-9A-Fa-f]{6}$', color):
                raise ValidationError(f"Invalid color code for {field.replace('_', ' ')}")
        
        # Validate nationality
        nationality = cleaned_data.get('nationality')
        if nationality:
            valid_countries = [code for code, name in UserChoices.COUNTRY_CHOICES]
            if nationality not in valid_countries:
                raise ValidationError("Invalid nationality selected.")
        
        return cleaned_data


class QuickMessageForm(forms.ModelForm):
    """Form for quick message sending in rooms"""
    
    class Meta:
        model = Message
        fields = ['content']
        widgets = {
            'content': forms.TextInput(attrs={
                'class': 'message-input',
                'placeholder': 'Type your message...',
                'autocomplete': 'off',
                'maxlength': 1000
            })
        }
    
    def clean_content(self):
        content = self.cleaned_data['content'].strip()
        
        if not content:
            raise ValidationError("Message cannot be empty.")
        
        if len(content) > 1000:
            raise ValidationError("Message too long. Maximum 1000 characters.")
        
        # Basic spam detection
        if content.upper() == content and len(content) > 10:
            raise ValidationError("Please don't use all caps.")
        
        # Check for repeated characters
        if re.search(r'(.)\1{10,}', content):
            raise ValidationError("Please avoid excessive repeated characters.")
        
        return content


class RoomDemographicsFilterForm(forms.Form):
    """Form for filtering room demographics"""
    
    min_countries = forms.IntegerField(
        required=False,
        min_value=1,
        max_value=50,
        widget=forms.NumberInput(attrs={
            'class': 'input',
            'placeholder': 'Min countries',
            'min': 1,
            'max': 50
        }),
        help_text="Minimum number of different countries"
    )
    
    min_users = forms.IntegerField(
        required=False,
        min_value=1,
        widget=forms.NumberInput(attrs={
            'class': 'input',
            'placeholder': 'Min users',
            'min': 1
        }),
        help_text="Minimum number of active users"
    )
    
    category = forms.ModelChoiceField(
        queryset=RoomCategory.objects.filter(is_active=True),
        required=False,
        empty_label="All Categories",
        widget=forms.Select(attrs={'class': 'input'})
    )
    
    sort_by = forms.ChoiceField(
        choices=[
            ('diversity', 'Most Diverse'),
            ('users', 'Most Users'),
            ('activity', 'Most Active'),
            ('name', 'Name A-Z'),
        ],
        required=False,
        initial='diversity',
        widget=forms.Select(attrs={'class': 'input'})
    )


class FriendSuggestionsFilterForm(forms.Form):
    """Form for filtering friend suggestions"""
    
    suggestion_type = forms.ChoiceField(
        choices=[
            ('all', 'All Suggestions'),
            ('same_nationality', 'Same Nationality'),
            ('mutual_friends', 'Mutual Friends'),
            ('same_rooms', 'Same Rooms'),
            ('similar_interests', 'Similar Interests'),
        ],
        required=False,
        initial='all',
        widget=forms.Select(attrs={'class': 'input'})
    )
    
    nationality = forms.ChoiceField(
        choices=[('', 'Any Nationality')] + UserChoices.COUNTRY_CHOICES,
        required=False,
        widget=forms.Select(attrs={
            'class': 'input nationality-filter',
            'id': 'friend-nationality-filter'
        })
    )
    
    limit = forms.IntegerField(
        required=False,
        min_value=5,
        max_value=50,
        initial=10,
        widget=forms.NumberInput(attrs={
            'class': 'input',
            'min': 5,
            'max': 50
        }),
        help_text="Number of suggestions to show"
    )


# ==================== SUBSCRIPTION/PAYMENT FORMS ====================

class SubscriptionPlanForm(forms.ModelForm):
    """Form for creating/editing subscription plans"""
    
    class Meta:
        model = SubscriptionPlan
        fields = [
            'name', 'display_name', 'description', 'price',
            'max_users_per_room', 'max_rooms', 'features',
            'stripe_price_id', 'is_active', 'is_popular'
        ]
        widgets = {
            'name': forms.Select(attrs={'class': 'input'}),
            'display_name': forms.TextInput(attrs={
                'class': 'input',
                'placeholder': 'Plan display name'
            }),
            'description': forms.Textarea(attrs={
                'class': 'input',
                'rows': 3,
                'placeholder': 'Plan description...'
            }),
            'price': forms.NumberInput(attrs={
                'class': 'input',
                'step': '0.01',
                'min': '0'
            }),
            'max_users_per_room': forms.NumberInput(attrs={
                'class': 'input',
                'min': '1',
                'max': '500'
            }),
            'max_rooms': forms.NumberInput(attrs={
                'class': 'input',
                'min': '0',
                'help_text': '0 means unlimited'
            }),
            'features': forms.Textarea(attrs={
                'class': 'input',
                'rows': 5,
                'placeholder': 'Enter features as JSON array: ["Feature 1", "Feature 2"]'
            }),
            'stripe_price_id': forms.TextInput(attrs={
                'class': 'input',
                'placeholder': 'price_xxx'
            }),
            'is_active': forms.CheckboxInput(attrs={'class': 'checkbox'}),
            'is_popular': forms.CheckboxInput(attrs={'class': 'checkbox'}),
        }
    
    def clean_features(self):
        features = self.cleaned_data['features']
        if features:
            try:
                import json
                features_list = json.loads(features)
                if not isinstance(features_list, list):
                    raise ValidationError("Features must be a JSON array.")
                return features_list
            except json.JSONDecodeError:
                raise ValidationError("Invalid JSON format for features.")
        return []


class PaymentFilterForm(forms.Form):
    """Form for filtering payments in admin"""
    
    status = forms.ChoiceField(
        choices=[('', 'All Statuses')] + list(PaymentChoices.PAYMENT_STATUS_CHOICES),
        required=False,
        widget=forms.Select(attrs={'class': 'input'})
    )
    
    plan = forms.ModelChoiceField(
        queryset=SubscriptionPlan.objects.filter(is_active=True),
        required=False,
        empty_label="All Plans",
        widget=forms.Select(attrs={'class': 'input'})
    )
    
    date_from = forms.DateField(
        required=False,
        widget=forms.DateInput(attrs={
            'class': 'input',
            'type': 'date'
        })
    )
    
    date_to = forms.DateField(
        required=False,
        widget=forms.DateInput(attrs={
            'class': 'input',
            'type': 'date'
        })
    )
    
    search = forms.CharField(
        max_length=100,
        required=False,
        widget=forms.TextInput(attrs={
            'class': 'input',
            'placeholder': 'Search by username or email...'
        })
    )