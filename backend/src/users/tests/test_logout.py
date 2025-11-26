"""
Unit test for the logout endpoint functionality
"""
import json
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


class LogoutTest(TestCase):
    """Test the logout endpoint functionality"""

    def test_logout_endpoint(self):
        """Test that the logout endpoint is working correctly"""
        client = Client()
        
        # Create a test user
        user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            email='test@example.com'
        )
        
        # Generate tokens for the user
        refresh = RefreshToken.for_user(user)
        access = refresh.access_token
        
        # Test logout endpoint with valid token
        response = client.post(
            '/api/auth/logout/',
            data=json.dumps({'refresh': str(refresh)}),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {access}'
        )
        
        self.assertEqual(response.status_code, 200)
        
        response_data = json.loads(response.content)
        # Verify response structure if needed, e.g. success message