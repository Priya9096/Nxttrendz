from django.urls import path
from .views import RegisterView, MyProfileView
from rest_framework_simplejwt.views import TokenObtainPairView
from .views import LogoutView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)


urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('profile/', MyProfileView.as_view(), name='my-profile'),
    path('login/', TokenObtainPairView.as_view(), name='login'),
    path('login/refresh/', TokenRefreshView.as_view(), name='refresh'),
    path("logout/", LogoutView.as_view(), name="logout"),

]
