import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from .models import Room, Message, Reaction, Meetup
from django.utils import timezone
from datetime import timedelta

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'chat_{self.room_name}'
        self.user = self.scope.get('user', None)

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # Send message indicating user joined
        if self.user and not self.user.is_anonymous:
            # Add user to active users list
            await self.update_user_presence(True)

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

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

        # Update user presence
        if self.user and not self.user.is_anonymous:
            await self.update_user_presence(False)

            # Send updated user list to everyone
            active_users = await self.get_active_users()
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'users',
                    'users': active_users
                }
            )

    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json.get('type', 'chat')

        if message_type == 'chat':
            message = text_data_json.get('message', '')

            if not message or not self.user or self.user.is_anonymous:
                return

            # Save message to database
            message_id = await self.save_message(message)

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

    # Added missing users event handler
    async def users(self, event):
        # Send users list to WebSocket
        await self.send(json.dumps({
            'type': 'users',
            'users': event['users']
        }))

    # Database operations

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
    def update_user_presence(self, is_online):
        # In a real app, you might update a UserPresence model
        # For now, we'll use a simpler approach
        room = Room.objects.get(name=self.room_name)

        # For demonstration, we're simulating presence by adding a recent message
        # In a real app, you'd have a proper presence system
        if is_online and not Message.objects.filter(
            room=room,
            user=self.user,
            timestamp__gte=timezone.now() - timedelta(minutes=5)
        ).exists():
            # Add a system message that user joined (could be hidden)
            Message.objects.create(
                user=self.user,
                room=room,
                content=f"<span class='hidden'>User presence update</span>"
            )

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
        users = list(recent_users)
        if self.user and not self.user.is_anonymous and self.user.username not in users:
            users.append(self.user.username)

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
