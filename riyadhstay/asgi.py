import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import re_path
from channels.layers import get_channel_layer

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "riyadhstay.settings")

# Get the Django ASGI application
django_application = get_asgi_application()

# Import consumer after Django setup
from api.utils.consumers import MessageConsumer

# Create the combined application
application = ProtocolTypeRouter(
    {
        "http": django_application,
        "websocket": AuthMiddlewareStack(
            URLRouter(
                [
                    re_path(r"^ws/messages/$", MessageConsumer.as_asgi()),
                ]
            )
        ),
    }
)

# Ensure channel layer is initialized
channel_layer = get_channel_layer()
