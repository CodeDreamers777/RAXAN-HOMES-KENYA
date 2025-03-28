import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)


class MessageConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Extract token from query string
        try:
            # Modify this line to match how you're passing the token
            token_str = self.scope["query_string"].decode("utf-8").split("=")[-1]

            # Validate the token
            validated_token = AccessToken(token_str)
            user_id = validated_token["user_id"]

            # Get the user
            User = get_user_model()
            user = await self.get_user(user_id)

            if user:
                # Generate a group name based on user ID
                self.group_name = f"user_{user_id}_messages"

                # Join the group
                await self.channel_layer.group_add(self.group_name, self.channel_name)

                # Accept the connection
                await self.accept()
                logger.info(f"WebSocket connected for user {user_id}")
            else:
                await self.close(code=4003)  # Forbidden

        except Exception as e:
            logger.error(f"Connection error: {e}")
            await self.close(code=4001)  # Unauthorized

    @database_sync_to_async
    def get_user(self, user_id):
        User = get_user_model()
        try:
            return User.objects.get(id=user_id)
        except User.DoesNotExist:
            return None

    async def disconnect(self, close_code):
        # Leave group when WebSocket disconnects
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_message(self, event):
        # Send message to WebSocket
        message = event["message"]
        await self.send(text_data=json.dumps({"message": message}))
