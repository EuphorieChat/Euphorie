import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from .models import UserProfile
from django.utils.dateparse import parse_datetime

from .models import Room, Message, Reaction, Meetup, Announcement, AnnouncementReadStatus, RoomBookmark
from .services import (
    get_online_friends,
    update_user_status,
    get_room_recommendations,
    record_user_interest,
    get_friend_suggestions
)

# Set up logging
logger = logging.getLogger(__name__)

class ChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        # Track connection info for later use
        self.room_name = self.scope['url_route']['kwargs']['room_name']
        self.room_group_name = f'chat_{self.room_name}'
        self.user = self.scope.get('user', None)

        # Track if user is authenticated
        self.is_authenticated = self.user and not self.user.is_anonymous

        # Log connection attempt
        logger.info(f"WebSocket connect attempt: room={self.room_name}, user={self.user.username if self.is_authenticated else 'anonymous'}")

        # Check if room exists and user has access
        room_access = await self.check_room_access()

        if not room_access['exists']:
            # Room doesn't exist, reject the connection
            logger.warning(f"Connection rejected: Room '{self.room_name}' does not exist")
            await self.close(code=4004)
            return

        # Check if user has access to this room (for DMs)
        if not room_access['has_access']:
            # User doesn't have permission to access this room
            logger.warning(f"Connection rejected: User does not have access to room '{self.room_name}'")
            await self.close(code=4003)
            return

        # Check if room is password protected and user has access
        if room_access['is_protected']:
            # Get session from scope
            session = self.scope.get('session', None)
            if not session or not session.get(f'room_access_{self.room_name}'):
                # User hasn't entered the password, reject connection
                logger.warning(f"Connection rejected: User does not have access to protected room '{self.room_name}'")
                await self.close(code=4003)
                return

        try:
            # Join room group
            await self.channel_layer.group_add(
                self.room_group_name,
                self.channel_name
            )

            await self.accept()
            logger.info(f"WebSocket connected successfully: room={self.room_name}, user={self.user.username if self.is_authenticated else 'anonymous'}")

            # Additional operations only for authenticated users
            if self.is_authenticated:
                # Update user status to online
                await database_sync_to_async(self._update_user_status)(True)

                # Add user to active users list
                await self.update_user_presence()

                # Get active users list and broadcast to the new connection
                active_users = await self.get_active_users()

                # Debug log for active users
                logger.info(f"Active users for {self.room_name}: {active_users}")

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
                announcements = await self.get_active_announcements()
                if announcements:
                    await self.send(json.dumps({
                        'type': 'announcements',
                        'announcements': announcements
                    }))

        except Exception as e:
            logger.error(f"Error during WebSocket connection: {str(e)}", exc_info=True)
            await self.close(code=4500)

    def _update_user_status(self, is_online):
        """Synchronous function to update user online status"""
        try:
            if self.is_authenticated:
                return update_user_status(self.user, is_online)
            return False
        except Exception as e:
            logger.error(f"Error updating user status: {str(e)}")
            return False

    async def disconnect(self, close_code):
        logger.info(f"WebSocket disconnecting: room={self.room_name}, user={self.user.username if self.is_authenticated else 'anonymous'}, code={close_code}")

        try:
            # Update user status to offline - only for authenticated users
            if self.is_authenticated:
                await database_sync_to_async(self._update_user_status)(False)

                # Send updated user list to everyone
                active_users = await self.get_active_users_for_disconnect()
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'users',
                        'users': active_users
                    }
                )

            # Leave room group
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

            logger.info(f"WebSocket disconnected: room={self.room_name}, user={self.user.username if self.is_authenticated else 'anonymous'}")
        except Exception as e:
            logger.error(f"Error during WebSocket disconnect: {str(e)}", exc_info=True)

    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
            message_type = text_data_json.get('type', 'chat')

            # Handle ping messages to keep connection alive
            if message_type == 'ping':
                # Just acknowledge the ping
                await self.send(json.dumps({
                    'type': 'pong',
                    'timestamp': timezone.now().timestamp()
                }))
                return

            # Log message reception
            logger.debug(f"Received {message_type} message from {self.user.username if self.is_authenticated else 'anonymous'}")

            # For most message types, require authentication
            requires_auth = ['chat', 'typing', 'reaction', 'whiteboard', 'meetup', 'announcement', 'friends', 'recommendations']

            if message_type in requires_auth and not self.is_authenticated:
                # Silent fail - don't send error messages to guests
                logger.debug(f"Authentication required for {message_type}, user not authenticated")
                return

            # Profile updates
            if message_type == 'profile_update':
                profile_data = text_data_json.get('profile_data', {})

                # Store in the database
                if self.is_authenticated:
                    await self.save_profile_data(profile_data)

                # Broadcast to all connected clients
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'profile_update',
                        'username': self.user.username,
                        'profile_data': profile_data
                    }
                )

            elif message_type == 'chat':
                message = text_data_json.get('message', '')

                if not message:
                    logger.warning("Chat message rejected: empty message")
                    return

                # Save message to database
                message_id = await self.save_message(message)

                # Record user interest in the room
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

                if not message_id or not reaction:
                    logger.warning("Reaction rejected: missing data")
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

                    # Debug log
                    logger.info(f"Sending active users to client: {active_users}")

                    await self.send(json.dumps({
                        'type': 'users',
                        'users': active_users
                    }))

            elif message_type == 'whiteboard':
                action = text_data_json.get('action')

                if not action:
                    return

                # Debug log
                logger.info(f"Received whiteboard update: {action}")

                # Simply forward whiteboard data to all clients
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'whiteboard',
                        'action': action,
                        'fromX': text_data_json.get('fromX'),
                        'fromY': text_data_json.get('fromY'),
                        'toX': text_data_json.get('toX'),
                        'toY': text_data_json.get('toY'),
                        'x': text_data_json.get('x'),
                        'y': text_data_json.get('y'),
                        'color': text_data_json.get('color'),
                        'size': text_data_json.get('size')
                    }
                )

            elif message_type == 'meetup':
                action = text_data_json.get('action', '')

                logger.info(f"Received meetup action: {action} from user: {self.user.username if self.is_authenticated else 'anonymous'}")

                if action == 'create':
                    meetup_data = text_data_json.get('data', {})

                    logger.info(f"Meetup data received: {meetup_data}")

                    if not meetup_data:
                        logger.warning("Meetup creation failed: no data provided")
                        await self.send(json.dumps({
                            'type': 'error',
                            'message': 'No meetup data provided'
                        }))
                        return

                    # Validate required fields (based on your model)
                    required_fields = ['title', 'datetime', 'location']
                    missing_fields = [field for field in required_fields if not meetup_data.get(field, '').strip()]

                    if missing_fields:
                        logger.warning(f"Meetup creation failed: missing fields: {missing_fields}")
                        await self.send(json.dumps({
                            'type': 'error',
                            'message': f'Missing required fields: {", ".join(missing_fields)}'
                        }))
                        return

                    try:
                        # Create new meetup
                        meetup_id = await self.create_meetup(meetup_data)
                        logger.info(f"Meetup created successfully with ID: {meetup_id}")

                        # Get updated meetups list
                        meetups = await self.get_meetups()
                        logger.info(f"Retrieved {len(meetups)} meetups after creation")

                        # Send success response to all clients in the room
                        await self.channel_layer.group_send(
                            self.room_group_name,
                            {
                                'type': 'meetups_broadcast',
                                'action': 'created',
                                'meetups': meetups,
                                'creator': self.user.username
                            }
                        )

                    except Exception as e:
                        logger.error(f"Error creating meetup: {str(e)}", exc_info=True)
                        await self.send(json.dumps({
                            'type': 'error',
                            'message': f'Failed to create meetup: {str(e)}'
                        }))

                elif action == 'list':
                    try:
                        # Get meetups and send to client
                        meetups = await self.get_meetups()
                        logger.info(f"Sending {len(meetups)} meetups to client")

                        await self.send(json.dumps({
                            'type': 'meetups',
                            'action': 'list',
                            'meetups': meetups
                        }))
                    except Exception as e:
                        logger.error(f"Error getting meetups: {str(e)}")
                        await self.send(json.dumps({
                            'type': 'error',
                            'message': 'Failed to load meetups'
                        }))


            # Handle announcement message types
            elif message_type == 'announcement':
                action = text_data_json.get('action', '')

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
                    if self.is_authenticated:
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
                    if self.is_authenticated:
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
                    try:
                        # Only get room recommendations using existing method
                        recommendations = []
                        if self.is_authenticated:
                            recommendations_qs = await database_sync_to_async(self._get_recommendation_rooms)()
                            recommendations = await database_sync_to_async(self._get_room_data_list)(recommendations_qs)

                        # Get bookmarked rooms separately
                        bookmarked_rooms = []
                        if self.is_authenticated:
                            bookmarked_rooms = await database_sync_to_async(self._get_bookmarked_room_data)()

                        # Send response
                        await self.send(json.dumps({
                            'type': 'recommendations',
                            'action': 'list',
                            'rooms': recommendations,
                            'bookmarked_rooms': bookmarked_rooms
                        }))
                    except Exception as e:
                        logger.error(f"Error in recommendations: {str(e)}")
                        await self.send(json.dumps({
                            'type': 'error',
                            'message': 'Error processing recommendations'
                        }))

        except json.JSONDecodeError:
            # Handle JSON decode error
            logger.warning(f"Invalid JSON received: {text_data[:100]}")
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}", exc_info=True)

    async def meetups_broadcast(self, event):
        """Handle meetups broadcast messages"""
        try:
            await self.send(json.dumps({
                'type': 'meetups',
                'action': event.get('action', ''),
                'meetups': event.get('meetups', []),
                'creator': event.get('creator', '')
            }))
            logger.debug(f"Sent meetups broadcast to {self.user.username if self.is_authenticated else 'anonymous'}")
        except Exception as e:
            logger.error(f"Error sending meetups broadcast: {str(e)}")

    async def profile_update(self, event):
        username = event['username']
        profile_data = event['profile_data']

        # Send to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'profile_update',
            'username': username,
            'profile_data': profile_data
        }))

    @database_sync_to_async
    def save_profile_data(self, profile_data):
        try:
            profile, created = UserProfile.objects.get_or_create(user=self.user)
            profile.profile_picture_data = json.dumps(profile_data)
            profile.save()
        except Exception as e:
            logger.error(f"Error saving profile data: {e}")

    def _record_user_interest(self, room):
        """Synchronous function to record user interest"""
        try:
            if self.is_authenticated:
                return record_user_interest(self.user, room=room, points=1)
            return False
        except Exception as e:
            logger.error(f"Error recording user interest: {str(e)}")
            return False

    # Message handlers
    async def chat_message(self, event):
        # Send message to WebSocket with all data including media_url
        await self.send(json.dumps({
            'type': 'chat',
            'message': event.get('message', ''),
            'username': event.get('username'),
            'message_id': event.get('message_id'),
            'timestamp': event.get('timestamp'),
            'media_url': event.get('media_url'),  # Include media_url if present
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
        try:
            # Debug log
            logger.info(f"Sending whiteboard update: {event['action']}")

            await self.send(json.dumps({
                'type': 'whiteboard',
                'action': event['action'],
                'fromX': event.get('fromX'),
                'fromY': event.get('fromY'),
                'toX': event.get('toX'),
                'toY': event.get('toY'),
                'x': event.get('x'),
                'y': event.get('y'),
                'color': event.get('color'),
                'size': event.get('size')
            }))
        except Exception as e:
            logger.error(f"Error sending whiteboard update: {str(e)}")

    async def meetups(self, event):
        # Send meetups update to WebSocket
        try:
            await self.send(json.dumps({
                'type': 'meetups',
                'meetups': event['meetups']
            }))
        except Exception as e:
            logger.error(f"Error sending meetups update: {str(e)}")

    async def users(self, event):
        # Send users list to WebSocket
        try:
            await self.send(json.dumps({
                'type': 'users',
                'users': event['users']
            }))
        except Exception as e:
            logger.error(f"Error sending users list: {str(e)}")

    async def announcement(self, event):
        # Send announcement to WebSocket
        try:
            await self.send(json.dumps({
                'type': 'announcement',
                'action': event['action'],
                'announcement_id': event['announcement_id'],
                'content': event['content'],
                'creator': event['creator'],
                'created_at': event['created_at']
            }))
        except Exception as e:
            logger.error(f"Error sending announcement: {str(e)}")

    # Add handlers for friends and recommendations
    async def friends(self, event):
        # Send friends update to WebSocket
        try:
            await self.send(json.dumps({
                'type': 'friends',
                'action': event.get('action', ''),
                'friends': event.get('friends', []),
                'suggestions': event.get('suggestions', [])
            }))
        except Exception as e:
            logger.error(f"Error sending friends update: {str(e)}")

    async def recommendations(self, event):
        # Send recommendations update to WebSocket
        try:
            await self.send(json.dumps({
                'type': 'recommendations',
                'action': event.get('action', ''),
                'rooms': event.get('rooms', [])
            }))
        except Exception as e:
            logger.error(f"Error sending recommendations: {str(e)}")

    # Database operations
    @database_sync_to_async
    def check_room_access(self):
        """Check if room exists and if user has access permissions"""
        try:
            room = Room.objects.get(name=self.room_name)

            # First check if room is a DM
            if room.is_dm:
                # For DM rooms, we need to check if the current user is one of the participants
                # Extract usernames from room name (format: dm_username1_username2)
                parts = self.room_name.split('_')

                if len(parts) >= 3 and parts[0] == 'dm':
                    # Get the usernames from the room name
                    usernames = parts[1:]

                    # If user is authenticated and username is in the DM participants, allow access
                    if self.is_authenticated and self.user.username in usernames:
                        return {
                            'exists': True,
                            'is_protected': False,
                            'has_access': True,
                            'is_dm': True,
                            'other_username': next((u for u in usernames if u != self.user.username), None)
                        }
                    else:
                        # User is not a participant in this DM
                        logger.warning(f"DM access denied for {self.user.username if self.is_authenticated else 'anonymous'} to {self.room_name}")
                        return {
                            'exists': True,
                            'is_protected': False,
                            'has_access': False,
                            'is_dm': True
                        }
                else:
                    # Invalid DM room name format
                    logger.warning(f"Invalid DM room name format: {self.room_name}")
                    return {
                        'exists': True,
                        'is_protected': False,
                        'has_access': False,
                        'is_dm': True
                    }

            # Non-DM room, check for password protection
            return {
                'exists': True,
                'is_protected': room.is_protected,
                'has_access': True,  # Default access for non-DM rooms
                'is_dm': False
            }
        except Room.DoesNotExist:
            return {
                'exists': False,
                'is_protected': False,
                'has_access': False,
                'is_dm': False
            }

    @database_sync_to_async
    def save_message(self, content):
        try:
            room = Room.objects.get(name=self.room_name)
            message = Message.objects.create(
                user=self.user,
                room=room,
                content=content
            )

            # If this is a DM room, check if we need to notify the recipient
            if room.is_dm and self.is_authenticated:
                # Extract usernames from room name (format: dm_username1_username2)
                parts = self.room_name.split('_')
                if len(parts) >= 3 and parts[0] == 'dm':
                    # Get the usernames from the room name
                    usernames = parts[1:]

                    # Find the recipient (the other user, not the sender)
                    recipient_username = next((username for username in usernames if username != self.user.username), None)

                    if recipient_username:
                        # You could implement a notification system here to let the user know they have a message
                        # For now, we'll just log it
                        logger.info(f"DM sent to {recipient_username} from {self.user.username} in room {self.room_name}")

                        # Here you could add code to send an email or push notification
                        # For example:
                        # send_dm_notification(recipient_username, self.user.username, content)

            return message.id
        except Exception as e:
            logger.error(f"Error saving message: {str(e)}")
            raise

    @database_sync_to_async
    def toggle_reaction(self, message_id, emoji):
        try:
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
        except Exception as e:
            logger.error(f"Error toggling reaction: {str(e)}")
            raise

    async def update_user_presence(self):
        try:
            if not self.is_authenticated:
                return

            # Get Redis connection from channel layer
            redis = await self.channel_layer.redis()
            if redis:
                key = f"presence:{self.room_name}:{self.user.username}"
                await redis.set(key, "1", ex=65)  # 65s TTL
                logger.debug(f"Set user presence for {self.user.username} in {self.room_name}")
            else:
                logger.warning("Redis connection not available")
        except Exception as e:
            logger.error(f"Error updating user presence (Redis): {str(e)}")

    async def get_active_users(self):
        try:
            # Try Redis approach first
            try:
                redis = await self.channel_layer.redis()
                if redis:
                    pattern = f"presence:{self.room_name}:*"
                    keys = await redis.keys(pattern)
                    users = [key.decode().split(":")[-1] for key in keys]
                    logger.debug(f"Found {len(users)} active users in Redis for {self.room_name}")
                    return users
            except Exception as e:
                logger.error(f"Redis error getting active users: {str(e)}")

            # Fallback to database approach if Redis fails
            return await database_sync_to_async(self._get_active_users_db)()
        except Exception as e:
            logger.error(f"Error getting active users: {str(e)}")
            return []

    def _get_active_users_db(self):
        """Get active users from the database as fallback"""
        try:
            # Get users who sent messages in the last hour
            recent_time = timezone.now() - timedelta(hours=1)
            room = Room.objects.get(name=self.room_name)

            recent_users = Message.objects.filter(
                room=room,
                timestamp__gte=recent_time
            ).values_list('user__username', flat=True).distinct()

            # Add current user if authenticated
            users = list(set(recent_users))
            if self.is_authenticated and self.user.username not in users:
                users.append(self.user.username)

            logger.debug(f"Retrieved {len(users)} active users from DB for {self.room_name}")
            return users
        except Exception as e:
            logger.error(f"Database error getting active users: {str(e)}")
            return []

    @database_sync_to_async
    def get_active_users_for_disconnect(self):
        try:
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
            if self.is_authenticated and self.user.username in users:
                users.remove(self.user.username)

            return users
        except Exception as e:
            logger.error(f"Error getting active users for disconnect: {str(e)}")
            return []

    @database_sync_to_async
    def create_meetup(self, meetup_data):
        """Create a new meetup with your model structure"""
        try:
            from django.utils.dateparse import parse_datetime
            from django.core.exceptions import ValidationError

            # Get the room
            room = Room.objects.get(name=self.room_name)

            # Parse and validate datetime
            datetime_str = meetup_data.get('datetime')
            if not datetime_str:
                raise ValueError("Datetime is required")

            parsed_datetime = parse_datetime(datetime_str)
            if not parsed_datetime:
                raise ValueError("Invalid datetime format")

            # Check if datetime is in the future
            if parsed_datetime <= timezone.now():
                raise ValueError("Meetup datetime must be in the future")

            # Validate required fields
            title = meetup_data.get('title', '').strip()
            location = meetup_data.get('location', '').strip()
            description = meetup_data.get('description', '').strip()

            if not title:
                raise ValueError("Title is required")
            if not location:
                raise ValueError("Location is required")

            # Create the meetup (matching your model exactly)
            meetup = Meetup.objects.create(
                title=title,
                description=description if description else None,  # Your model allows null
                datetime=parsed_datetime,
                location=location,
                room=room,
                creator=self.user
            )

            # Add creator as attendee
            meetup.attendees.add(self.user)

            logger.info(f"Meetup created: ID={meetup.id}, Title='{title}', Creator={self.user.username}")
            return meetup.id

        except Room.DoesNotExist:
            logger.error(f"Room not found: {self.room_name}")
            raise ValueError("Room not found")
        except ValueError as e:
            logger.error(f"Validation error creating meetup: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error creating meetup: {str(e)}", exc_info=True)
            raise ValueError(f"Failed to create meetup: {str(e)}")

    @database_sync_to_async
    def get_meetups(self):
        """Get meetups for the room"""
        try:
            room = Room.objects.get(name=self.room_name)

            # Get upcoming meetups (including today)
            now = timezone.now()
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

            meetups = Meetup.objects.filter(
                room=room,
                datetime__gte=today_start
            ).order_by('datetime').select_related('creator').prefetch_related('attendees')

            result = []
            for meetup in meetups:
                try:
                    attendees = list(meetup.attendees.values_list('username', flat=True))

                    result.append({
                        'id': meetup.id,
                        'title': meetup.title,
                        'datetime': meetup.datetime.isoformat(),
                        'location': meetup.location,
                        'description': meetup.description or '',
                        'created_by': meetup.creator.username,
                        'attendees': attendees,
                        'attendee_count': len(attendees)
                    })
                except Exception as e:
                    logger.error(f"Error processing meetup {meetup.id}: {str(e)}")
                    continue

            logger.info(f"Retrieved {len(result)} meetups for room {self.room_name}")
            return result

        except Room.DoesNotExist:
            logger.error(f"Room not found when getting meetups: {self.room_name}")
            return []
        except Exception as e:
            logger.error(f"Error getting meetups: {str(e)}", exc_info=True)
            return []

    @database_sync_to_async
    def update_meetup_attendance(self, meetup_id, is_joining):
        try:
            meetup = Meetup.objects.get(id=meetup_id)

            if is_joining:
                meetup.attendees.add(self.user)
            else:
                meetup.attendees.remove(self.user)

            return True
        except Exception as e:
            logger.error(f"Error updating meetup attendance: {str(e)}")
            return False

    @database_sync_to_async
    def check_if_admin(self):
        """Check if the current user is an admin or room creator"""
        try:
            if not self.is_authenticated:
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
        except Exception as e:
            logger.error(f"Error checking if user is admin: {str(e)}")
            return False

    @database_sync_to_async
    def create_announcement(self, content):
        """Create a new announcement in the room"""
        try:
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
        except Exception as e:
            logger.error(f"Error creating announcement: {str(e)}")
            raise

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
            logger.warning(f"Announcement {announcement_id} not found when trying to mark as read")
            return False
        except Exception as e:
            logger.error(f"Error marking announcement as read: {str(e)}")
            return False

    @database_sync_to_async
    def get_active_announcements(self):
        """Get all active announcements for this room that the user hasn't read"""
        try:
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
        except Exception as e:
            logger.error(f"Error getting active announcements: {str(e)}")
            return []

    # Helper methods for formatting data
    async def get_room(self):
        """Get the current room object"""
        return await database_sync_to_async(self._get_room)()

    def _get_room(self):
        """Synchronous function to get room object"""
        try:
            return Room.objects.get(name=self.room_name)
        except Room.DoesNotExist:
            logger.error(f"Room not found: {self.room_name}")
            raise

    async def get_user_data_list(self, users_qs):
        """Get user data list"""
        return await database_sync_to_async(self._get_user_data_list)(users_qs)

    def _get_user_data_list(self, users_qs):
        """Synchronous function to convert users to data list"""
        try:
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
        except Exception as e:
            logger.error(f"Error creating user data list: {str(e)}")
            return []

    async def get_room_data_list(self, rooms_qs):
        """Get room data list"""
        return await database_sync_to_async(self._get_room_data_list)(rooms_qs)

    def _get_room_data_list(self, rooms_qs):
        """Synchronous function to convert rooms to data list"""
        try:
            return [
                {
                    'id': room.id,
                    'name': room.name,
                    'display_name': room.display_name or room.name,
                    'category': room.category.name if room.category else None,
                    'message_count': room.messages.count(),
                    'is_protected': room.is_protected,
                    'activity': 'high' if room.messages.count() > 50 else 'medium'  # Added activity indicator
                }
                for room in rooms_qs
            ]
        except Exception as e:
            logger.error(f"Error creating room data list: {str(e)}")
            return []

    def _get_recommendation_rooms(self):
        """Get room recommendations for the current user"""
        try:
            from django.db.models import Count

            # If user is authenticated, get personalized recommendations
            if self.is_authenticated:
                # Get rooms the user has already participated in
                user_rooms = Room.objects.filter(
                    messages__user=self.user
                ).distinct().values_list('id', flat=True)

                # Get recommendations - exclude rooms the user is already in and exclude DMs
                recommendations = Room.objects.filter(is_dm=False).exclude(
                    id__in=user_rooms
                ).annotate(
                    message_count=Count('messages')
                ).order_by('-message_count')[:5]

                return recommendations
            else:
                # For anonymous users, just return popular rooms - exclude DMs
                return Room.objects.filter(is_dm=False).annotate(
                    message_count=Count('messages')
                ).order_by('-message_count')[:5]
        except Exception as e:
            logger.error(f"Error getting recommendation rooms: {str(e)}")
            return []

    def _get_bookmarked_room_data(self):
        """Get bookmarked rooms data for the current user"""
        try:
            from django.db.models import Count

            if not self.is_authenticated:
                return []

            # Get bookmarked rooms
            bookmarks = RoomBookmark.objects.filter(
                user=self.user,
                is_bookmarked=True
            ).select_related('room', 'room__category')

            # Format for frontend
            result = []
            for bookmark in bookmarks:
                room = bookmark.room
                if not room:
                    continue

                # Count messages for this room
                message_count = Message.objects.filter(room=room).count()

                result.append({
                    'name': room.name,
                    'display_name': room.display_name or room.name.title(),
                    'category': room.category.name if room.category else None,
                    'message_count': message_count,
                    'activity': 'high' if message_count > 50 else 'medium',
                    'is_protected': getattr(room, 'is_protected', False)
                })

            return result
        except Exception as e:
            logger.error(f"Error getting bookmarked rooms: {str(e)}")
            return []
