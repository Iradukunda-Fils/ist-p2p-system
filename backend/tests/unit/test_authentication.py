#!/usr/bin/env python
"""
Unit tests for JWT authentication and user permissions.
"""
import os
import sys
import django

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src'))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken
from core.permissions import IsStaffUser, IsApproverLevel1, IsApproverLevel2, IsFinanceUser, IsAdminUser

User = get_user_model()

def test_user_model():
    """Test the custom User model with roles."""
    # print("Testing User model...")
    
    # Create a test user
    user = User(username='testuser', email='test@example.com', role='staff')
    user.set_password('testpass123')
    
    # Test validation
    try:
        user.full_clean()
        # print("✓ User model validation passed")
    except Exception as e:
        # print(f"✗ User model validation failed: {e}")
        return False
    
    # Test role properties
    assert user.role == 'staff'
    assert not user.can_approve_level_1
    assert not user.can_approve_level_2
    assert not user.can_manage_finance
    assert not user.is_admin_user
    # print("✓ Staff user role properties correct")
    
    # Test approver level 1
    user.role = 'approver_lvl1'
    assert user.can_approve_level_1
    assert not user.can_approve_level_2
    # print("✓ Approver Level 1 role properties correct")
    
    # Test approver level 2
    user.role = 'approver_lvl2'
    assert user.can_approve_level_1
    assert user.can_approve_level_2
    # print("✓ Approver Level 2 role properties correct")
    
    # Test finance user
    user.role = 'finance'
    assert not user.can_approve_level_1
    assert not user.can_approve_level_2
    assert user.can_manage_finance
    # print("✓ Finance user role properties correct")
    
    # Test admin user
    user.role = 'admin'
    assert user.can_approve_level_1
    assert user.can_approve_level_2
    assert user.can_manage_finance
    assert user.is_admin_user
    # print("✓ Admin user role properties correct")
    
    return True

def test_jwt_tokens():
    """Test JWT token generation."""
    # print("\nTesting JWT tokens...")
    
    # Create a test user
    user = User.objects.create_user(
        username='jwttest',
        email='jwt@example.com',
        password='testpass123',
        role='staff'
    )
    
    # Generate tokens
    refresh = RefreshToken.for_user(user)
    access_token = refresh.access_token
    
    # print(f"✓ JWT tokens generated successfully")
    # print(f"  Access token: {str(access_token)[:50]}...")
    # print(f"  Refresh token: {str(refresh)[:50]}...")
    
    # Clean up
    user.delete()
    return True

def test_permission_classes():
    """Test permission classes."""
    # print("\nTesting permission classes...")
    
    # Create test users with different roles
    staff_user = User(username='staff', role='staff')
    approver1_user = User(username='approver1', role='approver_lvl1')
    approver2_user = User(username='approver2', role='approver_lvl2')
    finance_user = User(username='finance', role='finance')
    admin_user = User(username='admin', role='admin')
    
    # Mock request object
    class MockRequest:
        def __init__(self, user):
            self.user = user
    
    # Test IsStaffUser permission
    staff_perm = IsStaffUser()
    assert staff_perm.has_permission(MockRequest(staff_user), None)
    assert staff_perm.has_permission(MockRequest(approver1_user), None)
    assert staff_perm.has_permission(MockRequest(admin_user), None)
    # print("✓ IsStaffUser permission class working")
    
    # Test IsApproverLevel1 permission
    approver1_perm = IsApproverLevel1()
    assert not approver1_perm.has_permission(MockRequest(staff_user), None)
    assert approver1_perm.has_permission(MockRequest(approver1_user), None)
    assert approver1_perm.has_permission(MockRequest(approver2_user), None)
    assert approver1_perm.has_permission(MockRequest(admin_user), None)
    # print("✓ IsApproverLevel1 permission class working")
    
    # Test IsApproverLevel2 permission
    approver2_perm = IsApproverLevel2()
    assert not approver2_perm.has_permission(MockRequest(staff_user), None)
    assert not approver2_perm.has_permission(MockRequest(approver1_user), None)
    assert approver2_perm.has_permission(MockRequest(approver2_user), None)
    assert approver2_perm.has_permission(MockRequest(admin_user), None)
    # print("✓ IsApproverLevel2 permission class working")
    
    # Test IsFinanceUser permission
    finance_perm = IsFinanceUser()
    assert not finance_perm.has_permission(MockRequest(staff_user), None)
    assert not finance_perm.has_permission(MockRequest(approver1_user), None)
    assert finance_perm.has_permission(MockRequest(finance_user), None)
    assert finance_perm.has_permission(MockRequest(admin_user), None)
    # print("✓ IsFinanceUser permission class working")
    
    # Test IsAdminUser permission
    admin_perm = IsAdminUser()
    assert not admin_perm.has_permission(MockRequest(staff_user), None)
    assert not admin_perm.has_permission(MockRequest(finance_user), None)
    assert admin_perm.has_permission(MockRequest(admin_user), None)
    # print("✓ IsAdminUser permission class working")
    
    return True

def main():
    """Run all tests."""
    # print("=== Testing Django P2P Authentication System ===\n")
    
    try:
        # Test user model
        if not test_user_model():
            return False
        
        # Test JWT tokens
        if not test_jwt_tokens():
            return False
        
        # Test permission classes
        if not test_permission_classes():
            return False
        
        # print("\n=== All tests passed! ===")
        # print("✓ Custom User model with roles working correctly")
        # print("✓ JWT authentication configured properly")
        # print("✓ Role-based permission classes implemented")
        return True
        
    except Exception as e:
        # print(f"\n✗ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)