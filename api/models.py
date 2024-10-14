from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.db.models.signals import pre_delete
from django.dispatch import receiver
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.core.validators import RegexValidator
from django.utils import timezone
from django.db.models import Count


class UserType(models.Model):
    USER_TYPES = [
        ("CLIENT", "Client"),
        ("SELLER", "Seller"),
    ]
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    user_type = models.CharField(max_length=10, choices=USER_TYPES)

    def __str__(self):
        return f"{self.user.username} - {self.get_user_type_display()}"


class SubscriptionPlan(models.Model):
    PLAN_TYPES = [
        ("BASIC", "Basic"),
        ("STANDARD", "Standard"),
        ("PREMIUM", "Premium"),
    ]
    name = models.CharField(max_length=20, choices=PLAN_TYPES)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    properties_for_sale_limit = models.PositiveIntegerField(
        help_text="Number of properties for sale allowed per month. Use 0 for unlimited."
    )

    def __str__(self):
        return self.name


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
    is_seller = models.BooleanField(default=False)
    subscription = models.ForeignKey(
        SubscriptionPlan, on_delete=models.SET_NULL, null=True, blank=True
    )
    subscription_start_date = models.DateTimeField(null=True, blank=True)
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
    updated = models.DateTimeField(auto_now=True)
    created = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.user.username

    def save(self, *args, **kwargs):
        # Remove the validation check from here
        super().save(*args, **kwargs)

    def can_add_property_for_sale(self):
        if not self.is_seller or not self.subscription:
            return False
        if self.subscription.name == "PREMIUM":
            return True

        start_of_month = timezone.now().replace(
            day=1, hour=0, minute=0, second=0, microsecond=0
        )
        properties_this_month = PropertyForSale.objects.filter(
            host=self, created_at__gte=start_of_month
        ).count()

        return properties_this_month < self.subscription.properties_for_sale_limit

    def can_add_rental_property(self):
        return self.is_seller  # Sellers can always add rental properties for free


@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_user_profile(sender, instance, **kwargs):
    instance.profile.save()


@receiver(post_save, sender=UserType)
def update_profile_seller_status(sender, instance, **kwargs):
    if instance.user_type == "SELLER":
        profile = Profile.objects.get(user=instance.user)
        profile.is_seller = True
        standard_plan = SubscriptionPlan.objects.get(name="STANDARD")
        profile.subscription = standard_plan
        profile.subscription_start_date = timezone.now()


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
    latitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
    longitude = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True
    )
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
    created_at = models.DateTimeField(default=timezone.now)

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
    number_of_units = models.PositiveIntegerField()
    is_available = models.BooleanField(default=True)

    def images(self):
        return PropertyImage.objects.filter(
            content_type=ContentType.objects.get_for_model(self), object_id=self.id
        )

    def save(self, *args, **kwargs):
        if not self.pk:  # New property being created
            if not self.host.can_add_rental_property():
                raise ValueError("Only sellers can add rental properties.")
        super().save(*args, **kwargs)


class PropertyForSale(BaseProperty):
    price = models.DecimalField(max_digits=12, decimal_places=2)
    is_sold = models.BooleanField(default=False)
    year_built = models.PositiveIntegerField(null=True, blank=True)

    def images(self):
        return PropertyImage.objects.filter(
            content_type=ContentType.objects.get_for_model(self), object_id=self.id
        )

    def save(self, *args, **kwargs):
        if not self.pk:  # New property being created
            if not self.host.subscription:
                raise ValueError("You need a subscription to add properties for sale.")
            if not self.host.can_add_property_for_sale():
                raise ValueError(
                    "You have reached your limit for properties for sale this month."
                )
        super().save(*args, **kwargs)


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
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    is_confirmed = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)

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


class WishlistItem(models.Model):
    profile = models.ForeignKey(
        Profile, on_delete=models.CASCADE, related_name="wishlist_items"
    )
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    property = GenericForeignKey("content_type", "object_id")
    added_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("profile", "content_type", "object_id")

    def __str__(self):
        return f"{self.profile.user.username}'s wishlist item: {self.property}"


@receiver(pre_delete, sender=RentalProperty)
@receiver(pre_delete, sender=PropertyForSale)
def remove_from_wishlists(sender, instance, **kwargs):
    content_type = ContentType.objects.get_for_model(sender)
    WishlistItem.objects.filter(
        content_type=content_type, object_id=instance.id
    ).delete()


class Message(models.Model):
    sender = models.ForeignKey(
        Profile, on_delete=models.CASCADE, related_name="sent_messages"
    )
    receiver = models.ForeignKey(
        Profile, on_delete=models.CASCADE, related_name="received_messages"
    )
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)

    class Meta:
        ordering = ["timestamp"]

    def __str__(self):
        return f"Message from {self.sender} to {self.receiver} at {self.timestamp}"


class Payment(models.Model):
    profile = models.ForeignKey(Profile, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    reference = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment of {self.amount} by {self.profile.user.username}"
