"""
Test cases for receipt validation functionality.

This module tests the receipt validation logic and status reporting
to ensure validation results are properly calculated and stored.
"""

from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile

from .models import PurchaseRequest, RequestItem, PurchaseOrder
from documents.models import Document
from .receipt_validation import ReceiptValidator, validate_receipt_against_po

User = get_user_model()


class ReceiptValidationTestCase(TestCase):
    """
    Test cases for receipt validation functionality.
    """
    
    def setUp(self):
        """Set up test data."""
        # Create test user
        self.staff_user = User.objects.create_user(
            username='staff_user',
            email='staff@example.com',
            password='testpass123',
            role='staff'
        )
        
        # Create test purchase request (start as PENDING to allow item creation)
        self.purchase_request = PurchaseRequest.objects.create(
            title='Test Purchase Request',
            description='Test description',
            amount=Decimal('500.00'),
            status='PENDING',
            created_by=self.staff_user
        )
        
        # Create test items
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
        
        # Now change status to APPROVED (must be approved for receipt submission)
        self.purchase_request.status = 'APPROVED'
        self.purchase_request.save()
        
        # Create associated purchase order
        self.purchase_order = PurchaseOrder.objects.create(
            request=self.purchase_request,
            vendor='Test Vendor',
            total=self.purchase_request.amount,
            data={
                'items': [
                    {'name': 'Test Item 1', 'quantity': 2, 'unit_price': 150.00},
                    {'name': 'Test Item 2', 'quantity': 1, 'unit_price': 200.00}
                ]
            }
        )
        
        # Create test receipt document
        test_file = SimpleUploadedFile(
            'test_receipt.pdf',
            b'test file content',
            content_type='application/pdf'
        )
        
        self.receipt_document = Document.objects.create(
            file=test_file,
            doc_type='RECEIPT',
            title='Test Receipt',
            uploaded_by=self.staff_user
        )
    
    def test_receipt_validator_initialization(self):
        """Test ReceiptValidator initialization."""
        validator = ReceiptValidator(self.receipt_document, self.purchase_order)
        
        self.assertEqual(validator.receipt_document, self.receipt_document)
        self.assertEqual(validator.purchase_order, self.purchase_order)
    
    def test_validate_receipt_success(self):
        """Test successful receipt validation."""
        validator = ReceiptValidator(self.receipt_document, self.purchase_order)
        result = validator.validate_receipt()
        
        # Check that validation result contains expected fields
        self.assertIn('vendor_match', result)
        self.assertIn('total_match', result)
        self.assertIn('items_match', result)
        self.assertIn('match_score', result)
        self.assertIn('discrepancies', result)
        self.assertIn('needs_manual_review', result)
        self.assertIn('validation_timestamp', result)
        
        # Check that match score is calculated
        self.assertIsInstance(result['match_score'], float)
        self.assertGreaterEqual(result['match_score'], 0.0)
        self.assertLessEqual(result['match_score'], 1.0)
        
        # Check that validation results are stored in document metadata
        self.receipt_document.refresh_from_db()
        self.assertIsNotNone(self.receipt_document.metadata)
        self.assertIn('validation', self.receipt_document.metadata)
        self.assertEqual(
            self.receipt_document.metadata['validation']['match_score'],
            result['match_score']
        )
    
    def test_vendor_comparison_exact_match(self):
        """Test vendor comparison with exact match."""
        validator = ReceiptValidator(self.receipt_document, self.purchase_order)
        
        result = validator._compare_vendors('Test Vendor', 'Test Vendor')
        
        self.assertEqual(result['score'], 1.0)
        self.assertTrue(result['match'])
        self.assertIsNone(result['issue'])
    
    def test_vendor_comparison_partial_match(self):
        """Test vendor comparison with partial match."""
        validator = ReceiptValidator(self.receipt_document, self.purchase_order)
        
        result = validator._compare_vendors('Test Vendor Inc', 'Test Vendor')
        
        self.assertEqual(result['score'], 0.8)
        self.assertTrue(result['match'])  # 0.8 >= 0.8 threshold
        self.assertIsNone(result['issue'])
    
    def test_vendor_comparison_no_match(self):
        """Test vendor comparison with no match."""
        validator = ReceiptValidator(self.receipt_document, self.purchase_order)
        
        result = validator._compare_vendors('Different Vendor', 'Test Vendor')
        
        self.assertEqual(result['score'], 0.0)
        self.assertFalse(result['match'])
        self.assertIsNotNone(result['issue'])
    
    def test_total_comparison_exact_match(self):
        """Test total comparison with exact match."""
        validator = ReceiptValidator(self.receipt_document, self.purchase_order)
        
        result = validator._compare_totals(500.00, 500.00)
        
        self.assertEqual(result['score'], 1.0)
        self.assertTrue(result['match'])
        self.assertIsNone(result['issue'])
    
    def test_total_comparison_small_difference(self):
        """Test total comparison with small difference."""
        validator = ReceiptValidator(self.receipt_document, self.purchase_order)
        
        result = validator._compare_totals(502.50, 500.00)  # 0.5% difference
        
        self.assertEqual(result['score'], 1.0)  # Within 1%
        self.assertTrue(result['match'])
        self.assertIsNone(result['issue'])
    
    def test_total_comparison_large_difference(self):
        """Test total comparison with large difference."""
        validator = ReceiptValidator(self.receipt_document, self.purchase_order)
        
        result = validator._compare_totals(600.00, 500.00)  # 20% difference
        
        self.assertEqual(result['score'], 0.0)
        self.assertFalse(result['match'])
        self.assertIsNotNone(result['issue'])
    
    def test_items_comparison_full_match(self):
        """Test items comparison with full match."""
        validator = ReceiptValidator(self.receipt_document, self.purchase_order)
        
        receipt_items = [
            {'name': 'Test Item 1', 'quantity': 2},
            {'name': 'Test Item 2', 'quantity': 1}
        ]
        po_items = [
            {'name': 'Test Item 1', 'quantity': 2},
            {'name': 'Test Item 2', 'quantity': 1}
        ]
        
        result = validator._compare_items(receipt_items, po_items)
        
        self.assertEqual(result['score'], 1.0)
        self.assertTrue(result['match'])
        self.assertEqual(result['matched_items'], 2)
        self.assertIsNone(result['issue'])
    
    def test_items_comparison_partial_match(self):
        """Test items comparison with partial match."""
        validator = ReceiptValidator(self.receipt_document, self.purchase_order)
        
        receipt_items = [
            {'name': 'Test Item 1', 'quantity': 2},
            {'name': 'Different Item', 'quantity': 1}
        ]
        po_items = [
            {'name': 'Test Item 1', 'quantity': 2},
            {'name': 'Test Item 2', 'quantity': 1}
        ]
        
        result = validator._compare_items(receipt_items, po_items)
        
        self.assertEqual(result['score'], 0.5)  # 1 out of 2 items matched
        self.assertFalse(result['match'])  # 0.5 < 0.7 threshold
        self.assertEqual(result['matched_items'], 1)
        self.assertIsNotNone(result['issue'])
    
    def test_overall_score_calculation(self):
        """Test overall score calculation from individual scores."""
        validator = ReceiptValidator(self.receipt_document, self.purchase_order)
        
        vendor_match = {'score': 1.0}
        total_match = {'score': 0.9}
        items_match = {'score': 0.8}
        
        score = validator._calculate_overall_score(vendor_match, total_match, items_match)
        
        # Expected: 1.0 * 0.2 + 0.9 * 0.5 + 0.8 * 0.3 = 0.2 + 0.45 + 0.24 = 0.89
        self.assertEqual(score, 0.89)
    
    def test_validate_receipt_against_po_function(self):
        """Test the standalone validation function."""
        result = validate_receipt_against_po(
            str(self.receipt_document.id),
            str(self.purchase_order.id)
        )
        
        # Check that validation result contains expected fields
        self.assertIn('match_score', result)
        self.assertIn('needs_manual_review', result)
        self.assertIn('validation_timestamp', result)
        
        # Check that document was updated
        self.receipt_document.refresh_from_db()
        self.assertEqual(self.receipt_document.processing_status, 'COMPLETED')
        self.assertIsNotNone(self.receipt_document.processed_at)
        self.assertIn('validation', self.receipt_document.metadata)
    
    def test_validate_receipt_against_po_invalid_document(self):
        """Test validation function with invalid document ID."""
        import uuid
        invalid_uuid = str(uuid.uuid4())  # Valid UUID format but non-existent
        
        with self.assertRaises(ValueError) as context:
            validate_receipt_against_po(invalid_uuid, str(self.purchase_order.id))
        
        self.assertIn('Receipt document not found', str(context.exception))
    
    def test_validate_receipt_against_po_invalid_po(self):
        """Test validation function with invalid PO ID."""
        import uuid
        invalid_uuid = str(uuid.uuid4())  # Valid UUID format but non-existent
        
        with self.assertRaises(ValueError) as context:
            validate_receipt_against_po(str(self.receipt_document.id), invalid_uuid)
        
        self.assertIn('Purchase order not found', str(context.exception))
    
    def test_discrepancy_identification(self):
        """Test discrepancy identification from validation results."""
        validator = ReceiptValidator(self.receipt_document, self.purchase_order)
        
        vendor_match = {'score': 0.5, 'match': False, 'issue': 'Vendor name mismatch'}
        total_match = {'score': 0.8, 'match': False, 'issue': 'Total amount differs by 15%'}
        items_match = {'score': 1.0, 'match': True, 'issue': None}
        
        discrepancies = validator._identify_discrepancies(vendor_match, total_match, items_match)
        
        self.assertEqual(len(discrepancies), 2)
        self.assertIn('Vendor: Vendor name mismatch', discrepancies)
        self.assertIn('Total: Total amount differs by 15%', discrepancies)
    
    def test_validation_with_missing_data(self):
        """Test validation behavior with missing data."""
        validator = ReceiptValidator(self.receipt_document, self.purchase_order)
        
        # Test with missing vendor
        result = validator._compare_vendors(None, 'Test Vendor')
        self.assertEqual(result['score'], 0.0)
        self.assertFalse(result['match'])
        self.assertIn('Missing vendor information', result['issue'])
        
        # Test with missing total
        result = validator._compare_totals(None, 500.00)
        self.assertEqual(result['score'], 0.0)
        self.assertFalse(result['match'])
        self.assertIn('Missing total amount', result['issue'])
        
        # Test with missing items
        result = validator._compare_items([], [{'name': 'Item 1'}])
        self.assertEqual(result['score'], 0.0)
        self.assertFalse(result['match'])
        self.assertIn('Missing item information', result['issue'])