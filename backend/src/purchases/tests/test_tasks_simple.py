"""
Simple unit tests for receipt validation task functions.

This script tests the core validation logic without requiring
full Django model setup.
"""

from django.test import SimpleTestCase, override_settings
from purchases.tasks import (
    _perform_receipt_validation,
    _extract_receipt_data,
    _extract_po_data
)


@override_settings(RECEIPT_VALIDATION_THRESHOLD=0.8, DOCUMENT_PROCESSING={})
class SimpleReceiptValidationTest(SimpleTestCase):
    """Test receipt validation workflow without DB."""

    def test_receipt_validation_workflow(self):
        """Test the complete receipt validation workflow."""
        
        # Mock receipt document
        class MockReceiptDoc:
            def __init__(self):
                self.metadata = {
                    'vendor': {'name': 'Tech Solutions Inc', 'email': 'orders@techsolutions.com'},
                    'items': [
                        {'description': 'Laptop Computer', 'quantity': 2, 'unit_price': 800.00},
                        {'description': 'Wireless Mouse', 'quantity': 2, 'unit_price': 25.00}
                    ],
                    'totals': {'total': 1650.00, 'subtotal': 1650.00, 'tax': 0.00},
                    'transaction': {'date': '2024-11-20', 'transaction_id': 'TXN123'}
                }
        
        # Mock PO
        class MockPO:
            def __init__(self):
                self.vendor = 'Tech Solutions Inc'
                self.total = 1650.00
                self.po_number = 'PO-2024000001'
                self.data = {
                    'items': [
                        {'name': 'Laptop Computer', 'quantity': 2, 'unit_price': 800.00},
                        {'name': 'Wireless Mouse', 'quantity': 2, 'unit_price': 25.00}
                    ]
                }
            
            def get_items_from_data(self):
                return self.data['items']
        
        # Test data extraction
        receipt_doc = MockReceiptDoc()
        po = MockPO()
        
        receipt_data = _extract_receipt_data(receipt_doc)
        po_data = _extract_po_data(po)
        
        # Test validation
        validation_result = _perform_receipt_validation(receipt_data, po_data)
        
        # Assertions
        self.assertGreaterEqual(validation_result['overall_score'], 0.8, 
                               f"Should have high score for good match, got {validation_result['overall_score']}")
        self.assertGreaterEqual(validation_result['vendor_match'], 0.7, 
                               f"Vendor should match reasonably well, got {validation_result['vendor_match']}")
        self.assertGreaterEqual(validation_result['total_match'], 0.9, "Total should match exactly")
        self.assertGreaterEqual(validation_result['items_match'], 0.8, "Items should match well")
        self.assertIn(validation_result['confidence_level'], ['HIGH', 'MEDIUM'], "Should have reasonable confidence")

    def test_discrepancy_detection(self):
        """Test discrepancy detection with problematic receipt."""
        
        # Mock problematic receipt
        class MockBadReceiptDoc:
            def __init__(self):
                self.metadata = {
                    'vendor': {'name': 'Different Vendor LLC'},  # Wrong vendor
                    'items': [
                        {'description': 'Different Product', 'quantity': 1, 'unit_price': 2000.00}  # Wrong items
                    ],
                    'totals': {'total': 2000.00},  # Wrong total
                    'transaction': {'date': '2024-11-20'}
                }
        
        # Mock PO (same as before)
        class MockPO:
            def __init__(self):
                self.vendor = 'Tech Solutions Inc'
                self.total = 1650.00
                self.po_number = 'PO-2024000001'
                self.data = {
                    'items': [
                        {'name': 'Laptop Computer', 'quantity': 2, 'unit_price': 800.00},
                        {'name': 'Wireless Mouse', 'quantity': 2, 'unit_price': 25.00}
                    ]
                }
            
            def get_items_from_data(self):
                return self.data['items']
        
        receipt_doc = MockBadReceiptDoc()
        po = MockPO()
        
        receipt_data = _extract_receipt_data(receipt_doc)
        po_data = _extract_po_data(po)
        
        validation_result = _perform_receipt_validation(receipt_data, po_data)
        
        # Should detect multiple issues
        self.assertLess(validation_result['overall_score'], 0.6, "Should have low score for bad match")
        self.assertGreaterEqual(len(validation_result['discrepancies']), 2, "Should detect multiple discrepancies")
        self.assertIn('REQUIRES_MANUAL_REVIEW', validation_result['flags'], "Should flag for manual review")
        self.assertEqual(validation_result['confidence_level'], 'LOW', "Should have low confidence")
        
        # Check specific discrepancy types
        discrepancy_types = [d['type'] for d in validation_result['discrepancies']]
        self.assertIn('vendor_mismatch', discrepancy_types, "Should detect vendor mismatch")
        self.assertIn('total_mismatch', discrepancy_types, "Should detect total mismatch")