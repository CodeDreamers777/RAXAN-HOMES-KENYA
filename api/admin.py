from django.contrib import admin
from .models import Profile, Property, images


profiles = (admin.site.register(Profile),)
images = (admin.site.register(images),)
properties = (admin.site.register(Property),)
