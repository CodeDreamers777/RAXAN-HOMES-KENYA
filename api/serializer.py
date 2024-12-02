from rest_framework import serializers
from .models import (
    Profile,
    RentalProperty,
    PropertyForSale,
    PerNightProperty,
    PerNightBooking,
    PropertyImage,
    Amenity,
    UserType,
    Booking,
    Review,
    WishlistItem,
    Message,
    BookForSaleViewing,
)
from django.contrib.auth.models import User
import json
from django.db import transaction
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from django.db.models import Avg

from cloudinary.uploader import upload
from django.core.files.uploadedfile import InMemoryUploadedFile


class SignupSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    email = serializers.EmailField()
    phone_number = serializers.CharField(max_length=20)
    profile_picture = serializers.ImageField(required=False)
    user_type = serializers.ChoiceField(choices=UserType.USER_TYPES)
    identification_type = serializers.ChoiceField(
        choices=Profile.IDENTIFICATION_CHOICES, required=False, allow_null=True
    )
    identification_number = serializers.CharField(
        max_length=50, required=False, allow_null=True
    )

    def validate(self, data):
        if data["password"] != data["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match"}
            )
        if User.objects.filter(username=data["username"]).exists():
            raise serializers.ValidationError({"username": "Username already exists"})
        if User.objects.filter(email=data["email"]).exists():
            raise serializers.ValidationError({"email": "Email already exists"})
        # Check identification only for sellers
        if data["user_type"] == "SELLER":
            if not data.get("identification_type"):
                raise serializers.ValidationError(
                    {
                        "identification_type": "Identification type is required for sellers"
                    }
                )
            if not data.get("identification_number"):
                raise serializers.ValidationError(
                    {
                        "identification_number": "Identification number is required for sellers"
                    }
                )
        else:
            # For non-sellers, remove identification fields if they are null
            data.pop("identification_type", None)
            data.pop("identification_number", None)
        return data

    @transaction.atomic
    def create(self, validated_data):
        username = validated_data["username"]
        email = validated_data["email"]
        password = validated_data["password"]
        phone_number = validated_data["phone_number"]
        profile_picture = validated_data.get("profile_picture")
        user_type = validated_data["user_type"]

        # Create User
        user = User.objects.create_user(
            username=username, email=email, password=password
        )

        # Create UserType
        UserType.objects.create(user=user, user_type=user_type)

        # Update Profile
        profile = Profile.objects.get(user=user)
        profile.username = username
        profile.email = email
        profile.phone_number = phone_number
        if profile_picture:
            profile.profile_picture = profile_picture
        if user_type == "SELLER":
            profile.is_seller = True
            if not validated_data.get("identification_type") or not validated_data.get(
                "identification_number"
            ):
                raise serializers.ValidationError(
                    "Sellers must provide identification information."
                )
            profile.identification_type = validated_data.get("identification_type")
            profile.identification_number = validated_data.get("identification_number")
            # Remove the automatic subscription assignment
        profile.save()
        return user


class ProfileSerializer(serializers.ModelSerializer):
    user_type = serializers.SerializerMethodField()
    username = serializers.CharField(source="user.username")

    class Meta:
        model = Profile
        fields = [
            "id",
            "phone_number",
            "email",
            "profile_picture",
            "updated",
            "created",
            "username",
            "user_type",
            "identification_type",
            "identification_number",
            "is_seller",
        ]
        read_only_fields = ["updated", "created", "user_type"]

    def get_user_type(self, obj):
        return obj.user.usertype.user_type

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        if "username" in user_data:
            instance.user.username = user_data["username"]
            instance.user.save()

        instance.phone_number = validated_data.get(
            "phone_number", instance.phone_number
        )
        instance.email = validated_data.get("email", instance.email)
        if "profile_picture" in validated_data:
            instance.profile_picture = validated_data["profile_picture"]
        if instance.user.usertype.user_type == "SELLER":
            instance.identification_type = validated_data.get(
                "identification_type", instance.identification_type
            )
            instance.identification_number = validated_data.get(
                "identification_number", instance.identification_number
            )
        instance.save()
        return instance


class PropertyImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PropertyImage
        fields = ["id", "image"]


class AmenitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Amenity
        fields = ["id", "name"]


class BasePropertySerializer(serializers.ModelSerializer):
    images = serializers.ListField(
        child=serializers.URLField(),
        required=False,
    )
    host = serializers.SerializerMethodField()
    amenities = serializers.ListField(
        child=serializers.CharField(), write_only=True, required=False
    )
    latitude = serializers.DecimalField(
        max_digits=30, decimal_places=20, required=False, allow_null=True
    )
    longitude = serializers.DecimalField(
        max_digits=30, decimal_places=20, required=False, allow_null=True
    )
    rating = serializers.SerializerMethodField()

    class Meta:
        abstract = True
        fields = [
            "id",
            "name",
            "description",
            "location",
            "latitude",
            "longitude",
            "property_type",
            "bedrooms",
            "bathrooms",
            "area",
            "amenities",
            "host",
            "images",
            "rating",
        ]

    def get_host(self, obj):
        return {"id": obj.host.id, "username": obj.host.username}

    def get_rating(self, obj):
        from django.contrib.contenttypes.models import ContentType

        content_type = ContentType.objects.get_for_model(obj)
        reviews = Review.objects.filter(content_type=content_type, object_id=obj.id)
        if reviews.exists():
            return round(reviews.aggregate(Avg("rating"))["rating__avg"], 1)
        return None

    def create(self, validated_data):
        image_urls = validated_data.pop("images", [])
        amenities_data = validated_data.pop("amenities", [])
        instance = super().create(validated_data)
        self._handle_amenities(instance, amenities_data)
        self._save_images(instance, image_urls)
        return instance

    def update(self, instance, validated_data):
        image_urls = validated_data.pop("images", [])
        amenities_data = validated_data.pop("amenities", None)
        instance = super().update(instance, validated_data)
        if amenities_data is not None:
            self._handle_amenities(instance, amenities_data)
        self._save_images(instance, image_urls)
        return instance

    def _handle_amenities(self, instance, amenities_data):
        print(f"Handling amenities: {amenities_data}")
        if isinstance(amenities_data, str):
            try:
                amenities_data = json.loads(amenities_data)
            except json.JSONDecodeError:
                amenities_data = [amenities_data]

        if (
            isinstance(amenities_data, list)
            and len(amenities_data) == 1
            and isinstance(amenities_data[0], str)
        ):
            try:
                amenities_data = json.loads(amenities_data[0])
            except json.JSONDecodeError:
                pass  # Keep it as is if it's not a valid JSON string

        amenities = []
        for name in amenities_data:
            name = name.strip().lower()
            amenity, _ = Amenity.objects.get_or_create(name=name)
            amenities.append(amenity)
        instance.amenities.set(amenities)

    def _save_images(self, instance, image_urls):
        """
        Saves provided image URLs to the `PropertyImage` model linked to the property.
        """
        print(f"Saving images for property {instance.id}: {image_urls}")

        if not image_urls:
            print("No images provided.")
            return

        content_type = ContentType.objects.get_for_model(instance)
        for image_url in image_urls:
            PropertyImage.objects.create(
                property=instance,
                image=image_url,
                content_type=content_type,
                object_id=instance.id,
            )
        print("Images saved successfully.")

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation["images"] = [
            image.image for image in PropertyImage.objects.filter(object_id=instance.id)
        ]
        representation["amenities"] = AmenitySerializer(
            instance.amenities.all(), many=True
        ).data
        return representation


class RentalPropertySerializer(BasePropertySerializer):
    is_featured = serializers.SerializerMethodField()
    total_price = serializers.SerializerMethodField()

    class Meta(BasePropertySerializer.Meta):
        model = RentalProperty
        fields = BasePropertySerializer.Meta.fields + [
            "price_per_month",
            "deposit",
            "number_of_units",
            "is_available",
            "is_featured",
            "total_price",
        ]

    def get_is_featured(self, obj):
        return obj.is_featured

    def get_total_price(self, obj):
        # Handle case where deposit might be None
        deposit = obj.deposit or 0
        return deposit + obj.price_per_month


class PropertyForSaleSerializer(BasePropertySerializer):
    is_featured = serializers.SerializerMethodField()

    class Meta(BasePropertySerializer.Meta):
        model = PropertyForSale
        fields = BasePropertySerializer.Meta.fields + [
            "price",
            "is_sold",
            "year_built",
            "is_featured",
        ]

    def get_is_featured(self, obj):
        return obj.is_featured


class WishlistItemSerializer(serializers.ModelSerializer):
    property_name = serializers.CharField(source="property.name")
    property_type = serializers.CharField(source="content_type.model")
    username = serializers.CharField(source="profile.user.username")

    class Meta:
        model = WishlistItem
        fields = ["id", "property_name", "property_type", "added_at", "username"]


class BookingSerializer(serializers.ModelSerializer):
    client_email = serializers.EmailField(source="client.user.email", read_only=True)
    property_name = serializers.CharField(source="property.name", read_only=True)
    property_id = serializers.CharField(source="property.id", read_only=True)

    class Meta:
        model = Booking
        fields = [
            "id",
            "property_id",
            "property_name",
            "client_email",
            "total_price",
            "is_confirmed",
            "created_at",
        ]


class MessageSerializer(serializers.ModelSerializer):
    sender = ProfileSerializer(read_only=True)
    receiver = ProfileSerializer(read_only=True)

    class Meta:
        model = Message
        fields = ["id", "sender", "receiver", "content", "timestamp", "is_read"]
        read_only_fields = ["timestamp", "is_read"]


class MessageCreateSerializer(serializers.ModelSerializer):
    receiver_id = serializers.IntegerField(write_only=True)

    class Meta:
        model = Message
        fields = ["receiver_id", "content"]

    def create(self, validated_data):
        sender = self.context["request"].user.profile
        receiver_id = validated_data.pop("receiver_id")
        receiver = Profile.objects.get(id=receiver_id)
        return Message.objects.create(
            sender=sender, receiver=receiver, **validated_data
        )


class ReviewerSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username")
    profile_picture = serializers.ImageField(read_only=True)

    class Meta:
        model = Profile
        fields = ["username", "profile_picture"]


class ReviewSerializer(serializers.ModelSerializer):
    reviewer = ReviewerSerializer(read_only=True)

    class Meta:
        model = Review
        fields = ["id", "reviewer", "rating", "comment", "created_at"]
        read_only_fields = ["reviewer", "created_at"]

    def validate(self, data):
        request = self.context.get("request")
        if request and request.method == "POST":
            content_type = ContentType.objects.get_for_model(self.context["property"])
            if Review.objects.filter(
                reviewer=request.user.profile,
                content_type=content_type,
                object_id=self.context["property"].id,
            ).exists():
                raise serializers.ValidationError(
                    "You have already reviewed this property."
                )
        return data


class EmailSerializer(serializers.Serializer):
    to_email = serializers.EmailField()
    to_name = serializers.CharField(max_length=100)
    subject = serializers.CharField(max_length=200)
    html_content = serializers.CharField()


class OTPEmailSerializer(serializers.Serializer):
    to_email = serializers.EmailField()
    to_name = serializers.CharField(max_length=100)
    otp_code = serializers.CharField(max_length=6)
    expiry_minutes = serializers.IntegerField(default=5)


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)
    new_password = serializers.CharField(min_length=8, write_only=True)


# Add new serializer for OTP verification
class OTPVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6, min_length=6)


class BookForSaleViewingSerializer(serializers.ModelSerializer):
    property_name = serializers.CharField(source="property.name", read_only=True)
    client_name = serializers.CharField(source="client.user.username", read_only=True)

    class Meta:
        model = BookForSaleViewing
        fields = [
            "id",
            "property",
            "property_name",
            "client",
            "client_name",
            "viewing_date",
            "status",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["status", "client", "created_at", "updated_at"]

    def validate_property(self, value):
        try:
            property_obj = PropertyForSale.objects.get(pk=value.id)
            if property_obj.is_sold:
                raise serializers.ValidationError("This property is already sold")
            return value
        except PropertyForSale.DoesNotExist:
            raise serializers.ValidationError("Invalid property selected")

    def validate_viewing_date(self, value):
        if value < timezone.now():
            raise serializers.ValidationError("Viewing date must be in the future")
        return value

    def validate(self, data):
        # Check for existing bookings at the same time
        if "property" in data and "viewing_date" in data:
            existing_booking = BookForSaleViewing.objects.filter(
                property=data["property"], viewing_date=data["viewing_date"]
            ).exists()
            if existing_booking:
                raise serializers.ValidationError(
                    {
                        "viewing_date": "There is already a viewing scheduled at this time"
                    }
                )
        return data


class PerNightPropertySerializer(serializers.ModelSerializer):
    images = serializers.SerializerMethodField()
    is_featured = serializers.SerializerMethodField()

    host_username = serializers.CharField(source="host.user.username", read_only=True)
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(
            max_length=1000000, allow_empty_file=False, use_url=False
        ),
        write_only=True,
        required=False,
    )
    amenities = serializers.ListField(
        child=serializers.CharField(), write_only=True, required=False
    )
    rating = serializers.SerializerMethodField()

    class Meta:
        model = PerNightProperty
        fields = [
            "id",
            "name",
            "description",
            "location",
            "latitude",
            "longitude",
            "property_type",
            "bedrooms",
            "bathrooms",
            "area",
            "host_username",
            "price_per_night",
            "is_featured",
            "number_of_units",
            "property_style",
            "check_in_time",
            "check_out_time",
            "min_nights",
            "max_nights",
            "is_available",
            "created_at",
            "images",
            "uploaded_images",
            "amenities",
            "rating",
        ]
        read_only_fields = ["created_at", "host"]

    def get_images(self, obj):
        images = obj.images()
        return [
            {"id": image.id, "image": image.image.url if image.image else None}
            for image in images
        ]

    def get_is_featured(self, obj):
        return obj.is_featured

    def get_rating(self, obj):
        from django.contrib.contenttypes.models import ContentType
        from django.db.models import Avg

        content_type = ContentType.objects.get_for_model(obj)
        reviews = Review.objects.filter(content_type=content_type, object_id=obj.id)
        if reviews.exists():
            return round(reviews.aggregate(Avg("rating"))["rating__avg"], 1)
        return None

    def create(self, validated_data):
        # Extract images and amenities data
        uploaded_images = validated_data.pop("uploaded_images", [])
        amenities_data = validated_data.pop("amenities", [])

        # Create property instance
        property = PerNightProperty.objects.create(**validated_data)

        # Handle amenities
        for amenity_name in amenities_data:
            amenity, _ = Amenity.objects.get_or_create(
                name=amenity_name.strip().lower()
            )
            property.amenities.add(amenity)

        # Handle images
        content_type = ContentType.objects.get_for_model(PerNightProperty)
        for image in uploaded_images:
            PropertyImage.objects.create(
                image=image, content_type=content_type, object_id=property.id
            )

        return property

    def update(self, instance, validated_data):
        # Extract images and amenities data
        uploaded_images = validated_data.pop("uploaded_images", [])
        amenities_data = validated_data.pop("amenities", None)

        # Update property instance
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update amenities if provided
        if amenities_data is not None:
            instance.amenities.clear()
            for amenity_name in amenities_data:
                amenity, _ = Amenity.objects.get_or_create(
                    name=amenity_name.strip().lower()
                )
                instance.amenities.add(amenity)

        # Add new images
        if uploaded_images:
            content_type = ContentType.objects.get_for_model(PerNightProperty)
            for image in uploaded_images:
                PropertyImage.objects.create(
                    image=image, content_type=content_type, object_id=instance.id
                )

        return instance

    def validate_min_nights(self, value):
        if value < 1:
            raise serializers.ValidationError("Minimum nights must be at least 1")
        return value

    def validate(self, data):
        if "max_nights" in data and data["max_nights"]:
            if data["max_nights"] < data.get("min_nights", 1):
                raise serializers.ValidationError(
                    {
                        "max_nights": "Maximum nights must be greater than or equal to minimum nights"
                    }
                )
        return data

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation["amenities"] = AmenitySerializer(
            instance.amenities.all(), many=True
        ).data
        return representation


class PerNightBookingSerializer(serializers.ModelSerializer):
    property_name = serializers.CharField(source="property.name", read_only=True)
    property_id = serializers.CharField(source="property.id", read_only=True)
    host_username = serializers.CharField(
        source="property.host.user.username", read_only=True
    )
    client_email = serializers.EmailField(source="client.user.email", read_only=True)
    client_phone_number = serializers.CharField(
        source="client.phone_number", read_only=True
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = PerNightBooking
        fields = [
            "id",
            "property",
            "property_id",
            "property_name",
            "host_username",
            "client_email",
            "client_phone_number",
            "check_in_date",
            "check_out_date",
            "total_nights",
            "total_price",
            "status",
            "status_display",
            "guests",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]
