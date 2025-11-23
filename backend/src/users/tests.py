from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.core.exceptions import ValidationError
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class UserModelTestCase(TestCase):
    """Test the custom User model with role functionality."""
    
    def test_create_user_with_default_role(self):
        """Test creating a user with default staff role."""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.assertEqual(user.username, 'testuser')
        self.assertEqual(user.email, 'test@example.com')
        self.assertEqual(user.role, 'staff')  # Default role
        self.assertTrue(user.check_password('testpass123'))
    
    def test_create_user_with_specific_role(self):
        """Test creating a user with a specific role."""
        user = User.objects.create_user(
            username='approver',
            email='approver@example.com',
            password='testpass123',
            role='approver_lvl1'
        )
        
        self.assertEqual(user.role, 'approver_lvl1')
    
    def test_user_string_representation(self):
        """Test the string representation of the User model."""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='finance'
        )
        
        expected_str = "testuser (Finance)"
        self.assertEqual(str(user), expected_str)
    
    def test_user_role_choices(self):
        """Test all valid role choices."""
        valid_roles = ['staff', 'approver_lvl1', 'approver_lvl2', 'finance', 'admin']
        
        for role in valid_roles:
            user = User.objects.create_user(
                username=f'user_{role}',
                email=f'{role}@example.com',
                password='testpass123',
                role=role
            )
            self.assertEqual(user.role, role)
    
    def test_user_validation_requires_email(self):
        """Test that email is required for user creation."""
        with self.assertRaises(ValidationError):
            user = User(
                username='testuser',
                password='testpass123',
                role='staff'
            )
            user.full_clean()
    
    def test_user_validation_invalid_role(self):
        """Test validation fails with invalid role."""
        with self.assertRaises(ValidationError):
            user = User(
                username='testuser',
                email='test@example.com',
                password='testpass123',
                role='invalid_role'
            )
            user.full_clean()
    
    def test_can_approve_level_1_property(self):
        """Test can_approve_level_1 property for different roles."""
        # Roles that can approve level 1
        for role in ['approver_lvl1', 'approver_lvl2', 'admin']:
            user = User.objects.create_user(
                username=f'user_{role}',
                email=f'{role}@example.com',
                password='testpass123',
                role=role
            )
            self.assertTrue(user.can_approve_level_1, f"Role {role} should be able to approve level 1")
        
        # Roles that cannot approve level 1
        for role in ['staff', 'finance']:
            user = User.objects.create_user(
                username=f'user_{role}',
                email=f'{role}@example.com',
                password='testpass123',
                role=role
            )
            self.assertFalse(user.can_approve_level_1, f"Role {role} should not be able to approve level 1")
    
    def test_can_approve_level_2_property(self):
        """Test can_approve_level_2 property for different roles."""
        # Roles that can approve level 2
        for role in ['approver_lvl2', 'admin']:
            user = User.objects.create_user(
                username=f'user_{role}',
                email=f'{role}@example.com',
                password='testpass123',
                role=role
            )
            self.assertTrue(user.can_approve_level_2, f"Role {role} should be able to approve level 2")
        
        # Roles that cannot approve level 2
        for role in ['staff', 'approver_lvl1', 'finance']:
            user = User.objects.create_user(
                username=f'user_{role}',
                email=f'{role}@example.com',
                password='testpass123',
                role=role
            )
            self.assertFalse(user.can_approve_level_2, f"Role {role} should not be able to approve level 2")
    
    def test_can_manage_finance_property(self):
        """Test can_manage_finance property for different roles."""
        # Roles that can manage finance
        for role in ['finance', 'admin']:
            user = User.objects.create_user(
                username=f'user_{role}',
                email=f'{role}@example.com',
                password='testpass123',
                role=role
            )
            self.assertTrue(user.can_manage_finance, f"Role {role} should be able to manage finance")
        
        # Roles that cannot manage finance
        for role in ['staff', 'approver_lvl1', 'approver_lvl2']:
            user = User.objects.create_user(
                username=f'user_{role}',
                email=f'{role}@example.com',
                password='testpass123',
                role=role
            )
            self.assertFalse(user.can_manage_finance, f"Role {role} should not be able to manage finance")
    
    def test_is_admin_user_property(self):
        """Test is_admin_user property for different roles."""
        # Admin role user
        admin_user = User.objects.create_user(
            username='admin_user',
            email='admin@example.com',
            password='testpass123',
            role='admin'
        )
        self.assertTrue(admin_user.is_admin_user)
        
        # Superuser (regardless of role)
        superuser = User.objects.create_superuser(
            username='superuser',
            email='super@example.com',
            password='testpass123',
            role='staff'
        )
        self.assertTrue(superuser.is_admin_user)
        
        # Regular users
        for role in ['staff', 'approver_lvl1', 'approver_lvl2', 'finance']:
            user = User.objects.create_user(
                username=f'user_{role}',
                email=f'{role}@example.com',
                password='testpass123',
                role=role
            )
            self.assertFalse(user.is_admin_user, f"Role {role} should not be admin user")
    
    def test_user_model_indexes(self):
        """Test that the model has the expected database indexes."""
        # This test verifies the indexes are defined in the model
        # The actual database index creation is tested by the migration
        user_meta = User._meta
        indexes = [index.name for index in user_meta.indexes]
        
        self.assertIn('idx_user_role', indexes)
        self.assertIn('idx_user_email', indexes)


class JWTAuthenticationTestCase(APITestCase):
    """Test JWT authentication endpoints and functionality."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.token_obtain_url = reverse('users:token_obtain_pair')
        self.token_refresh_url = reverse('users:token_refresh')
    
    def test_token_obtain_pair_success(self):
        """Test successful token acquisition."""
        data = {
            'username': 'testuser',
            'password': 'testpass123'
        }
        response = self.client.post(self.token_obtain_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        
        # Verify tokens are strings
        self.assertIsInstance(response.data['access'], str)
        self.assertIsInstance(response.data['refresh'], str)
    
    def test_token_obtain_pair_invalid_credentials(self):
        """Test token acquisition with invalid credentials."""
        data = {
            'username': 'testuser',
            'password': 'wrongpassword'
        }
        response = self.client.post(self.token_obtain_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotIn('access', response.data)
        self.assertNotIn('refresh', response.data)
    
    def test_token_refresh_success(self):
        """Test successful token refresh."""
        # First get tokens
        data = {
            'username': 'testuser',
            'password': 'testpass123'
        }
        response = self.client.post(self.token_obtain_url, data)
        refresh_token = response.data['refresh']
        
        # Now refresh the token
        refresh_data = {'refresh': refresh_token}
        response = self.client.post(self.token_refresh_url, refresh_data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        # Should also include new refresh token due to ROTATE_REFRESH_TOKENS=True
        self.assertIn('refresh', response.data)
    
    def test_token_refresh_invalid_token(self):
        """Test token refresh with invalid refresh token."""
        data = {'refresh': 'invalid_token'}
        response = self.client.post(self.token_refresh_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotIn('access', response.data)
    
    def test_authenticated_request_with_valid_token(self):
        """Test making authenticated request with valid JWT token."""
        # Get access token
        data = {
            'username': 'testuser',
            'password': 'testpass123'
        }
        response = self.client.post(self.token_obtain_url, data)
        access_token = response.data['access']
        
        # Make authenticated request to admin (requires authentication)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
        response = self.client.get('/admin/')
        
        # Should not get 401 (though might get 403 or redirect)
        self.assertNotEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_unauthenticated_request_to_protected_endpoint(self):
        """Test accessing protected endpoint without token."""
        # Try to access a protected endpoint without authentication
        response = self.client.get('/api/requests/')
        
        # Should get 401 Unauthorized due to IsAuthenticated permission
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
