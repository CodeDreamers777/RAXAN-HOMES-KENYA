from django.shortcuts import render
from .serializer import SignupSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from .utils.decorator import jwt_required
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login, logout
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator


class HealthCheckView(APIView):
    def get(self, request):
        return Response(
            {
                "success": True,
                "Message": "If you see this the server is running on v1.0.0",
            }
        )


@method_decorator(csrf_exempt, name="dispatch")
class LoginView(APIView):
    def post(self, request):
        if request.user.is_authenticated:
            return Response({"success": True, "Message": "User already logged in"})

        try:
            username = request.data.get("username").lower()
            password = request.data.get("password")

            user = authenticate(request, username=username, password=password)

            if user is not None:
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
        except User.DoesNotExist:
            return Response({"success": False, "Message": "User does not exist"})
        except Exception as e:
            return Response(
                {"success": False, "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


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
