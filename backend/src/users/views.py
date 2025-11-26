from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView, TokenBlacklistView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status, viewsets, filters
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from django_filters.rest_framework import DjangoFilterBackend
from django.contrib.auth import get_user_model
from rest_framework.decorators import action

from core.permissions import IsAdminUser
from .serializers import (
    CustomTokenObtainPairSerializer,
    UserListSerializer,
    UserDetailSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
)

User = get_user_model()


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class CustomTokenRefreshView(TokenRefreshView):
    """
    Custom TokenRefreshView to handle cases where the user associated
    with the refresh token no longer exists.
    """
    def post(self, request, *args, **kwargs):
        try:
            return super().post(request, *args, **kwargs)
        except User.DoesNotExist:
            # If the user ID in the token doesn't exist in DB
            return Response(
                {"detail": "User not found", "code": "user_not_found"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        except Exception as e:
            # Fallback for other unexpected errors
            if "User matching query does not exist" in str(e):
                 return Response(
                    {"detail": "User not found", "code": "user_not_found"},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            raise e



class UserManagementViewSet(viewsets.ModelViewSet):
    """
    ViewSet for user management (Admin only).
    
    Provides CRUD operations for users with role-based filtering.
    """
    queryset = User.objects.all().order_by('-date_joined')
    permission_classes = [IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['role', 'is_active']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering_fields = ['date_joined', 'last_login', 'username', 'email']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return UserListSerializer
        elif self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserDetailSerializer
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get user statistics"""
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        role_counts = {}
        
        for role_code, role_name in User.ROLE_CHOICES:
            count = User.objects.filter(role=role_code).count()
            role_counts[role_code] = {
                'name': role_name,
                'count': count
            }
        
        return Response({
            'total_users': total_users,
            'active_users': active_users,
            'inactive_users': total_users - active_users,
            'role_counts': role_counts
        })
    
    @action(detail=True, methods=['post'])
    def deactivate(self, request, pk=None):
        """Deactivate a user"""
        user = self.get_object()
        
        # Prevent self-deactivation
        if user.id == request.user.id:
            return Response(
                {'error': 'Cannot deactivate your own account'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.is_active = False
        user.save()
        
        serializer = self.get_serializer(user)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a user"""
        user = self.get_object()
        user.is_active = True
        user.save()
        
        serializer = self.get_serializer(user)
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        """Prevent deletion of own account"""
        user = self.get_object()
        
        if user.id == request.user.id:
            return Response(
                {'error': 'Cannot delete your own account'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return super().destroy(request, *args, **kwargs)
