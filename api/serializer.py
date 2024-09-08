from rest_framework import serializers
from .models import Profile, RentalProperty, PropertyForSale, PropertyImage, Amenity
from django.contrib.auth.models import User


class SignupSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    email = serializers.EmailField()
    phone_number = serializers.CharField(max_length=20)
    profile_picture = serializers.ImageField(required=False)

    def validate(self, data):
        if data["password"] != data["confirm_password"]:
            raise serializers.ValidationError(
                {"confirm_password": "Passwords do not match"}
            )
        if User.objects.filter(username=data["username"]).exists():
            raise serializers.ValidationError({"username": "Username already exists"})
        if User.objects.filter(email=data["email"]).exists():
            raise serializers.ValidationError({"email": "Email already exists"})
        return data

    def create(self, validated_data):
        username = validated_data["username"]
        email = validated_data["email"]
        password = validated_data["password"]
        phone_number = validated_data["phone_number"]
        profile_picture = validated_data.get("profile_picture")

        user = User.objects.create_user(
            username=username, email=email, password=password
        )

        profile = Profile.objects.get(user=user)
        profile.username = username  # Update username in Profile
        profile.email = email  # Update email in Profile
        profile.phone_number = phone_number
        if profile_picture:
            profile.profile_picture = profile_picture
        profile.save()

        return user


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = [
            "phone_number",
            "email",
            "profile_picture",
            "updated",
            "created",
            "username",
        ]
        read_only_fields = ["updated", "created"]

    def update(self, instance, validated_data):
        instance.phone_number = validated_data.get(
            "phone_number", instance.phone_number
        )
        instance.email = validated_data.get("email", instance.email)
        if "profile_picture" in validated_data:
            instance.profile_picture = validated_data["profile_picture"]
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
    )
    host = serializers.PrimaryKeyRelatedField(read_only=True)
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

    def create(self, validated_data):
        amenities_data = validated_data.pop("amenities", [])
        uploaded_images = validated_data.pop("uploaded_images", [])
        instance = super().create(validated_data)
        self._handle_amenities(instance, amenities_data)
        self._handle_images(instance, uploaded_images)
        return instance

    def update(self, instance, validated_data):
        amenities_data = validated_data.pop("amenities", None)
        uploaded_images = validated_data.pop("uploaded_images", [])
        instance = super().update(instance, validated_data)
        if amenities_data is not None:
            self._handle_amenities(instance, amenities_data)
        self._handle_images(instance, uploaded_images)
        return instance

    def _handle_amenities(self, instance, amenities_data):
        amenities = []
        for name in amenities_data:
            amenity, _ = Amenity.objects.get_or_create(name=name.strip().lower())
            amenities.append(amenity)
        instance.amenities.set(amenities)

    def _handle_images(self, instance, image_files):
        for image_file in image_files:
            PropertyImage.objects.create(property=instance, image=image_file)

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
            "price_per_night",
            "max_guests",
            "check_in_time",
            "check_out_time",
            "is_available",
        ]


class PropertyForSaleSerializer(BasePropertySerializer):
    class Meta(BasePropertySerializer.Meta):
        model = PropertyForSale
        fields = BasePropertySerializer.Meta.fields + ["price", "is_sold", "year_built"]
