import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model


class MessageConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Extract token from query string
        token_str = self.scope["query_string"].decode("utf-8").split("=")[-1]

        try:
            # Validate the token
            validated_token = AccessToken(token_str)
            user_id = validated_token["user_id"]

            # Get the user
            User = get_user_model()
            user = await self.get_user(user_id)

            if user:
                # Add user to the scope
                self.scope["user"] = user

                # Generate a group name based on user ID
                self.group_name = f"user_{user_id}_messages"

                # Join the group
                await self.channel_layer.group_add(self.group_name, self.channel_name)

                # Accept the connection
                await self.accept()
                print(f"WebSocket connected for user {user_id}")
            else:
                await self.close()
        except Exception as e:
            print(f"Authentication failed: {e}")
            await self.close()

    @database_sync_to_async
    def get_user(self, user_id):
        User = get_user_model()
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None

    async def disconnect(self, close_code):
        # Leave group when WebSocket disconnects
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        # Handle incoming messages
        try:
            data = json.loads(text_data)
            print(f"Received data: {data}")
        except json.JSONDecodeError:
            print("Invalid JSON received")
