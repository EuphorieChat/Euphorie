# Generated by Django 5.1.7 on 2025-05-11 07:14

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0008_usersettings_room_is_dm_room_is_protected_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='profile_picture_data',
            field=models.TextField(blank=True, null=True),
        ),
    ]
