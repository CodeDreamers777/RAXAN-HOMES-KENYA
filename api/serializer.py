from rest_framework import serializers
from .models import Profile, RentalProperty, PropertyForSale, PropertyImage, Amenity, UserType
from django.contrib.auth.models import User
import json
from django.core.files.uploadedfile import InMemoryUploadedFile

class SignupSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    email = serializers.EmailField()
    phone_number = serializers.CharField(max_length=20)
    profile_picture = serializers.ImageField(required=False)
    user_type = serializers.ChoiceField(choices=UserType.USER_TYPES)
    identification_type = serializers.ChoiceField(choices=Profile.IDENTIFICATION_CHOICES, required=False)
    identification_number = serializers.CharField(max_length=50, required=False)

    def validate(self, data):
        if data["password"] != data["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match"})
        if User.objects.filter(username=data["username"]).exists():
            raise serializers.ValidationError({"username": "Username already exists"})
        if User.objects.filter(email=data["email"]).exists():
            raise serializers.ValidationError({"email": "Email already exists"})
        if data["user_type"] == "SELLER" and (not data.get("identification_type") or not data.get("identification_number")):
            raise serializers.ValidationError({"identification": "Sellers must provide identification information"})
        return data

    def create(self, validated_data):
        username = validated_data["username"]
        email = validated_data["email"]
        password = validated_data["password"]
        phone_number = validated_data["phone_number"]
        profile_picture = validated_data.get("profile_picture")
        user_type = validated_data["user_type"]
        identification_type = validated_data.get("identification_type")
        identification_number = validated_data.get("identification_number")

        user = User.objects.create_user(username=username, email=email, password=password)

        UserType.objects.create(user=user, user_type=user_type)

        profile = Profile.objects.get(user=user)
        profile.username = username
        profile.email = email
        profile.phone_number = phone_number
        if profile_picture:
            profile.profile_picture = profile_picture
        if user_type == "SELLER":
            profile.identification_type = identification_type
            profile.identification_number = identification_number
        profile.save()

        return user

class ProfileSerializer(serializers.ModelSerializer):
    user_type = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            "phone_number",
            "email",
            "profile_picture",
            "updated",
            "created",
            "username",
            "user_type",
            "identification_type",
            "identification_number",
        ]
        read_only_fields = ["updated", "created", "user_type"]

    def get_user_type(self, obj):
        return obj.user.usertype.user_type

    def update(self, instance, validated_data):
        instance.phone_number = validated_data.get("phone_number", instance.phone_number)
        instance.email = validated_data.get("email", instance.email)
        if "profile_picture" in validated_data:
            instance.profile_picture = validated_data["profile_picture"]
        if instance.user.usertype.user_type == "SELLER":
            instance.identification_type = validated_data.get("identification_type", instance.identification_type)
            instance.identification_number = validated_data.get("identification_number", instance.identification_number)
        instance.save()
        return instance

class BasePropertySerializer(serializers.ModelSerializer):
    images = PropertyImageSerializer(many=True, read_only=True)
    uploaded_images = serializers.ListField(
        child=serializers.ImageField(max_length=1000000, allow_empty_file=False, use_url=False),
        write_only=True,
        required=False,
        source="images",
    )
    host = serializers.PrimaryKeyRelatedField(read_only=True)
    amenities = serializers.ListField(child=serializers.CharField(), write_only=True, required=False)

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
        # (Same as before)

    def _handle_images(self, instance, image_files):
        # (Same as before)

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation["amenities"] = AmenitySerializer(instance.amenities.all(), many=True).data
        return representation

class RentalPropertySerializer(BasePropertySerializer):
    class Meta(BasePropertySerializer.Meta):
        model = RentalProperty
        fields = BasePropertySerializer.Meta.fields + [
            "price_per_month",
            "max_guests",
            "is_available",
        ]

class PropertyForSaleSerializer(BasePropertySerializer):
    class Meta(BasePropertySerializer.Meta):
        model = PropertyForSale
        f
