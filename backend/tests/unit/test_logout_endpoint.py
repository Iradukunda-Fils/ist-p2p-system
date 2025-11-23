#!/usr/bin/env python3
"""
Unit test for the logout endpoint functionality
"""
import os
import sys
import django
from django.conf import settings

# Add the project root to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src'))

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
django.setup()

def test_logout_endpoint():
    """Test that the logout endpoint is working correctly"""
    from django.test import Client
    from django.contrib.auth import get_user_model
    from rest_framework_simplejwt.tokens import RefreshToken
    import json
    
    User = get_user_model()
    client = Client()
    
    try:
        # Create a test user
        user = User.objects.create_user(
            username='testuser',
            password='testpass123',
            email='test@example.com'
        )
        
        # Generate tokens for the user
        refresh = RefreshToken.for_user(user)
        access = refresh.access_token
        
        # print(f"✅ Test user created: {user.username}")
        # print(f"✅ Tokens generated successfully")
        
        # Test logout endpoint with valid token
        response = client.post(
            '/api/auth/logout/',
            data=json.dumps({'refresh': str(refresh)}),
            content_type='application/json',
            HTTP_AUTHORIZATION=f'Bearer {access}'
        )
        
        # print(f"✅ Logout endpoint response status: {response.status_code}")
        
        if response.status_code == 200:
            response_data = json.loads(response.content)
            # print(f"✅ Logout response: {response_data}")
            # print("✅ Logout endpoint working correctly!")
        else:
            # print(f"❌ Logout failed with status {response.status_code}")
            # print(f"Response: {response.content}")
            pass
        
        # Clean up
        user.delete()
        # print("✅ Test user cleaned up")
        
        return response.status_code == 200
        
    except Exception as e:
        # print(f"❌ Error testing logout endpoint: {e}")
        return False

if __name__ == "__main__":
    # print("Testing Django logout endpoint functionality...")
    success = test_logout_endpoint()
    if success:
        # print("\n🎉 Logout endpoint test passed!")
        pass
    else:
        # print("\n❌ Logout endpoint test failed!")
        pass