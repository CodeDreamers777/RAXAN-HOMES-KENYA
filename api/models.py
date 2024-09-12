from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.validators import RegexValidator


class UserType(models.Model):
    USER_TYPES = [
        ("CLIENT", "Client"),
        ("SELLER", "Seller"),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    user_type = models.CharField(max_length=10, choices=USER_TYPES)

    def __str__(self):
        return f"{self.user.username} - {self.get_user_type_display()}"


class Profile(models.Model):
    IDENTIFICATION_CHOICES = [
        ("ID", "National ID"),
        ("PASSPORT", "Passport"),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    phone_number = models.CharField(max_length=20)
    email = models.EmailField(default="example@example.com")
    username = models.CharField(max_length=100, null=True)
    profile_picture = models.ImageField(
        upload_to="profile_pictures", blank=True, null=True
    )
    updated = models.DateTimeField(auto_now=True)
    created = models.DateTimeField(auto_now_add=True)

    # Fields for sellers only
    identification_type = models.CharField(
        max_length=8, choices=IDENTIFICATION_CHOICES, null=True, blank=True
    )
    identification_number = models.CharField(
        max_length=50,
        validators=[
            RegexValidator(
                regex=r"^[A-Za-z0-9-]*$",
                message="Identification number must contain only letters, numbers, and hyphens.",
            ),
        ],
        null=True,
        blank=True,
    )

    def __str__(self):
        return self.user.username

    def save(self, *args, **kwargs):
        if hasattr(self.user, "usertype") and self.user.usertype.user_type == "SELLER":
            if not self.identification_type or not self.identification_number:
                raise ValueError("Sellers must provide identification information.")
        super().save(*args, **kwargs)


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)
        UserType.objects.create(user=instance, user_type="CLIENT")  # Default to CLIENT


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()


class Amenity(models.Model):
    name = models.CharField(max_length=50)

    def __str__(self):
        return self.name


class BaseProperty(models.Model):
    PROPERTY_TYPES = [
        ("APT", "Apartment"),
        ("HOUSE", "House"),
        ("VILLA", "Villa"),
        ("OTHER", "Other"),
    ]

    name = models.CharField(max_length=100)
    description = models.TextField()
    location = models.CharField(max_length=1000)
    property_type = models.CharField(
        max_length=5, choices=PROPERTY_TYPES, default="OTHER"
    )
    bedrooms = models.PositiveIntegerField()
    bathrooms = models.PositiveIntegerField()
    area = models.DecimalField(
        max_digits=10, decimal_places=2, help_text="Area in square meters"
    )
    amenities = models.ManyToManyField(Amenity)
    host = models.ForeignKey(Profile, on_delete=models.CASCADE)

    class Meta:
        abstract = True

    def __str__(self):
        return self.name

    def delete(self, *args, **kwargs):
        # Delete associated images
        PropertyImage.objects.filter(
            content_type=ContentType.objects.get_for_model(self), object_id=self.id
        ).delete()
        # Call the "real" delete() method
        super().delete(*args, **kwargs)


class RentalProperty(BaseProperty):
    price_per_month = models.DecimalField(max_digits=10, decimal_places=2)
    max_guests = models.PositiveIntegerField()
    is_available = models.BooleanField(default=True)

    def images(self):
        return PropertyImage.objects.filter(
            content_type=ContentType.objects.get_for_model(self), object_id=self.id
        )


class PropertyForSale(BaseProperty):
    price = models.DecimalField(max_digits=12, decimal_places=2)
    is_sold = models.BooleanField(default=False)
    year_built = models.PositiveIntegerField(null=True, blank=True)

    def images(self):
        return PropertyImage.objects.filter(
            content_type=ContentType.objects.get_for_model(self), object_id=self.id
        )


class PropertyImage(models.Model):
    image = models.ImageField(upload_to="property_images")
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    property = GenericForeignKey("content_type", "object_id")

    def __str__(self):
        return f"Image for {self.property}"


class Booking(models.Model):
    property = models.ForeignKey(RentalProperty, on_delete=models.CASCADE)
    client = models.ForeignKey(Profile, on_delete=models.CASCADE)
    check_in_date = models.DateField()
    check_out_date = models.DateField()
    guests = models.PositiveIntegerField()
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    is_confirmed = models.BooleanField(default=False)

    def __str__(self):
        return f"Booking for {self.property.name} by {self.client.user.username}"


class Review(models.Model):
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    property = GenericForeignKey("content_type", "object_id")
    reviewer = models.ForeignKey(Profile, on_delete=models.CASCADE)
    rating = models.PositiveIntegerField()
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Review for {self.property} by {self.reviewer.user.username}"


class RentalPricingPeriod(models.Model):
    property = models.ForeignKey(RentalProperty, on_delete=models.CASCADE)
    start_date = models.DateField()
    end_date = models.DateField()
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"Pricing for {self.property.name} from {self.start_date} to {self.end_date}"
