"""
Tests for Celery tasks in the purchases app.
"""

import json
from decimal import Decimal
from unittest.mock import patch, MagicMock

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone

from purchases.models import PurchaseRequest, RequestItem, PurchaseOrder, Approval
from purchases.tasks import (
    generate_purchase_order,
    generate_po_pdf,
    validate_receipt_against_po,
    notify_finance_team
)
from documents.models import Document

User = get_user_model()


class PurchaseOrderGenerationTaskTests(TestCase):
    """Test cases for PO generation task."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='staff'
        )
        
        self.approver = User.objects.create_user(
            username='approver',
            email='approver@example.com',
            password='testpass123',
            role='approver_lvl1'
        )
        
        # Create a purchase request
        self.purchase_request = PurchaseRequest.objects.create(
            title='Test Purchase Request',
            description='Test description',
            amount=Decimal('500.00'),
            created_by=self.user,
            status='APPROVED',
            last_approved_by=self.approver,
            approved_at=timezone.now()
        )
        
        # Add items to the request
        RequestItem.objects.create(
            request=self.purchase_request,
            name='Test Item 1',
            quantity=2,
            unit_price=Decimal('150.00')
        )
        
        RequestItem.objects.create(
            request=self.purchase_request,
            name='Test Item 2',
            quantity=1,
            unit_price=Decimal('200.00')
        )
    
    def test_generate_purchase_order_success(self):
        """Test successful PO generation."""
        # Execute the task
        result = generate_purchase_order(str(self.purchase_request.id))
        
        # Verify result
        self.assertEqual(result['status'], 'created')
        self.assertEqual(result['request_id'], str(self.purchase_request.id))
        self.assertIn('po_number', result)
        self.assertIn('po_id', result)
        
        # Verify PO was created
        po = PurchaseOrder.objects.get(request=self.purchase_request)
        self.assertEqual(po.total, self.purchase_request.amount)
        self.assertEqual(po.status, 'DRAFT')
        self.assertIsNotNone(po.po_number)
        
        # Verify PO data contains items
        self.assertIn('items', po.data)
        self.assertEqual(len(po.data['items']), 2)
    
    def test_generate_purchase_order_nonexistent_request(self):
        """Test PO generation with non-existent request."""
        result = generate_purchase_order('00000000-0000-0000-0000-000000000000')
        
        self.assertIn('error', result)
        self.assertEqual(result['error'], 'Purchase request not found')
    
    def test_generate_purchase_order_not_approved(self):
        """Test PO generation for non-approved request."""
        # Change request status to pending
        self.purchase_request.status = 'PENDING'
        self.purchase_request.save()
        
        result = generate_purchase_order(str(self.purchase_request.id))
        
        self.assertIn('error', result)
        self.assertEqual(result['error'], 'Purchase request is not approved')
    
    def test_generate_purchase_order_already_exists(self):
        """Test PO generation when PO already exists."""
        # Create existing PO
        existing_po = PurchaseOrder.objects.create(
            po_number='PO-2024000001123',
            request=self.purchase_request,
            vendor='Test Vendor',
            total=self.purchase_request.amount
        )
        
        result = generate_purchase_order(str(self.purchase_request.id))
        
        self.assertEqual(result['status'], 'already_exists')
        self.assertEqual(result['po_number'], existing_po.po_number)


class POPDFGenerationTaskTests(TestCase):
    """Test cases for PO PDF generation task."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='staff'
        )
        
        self.purchase_request = PurchaseRequest.objects.create(
            title='Test Purchase Request',
            description='Test description',
            amount=Decimal('500.00'),
            created_by=self.user,
            status='APPROVED'
        )
        
        self.po = PurchaseOrder.objects.create(
            po_number='PO-2024000001123',
            request=self.purchase_request,
            vendor='Test Vendor',
            total=self.purchase_request.amount
        )
    
    @patch('purchases.tasks._generate_po_pdf_content')
    def test_generate_po_pdf_success(self, mock_pdf_content):
        """Test successful PDF generation."""
        mock_pdf_content.return_value = b'fake pdf content'
        
        result = generate_po_pdf(str(self.po.id))
        
        self.assertEqual(result['status'], 'generated')
        self.assertEqual(result['po_number'], self.po.po_number)
        self.assertIn('document_id', result)
        
        # Verify document was created
        self.po.refresh_from_db()
        self.assertIsNotNone(self.po.pdf_document)
        self.assertEqual(self.po.pdf_document.doc_type, 'PO')
    
    def test_generate_po_pdf_nonexistent_po(self):
        """Test PDF generation with non-existent PO."""
        result = generate_po_pdf('00000000-0000-0000-0000-000000000000')
        
        self.assertIn('error', result)
        self.assertEqual(result['error'], 'Purchase order not found')


class ReceiptValidationTaskTests(TestCase):
    """Test cases for receipt validation task."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='staff'
        )
        
        self.purchase_request = PurchaseRequest.objects.create(
            title='Test Purchase Request',
            description='Test description',
            amount=Decimal('500.00'),
            created_by=self.user,
            status='APPROVED'
        )
        
        self.po = PurchaseOrder.objects.create(
            po_number='PO-2024000001123',
            request=self.purchase_request,
            vendor='Test Vendor',
            total=self.purchase_request.amount,
            data={
                'items': [
                    {
                        'name': 'Test Item',
                        'quantity': 2,
                        'unit_price': 250.0,
                        'line_total': 500.0
                    }
                ]
            }
        )
        
        # Create receipt document
        self.receipt = Document.objects.create(
            original_filename='receipt.pdf',
            file_size=1024,
            file_hash='test_hash_receipt',
            doc_type='RECEIPT',
            title='Test Receipt',
            uploaded_by=self.user,
            processing_status='COMPLETED',
            metadata={
                'vendor': {'name': 'Test Vendor'},
                'totals': {'total': 500.0},
                'items': [
                    {
                        'description': 'Test Item',
                        'quantity': 2,
                        'unit_price': 250.0
                    }
                ]
            }
        )
    
    @patch('purchases.tasks.notify_finance_team')
    def test_validate_receipt_success(self, mock_notify):
        """Test successful receipt validation."""
        result = validate_receipt_against_po(str(self.receipt.id), str(self.po.id))
        
        self.assertEqual(result['status'], 'completed')
        self.assertEqual(result['po_number'], self.po.po_number)
        self.assertIn('validation_score', result)
        self.assertFalse(result['needs_review'])  # Should be high score
        
        # Verify validation results stored in receipt metadata
        self.receipt.refresh_from_db()
        self.assertIn('validation', self.receipt.metadata)
        validation_data = self.receipt.metadata['validation']
        self.assertEqual(validation_data['po_number'], self.po.po_number)
        self.assertIn('results', validation_data)
    
    def test_validate_receipt_nonexistent_documents(self):
        """Test validation with non-existent documents."""
        result = validate_receipt_against_po(
            '00000000-0000-0000-0000-000000000000',
            '00000000-0000-0000-0000-000000000000'
        )
        
        self.assertIn('error', result)
    
    @patch('purchases.tasks.notify_finance_team')
    def test_validate_receipt_low_score(self, mock_notify):
        """Test receipt validation with low score triggering review."""
        # Modify receipt to have different vendor
        self.receipt.metadata['vendor']['name'] = 'Different Vendor'
        self.receipt.metadata['totals']['total'] = 600.0  # Different total
        self.receipt.save()
        
        result = validate_receipt_against_po(str(self.receipt.id), str(self.po.id))
        
        self.assertEqual(result['status'], 'completed')
        self.assertTrue(result['needs_review'])
        self.assertGreater(len(result['discrepancies']), 0)
        
        # Verify finance team was notified
        mock_notify.delay.assert_called_once()


class NotificationTaskTests(TestCase):
    """Test cases for notification task."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='staff'
        )
        
        self.finance_user = User.objects.create_user(
            username='finance',
            email='finance@example.com',
            password='testpass123',
            role='finance'
        )
        
        self.purchase_request = PurchaseRequest.objects.create(
            title='Test Purchase Request',
            description='Test description',
            amount=Decimal('500.00'),
            created_by=self.user,
            status='APPROVED'
        )
        
        self.po = PurchaseOrder.objects.create(
            po_number='PO-2024000001123',
            request=self.purchase_request,
            vendor='Test Vendor',
            total=self.purchase_request.amount
        )
    
    def test_notify_finance_team_success(self):
        """Test successful finance team notification."""
        validation_result = {
            'overall_score': 0.5,
            'discrepancies': [
                {'type': 'vendor_mismatch', 'score': 0.3}
            ]
        }
        
        result = notify_finance_team(str(self.po.id), validation_result)
        
        self.assertEqual(result['status'], 'sent')
        self.assertEqual(result['po_number'], self.po.po_number)
        self.assertIn('notified_users', result)
        self.assertIn('finance', result['notified_users'])
    
    def test_notify_finance_team_no_finance_users(self):
        """Test notification when no finance users exist."""
        # Delete finance user
        self.finance_user.delete()
        
        validation_result = {'overall_score': 0.5}
        
        result = notify_finance_team(str(self.po.id), validation_result)
        
        self.assertIn('warning', result)
        self.assertEqual(result['warning'], 'No finance team users to notify')
    
    def test_notify_finance_team_nonexistent_po(self):
        """Test notification with non-existent PO."""
        validation_result = {'overall_score': 0.5}
        
        result = notify_finance_team('00000000-0000-0000-0000-000000000000', validation_result)
        
        self.assertIn('error', result)
        self.assertEqual(result['error'], 'Purchase order not found')


class TaskHelperFunctionTests(TestCase):
    """Test cases for task helper functions."""
    
    def test_po_number_generation(self):
        """Test PO number generation helper."""
        from purchases.tasks import _generate_unique_po_number
        
        po_number = _generate_unique_po_number()
        
        # Verify format: PO-YYYYNNNNNNXXX
        self.assertTrue(po_number.startswith('PO-2024'))
        self.assertEqual(len(po_number), 17)  # PO- + 4 + 6 + 3
    
    def test_vendor_extraction_from_proforma(self):
        """Test vendor extraction from proforma metadata."""
        from purchases.tasks import _extract_vendor_from_proforma
        
        # Test with valid proforma
        proforma = MagicMock()
        proforma.metadata = {
            'vendor': {
                'name': 'Test Vendor Inc.',
                'email': 'vendor@test.com',
                'phone': '123-456-7890'
            }
        }
        
        vendor_info = _extract_vendor_from_proforma(proforma)
        
        self.assertEqual(vendor_info['name'], 'Test Vendor Inc.')
        self.assertIn('vendor@test.com', vendor_info['contact'])
        
        # Test with no proforma
        vendor_info = _extract_vendor_from_proforma(None)
        self.assertEqual(vendor_info['name'], 'Unknown Vendor')
    
    def test_receipt_data_extraction(self):
        """Test receipt data extraction helper."""
        from purchases.tasks import _extract_receipt_data
        
        receipt = MagicMock()
        receipt.metadata = {
            'vendor': {'name': 'Test Store'},
            'totals': {'total': 100.0},
            'items': [{'description': 'Item 1', 'quantity': 1}]
        }
        
        receipt_data = _extract_receipt_data(receipt)
        
        self.assertEqual(receipt_data['vendor']['name'], 'Test Store')
        self.assertEqual(receipt_data['totals']['total'], 100.0)
        self.assertEqual(len(receipt_data['items']), 1)
    
    def test_validation_comparison_functions(self):
        """Test validation comparison helper functions."""
        from purchases.tasks import _compare_vendors, _compare_totals, _compare_items
        
        # Test vendor comparison
        vendor1 = {'name': 'Test Vendor Inc.'}
        vendor2 = {'name': 'Test Vendor Inc.'}
        vendor3 = {'name': 'Different Vendor'}
        
        self.assertEqual(_compare_vendors(vendor1, vendor2), 1.0)
        self.assertLess(_compare_vendors(vendor1, vendor3), 0.5)
        
        # Test total comparison
        totals1 = {'total': 100.0}
        totals2 = {'total': 100.0}
        totals3 = {'total': 150.0}
        
        self.assertEqual(_compare_totals(totals1, totals2), 1.0)
        self.assertLess(_compare_totals(totals1, totals3), 1.0)
        
        # Test items comparison
        items1 = [{'name': 'Item 1'}, {'name': 'Item 2'}]
        items2 = [{'name': 'Item 1'}, {'name': 'Item 2'}]
        items3 = [{'name': 'Item 3'}]
        
        self.assertGreater(_compare_items(items1, items2), 0.5)
        self.assertLess(_compare_items(items1, items3), 0.5)