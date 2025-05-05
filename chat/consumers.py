import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta

from .models import Room, Message, Reaction, Meetup, Announcement, AnnouncementReadStatus
from .services import (
    get_online_friends,
    update_user_status,
    get_room_recommendations,
    record_user_interest,
    get_friend_suggestions
)

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'chat_{self.room_name}'
        self.user = self.scope.get('user', None)

        # Check if room exists and user has access (password check)
        room_access = await self.check_room_access()
        if not room_access['exists']:
            # Room doesn't exist, reject the connection
            await self.close()
            return

        # Check if room is password protected and user has access
        if room_access['is_protected']:
            # Get session from scope
            session = self.scope.get('session', None)
            if not session or not session.get(f'room_access_{self.room_name}'):
                # User hasn't entered the password, reject connection
                await self.close()
                return

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # Send message indicating user joined
        if self.user and not self.user.is_anonymous:
            # Update user status to online
            await database_sync_to_async(self._update_user_status)(True)

            # Add user to active users list without creating a message
            await self.update_user_presence()

            # Get active users list and broadcast to the new connection
            active_users = await self.get_active_users()
            await self.send(json.dumps({
                'type': 'users',
                'users': active_users
            }))

            # Broadcast to everyone that a new user joined
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'users',
                    'users': active_users
                }
            )

            # Get meetups list and send to new user
            meetups = await self.get_meetups()
            await self.send(json.dumps({
                'type': 'meetups',
                'meetups': meetups
            }))

            # Get active announcements and send to the user
            if self.user.is_authenticated:
                announcements = await self.get_active_announcements()
                if announcements:
                    await self.send(json.dumps({
                        'type': 'announcements',
                        'announcements': announcements
                    }))

    def _update_user_status(self, is_online):
        """Synchronous function to update user online status"""
        return update_user_status(self.user, is_online)

    async def disconnect(self, close_code):
        # Update user status to offline
        if hasattr(self, 'user') and self.user and not self.user.is_anonymous:
            await database_sync_to_async(self._update_user_status)(False)

        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

        # Send updated user list to everyone
        if self.user and not self.user.is_anonymous:
            # Get active users list without creating a message
            active_users = await self.get_active_users_for_disconnect()
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'users',
                    'users': active_users
                }
            )

    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type', 'chat')

            if message_type == 'chat':
                message = text_data_json.get('message', '')

                if not message or not self.user or self.user.is_anonymous:
                    return

                # Save message to database
                message_id = await self.save_message(message)

                # Record user interest in the room
                if hasattr(self, 'user') and self.user.is_authenticated:
                    room = await self.get_room()
                    await database_sync_to_async(self._record_user_interest)(room)

                # Send message to room group
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'chat_message',
                        'message': message,
                        'username': self.user.username,
                        'message_id': message_id
                    }
                )

            elif message_type == 'typing':
                if not self.user or self.user.is_anonymous:
                    return

                # Send typing notification to room group
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'typing',
                        'username': self.user.username
                    }
                )

            elif message_type == 'reaction':
                message_id = text_data_json.get('message_id')
                reaction = text_data_json.get('reaction')

                if not message_id or not reaction or not self.user or self.user.is_anonymous:
                    return

                # Toggle reaction in database
                reaction_data = await self.toggle_reaction(message_id, reaction)

                # Send reaction update to room group
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'reaction',
                        'message_id': message_id,
                        'reaction': reaction,
                        'count': reaction_data['count'],
                        'users': reaction_data['users']
                    }
                )

            elif message_type == 'users':
                action = text_data_json.get('action', 'list')

                if action == 'list':
                    # Get active users and send to client
                    active_users = await self.get_active_users()

                    await self.send(json.dumps({
                        'type': 'users',
                        'users': active_users
                    }))

                    # Also broadcast to all users in the room
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'users',
                            'users': active_users
                        }
                    )

            elif message_type == 'whiteboard':
                action = text_data_json.get('action')

                if not action or not self.user or self.user.is_anonymous:
                    return

                # Simply forward whiteboard data to all clients
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'whiteboard',
                        'action': action,
                        'x': text_data_json.get('x'),
                        'y': text_data_json.get('y'),
                        'color': text_data_json.get('color'),
                        'size': text_data_json.get('size')
                    }
                )

            elif message_type == 'meetup':
                action = text_data_json.get('action', '')

                if not self.user or self.user.is_anonymous:
                    return

                if action == 'create':
                    meetup_data = text_data_json.get('meetup', {})

                    if not meetup_data:
                        return

                    # Create new meetup
                    await self.create_meetup(meetup_data)

                    # Get updated meetups list
                    meetups = await self.get_meetups()

                    # Send updated list to all clients
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'meetups',
                            'meetups': meetups
                        }
                    )

                elif action == 'list':
                    # Get meetups and send to client
                    meetups = await self.get_meetups()

                    await self.send(json.dumps({
                        'type': 'meetups',
                        'meetups': meetups
                    }))

                elif action in ['join', 'leave']:
                    meetup_id = text_data_json.get('meetup_id')

                    if not meetup_id:
                        return

                    # Update meetup attendance
                    await self.update_meetup_attendance(meetup_id, action == 'join')

                    # Get updated meetups list
                    meetups = await self.get_meetups()

                    # Send updated list to all clients
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'meetups',
                            'meetups': meetups
                        }
                    )

            # Handle announcement message types
            elif message_type == 'announcement':
                action = text_data_json.get('action', '')

                if not self.user or self.user.is_anonymous:
                    return

                if action == 'create':
                    # Check if user is admin or room creator
                    is_admin = await self.check_if_admin()
                    if not is_admin:
                        return

                    content = text_data_json.get('content', '')
                    if not content:
                        return

                    # Create announcement
                    announcement_data = await self.create_announcement(content)

                    # Broadcast to everyone
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'announcement',
                            'action': 'new',
                            'announcement_id': announcement_data['id'],
                            'content': announcement_data['content'],
                            'creator': announcement_data['creator'],
                            'created_at': announcement_data['created_at']
                        }
                    )

                elif action == 'mark_read':
                    announcement_id = text_data_json.get('announcement_id')
                    if not announcement_id:
                        return

                    # Mark announcement as read
                    success = await self.mark_announcement_read(announcement_id)

                    # Only send confirmation to the user who marked it as read
                    if success:
                        await self.send(json.dumps({
                            'type': 'announcement',
                            'action': 'marked_read',
                            'announcement_id': announcement_id
                        }))

            # Add handlers for friends and recommendations message types
            elif message_type == 'friends':
                action = text_data_json.get('action', '')

                if action == 'list_online':
                    # Get online friends
                    online_friends = []
                    if hasattr(self, 'user') and self.user.is_authenticated:
                        online_friends_qs = await database_sync_to_async(get_online_friends)(self.user)
                        online_friends = await self.get_user_data_list(online_friends_qs)

                    # Send response
                    await self.send(json.dumps({
                        'type': 'friends',
                        'action': 'online_list',
                        'friends': online_friends
                    }))

                elif action == 'suggestions':
                    # Get friend suggestions
                    suggestions = []
                    if hasattr(self, 'user') and self.user.is_authenticated:
                        suggestions_list = await database_sync_to_async(get_friend_suggestions)(self.user)
                        suggestions = await self.get_user_data_list(suggestions_list)

                    # Send response
                    await self.send(json.dumps({
                        'type': 'friends',
                        'action': 'suggestions',
                        'suggestions': suggestions
                    }))

            elif message_type == 'recommendations':
                action = text_data_json.get('action', '')

                if action == 'get':
                    # Get room recommendations
                    recommendations = []
                    if hasattr(self, 'user'):
                        recommendations_qs = await database_sync_to_async(get_room_recommendations)(self.user)
                        recommendations = await self.get_room_data_list(recommendations_qs)

                    # Send response
                    await self.send(json.dumps({
                        'type': 'recommendations',
                        'action': 'list',
                        'rooms': recommendations
                    }))

        except json.JSONDecodeError:
            # Handle JSON decode error
            pass

    def _record_user_interest(self, room):
        """Synchronous function to record user interest"""
        return record_user_interest(self.user, room=room, points=1)

    # Message handlers
    async def chat_message(self, event):
        # Send message to WebSocket
        await self.send(json.dumps({
            'type': 'chat',
            'message': event['message'],
            'username': event['username'],
            'message_id': event['message_id']
        }))

    async def typing(self, event):
        # Send typing indicator to WebSocket
        await self.send(json.dumps({
            'type': 'typing',
            'username': event['username']
        }))

    async def reaction(self, event):
        # Send reaction update to WebSocket
        await self.send(json.dumps({
            'type': 'reaction',
            'message_id': event['message_id'],
            'reaction': event['reaction'],
            'count': event['count'],
            'users': event['users']
        }))

    async def whiteboard(self, event):
        # Send whiteboard update to WebSocket
        await self.send(json.dumps({
            'type': 'whiteboard',
            'action': event['action'],
            'x': event.get('x'),
            'y': event.get('y'),
            'color': event.get('color'),
            'size': event.get('size')
        }))

    async def meetups(self, event):
        # Send meetups update to WebSocket
        await self.send(json.dumps({
            'type': 'meetups',
            'meetups': event['meetups']
        }))

    async def users(self, event):
        # Send users list to WebSocket
        await self.send(json.dumps({
            'type': 'users',
            'users': event['users']
        }))

    async def announcement(self, event):
        # Send announcement to WebSocket
        await self.send(json.dumps({
            'type': 'announcement',
            'action': event['action'],
            'announcement_id': event['announcement_id'],
            'content': event['content'],
            'creator': event['creator'],
            'created_at': event['created_at']
        }))

    # Add handlers for friends and recommendations
    async def friends(self, event):
        # Send friends update to WebSocket
        await self.send(json.dumps({
            'type': 'friends',
            'action': event.get('action', ''),
            'friends': event.get('friends', []),
            'suggestions': event.get('suggestions', [])
        }))

    async def recommendations(self, event):
        # Send recommendations update to WebSocket
        await self.send(json.dumps({
            'type': 'recommendations',
            'action': event.get('action', ''),
            'rooms': event.get('rooms', [])
        }))

    # Database operations
    @database_sync_to_async
    def check_room_access(self):
        """Check if room exists and if it's password protected"""
        try:
            room = Room.objects.get(name=self.room_name)
            return {
                'exists': True,
                'is_protected': room.is_protected
            }
        except Room.DoesNotExist:
            return {
                'exists': False,
                'is_protected': False
            }

    @database_sync_to_async
    def save_message(self, content):
        room = Room.objects.get(name=self.room_name)
        message = Message.objects.create(
            user=self.user,
            room=room,
            content=content
        )
        return message.id

    @database_sync_to_async
    def toggle_reaction(self, message_id, emoji):
        message = Message.objects.get(id=message_id)

        # Check if reaction exists
        try:
            reaction = Reaction.objects.get(
                message=message,
                user=self.user,
                emoji=emoji
            )
            # If it exists, delete it (toggle off)
            reaction.delete()
        except Reaction.DoesNotExist:
            # If it doesn't exist, create it (toggle on)
            Reaction.objects.create(
                message=message,
                user=self.user,
                emoji=emoji
            )

        # Get updated count and users who reacted
        reactions = Reaction.objects.filter(message=message, emoji=emoji)
        count = reactions.count()
        users = list(reactions.values_list('user__username', flat=True))

        return {
            'count': count,
            'users': users
        }

    @database_sync_to_async
    def update_user_presence(self):
        # This function intentionally does nothing but must be defined
        # as a synchronous function for database_sync_to_async
        pass

    @database_sync_to_async
    def get_active_users(self):
        room = Room.objects.get(name=self.room_name)

        # Get users who sent messages in the last hour
        recent_time = timezone.now() - timedelta(hours=1)
        recent_users = Message.objects.filter(
            room=room,
            timestamp__gte=recent_time
        ).values_list('user__username', flat=True).distinct()

        # Add current user if not already included
        users = list(set(recent_users))  # Convert to set to remove duplicates
        if self.user and not self.user.is_anonymous and self.user.username not in users:
            users.append(self.user.username)

        return users

    @database_sync_to_async
    def get_active_users_for_disconnect(self):
        # For disconnect events, we don't want to add the current user since they're leaving
        room = Room.objects.get(name=self.room_name)

        # Get users who sent messages in the last hour
        recent_time = timezone.now() - timedelta(hours=1)
        recent_users = Message.objects.filter(
            room=room,
            timestamp__gte=recent_time
        ).values_list('user__username', flat=True).distinct()

        # Convert to list and remove current user
        users = list(set(recent_users))
        if self.user and not self.user.is_anonymous and self.user.username in users:
            users.remove(self.user.username)

        return users

    @database_sync_to_async
    def create_meetup(self, meetup_data):
        room = Room.objects.get(name=self.room_name)

        meetup = Meetup.objects.create(
            title=meetup_data.get('title'),
            description=meetup_data.get('description', ''),
            datetime=timezone.datetime.fromisoformat(meetup_data.get('datetime')),
            location=meetup_data.get('location'),
            room=room,
            creator=self.user
        )

        # Add creator as attendee
        meetup.attendees.add(self.user)

        return meetup.id

    @database_sync_to_async
    def get_meetups(self):
        room = Room.objects.get(name=self.room_name)

        # Get upcoming meetups
        meetups = Meetup.objects.filter(
            room=room,
            datetime__gte=timezone.now()
        ).order_by('datetime')

        result = []
        for meetup in meetups:
            attendees = list(meetup.attendees.values_list('username', flat=True))

            result.append({
                'id': meetup.id,
                'title': meetup.title,
                'datetime': meetup.datetime.isoformat(),
                'location': meetup.location,
                'description': meetup.description,
                'created_by': meetup.creator.username,
                'attendees': attendees
            })

        return result

    @database_sync_to_async
    def update_meetup_attendance(self, meetup_id, is_joining):
        meetup = Meetup.objects.get(id=meetup_id)

        if is_joining:
            meetup.attendees.add(self.user)
        else:
            meetup.attendees.remove(self.user)

    @database_sync_to_async
    def check_if_admin(self):
        """Check if the current user is an admin or room creator"""
        if not self.user or self.user.is_anonymous:
            return False

        # Check if user is staff or superuser
        if self.user.is_staff or self.user.is_superuser:
            return True

        # Check if user is the room creator
        try:
            room = Room.objects.get(name=self.room_name)
            return room.creator == self.user
        except Room.DoesNotExist:
            return False

    @database_sync_to_async
    def create_announcement(self, content):
        """Create a new announcement in the room"""
        room = Room.objects.get(name=self.room_name)

        announcement = Announcement.objects.create(
            room=room,
            creator=self.user,
            content=content,
            is_active=True
        )

        return {
            'id': announcement.id,
            'content': announcement.content,
            'creator': self.user.username,
            'created_at': announcement.created_at.isoformat()
        }

    @database_sync_to_async
    def mark_announcement_read(self, announcement_id):
        """Mark an announcement as read by the current user"""
        try:
            announcement = Announcement.objects.get(id=announcement_id)
            AnnouncementReadStatus.objects.get_or_create(
                announcement=announcement,
                user=self.user
            )
            return True
        except Announcement.DoesNotExist:
            return False

    @database_sync_to_async
    def get_active_announcements(self):
        """Get all active announcements for this room that the user hasn't read"""
        room = Room.objects.get(name=self.room_name)

        # Get all active announcements
        announcements = Announcement.objects.filter(
            room=room,
            is_active=True
        )

        result = []
        for announcement in announcements:
            # Check if user has read this announcement
            is_read = AnnouncementReadStatus.objects.filter(
                announcement=announcement,
                user=self.user
            ).exists()

            # Only include unread announcements
            if not is_read:
                result.append({
                    'id': announcement.id,
                    'content': announcement.content,
                    'creator': announcement.creator.username,
                    'created_at': announcement.created_at.isoformat()
                })

        return result

    # Helper methods for formatting data
    async def get_room(self):
        """Get the current room object"""
        return await database_sync_to_async(self._get_room)()

    def _get_room(self):
        """Synchronous function to get room object"""
        return Room.objects.get(name=self.room_name)

    async def get_user_data_list(self, users_qs):
        """Get user data list"""
        return await database_sync_to_async(self._get_user_data_list)(users_qs)

    def _get_user_data_list(self, users_qs):
        """Synchronous function to convert users to data list"""
        return [
            {
                'id': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'avatar': f"{user.username[:1].upper()}"  # First letter as avatar placeholder
            }
            for user in users_qs
        ]

    async def get_room_data_list(self, rooms_qs):
        """Get room data list"""
        return await database_sync_to_async(self._get_room_data_list)(rooms_qs)

    def _get_room_data_list(self, rooms_qs):
        """Synchronous function to convert rooms to data list"""
        return [
            {
                'id': room.id,
                'name': room.name,
                'display_name': room.display_name or room.name,
                'category': room.category.name if room.category else None,
                'message_count': room.messages.count(),
                'is_protected': room.is_protected
            }
            for room in rooms_qs
        ]
