from django.contrib import admin
from django.contrib.contenttypes.admin import GenericTabularInline
from .models import (
    UserType,
    Profile,
    RentalProperty,
    PropertyForSale,
    PropertyImage,
    Booking,
    Review,
    Amenity,
    RentalPricingPeriod,
    WishlistItem,
)


@admin.register(UserType)
class UserTypeAdmin(admin.ModelAdmin):
    list_display = ("user", "user_type")
    list_filter = ("user_type",)
    search_fields = ("user__username", "user__email")


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "phone_number", "email", "created", "updated")
    search_fields = ("user__username", "user__email", "phone_number")
    list_filter = ("user__usertype__user_type",)


class PropertyImageInline(GenericTabularInline):
    model = PropertyImage
    extra = 1


@admin.register(RentalProperty)
class RentalPropertyAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "location",
        "property_type",
        "price_per_month",
        "is_available",
        "host",
    )
    list_filter = ("property_type", "is_available")
    search_fields = ("name", "location", "host__user__username")
    inlines = [PropertyImageInline]


@admin.register(PropertyForSale)
class PropertyForSaleAdmin(admin.ModelAdmin):
    list_display = ("name", "location", "property_type", "price", "is_sold", "host")
    list_filter = ("property_type", "is_sold")
    search_fields = ("name", "location", "host__user__username")
    inlines = [PropertyImageInline]


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = (
        "property",
        "client",
        "created_at",
        "is_confirmed",
    )
    list_filter = ("is_confirmed", "created_at")
    search_fields = ("property__name", "client__user__username")


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("get_property_name", "reviewer", "rating", "created_at")
    list_filter = ("rating", "created_at")
    search_fields = ("property__name", "reviewer__user__username", "comment")

    def get_property_name(self, obj):
        return obj.property.name

    get_property_name.short_description = "Property"


@admin.register(Amenity)
class AmenityAdmin(admin.ModelAdmin):
    list_display = ("name",)
    search_fields = ("name",)


@admin.register(RentalPricingPeriod)
class RentalPricingPeriodAdmin(admin.ModelAdmin):
    list_display = ("property", "start_date", "end_date", "price")
    list_filter = ("start_date", "end_date")
    search_fields = ("property__name",)


@admin.register(PropertyImage)
class PropertyImageAdmin(admin.ModelAdmin):
    list_display = ("get_property_name", "image")
    search_fields = ("property__name",)

    def get_property_name(self, obj):
        return obj.property.name

    get_property_name.short_description = "Property"


@admin.register(WishlistItem)
class WishlistItemAdmin(admin.ModelAdmin):
    list_display = ("profile", "get_property_name", "content_type", "added_at")
    list_filter = ("added_at", "content_type")
    search_fields = ("profile__user__username", "object_id")

    def get_property_name(self, obj):
        return str(obj.property)

    get_property_name.short_description = "Property"
