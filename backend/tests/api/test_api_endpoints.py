#!/usr/bin/env python
"""
API Testing Script for P2P Procurement System
Tests all major API endpoints with different user roles.
"""
import os
import sys
import django
import requests
from decimal import Decimal

# Get the directory where the script is located
script_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.join(script_dir, '..', '..', 'src')

# Add the src directory to Python path
sys.path.insert(0, src_dir)

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

# API Base URL
BASE_URL = "http://127.0.0.1:8000"

def create_test_users():
    """Create test users with different roles."""
    # print("\n" + "="*80)
    # print("Creating Test Users")
    # print("="*80)
    
    users = []
    
    # Create staff user
    try:
        staff_user = User.objects.get(username='staff_user')
        # print(f"[OK] Staff user already exists: {staff_user.username}")
    except User.DoesNotExist:
        staff_user = User(
            username='staff_user',
            email='staff@example.com',
            first_name='Staff',
            last_name='User',
            role='staff'
        )
        staff_user.set_password('testpass123')
        staff_user.save()
        # print(f"[OK] Created staff user: {staff_user.username}")
    users.append(('staff', staff_user))
    
    # Create approver level 1 user
    try:
        approver1 = User.objects.get(username='approver_lvl1')
        # print(f"[OK] Approver level 1 already exists: {approver1.username}")
    except User.DoesNotExist:
        approver1 = User(
            username='approver_lvl1',
            email='approver1@example.com',
            first_name='Approver',
            last_name='Level1',
            role='approver_lvl1'
        )
        approver1.set_password('testpass123')
        approver1.save()
        # print(f"[OK] Created approver level 1: {approver1.username}")
    users.append(('approver_lvl1', approver1))
    
    # Create approver level 2 user
    try:
        approver2 = User.objects.get(username='approver_lvl2')
        # print(f"[OK] Approver level 2 already exists: {approver2.username}")
    except User.DoesNotExist:
        approver2 = User(
            username='approver_lvl2',
            email='approver2@example.com',
            first_name='Approver',
            last_name='Level2',
            role='approver_lvl2'
        )
        approver2.set_password('testpass123')
        approver2.save()
        # print(f"[OK] Created approver level 2: {approver2.username}")
    users.append(('approver_lvl2', approver2))
    
    # Create finance user
    try:
        finance_user = User.objects.get(username='finance_user')
        # print(f"[OK] Finance user already exists: {finance_user.username}")
    except User.DoesNotExist:
        finance_user = User(
            username='finance_user',
            email='finance@example.com',
            first_name='Finance',
            last_name='User',
            role='finance'
        )
        finance_user.set_password('testpass123')
        finance_user.save()
        # print(f"[OK] Created finance user: {finance_user.username}")
    users.append(('finance', finance_user))
    
    # Create admin user
    try:
        admin_user = User.objects.get(username='admin_user')
        # print(f"[OK] Admin user already exists: {admin_user.username}")
    except User.DoesNotExist:
        admin_user = User(
            username='admin_user',
            email='admin@example.com',
            first_name='Admin',
            last_name='User',
            role='admin',
            is_staff=True,
            is_superuser=True
        )
        admin_user.set_password('testpass123')
        admin_user.save()
        # print(f"[OK] Created admin user: {admin_user.username}")
    users.append(('admin', admin_user))
    
    return users

def get_auth_token(username, password='testpass123'):
    """Get JWT token for a user."""
    url = f"{BASE_URL}/api/auth/api/auth/token/"
    try:
        response = requests.post(url, json={
            'username': username,
            'password': password
        })
        if response.status_code == 200:
            data = response.json()
            return data.get('access')
        else:
            # print(f"✗ Failed to get token for {username}: {response.status_code}")
            # print(f"  Response: {response.text}")
            return None
    except Exception as e:
        # print(f"✗ Error getting token for {username}: {e}")
        return None

def test_health_check():
    """Test the health check endpoint."""
    # print("\n" + "="*80)
    # print("Testing Health Check API")
    # print("="*80)
    
    url = f"{BASE_URL}/api/core/health/"
    try:
        response = requests.get(url)
        # print(f"GET {url}")
        # print(f"Status Code: {response.status_code}")
        # print(f"Response: {response.json() if response.status_code == 200 else response.text}")
        return response.status_code == 200
    except Exception as e:
        # print(f"✗ Error: {e}")
        return False

def test_storage_status():
    """Test the storage status endpoint."""
    # print("\n" + "="*80)
    # print("Testing Storage Status API")
    # print("="*80)
    
    url = f"{BASE_URL}/api/core/storage-status/"
    try:
        response = requests.get(url)
        # print(f"GET {url}")
        # print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            # print(f"Response: {response.json()}")
            pass
        else:
            # print(f"Response: {response.text[:200]}")
            pass
        return response.status_code == 200
    except Exception as e:
        # print(f"✗ Error: {e}")
        return False

def test_authentication():
    """Test JWT authentication."""
    # print("\n" + "="*80)
    # print("Testing JWT Authentication")
    # print("="*80)
    
    # Test token endpoint
    url = f"{BASE_URL}/api/auth/api/auth/token/"
    # print(f"\nPOST {url}")
    
    try:
        response = requests.post(url, json={
            'username': 'staff_user',
            'password': 'testpass123'
        })
        # print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            # print(f"✓ Authentication successful")
            # print(f"  Access Token: {data.get('access', '')[:50]}...")
            # print(f"  Refresh Token: {data.get('refresh', '')[:50]}...")
            return True
        else:
            # print(f"✗ Authentication failed")
            # print(f"  Response: {response.text}")
            return False
    except Exception as e:
        # print(f"✗ Error: {e}")
        return False

def test_purchase_requests(token):
    """Test purchase request endpoints."""
    # print("\n" + "="*80)
    # print("Testing Purchase Request APIs")
    # print("="*80)
    
    headers = {'Authorization': f'Bearer {token}'}
    
    # Test list purchase requests
    url = f"{BASE_URL}/api/purchases/requests/"
    # print(f"\n1. List Purchase Requests")
    # print(f"GET {url}")
    
    try:
        response = requests.get(url, headers=headers)
        # print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            # print(f"✓ Found {len(data.get('results', []))} purchase requests")
            pass
        else:
            # print(f"Response: {response.text[:200]}")
            pass
    except Exception as e:
        # print(f"✗ Error: {e}")
        pass
    
    # Test create purchase request
    # print(f"\n2. Create Purchase Request")
    # print(f"POST {url}")
    
    try:
        request_data = {
            "title": "Test Purchase Request",
            "description": "Testing API creation",
            "total_amount": "500.00",
            "line_items": [
                {
                    "description": "Test Item 1",
                    "quantity": 2,
                    "unit_price": "150.00",
                    "total_price": "300.00"
                },
                {
                    "description": "Test Item 2",
                    "quantity": 1,
                    "unit_price": "200.00",
                    "total_price": "200.00"
                }
            ]
        }
        
        response = requests.post(url, json=request_data, headers=headers)
        # print(f"Status Code: {response.status_code}")
        
        if response.status_code == 201:
            data = response.json()
            # print(f"✓ Successfully created purchase request")
            # print(f"  ID: {data.get('id')}")
            # print(f"  Title: {data.get('title')}")
            # print(f"  Status: {data.get('status')}")
            # print(f"  Total Amount: ${data.get('total_amount')}")
            return data.get('id')
        else:
            # print(f"✗ Failed to create purchase request")
            # print(f"  Response: {response.text}")
            pass
    except Exception as e:
        # print(f"✗ Error: {e}")
        pass
    
    return None

def test_purchase_orders(token):
    """Test purchase order endpoints."""
    # print("\n" + "="*80)
    # print("Testing Purchase Order APIs")
    # print("="*80)
    
    headers = {'Authorization': f'Bearer {token}'}
    
    # Test list purchase orders
    url = f"{BASE_URL}/api/purchases/purchase-orders/"
    # print(f"\n1. List Purchase Orders")
    # print(f"GET {url}")
    
    try:
        response = requests.get(url, headers=headers)
        # print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            results = data.get('results', [])
            # print(f"✓ Found {len(results)} purchase orders")
            if results:
                # print(f"\nSample PO:")
                po = results[0]
                # print(f"  PO Number: {po.get('po_number')}")
                # print(f"  Status: {po.get('status')}")
                # print(f"  Total Amount: ${po.get('total_amount')}")
                pass
        else:
            # print(f"Response: {response.text[:200]}")
            pass
    except Exception as e:
        # print(f"✗ Error: {e}")
        pass
    
    # Test summary endpoint
    url = f"{BASE_URL}/api/purchases/purchase-orders/summary/"
    # print(f"\n2. Get Purchase Order Summary")
    # print(f"GET {url}")
    
    try:
        response = requests.get(url, headers=headers)
        # print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            # print(f"✓ Summary retrieved successfully")
            for key, value in data.items():
                # print(f"  {key}: {value}")
                pass
        else:
            # print(f"Response: {response.text[:200]}")
            pass
    except Exception as e:
        # print(f"✗ Error: {e}")
        pass

def test_api_documentation():
    """Test API documentation endpoints."""
    # print("\n" + "="*80)
    # print("Testing API Documentation")
    # print("="*80)
    
    # Test schema endpoint
    url = f"{BASE_URL}/api/schema/"
    # print(f"\nGET {url}")
    try:
        response = requests.get(url)
        # print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            # print(f"✓ OpenAPI schema available")
            # print(f"  Schema size: {len(response.text)} bytes")
            pass
        else:
            # print(f"✗ Schema not available")
            pass
    except Exception as e:
        # print(f"✗ Error: {e}")
        pass
    
    # Test Swagger UI
    url = f"{BASE_URL}/api/docs/"
    # print(f"\nGET {url}")
    try:
        response = requests.get(url)
        # print(f"Status Code: {response.status_code}")
        if response.status_code == 200:
            # print(f"✓ Swagger UI available at {url}")
            pass
        else:
            # print(f"✗ Swagger UI not available")
            pass
    except Exception as e:
        # print(f"✗ Error: {e}")
        pass

def main():
    """Run all API tests."""
    # print("\n" + "="*80)
    # print("P2P PROCUREMENT SYSTEM - API TESTING")
    # print("="*80)
    # print(f"Base URL: {BASE_URL}")
    # print(f"Testing all major API endpoints...")
    
    try:
        # Create test users
        users = create_test_users()
        
        # Test health check (no auth required)
        test_health_check()
        
        # Test storage status (no auth required)
        test_storage_status()
        
        # Test authentication
        test_authentication()
        
        # Get token for staff user
        token = get_auth_token('staff_user')
        
        if token:
            # print(f"\n✓ Successfully obtained auth token for staff_user")
            
            # Test purchase requests
            test_purchase_requests(token)
            
            # Test purchase orders (using finance user)
            finance_token = get_auth_token('finance_user')
            if finance_token:
                test_purchase_orders(finance_token)
        else:
            # print(f"\n✗ Failed to obtain auth token, skipping authenticated tests")
            pass
        
        # Test API documentation
        test_api_documentation()
        
        # print("\n" + "="*80)
        # print("API Testing Complete!")
        # print("="*80)
        # print("\nTest Users Created:")
        # print("  • staff_user (password: testpass123) - Can create purchase requests")
        # print("  • approver_lvl1 (password: testpass123) - Can approve requests <= $1000")
        # print("  • approver_lvl2 (password: testpass123) - Can approve all requests")
        # print("  • finance_user (password: testpass123) - Can manage purchase orders")
        # print("  • admin_user (password: testpass123) - Full system access")
        # print("\nAPI Documentation:")
        # print(f"  • Swagger UI: {BASE_URL}/api/docs/")
        # print(f"  • ReDoc: {BASE_URL}/api/redoc/")
        # print(f"  • OpenAPI Schema: {BASE_URL}/api/schema/")
        
    except Exception as e:
        # print(f"\n✗ Test failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main()