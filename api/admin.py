from django.contrib import admin
from django.contrib.contenttypes.admin import GenericTabularInline
from .models import (
    UserType,
    Profile,
    BookForSaleViewing,
    RentalProperty,
    PropertyForSale,
    PropertyImage,
    Booking,
    Review,
    Amenity,
    RentalPricingPeriod,
    WishlistItem,
    Message,
    SubscriptionPlan,
    Payment,
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


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ("name", "price", "properties_for_sale_limit")
    list_filter = ("name",)
    search_fields = ("name",)


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("profile", "amount", "reference", "status", "created_at")
    list_filter = ("status", "created_at")
    search_fields = ("profile__user__username", "reference")
    date_hierarchy = "created_at"


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("sender", "receiver", "content", "timestamp", "is_read")
    list_filter = ("is_read", "timestamp")
    search_fields = ("sender__user__username", "receiver__user__username", "content")
    date_hierarchy = "timestamp"


@admin.register(BookForSaleViewing)
class BookForSaleViewingAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "property_name",
        "client_name",
        "viewing_date",
        "status",
        "created_at",
        "updated_at",
    )

    list_filter = ("status", "viewing_date", "created_at", "property__property_type")

    search_fields = (
        "property__name",
        "client__user__username",
        "client__user__email",
        "notes",
    )

    readonly_fields = ("created_at", "updated_at")

    ordering = ("-viewing_date", "-created_at")

    date_hierarchy = "viewing_date"

    def property_name(self, obj):
        return obj.property.name

    property_name.admin_order_field = "property__name"

    def client_name(self, obj):
        return f"{obj.client.user.username} ({obj.client.user.email})"

    client_name.admin_order_field = "client__user__username"

    fieldsets = (
        (
            "Viewing Details",
            {"fields": ("property", "client", "viewing_date", "status", "notes")},
        ),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("property", "client", "client__user")
        )

    # Optional: Add actions
    actions = ["mark_as_confirmed", "mark_as_completed", "mark_as_cancelled"]

    def mark_as_confirmed(self, request, queryset):
        queryset.update(status="CONFIRMED")

    mark_as_confirmed.short_description = "Mark selected viewings as confirmed"

    def mark_as_completed(self, request, queryset):
        queryset.update(status="COMPLETED")

    mark_as_completed.short_description = "Mark selected viewings as completed"

    def mark_as_cancelled(self, request, queryset):
        queryset.update(status="CANCELLED")

    mark_as_cancelled.short_description = "Mark selected viewings as cancelled"

    # Optional: Add list_per_page to control pagination
    list_per_page = 20
