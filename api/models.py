from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    phone_number = models.CharField(max_length=20)
    email = models.EmailField(default="example@example.com")
    profile_picture = models.ImageField(
        upload_to="profile_pictures", blank=True, null=True
    )
    updated = models.DateTimeField(auto_now=True)
    created = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.user.username

    @receiver(post_save, sender=User)
    def create_user_profile(sender, instance, created, **kwargs):
        if created:
            Profile.objects.create(user=instance)

    @receiver(post_save, sender=User)
    def save_user_profile(sender, instance, **kwargs):
        instance.profile.save()


class Property(models.Model):
    name = models.CharField(max_length=100)
    location = models.CharField(max_length=1000)
    price = models.IntegerField()
    availability = models.BooleanField()
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE)


class images(models.Model):
    image = models.ImageField()
    property = models.ForeignKey(Property, on_delete=models.CASCADE)
