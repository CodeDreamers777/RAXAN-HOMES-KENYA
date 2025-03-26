from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import re_path
from api.utils.consumers import MessageConsumer

application = ProtocolTypeRouter(
    {
        "websocket": AuthMiddlewareStack(
            URLRouter(
                [
                    re_path(r"^ws/messages/$", MessageConsumer.as_asgi()),
                ]
            )
        ),
    }
)
