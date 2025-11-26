"""
Unit tests for receipt validation task implementation.

This script tests the enhanced receipt validation functionality
to ensure it meets requirements 6.2, 6.3, and 6.4.
"""

from decimal import Decimal
from django.test import TestCase
from purchases.tasks import (
    _perform_receipt_validation,
    _compare_vendors_detailed,
    _compare_totals_detailed,
    _compare_items_detailed,
    _check_fraud_indicators
)


class ReceiptValidationTaskTest(TestCase):
    """Test detailed receipt validation logic."""

    def test_vendor_comparison(self):
        """Test detailed vendor comparison functionality."""
        # Test exact match
        receipt_vendor = {'name': 'ABC Company Ltd', 'email': 'contact@abc.com'}
        po_vendor = {'name': 'ABC Company Ltd', 'email': 'contact@abc.com'}
        
        result = _compare_vendors_detailed(receipt_vendor, po_vendor)
        self.assertGreaterEqual(result['score'], 0.9, "Exact match should score high")
        
        # Test partial match
        receipt_vendor = {'name': 'ABC Company', 'phone': '555-1234'}
        po_vendor = {'name': 'ABC Company Ltd', 'phone': '555-1234'}
        
        result = _compare_vendors_detailed(receipt_vendor, po_vendor)
        self.assertGreaterEqual(result['score'], 0.7, "Partial match should score reasonably high")
        
        # Test poor match
        receipt_vendor = {'name': 'XYZ Corporation'}
        po_vendor = {'name': 'ABC Company Ltd'}
        
        result = _compare_vendors_detailed(receipt_vendor, po_vendor)
        self.assertLess(result['score'], 0.5, "Poor match should score low")

    def test_totals_comparison(self):
        """Test detailed totals comparison functionality."""
        # Test exact match
        receipt_totals = {'total': 1000.00, 'subtotal': 900.00, 'tax': 100.00}
        po_totals = {'total': 1000.00, 'subtotal': 900.00, 'tax': 100.00}
        
        result = _compare_totals_detailed(receipt_totals, po_totals)
        self.assertEqual(result['score'], 1.0, "Exact match should score 1.0")
        
        # Test small difference (within 1%)
        receipt_totals = {'total': 1005.00}
        po_totals = {'total': 1000.00}
        
        result = _compare_totals_detailed(receipt_totals, po_totals)
        self.assertGreaterEqual(result['score'], 0.9, "Small difference should score high")
        
        # Test large difference
        receipt_totals = {'total': 1200.00}
        po_totals = {'total': 1000.00}
        
        result = _compare_totals_detailed(receipt_totals, po_totals)
        self.assertLess(result['score'], 0.7, "Large difference should score low")

    def test_items_comparison(self):
        """Test detailed items comparison functionality."""
        # Test exact match
        receipt_items = [
            {'description': 'laptop computer', 'quantity': 2, 'unit_price': 500.00},
            {'description': 'wireless mouse', 'quantity': 2, 'unit_price': 25.00}
        ]
        po_items = [
            {'name': 'laptop computer', 'quantity': 2, 'unit_price': 500.00},
            {'name': 'wireless mouse', 'quantity': 2, 'unit_price': 25.00}
        ]
        
        result = _compare_items_detailed(receipt_items, po_items)
        self.assertGreaterEqual(result['score'], 0.9, "Exact match should score high")
        
        # Test partial match with quantity difference
        receipt_items = [
            {'description': 'laptop computer', 'quantity': 3, 'unit_price': 500.00},
            {'description': 'wireless mouse', 'quantity': 2, 'unit_price': 25.00}
        ]
        po_items = [
            {'name': 'laptop computer', 'quantity': 2, 'unit_price': 500.00},
            {'name': 'wireless mouse', 'quantity': 2, 'unit_price': 25.00}
        ]
        
        result = _compare_items_detailed(receipt_items, po_items)
        self.assertLess(result['score'], 1.0, "Quantity difference should reduce score")
        
        # Test missing items
        receipt_items = [
            {'description': 'laptop computer', 'quantity': 2, 'unit_price': 500.00}
        ]
        po_items = [
            {'name': 'laptop computer', 'quantity': 2, 'unit_price': 500.00},
            {'name': 'wireless mouse', 'quantity': 2, 'unit_price': 25.00}
        ]
        
        result = _compare_items_detailed(receipt_items, po_items)
        self.assertGreater(len(result['missing_items']), 0, "Should detect missing items")

    def test_comprehensive_validation(self):
        """Test the complete receipt validation process."""
        # Test case 1: Good receipt that should pass validation
        receipt_data = {
            'vendor': {'name': 'Tech Supplies Inc', 'email': 'orders@techsupplies.com'},
            'items': [
                {'description': 'Dell Laptop', 'quantity': 2, 'unit_price': 800.00},
                {'description': 'Wireless Mouse', 'quantity': 2, 'unit_price': 30.00}
            ],
            'totals': {'total': 1660.00, 'subtotal': 1660.00, 'tax': 0.00},
            'transaction': {'date': '2024-11-20', 'transaction_id': 'TXN123456'}
        }
        
        po_data = {
            'vendor': {'name': 'Tech Supplies Inc'},
            'items': [
                {'name': 'Dell Laptop', 'quantity': 2, 'unit_price': 800.00},
                {'name': 'Wireless Mouse', 'quantity': 2, 'unit_price': 30.00}
            ],
            'totals': {'total': 1660.00},
            'po_number': 'PO-2024000001123'
        }
        
        result = _perform_receipt_validation(receipt_data, po_data)
        
        self.assertGreaterEqual(result['overall_score'], 0.8, "Good receipt should score high")
        self.assertIn(result['confidence_level'], ['HIGH', 'MEDIUM'], "Should have reasonable confidence")
        
        # Test case 2: Problematic receipt that should flag for review
        receipt_data_bad = {
            'vendor': {'name': 'Different Vendor Corp'},
            'items': [
                {'description': 'Some Other Product', 'quantity': 1, 'unit_price': 2000.00}
            ],
            'totals': {'total': 2000.00},
            'transaction': {'date': '2024-11-20'}
        }
        
        result_bad = _perform_receipt_validation(receipt_data_bad, po_data)
        
        self.assertLess(result_bad['overall_score'], 0.6, "Bad receipt should score low")
        self.assertIn('REQUIRES_MANUAL_REVIEW', result_bad['flags'], "Should flag for manual review")
        self.assertGreater(len(result_bad['discrepancies']), 0, "Should detect discrepancies")

    def test_fraud_detection(self):
        """Test fraud indicator detection."""
        receipt_data = {
            'vendor': {'name': 'Suspicious Vendor'},
            'totals': {'total': 5000.00},  # Much higher than PO
            'items': []
        }
        
        po_data = {
            'vendor': {'name': 'Legitimate Vendor Inc'},
            'totals': {'total': 1000.00},
            'items': []
        }
        
        validation_result = {
            'vendor_match': 0.1,  # Very low vendor match
            'overall_score': 0.2
        }
        
        fraud_flags = _check_fraud_indicators(receipt_data, po_data, validation_result)
        
        self.assertIn('SUSPICIOUS_AMOUNT_INCREASE', fraud_flags, "Should detect suspicious amount increase")
        self.assertIn('POTENTIAL_VENDOR_FRAUD', fraud_flags, "Should detect potential vendor fraud")