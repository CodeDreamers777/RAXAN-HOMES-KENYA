from django.urls import path
from . import views
from rest_framework.routers import DefaultRouter

# Create a router and register our viewset with it.
router = DefaultRouter()
router.register(r"properties", views.PropertyViewSet, basename="property")

urlpatterns = [
    path("health-check/", views.HealthCheckView.as_view()),
    path("register/", views.SignupView.as_view()),
    path("login/", views.LoginView.as_view()),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("get-csrf-token/", views.get_csrf_token),
    path("profile/", views.ProfileAPIView.as_view()),
    path("send-mail/", views.SendEmailView.as_view()),
    path("wishlist/", views.WishlistView.as_view()),
    path(
        "initiate-payment/",
        views.InitiatePaystackPaymentView.as_view(),
        name="initiate-payment",
    ),
    path(
        "confirm-booking/", views.ConfirmBookingView.as_view(), name="confirm-booking"
    ),
    path("bookings/", views.BookingListView.as_view(), name="booking-list"),
    path(
        "bookings/<int:pk>/",
        views.BookingDetailView.as_view(),
        name="booking-detail",
    ),
    path(
        "host/booked-properties/",
        views.HostBookedPropertiesView.as_view(),
        name="host-booked-properties",
    ),
    path("host/bookings/", views.HostBookingsView.as_view(), name="host-bookings"),
    path(
        "host/bookings/<int:pk>/",
        views.HostBookingDetailView.as_view(),
        name="host-booking-detail",
    ),
    # Include the router URLs in our urlpatterns
    *router.urls,
]
