from django.urls import path
from . import views


urlpatterns = [
    path("health-check/", views.HealthCheckView.as_view()),
    path("register/", views.SignupView.as_view()),
    path("login/", views.LoginView.as_view()),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("get-csrf-token/", views.get_csrf_token),
    path("profile/", views.ProfileAPIView.as_view()),
    path("send-mail/", views.SendEmailView.as_view()),
    path("properties/", views.PropertyListView.as_view(), name="property-list"),
    path(
        "rental-properties/",
        views.CreateRentalPropertyView.as_view(),
        name="create-rental-property",
    ),
    path(
        "properties-for-sale/",
        views.CreatePropertyForSaleView.as_view(),
        name="create-property-for-sale",
    ),
]
