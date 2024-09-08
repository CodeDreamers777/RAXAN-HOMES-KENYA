from django.shortcuts import render
from .serializer import SignupSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from .utils.decorator import jwt_required
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status, viewsets
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
from .models import RentalProperty, PropertyForSale, Profile, Amenity
from .serializer import (
    RentalPropertySerializer,
    PropertyForSaleSerializer,
    ProfileSerializer,
)
from .utils.send_mail import send_email_via_mailgun
import logging

logger = logging.getLogger(__name__)


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


@method_decorator(csrf_exempt, name="dispatch")
class PropertyViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        rental_properties = RentalProperty.objects.all()
        properties_for_sale = PropertyForSale.objects.all()
        return list(rental_properties) + list(properties_for_sale)

    def get_object(self, pk):
        try:
            return RentalProperty.objects.get(pk=pk)
        except RentalProperty.DoesNotExist:
            try:
                return PropertyForSale.objects.get(pk=pk)
            except PropertyForSale.DoesNotExist:
                return None

    def list(self, request):
        queryset = self.get_queryset()
        serialized_data = []
        for property in queryset:
            if isinstance(property, RentalProperty):
                serializer = RentalPropertySerializer(property)
            else:
                serializer = PropertyForSaleSerializer(property)
            serialized_data.append(serializer.data)
        return Response(serialized_data)

    def retrieve(self, request, pk=None):
        property = self.get_object(pk)
        if property is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if isinstance(property, RentalProperty):
            serializer = RentalPropertySerializer(property)
        else:
            serializer = PropertyForSaleSerializer(property)
        return Response(serializer.data)

    def create(self, request):
        print(f"Received create request with data: {request.data}")
        print(f"Files in request: {request.FILES}")
        property_type = request.data.get("property_category")

        # Prepare the data for the serializer
        serializer_data = request.data.copy()
        serializer_data["uploaded_images"] = request.FILES.getlist("images")

        if property_type == "rental":
            serializer = RentalPropertySerializer(data=serializer_data)
        elif property_type == "sale":
            serializer = PropertyForSaleSerializer(data=serializer_data)
        else:
            return Response(
                {"error": "Invalid property type"}, status=status.HTTP_400_BAD_REQUEST
            )

        if serializer.is_valid():
            print("Serializer is valid")
            profile, created = Profile.objects.get_or_create(user=request.user)
            property = serializer.save(host=profile)
            print(f"Property created with id: {property.id}")
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        print(f"Serializer errors: {serializer.errors}")
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, pk=None):
        property = self.get_object(pk)
        if property is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if property.host.user != request.user:
            return Response(
                {"error": "You do not have permission to update this property"},
                status=status.HTTP_403_FORBIDDEN,
            )
        if isinstance(property, RentalProperty):
            serializer = RentalPropertySerializer(
                property, data=request.data, partial=True
            )
        else:
            serializer = PropertyForSaleSerializer(
                property, data=request.data, partial=True
            )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
