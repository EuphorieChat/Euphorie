# backend/chat/forms.py

from django import forms
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from django.utils.text import slugify
import re

from .models import (
    Room, RoomCategory, UserProfile, MessageReport, 
    Friendship, WordFilter, UserModerationAction
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
                'max': 100,
                'value': 50
            })
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
    """Enhanced user profile form"""
    
    # Avatar customization fields
    hair_style = forms.ChoiceField(
        choices=[
            ('short', 'Short'),
            ('long', 'Long'),
            ('curly', 'Curly'),
            ('braids', 'Braids'),
            ('bald', 'Bald'),
        ],
        required=False,
        widget=forms.Select(attrs={'class': 'input'})
    )
    
    hair_color = forms.CharField(
        max_length=7,
        required=False,
        widget=forms.TextInput(attrs={
            'type': 'color',
            'class': 'color-input',
            'value': '#8B4513'
        })
    )
    
    skin_tone = forms.CharField(
        max_length=7,
        required=False,
        widget=forms.TextInput(attrs={
            'type': 'color',
            'class': 'color-input',
            'value': '#FDBCB4'
        })
    )
    
    shirt_color = forms.CharField(
        max_length=7,
        required=False,
        widget=forms.TextInput(attrs={
            'type': 'color',
            'class': 'color-input',
            'value': '#FF6B6B'
        })
    )
    
    pants_color = forms.CharField(
        max_length=7,
        required=False,
        widget=forms.TextInput(attrs={
            'type': 'color',
            'class': 'color-input',
            'value': '#4ECDC4'
        })
    )
    
    eye_color = forms.CharField(
        max_length=7,
        required=False,
        widget=forms.TextInput(attrs={
            'type': 'color',
            'class': 'color-input',
            'value': '#4A90E2'
        })
    )
    
    class Meta:
        model = UserProfile
        fields = [
            'display_name', 'bio', 'location', 'website',
            'theme', 'status_message', 'profile_visibility',
            'show_online_status', 'allow_friend_requests'
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
        }
    
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
        }
        
        profile.avatar_customization = avatar_data
        
        if commit:
            profile.save()
        
        return profile


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


class FriendRequestForm(forms.Form):
    """Form for sending friend requests"""
    
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


class ModerationActionForm(forms.ModelForm):
    """Form for moderation actions"""
    
    duration_hours = forms.IntegerField(
        required=False,
        min_value=1,
        max_value=8760,  # 1 year
        widget=forms.NumberInput(attrs={
            'class': 'input',
            'placeholder': 'Duration in hours (optional)'
        }),
        help_text="Leave blank for permanent actions"
    )
    
    class Meta:
        model = UserModerationAction
        fields = ['action', 'reason', 'duration_hours']
        widgets = {
            'action': forms.Select(attrs={'class': 'input'}),
            'reason': forms.Textarea(attrs={
                'class': 'input',
                'placeholder': 'Reason for this action...',
                'rows': 3,
                'maxlength': 500,
                'required': True
            })
        }
    
    def clean_reason(self):
        reason = self.cleaned_data['reason'].strip()
        
        if len(reason) < 10:
            raise ValidationError("Reason must be at least 10 characters long.")
        
        return reason


class WordFilterForm(forms.ModelForm):
    """Form for managing word filters"""
    
    class Meta:
        model = WordFilter
        fields = ['word', 'severity', 'action', 'replacement', 'is_regex', 'case_sensitive', 'is_active']
        widgets = {
            'word': forms.TextInput(attrs={
                'class': 'input',
                'placeholder': 'Word or phrase to filter',
                'maxlength': 100
            }),
            'severity': forms.Select(attrs={'class': 'input'}),
            'action': forms.Select(attrs={'class': 'input'}),
            'replacement': forms.TextInput(attrs={
                'class': 'input',
                'placeholder': '***',
                'maxlength': 20
            }),
            'is_regex': forms.CheckboxInput(attrs={'class': 'checkbox'}),
            'case_sensitive': forms.CheckboxInput(attrs={'class': 'checkbox'}),
            'is_active': forms.CheckboxInput(attrs={'class': 'checkbox'})
        }
    
    def clean_word(self):
        word = self.cleaned_data['word'].strip()
        
        if len(word) < 2:
            raise ValidationError("Filter word must be at least 2 characters long.")
        
        return word


class SearchForm(forms.Form):
    """Enhanced search form"""
    
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
            ('name', 'Name A-Z')
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


class AvatarCustomizationForm(forms.Form):
    """Standalone avatar customization form"""
    
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
    
    def clean(self):
        cleaned_data = super().clean()
        
        # Validate color codes
        color_fields = ['hair_color', 'skin_tone', 'eye_color', 'shirt_color', 'pants_color']
        
        for field in color_fields:
            color = cleaned_data.get(field)
            if color and not re.match(r'^#[0-9A-Fa-f]{6}$', color):
                raise ValidationError(f"Invalid color code for {field.replace('_', ' ')}")
        
        return cleaned_data


class QuickMessageForm(forms.Form):
    """Form for quick message sending in rooms"""
    
    content = forms.CharField(
        max_length=1000,
        widget=forms.TextInput(attrs={
            'class': 'message-input',
            'placeholder': 'Type your message...',
            'autocomplete': 'off',
            'maxlength': 1000
        })
    )
    
    message_type = forms.ChoiceField(
        choices=[
            ('text', 'Text'),
            ('emotion', 'Emotion'),
        ],
        initial='text',
        widget=forms.HiddenInput()
    )
    
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