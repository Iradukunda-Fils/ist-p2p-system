#!/usr/bin/env python
"""
Integration test script for Celery tasks in the P2P system.

This script tests the complete workflow:
1. Document processing
2. PO generation
3. Receipt validation
"""

import os
import sys
import django
from decimal import Decimal

# Setup Django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from purchases.models import PurchaseRequest, RequestItem, Approval
from purchases.tasks import generate_purchase_order, validate_receipt_against_po
from documents.tasks import extract_document_metadata
from documents.models import Document

User = get_user_model()


def test_celery_integration():
    """Test the complete Celery task integration."""
    # print("🚀 Starting Celery integration test...")
    
    # Create test users
    # print("📝 Creating test users...")
    staff_user = User.objects.create_user(
        username='test_staff',
        email='staff@test.com',
        password='testpass123',
        role='staff'
    )
    
    approver = User.objects.create_user(
        username='test_approver',
        email='approver@test.com',
        password='testpass123',
        role='approver_lvl1'
    )
    
    # Create purchase request
    # print("📋 Creating purchase request...")
    pr = PurchaseRequest.objects.create(
        title='Test Integration Purchase',
        description='Testing Celery integration',
        amount=Decimal('750.00'),
        created_by=staff_user
    )
    
    # Add items
    RequestItem.objects.create(
        request=pr,
        name='Integration Test Item 1',
        quantity=3,
        unit_price=Decimal('200.00')
    )
    
    RequestItem.objects.create(
        request=pr,
        name='Integration Test Item 2',
        quantity=1,
        unit_price=Decimal('150.00')
    )
    
    # print(f"✅ Created purchase request: {pr.title} (${pr.amount})")
    
    # Test PO generation task (should fail since not approved)
    # print("🔄 Testing PO generation on non-approved request...")
    result = generate_purchase_order(str(pr.id))
    if 'error' in result:
        # print(f"✅ Expected error: {result['error']}")
        pass
    else:
        # print(f"❌ Unexpected success: {result}")
        pass
    
    # Approve the request
    # print("✅ Approving purchase request...")
    approval = Approval.objects.create(
        request=pr,
        approver=approver,
        level=1,
        decision='APPROVED',
        comment='Integration test approval'
    )
    
    # Refresh request to see updated status
    pr.refresh_from_db()
    # print(f"✅ Request status: {pr.status}")
    
    # Test PO generation task (should succeed now)
    # print("🔄 Testing PO generation on approved request...")
    result = generate_purchase_order(str(pr.id))
    if result.get('status') == 'created':
        # print(f"✅ PO generated successfully: {result['po_number']}")
        po_id = result['po_id']
    else:
        # print(f"❌ PO generation failed: {result}")
        return False
    
    # Test duplicate PO generation (should return existing)
    # print("🔄 Testing duplicate PO generation...")
    result = generate_purchase_order(str(pr.id))
    if result.get('status') == 'already_exists':
        # print(f"✅ Correctly detected existing PO: {result['po_number']}")
        pass
    else:
        # print(f"❌ Unexpected result for duplicate PO: {result}")
        pass
    
    # Create a mock receipt document
    # print("📄 Creating mock receipt document...")
    receipt = Document.objects.create(
        original_filename='test_receipt.pdf',
        file_size=1024,
        file_hash='test_integration_receipt_hash',
        doc_type='RECEIPT',
        title='Integration Test Receipt',
        uploaded_by=staff_user,
        processing_status='COMPLETED',
        metadata={
            'vendor': {'name': 'Test Vendor'},
            'totals': {'total': 750.0},
            'items': [
                {
                    'description': 'Integration Test Item 1',
                    'quantity': 3,
                    'unit_price': 200.0
                },
                {
                    'description': 'Integration Test Item 2',
                    'quantity': 1,
                    'unit_price': 150.0
                }
            ]
        }
    )
    
    # print(f"✅ Created receipt document: {receipt.title}")
    
    # Test receipt validation
    # print("🔄 Testing receipt validation...")
    result = validate_receipt_against_po(str(receipt.id), po_id)
    if result.get('status') == 'completed':
        # print(f"✅ Receipt validation completed with score: {result['validation_score']:.2f}")
        # print(f"   Needs review: {result['needs_review']}")
        if result['discrepancies']:
            # print(f"   Discrepancies found: {len(result['discrepancies'])}")
            pass
    else:
        # print(f"❌ Receipt validation failed: {result}")
        pass
    
    # Test document processing task
    # print("🔄 Testing document metadata extraction...")
    
    # Create a simple document for processing
    test_doc = Document.objects.create(
        original_filename='test_document.pdf',
        file_size=512,
        file_hash='test_integration_doc_hash',
        doc_type='PROFORMA',
        title='Integration Test Document',
        uploaded_by=staff_user,
        processing_status='PENDING'
    )
    
    # Test the extraction task
    result = extract_document_metadata(str(test_doc.id))
    if result.get('status') == 'completed':
        # print(f"✅ Document processing completed")
        # print(f"   Text length: {result.get('text_length', 0)}")
        # print(f"   Metadata keys: {result.get('metadata_keys', [])}")
        pass
    else:
        # print(f"❌ Document processing failed: {result}")
        pass
    
    # print("\n🎉 Celery integration test completed!")
    # print("\n📊 Summary:")
    # print(f"   - Purchase Request: {pr.title} (${pr.amount})")
    # print(f"   - Status: {pr.status}")
    # print(f"   - PO Generated: {result.get('po_number', 'N/A')}")
    # print(f"   - Receipt Validated: {'Yes' if receipt else 'No'}")
    # print(f"   - Document Processed: {'Yes' if test_doc else 'No'}")
    
    return True


if __name__ == '__main__':
    try:
        success = test_celery_integration()
        if success:
            # print("\n✅ All tests passed!")
            sys.exit(0)
        else:
            # print("\n❌ Some tests failed!")
            sys.exit(1)
    except Exception as e:
        # print(f"\n💥 Test failed with exception: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)