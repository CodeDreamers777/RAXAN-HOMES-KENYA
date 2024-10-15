from django.shortcuts import render
from django.db.models import Q, Max
from rest_framework import generics, permissions
from django.utils import timezone
from django.contrib.auth import update_session_auth_hash

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
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.middleware.csrf import get_token
from django.http import JsonResponse
from collections import defaultdict
from rest_framework.parsers import MultiPartParser, FormParser
from .models import (
    RentalProperty,
    WishlistItem,
    PropertyForSale,
    Profile,
    Amenity,
    Review,
    Booking,
    Message,
    SubscriptionPlan,
    Payment,
)
from .serializer import (
    RentalPropertySerializer,
    PropertyForSaleSerializer,
    ProfileSerializer,
    ReviewSerializer,
    WishlistItemSerializer,
    BookingSerializer,
    MessageSerializer,
    MessageCreateSerializer,
    SubscriptionPlanSerializer,
)
from django.contrib.contenttypes.models import ContentType
from .utils.send_mail import send_email_via_mailgun
import logging
import requests
from django.conf import settings

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
        print("Received data:", request.data)
        print("Content-Type:", request.content_type)
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
            return Response({"success": True, "message": "User already logged in"})
        try:
            email = request.data.get("email").lower()
            password = request.data.get("password")

            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                return Response({"success": False, "message": "User does not exist"})

            if user.check_password(password):
                if not user.is_active:
                    # Reactivate the account
                    user.is_active = True
                    user.save()
                    reactivation_message = "Your account has been reactivated. "
                else:
                    reactivation_message = ""

                login(request, user)
                refresh = RefreshToken.for_user(user)
                return Response(
                    {
                        "success": True,
                        "message": f"{reactivation_message}User logged in successfully",
                        "access": str(refresh.access_token),
                        "refresh": str(refresh),
                    }
                )
            else:
                return Response({"success": False, "message": "Invalid credentials"})
        except Exception as e:
            return Response(
                {"success": False, "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class UserAccountManagementView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        action = request.data.get("action")

        if action == "change_password":
            return self.change_password(request)
        elif action == "deactivate_account":
            return self.deactivate_account(request)
        elif action == "delete_account":
            return self.delete_account(request)
        else:
            return Response(
                {"error": "Invalid action"}, status=status.HTTP_400_BAD_REQUEST
            )

    def change_password(self, request):
        user = request.user
        old_password = request.data.get("old_password")
        new_password = request.data.get("new_password")

        if not user.check_password(old_password):
            return Response(
                {"error": "Invalid old password"}, status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save()
        update_session_auth_hash(request, user)  # To keep the user logged in
        return Response(
            {"message": "Password changed successfully"}, status=status.HTTP_200_OK
        )

    def deactivate_account(self, request):
        user = request.user
        user.is_active = False
        user.save()

        # Check if the user is a seller and update property statuses
        try:
            profile = Profile.objects.get(user=user)
            if profile.is_seller:
                RentalProperty.objects.filter(host=profile).update(is_available=False)
                PropertyForSale.objects.filter(host=profile).update(is_sold=True)
        except Profile.DoesNotExist:
            pass  # If profile doesn't exist, we don't need to update properties

        return Response(
            {
                "message": "Account deactivated successfully. All properties have been marked as unavailable/sold."
            },
            status=status.HTTP_200_OK,
        )

    def delete_account(self, request):
        user = request.user
        user.delete()
        return Response(
            {"message": "Account deleted successfully"}, status=status.HTTP_200_OK
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
            user = serializer.save()
            return Response(
                {
                    "success": True,
                    "Message": "User Created successfully",
                    "user_type": user.usertype.user_type,
                },
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name="dispatch")
class PropertyViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Filter rental properties to include only available ones
        rental_properties = RentalProperty.objects.filter(is_available=True)

        # For properties for sale, we keep all of them as there's no 'is_available' field
        properties_for_sale = PropertyForSale.objects.all()

        # Get featured properties (rental properties with hosts having premium subscription)
        featured_properties = RentalProperty.objects.filter(
            is_available=True,
            host__subscription__name="PREMIUM",  # Assuming the premium plan is named 'premium'
        )

        return rental_properties, properties_for_sale, featured_properties

    def get_object(self, pk):
        try:
            return RentalProperty.objects.get(pk=pk)
        except RentalProperty.DoesNotExist:
            try:
                return PropertyForSale.objects.get(pk=pk)
            except PropertyForSale.DoesNotExist:
                return None

    def retrieve(self, request, pk=None):
        property = self.get_object(pk)
        if property is None:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if isinstance(property, RentalProperty):
            serializer = RentalPropertySerializer(property)
        else:
            serializer = PropertyForSaleSerializer(property)

        return Response(serializer.data)

    def list(self, request):
        rental_properties, properties_for_sale, featured_properties = (
            self.get_queryset()
        )

        # Serialize the querysets
        rental_serializer = RentalPropertySerializer(rental_properties, many=True)
        sale_serializer = PropertyForSaleSerializer(properties_for_sale, many=True)
        featured_serializer = RentalPropertySerializer(featured_properties, many=True)

        # Combine the serialized data
        data = {
            "rental_properties": rental_serializer.data,
            "properties_for_sale": sale_serializer.data,
            "featured_properties": featured_serializer.data,
        }

        return Response(data)

    def create(self, request):
        property_type = request.data.get("property_category")
        if property_type == "rental":
            serializer = RentalPropertySerializer(data=request.data)
        elif property_type == "sale":
            serializer = PropertyForSaleSerializer(data=request.data)
        else:
            return Response(
                {"error": "Invalid property type"}, status=status.HTTP_400_BAD_REQUEST
            )

        if serializer.is_valid():
            profile = request.user.profile
            if profile.user.usertype.user_type != "SELLER":
                return Response(
                    {"error": "Only sellers can create properties"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            # Check if the user has an active subscription
            if not profile.subscription:
                return Response(
                    {"error": "You need an active subscription to create properties"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            # Get the user's current property count
            current_property_count = (
                RentalProperty.objects.filter(host=profile).count()
                + PropertyForSale.objects.filter(host=profile).count()
            )

            # Check if the user has reached their property limit
            if current_property_count >= profile.subscription.property_limit:
                return Response(
                    {
                        "error": "You have reached your property listing limit. Please upgrade your subscription."
                    },
                    status=status.HTTP_403_FORBIDDEN,
                )

            property = serializer.save(host=profile)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def update(self, request, pk=None):
        property = self.get_object(pk)
        print(request.data)
        if property is None:
            return Response(status=status.HTTP_404_NOT_FOUND)
        if (
            property.host.user != request.user
            or request.user.usertype.user_type != "SELLER"
        ):
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

    @action(detail=False, methods=["get"])
    def user_properties(self, request):
        user_profile = request.user.profile
        rental_properties = RentalProperty.objects.filter(host=user_profile)
        properties_for_sale = PropertyForSale.objects.filter(host=user_profile)

        rental_property_serializer = RentalPropertySerializer(
            rental_properties, many=True
        )
        property_for_sale_serializer = PropertyForSaleSerializer(
            properties_for_sale, many=True
        )

        return Response(
            {
                "rental_properties": rental_property_serializer.data,
                "properties_for_sale": property_for_sale_serializer.data,
            }
        )

    @action(detail=False, methods=["get"])
    def user_property_reviews(self, request):
        user_profile = request.user.profile

        # Get all properties owned by the user
        rental_properties = RentalProperty.objects.filter(host=user_profile)
        properties_for_sale = PropertyForSale.objects.filter(host=user_profile)

        # Get content types for both property models
        rental_content_type = ContentType.objects.get_for_model(RentalProperty)
        sale_content_type = ContentType.objects.get_for_model(PropertyForSale)

        # Get all reviews for the user's properties
        reviews = Review.objects.filter(
            (
                Q(content_type=rental_content_type)
                & Q(object_id__in=rental_properties.values_list("id", flat=True))
            )
            | (
                Q(content_type=sale_content_type)
                & Q(object_id__in=properties_for_sale.values_list("id", flat=True))
            )
        ).order_by("-created_at")

        serializer = ReviewSerializer(reviews, many=True)

        return Response(serializer.data)

    def destroy(self, request, pk=None):
        property = self.get_object(pk)
        if property is None:
            return Response(status=status.HTTP_404_NOT_FOUND)

            if (
                property.host.user != request.user
                or request.user.usertype.user_type != "SELLER"
            ):
                return Response(
                    {"error": "You do not have permission to delete this property"},
                    status=status.HTTP_403_FORBIDDEN,
                )

        property.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class WishlistView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile = Profile.objects.get(user=request.user)
        wishlist_items = WishlistItem.objects.filter(profile=profile)
        serializer = WishlistItemSerializer(wishlist_items, many=True)
        return Response(serializer.data)

    def post(self, request):
        profile = Profile.objects.get(user=request.user)
        property_type = request.data.get("property_type")
        property_id = request.data.get("property_id")

        if property_type not in ["rental", "sale"]:
            return Response(
                {"error": "Invalid property type"}, status=status.HTTP_400_BAD_REQUEST
            )

        if property_type == "rental":
            model = RentalProperty
        else:
            model = PropertyForSale

        try:
            property_instance = model.objects.get(id=property_id)
        except model.DoesNotExist:
            return Response(
                {"error": "Property not found"}, status=status.HTTP_404_NOT_FOUND
            )

        content_type = ContentType.objects.get_for_model(model)

        wishlist_item, created = WishlistItem.objects.get_or_create(
            profile=profile, content_type=content_type, object_id=property_id
        )

        if created:
            return Response(
                {"message": "Property added to wishlist"},
                status=status.HTTP_201_CREATED,
            )
        else:
            return Response(
                {"message": "Property already in wishlist"}, status=status.HTTP_200_OK
            )

    def delete(self, request):
        profile = Profile.objects.get(user=request.user)
        property_type = request.data.get("property_type")
        property_id = request.data.get("property_id")

        if property_type not in ["rental", "sale"]:
            return Response(
                {"error": "Invalid property type"}, status=status.HTTP_400_BAD_REQUEST
            )

        if property_type == "rental":
            model = RentalProperty
        else:
            model = PropertyForSale

        content_type = ContentType.objects.get_for_model(model)

        try:
            wishlist_item = WishlistItem.objects.get(
                profile=profile, content_type=content_type, object_id=property_id
            )
            wishlist_item.delete()
            return Response(
                {"message": "Property removed from wishlist"}, status=status.HTTP_200_OK
            )
        except WishlistItem.DoesNotExist:
            return Response(
                {"error": "Property not found in wishlist"},
                status=status.HTTP_404_NOT_FOUND,
            )


class InitiatePaystackPaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        property_id = request.data.get("property_id")
        try:
            rental_property = RentalProperty.objects.get(id=property_id)
        except RentalProperty.DoesNotExist:
            return Response(
                {"error": "Property not found"}, status=status.HTTP_404_NOT_FOUND
            )
        if not rental_property.is_available or rental_property.number_of_units == 0:
            return Response(
                {"error": "Property is not available for booking"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Calculate total price (you might want to implement a more complex pricing logic)
        total_price = rental_property.price_per_month

        # Prepare the Paystack API request
        url = "https://api.paystack.co/transaction/initialize"
        headers = {
            "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
            "Content-Type": "application/json",
        }
        data = {
            "email": request.user.email,
            "amount": int(total_price * 100),  # Paystack expects amount in kobo
            "metadata": {
                "property_id": property_id,
                "user_id": request.user.id,
            },
        }

        # Make the API request to Paystack
        response = requests.post(url, json=data, headers=headers)
        if response.status_code == 200:
            response_data = response.json()
            return Response(
                {
                    "authorization_url": response_data["data"]["authorization_url"],
                    "access_code": response_data["data"]["access_code"],
                    "reference": response_data["data"]["reference"],
                },
                status=status.HTTP_200_OK,
            )
        else:
            return Response(
                {"error": "Failed to initialize payment"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class ConfirmBookingView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        reference = request.data.get("reference")

        # Verify the payment with Paystack
        url = f"https://api.paystack.co/transaction/verify/{reference}"
        headers = {
            "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
        }
        response = requests.get(url, headers=headers)
        print(response.json())

        if response.status_code == 200:
            payment_data = response.json()["data"]

            if payment_data["status"] == "success":
                metadata = payment_data["metadata"]
                property_id = metadata["property_id"]
                user_id = metadata["user_id"]

                # Ensure the user making the request is the same who initiated the payment
                if request.user.id != int(user_id):
                    return Response(
                        {"error": "Unauthorized"}, status=status.HTTP_401_UNAUTHORIZED
                    )

                try:
                    rental_property = RentalProperty.objects.get(id=property_id)
                except RentalProperty.DoesNotExist:
                    return Response(
                        {"error": "Property not found"},
                        status=status.HTTP_404_NOT_FOUND,
                    )

                # Check if units are still available
                if rental_property.number_of_units == 0:
                    return Response(
                        {"error": "No units available for this property"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Create the booking
                booking = Booking.objects.create(
                    property=rental_property,
                    client=request.user.profile,
                    total_price=payment_data["amount"] / 100,  # Convert back from kobo
                    is_confirmed=True,
                )

                # Update the property's number of units
                rental_property.number_of_units -= 1
                if rental_property.number_of_units == 0:
                    rental_property.is_available = False
                rental_property.save()

                return Response(
                    {
                        "success": True,
                        "message": "Booking confirmed successfully",
                        "booking_id": booking.id,
                    },
                    status=status.HTTP_201_CREATED,
                )
            else:
                return Response(
                    {"error": "Payment was not successful"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            return Response(
                {"error": "Failed to verify payment"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class BookingListView(generics.ListAPIView):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Booking.objects.filter(client=self.request.user.profile)


class BookingDetailView(generics.RetrieveAPIView):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Booking.objects.filter(client=self.request.user.profile)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.client != request.user.profile:
            return Response(
                {"error": "You do not have permission to view this booking."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class HostBookedPropertiesView(generics.ListAPIView):
    serializer_class = RentalPropertySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return RentalProperty.objects.filter(
            host=self.request.user.profile, booking__isnull=False
        ).distinct()


class HostBookingsView(generics.ListAPIView):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Booking.objects.filter(property__host=self.request.user.profile)


class HostBookingDetailView(generics.RetrieveAPIView):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Booking.objects.filter(property__host=self.request.user.profile)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.property.host != request.user.profile:
            return Response(
                {"error": "You do not have permission to view this booking."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class ConversationListView(generics.ListAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_profile = self.request.user.profile

        # Get the latest message for each conversation
        latest_messages = (
            Message.objects.filter(Q(sender=user_profile) | Q(receiver=user_profile))
            .values("sender", "receiver")
            .annotate(latest_timestamp=Max("timestamp"))
            .order_by("-latest_timestamp")
        )

        # Fetch the actual message objects
        conversation_messages = []
        for msg in latest_messages:
            conversation_message = Message.objects.filter(
                Q(sender_id=msg["sender"], receiver_id=msg["receiver"])
                | Q(sender_id=msg["receiver"], receiver_id=msg["sender"]),
                timestamp=msg["latest_timestamp"],
            ).first()
            if conversation_message:
                conversation_messages.append(conversation_message)

        return conversation_messages


class ConversationDetailView(generics.ListAPIView):
    serializer_class = MessageSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user_profile = self.request.user.profile
        other_profile_id = self.kwargs["other_user_id"]
        return Message.objects.filter(
            (Q(sender=user_profile) & Q(receiver_id=other_profile_id))
            | (Q(sender_id=other_profile_id) & Q(receiver=user_profile))
        ).order_by("timestamp")


class SendMessageView(generics.CreateAPIView):
    serializer_class = MessageCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save()


class MarkMessagesAsReadView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, other_user_id):
        user_profile = request.user.profile
        other_profile = Profile.objects.get(id=other_user_id)

        Message.objects.filter(
            sender=other_profile, receiver=user_profile, is_read=False
        ).update(is_read=True)

        return Response({"status": "success"})


class UnreadMessageCountView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user_profile = request.user.profile
        unread_count = Message.objects.filter(
            receiver=user_profile, is_read=False
        ).count()

        return Response({"unread_count": unread_count})


class SubscriptionPlanListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        plans = SubscriptionPlan.objects.all()
        serializer = SubscriptionPlanSerializer(plans, many=True)
        return Response(serializer.data)


class InitiateSubscriptionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        plan_id = request.data.get("plan_id")
        try:
            plan = SubscriptionPlan.objects.get(id=plan_id)
        except SubscriptionPlan.DoesNotExist:
            return Response(
                {"error": "Invalid plan ID"}, status=status.HTTP_400_BAD_REQUEST
            )

        profile = request.user.profile
        if not profile.is_seller:
            return Response(
                {"error": "Only sellers can subscribe to plans"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Initialize payment with Paystack
        url = "https://api.paystack.co/transaction/initialize"
        headers = {
            "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
            "Content-Type": "application/json",
        }
        data = {
            "amount": int(plan.price * 100),  # Amount in kobo
            "email": request.user.email,
        }

        response = requests.post(url, headers=headers, json=data)

        if response.status_code == 200:
            result = response.json()
            # Create a new Payment object
            payment = Payment.objects.create(
                profile=profile,
                amount=plan.price,
                reference=result["data"]["reference"],
                status="pending",
            )
            return Response(
                {
                    "payment_url": result["data"]["authorization_url"],
                    "reference": payment.reference,
                }
            )
        else:
            return Response(
                {"error": "Unable to initiate payment"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class VerifySubscriptionView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        reference = request.data.get("reference")
        try:
            payment = Payment.objects.get(
                reference=reference, profile=request.user.profile
            )
        except Payment.DoesNotExist:
            return Response(
                {"error": "Invalid payment reference"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Verify payment with Paystack
        url = f"https://api.paystack.co/transaction/verify/{reference}"
        headers = {
            "Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}",
        }

        response = requests.get(url, headers=headers)

        if response.status_code == 200:
            result = response.json()
            if result["data"]["status"] == "success":
                # Update payment status
                payment.status = "success"
                payment.save()

                # Update user's subscription
                profile = request.user.profile
                profile.subscription = SubscriptionPlan.objects.get(
                    price=payment.amount
                )
                profile.subscription_start_date = timezone.now()
                profile.save()

                return Response({"message": "Subscription updated successfully"})
            else:
                return Response(
                    {"error": "Payment was not successful"},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            return Response(
                {"error": "Unable to verify payment"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
