from django.shortcuts import render
from .serializer import SignupSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from .utils.decorator import jwt_required
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status, generics
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.middleware.csrf import get_token
from django.http import JsonResponse
from collections import defaultdict
from rest_framework.parsers import MultiPartParser, FormParser
from .models import RentalProperty, PropertyForSale
from .serializer import (
    RentalPropertySerializer,
    PropertyForSaleSerializer,
    ProfileSerializer,
)
from .utils.send_mail import send_email_via_mailgun


User = get_user_model()


def get_csrf_token(request):
    return JsonResponse({"csrfToken": get_token(request)})


class SendEmailView(APIView):
    def get(self, request):
        # Hardcoded email data for testing
        subject = "Test Email from Django"
        text = "This is a test email sent from Django REST Framework using Mailgun."
        to_email = (
            "crispusgikonyo@gmail.com"  # Replace with the actual recipient's email
        )

        # Call the Mailgun utility function
        response = send_email_via_mailgun(subject, text, to_email)
        print("This is res", response)

        # Check the response from Mailgun
        if response.status_code == 200:
            return Response(
                {"message": "Email sent successfully!"}, status=status.HTTP_200_OK
            )
        else:
            return Response(
                {"error": f"Failed to send email: {response.text}"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class HealthCheckView(APIView):
    def get(self, request):
        return Response(
            {
                "success": True,
                "Message": "If you see this the server is running on v1.0.0",
            }
        )


class ProfileAPIView(APIView):
    parser_classes = [MultiPartParser, FormParser]

    @method_decorator(jwt_required)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def get(self, request):
        profile = request.user.profile
        serializer = ProfileSerializer(profile)
        return Response(serializer.data)

    def put(self, request):
        profile = request.user.profile
        serializer = ProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name="dispatch")
class LoginView(APIView):
    def post(self, request):
        if request.user.is_authenticated:
            return Response({"success": True, "Message": "User already logged in"})
        try:
            email = request.data.get("email").lower()
            password = request.data.get("password")

            # Get the user by email
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                return Response({"success": False, "Message": "User does not exist"})

            # Authenticate using email and password
            if user.check_password(password):
                login(request, user)
                refresh = RefreshToken.for_user(user)
                return Response(
                    {
                        "success": True,
                        "Message": "User logged in successfully",
                        "access": str(refresh.access_token),
                        "refresh": str(refresh),
                    }
                )
            else:
                return Response({"success": False, "Message": "Invalid credentials"})
        except Exception as e:
            return Response(
                {"success": False, "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


@method_decorator(csrf_exempt, name="dispatch")
class LogoutView(APIView):
    permission_classes = [
        IsAuthenticated
    ]  # Ensures the user must be authenticated to log out

    def post(self, request):
        # Use Django's logout method to log the user out
        logout(request)
        return Response(
            {"success": True, "message": "User logged out successfully"},
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_exempt, name="dispatch")
class SignupView(APIView):
    def post(self, request, *args, **kwargs):
        serializer = SignupSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(
                {"success": True, "Message": "User Created successfully"},
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PropertyListView(generics.ListAPIView):
    @method_decorator(jwt_required)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def list(self, request, *args, **kwargs):
        rental_properties = RentalProperty.objects.all()
        properties_for_sale = PropertyForSale.objects.all()

        rental_serializer = RentalPropertySerializer(rental_properties, many=True)
        sale_serializer = PropertyForSaleSerializer(properties_for_sale, many=True)

        # Categorize rental properties by property type
        rental_by_type = defaultdict(list)
        for prop in rental_serializer.data:
            rental_by_type[prop["property_type"]].append(prop)

        # Categorize properties for sale by property type
        sale_by_type = defaultdict(list)
        for prop in sale_serializer.data:
            sale_by_type[prop["property_type"]].append(prop)

        return Response(
            {
                "rental_properties": dict(rental_by_type),
                "properties_for_sale": dict(sale_by_type),
            }
        )


class CreateRentalPropertyView(generics.CreateAPIView):
    queryset = RentalProperty.objects.all()
    serializer_class = RentalPropertySerializer

    @method_decorator(jwt_required)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )


class CreatePropertyForSaleView(generics.CreateAPIView):
    queryset = PropertyForSale.objects.all()
    serializer_class = PropertyForSaleSerializer

    @method_decorator(jwt_required)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )
