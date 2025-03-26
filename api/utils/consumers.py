import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import User
from api.models import Message


class MessageConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Get the user ID from the WebSocket scope
        self.user_id = self.scope["user"].id
        self.group_name = f"user_{self.user_id}_messages"

        # Join user-specific group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        # Leave group when WebSocket disconnects
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_message(self, event):
        # Send message to WebSocket
        message = event["message"]
        await self.send(
            text_data=json.dumps({"type": "new_message", "message": message})
        )

    @database_sync_to_async
    def get_unread_count(self, user_id):
        # Assuming you have a method to count unread messages
        return Message.objects.filter(receiver__user__id=user_id, is_read=False).count()
