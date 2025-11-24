"""
URL configuration for users app.

JWT Authentication Endpoints:
- POST /api/auth/token/ - Obtain access and refresh tokens
- POST /api/auth/token/refresh/ - Refresh access token using refresh token
- POST /api/auth/logout/ - Logout and blacklist refresh token

User Management Endpoints (Admin only):
- GET /api/auth/users/ - List all users
- POST /api/auth/users/ - Create new user
- GET /api/auth/users/{id}/ - Get user details
- PATCH /api/auth/users/{id}/ - Update user
- DELETE /api/auth/users/{id}/ - Delete user
- GET /api/auth/users/stats/ - Get user statistics
- POST /api/auth/users/{id}/activate/ - Activate user
- POST /api/auth/users/{id}/deactivate/ - Deactivate user
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomTokenObtainPairView, CustomTokenRefreshView, logout_view, UserManagementViewSet

app_name = 'users'

# Router for user management endpoints
router = DefaultRouter()
router.register(r'users', UserManagementViewSet, basename='user')

urlpatterns = [
    # JWT Authentication Endpoints
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('logout/', logout_view, name='logout'),
    
    # User Management Endpoints (admin only)
    path('', include(router.urls)),
]
