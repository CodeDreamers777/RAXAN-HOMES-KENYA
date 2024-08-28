from django.urls import path
from . import views


urlpatterns = [
    path("health-check/", views.HealthCheckView.as_view()),
    path("register/", views.SignupView.as_view()),
    path("login/", views.LoginView.as_view()),
]
