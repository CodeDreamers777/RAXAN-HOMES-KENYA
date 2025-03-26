from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from channels.routing import get_default_application

urlpatterns = [path("admin/", admin.site.urls), path("api/v1/", include("api.urls"))]

# Ensure this is set for Channels
application = get_default_application()
