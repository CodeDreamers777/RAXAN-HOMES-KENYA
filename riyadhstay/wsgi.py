import os
import django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import path

# Set the Django settings module
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "riyadhstay.settings")

# Initialize Django
django.setup()

# Import your consumer after Django setup
from api.utils.consumers import MessageConsumer


# Create the application
application = ProtocolTypeRouter(
    {
        "http": get_asgi_application(),
        "websocket": AuthMiddlewareStack(
            URLRouter(
                [
                    path("ws/messages/", MessageConsumer.as_asgi()),
                ]
            )
        ),
    }
)
