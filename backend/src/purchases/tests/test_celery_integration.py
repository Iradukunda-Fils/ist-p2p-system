"""
Integration test script for Celery tasks in the P2P system.

This script tests the complete workflow:
1. Document processing
2. PO generation
3. Receipt validation
"""

from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from purchases.models import PurchaseRequest, RequestItem, Approval
from purchases.tasks import generate_purchase_order, validate_receipt_against_po
from documents.tasks import extract_document_metadata
from documents.models import Document

User = get_user_model()


class CeleryIntegrationTest(TestCase):
    """Test the complete Celery task integration."""

    def test_celery_integration(self):
        """Test the complete Celery task integration."""
        
        # Create test users
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
        
        # Test PO generation task (should fail since not approved)
        result = generate_purchase_order(str(pr.id))
        self.assertIn('error', result)
        
        # Approve the request
        Approval.objects.create(
            request=pr,
            approver=approver,
            level=1,
            decision='APPROVED',
            comment='Integration test approval'
        )
        
        # Refresh request to see updated status
        pr.refresh_from_db()
        
        # Test PO generation task (should succeed now)
        result = generate_purchase_order(str(pr.id))
        self.assertEqual(result.get('status'), 'created')
        po_id = result['po_id']
        
        # Test duplicate PO generation (should return existing)
        result = generate_purchase_order(str(pr.id))
        self.assertEqual(result.get('status'), 'already_exists')
        
        # Create a mock receipt document
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
        
        # Test receipt validation
        result = validate_receipt_against_po(str(receipt.id), po_id)
        self.assertEqual(result.get('status'), 'completed')
        
        # Test document processing task
        
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
        self.assertEqual(result.get('status'), 'completed')