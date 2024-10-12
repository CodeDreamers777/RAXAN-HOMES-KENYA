from rest_framework import serializers
from .models import (
    Profile,
    RentalProperty,
    PropertyForSale,
    PropertyImage,
    Amenity,
    UserType,
    Booking,
    Review,
    WishlistItem,
    Message,
    SubscriptionPlan,
)
from django.contrib.auth.models import User
import json
from django.db import transaction
from django.utils import timezone

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

            # Set the free subscription plan
            free_plan = SubscriptionPlan.objects.get(name="FREE")
            profile.subscription = free_plan
            profile.subscription_start_date = timezone.now()

        profile.save()

        return user


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = ["id", "name", "price", "properties_for_sale_limit"]


class ProfileSerializer(serializers.ModelSerializer):
    user_type = serializers.SerializerMethodField()

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
            "subscription",
            "subscription_start_date",
        ]
        read_only_fields = ["updated", "created", "user_type"]

    def get_user_type(self, obj):
        return obj.user.usertype.user_type

    def update(self, instance, validated_data):
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
    images = PropertyImageSerializer(many=True, read_only=True)
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(
            max_length=1000000, allow_empty_file=False, use_url=False
        ),
        write_only=True,
        required=False,
        source="images",
    )
    host = serializers.SerializerMethodField()
    amenities = serializers.ListField(
        child=serializers.CharField(), write_only=True, required=False
    )

    class Meta:
        abstract = True
        fields = [
            "id",
            "name",
            "description",
            "location",
            "property_type",
            "bedrooms",
            "bathrooms",
            "area",
            "amenities",
            "host",
            "images",
            "uploaded_images",
        ]

    def get_host(self, obj):
        return {"id": obj.host.id, "username": obj.host.username}

    def create(self, validated_data):
        amenities_data = validated_data.pop("amenities", [])
        uploaded_images = validated_data.pop("images", [])
        instance = super().create(validated_data)
        self._handle_amenities(instance, amenities_data)
        self._handle_images(instance, uploaded_images)
        return instance

    def update(self, instance, validated_data):
        amenities_data = validated_data.pop("amenities", None)
        uploaded_images = validated_data.pop("images", [])
        instance = super().update(instance, validated_data)
        if amenities_data is not None:
            self._handle_amenities(instance, amenities_data)
        self._handle_images(instance, uploaded_images)
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
            print(f"Processing amenity: {name}")
            amenity, _ = Amenity.objects.get_or_create(name=name)
            amenities.append(amenity)
        instance.amenities.set(amenities)
        print(f"Amenities set for property {instance.id}: {amenities}")

    def _handle_images(self, instance, image_files):
        print(f"Handling images for property {instance.id}")
        print(f"Number of image files: {len(image_files)}")
        for image_file in image_files:
            try:
                print(f"Attempting to save image: {image_file}")
                if isinstance(image_file, InMemoryUploadedFile):
                    print(f"Image file name: {image_file.name}")
                    print(f"Image file size: {image_file.size}")
                    print(f"Image file content type: {image_file.content_type}")

                    # Try to read the file content
                    file_content = image_file.read()
                    print(
                        f"Successfully read {len(file_content)} bytes from the image file"
                    )

                    # Important: Seek back to the beginning of the file
                    image_file.seek(0)

                    new_image = PropertyImage(property=instance, image=image_file)
                    new_image.save()
                    print(f"Image saved successfully with id: {new_image.id}")
                else:
                    print(f"Unexpected type for image_file: {type(image_file)}")
            except Exception as e:
                print(f"Error saving image: {str(e)}")
                import traceback

                print(traceback.format_exc())

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation["amenities"] = AmenitySerializer(
            instance.amenities.all(), many=True
        ).data
        return representation


class RentalPropertySerializer(BasePropertySerializer):
    class Meta(BasePropertySerializer.Meta):
        model = RentalProperty
        fields = BasePropertySerializer.Meta.fields + [
            "price_per_month",
            "number_of_units",
            "is_available",
        ]


class PropertyForSaleSerializer(BasePropertySerializer):
    class Meta(BasePropertySerializer.Meta):
        model = PropertyForSale
        fields = BasePropertySerializer.Meta.fields + ["price", "is_sold", "year_built"]


class ReviewSerializer(serializers.ModelSerializer):
    property_name = serializers.SerializerMethodField()
    reviewer_name = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = [
            "id",
            "property_name",
            "reviewer_name",
            "rating",
            "comment",
            "created_at",
        ]

    def get_property_name(self, obj):
        return str(obj.property)

    def get_reviewer_name(self, obj):
        return obj.reviewer.user.username


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
