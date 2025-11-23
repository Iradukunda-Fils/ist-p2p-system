"""
URL configuration for users app.

JWT Authentication Endpoints:
- POST /api/auth/token/ - Obtain access and refresh tokens
- POST /api/auth/token/refresh/ - Refresh access token using refresh token
- POST /api/auth/logout/ - Logout and blacklist refresh token
"""
from django.urls import path, include
from rest_framework.permissions import AllowAny
from django.views.decorators.csrf import csrf_exempt
from rest_framework_simplejwt.views import TokenRefreshView
from .views import CustomTokenObtainPairView, logout_view

app_name = 'users'



urlpatterns = [
    # JWT Authentication Endpoints
    # POST /api/auth/token/ - Obtain JWT tokens with username/password
    # path('token/', csrf_exempt(TokenObtainPairView.as_view()), name='token_obtain_pair'),
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    # POST /api/auth/token/refresh/ - Refresh access token using refresh token
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    # POST /api/auth/logout/ - Logout and blacklist refresh token
    path('logout/', logout_view, name='logout'),
    path('api-auth/', include('rest_framework.urls'))
]


