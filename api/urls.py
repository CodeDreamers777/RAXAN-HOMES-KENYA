from django.urls import path
from . import views
from rest_framework.routers import DefaultRouter

# Create a router and register our viewset with it.
router = DefaultRouter()
router.register(r"properties", views.PropertyViewSet, basename="property")
router.register(r"reviews", views.ReviewViewSet)
router.register(
    r"property-viewings", views.BookForSaleViewingViewSet, basename="property-viewing"
)

urlpatterns = [
    path("health-check/", views.HealthCheckView.as_view()),
    path("register/", views.SignupView.as_view()),
    path("login/", views.LoginView.as_view()),
    path("verify-login-otp/", views.VerifyLoginOTPView.as_view()),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("get-csrf-token/", views.get_csrf_token),
    path("profile/", views.ProfileAPIView.as_view()),
    path("send-otp-mail/", views.SendOTPEmailView.as_view()),
    path(
        "forgot-password/", views.ForgotPasswordView.as_view(), name="forgot-password"
    ),
    path("reset-password/", views.ResetPasswordView.as_view(), name="reset-password"),
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
    path(
        "conversations/", views.ConversationListView.as_view(), name="conversation_list"
    ),
    path(
        "conversations/<int:other_user_id>/",
        views.ConversationDetailView.as_view(),
        name="conversation_detail",
    ),
    path("send-message/", views.SendMessageView.as_view(), name="send_message"),
    path(
        "mark-read/<int:other_user_id>/",
        views.MarkMessagesAsReadView.as_view(),
        name="mark_messages_as_read",
    ),
    path(
        "unread-count/",
        views.UnreadMessageCountView.as_view(),
        name="get_unread_message_count",
    ),
    path(
        "per-night/initiate-payment/",
        views.InitiatePerNightPaymentView.as_view(),
        name="initiate-per-night-payment",
    ),
    path(
        "per-night/confirm-payment/",
        views.ConfirmPerNightPaymentView.as_view(),
        name="confirm-per-night-payment",
    ),
    path(
        "manage/", views.UserAccountManagementView.as_view(), name="account_management"
    ),
    path(
        "per-night-bookings/",
        views.PerNightBookingListView.as_view(),
        name="per-night-bookings-list",
    ),
    path(
        "check-booking/<str:username>/<uuid:property_id>/<str:property_type>/",
        views.check_booking_exists,
        name="check-booking-exists",
    ),
    # Include the router URLs in our urlpatterns
    *router.urls,
]
