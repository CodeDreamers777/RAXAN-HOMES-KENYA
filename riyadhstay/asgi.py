import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter
from api.utils.routing import application as routing_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "riyadhstay.settings")

# Get the Django WSGI application
django_application = get_asgi_application()

# Create a combined application that handles both HTTP and WebSocket
application = ProtocolTypeRouter(
    {
        "http": django_application,
        "websocket": routing_application,
    }
)
