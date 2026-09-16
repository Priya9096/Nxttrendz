from rest_framework.views import APIView
from rest_framework.response import Response
from .serializers import RegisterSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError


from rest_framework.permissions import IsAuthenticated

# The two names LogoutView needs. Without these imports, logging out blows up
# with NameError the moment the view runs.
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError


class RegisterView(APIView):
     def post(self, request):
        serializer = RegisterSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Account created!"},status=201)
        return Response(serializer.errors, status=400)


class MyProfileView(APIView):        # GET /users/me/
    permission_classes = [IsAuthenticated]

    def get(self, request):
        # 2) return who you are
        # user_type is what lets the frontend hide a door instead of showing
        # one that answers 403: only a seller sees the Dashboard link.
        return Response({
            "username":  request.user.username,
            "email":     request.user.email,
            "user_type": request.user.user_type,
        })


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        try:
            RefreshToken(request.data["refresh"]).blacklist()
        except (KeyError, TokenError):
            return Response({"detail": "bad token"}, status=400)
        return Response({"detail": "logged out"}, status=205)
