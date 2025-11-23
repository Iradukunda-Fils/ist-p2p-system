#!/usr/bin/env python
"""
Unit tests for receipt validation task implementation.

This script tests the enhanced receipt validation functionality
to ensure it meets requirements 6.2, 6.3, and 6.4.
"""

import os
import sys
import django
from decimal import Decimal

# Add the src directory to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src'))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from purchases.tasks import (
    _perform_receipt_validation,
    _compare_vendors_detailed,
    _compare_totals_detailed,
    _compare_items_detailed,
    _check_fraud_indicators
)


def test_vendor_comparison():
    """Test detailed vendor comparison functionality."""
    # print("Testing vendor comparison...")
    
    # Test exact match
    receipt_vendor = {'name': 'ABC Company Ltd', 'email': 'contact@abc.com'}
    po_vendor = {'name': 'ABC Company Ltd', 'email': 'contact@abc.com'}
    
    result = _compare_vendors_detailed(receipt_vendor, po_vendor)
    # print(f"Exact match score: {result['score']:.2f} - {result['details']}")
    assert result['score'] >= 0.9, "Exact match should score high"
    
    # Test partial match
    receipt_vendor = {'name': 'ABC Company', 'phone': '555-1234'}
    po_vendor = {'name': 'ABC Company Ltd', 'phone': '555-1234'}
    
    result = _compare_vendors_detailed(receipt_vendor, po_vendor)
    # print(f"Partial match score: {result['score']:.2f} - {result['details']}")
    assert result['score'] >= 0.7, "Partial match should score reasonably high"
    
    # Test poor match
    receipt_vendor = {'name': 'XYZ Corporation'}
    po_vendor = {'name': 'ABC Company Ltd'}
    
    result = _compare_vendors_detailed(receipt_vendor, po_vendor)
    # print(f"Poor match score: {result['score']:.2f} - {result['details']}")
    assert result['score'] < 0.5, "Poor match should score low"
    
    # print("✓ Vendor comparison tests passed\n")


def test_totals_comparison():
    """Test detailed totals comparison functionality."""
    # print("Testing totals comparison...")
    
    # Test exact match
    receipt_totals = {'total': 1000.00, 'subtotal': 900.00, 'tax': 100.00}
    po_totals = {'total': 1000.00, 'subtotal': 900.00, 'tax': 100.00}
    
    result = _compare_totals_detailed(receipt_totals, po_totals)
    # print(f"Exact match score: {result['score']:.2f} - {result['details']}")
    assert result['score'] == 1.0, "Exact match should score 1.0"
    
    # Test small difference (within 1%)
    receipt_totals = {'total': 1005.00}
    po_totals = {'total': 1000.00}
    
    result = _compare_totals_detailed(receipt_totals, po_totals)
    # print(f"Small difference score: {result['score']:.2f} - {result['details']}")
    assert result['score'] >= 0.9, "Small difference should score high"
    
    # Test large difference
    receipt_totals = {'total': 1200.00}
    po_totals = {'total': 1000.00}
    
    result = _compare_totals_detailed(receipt_totals, po_totals)
    # print(f"Large difference score: {result['score']:.2f} - {result['details']}")
    assert result['score'] < 0.7, "Large difference should score low"
    
    # print("✓ Totals comparison tests passed\n")


def test_items_comparison():
    """Test detailed items comparison functionality."""
    # print("Testing items comparison...")
    
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
    # print(f"Exact match score: {result['score']:.2f} - {result['details']}")
    assert result['score'] >= 0.9, "Exact match should score high"
    
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
    # print(f"Quantity difference score: {result['score']:.2f} - {result['details']}")
    # print(f"Quantity discrepancies: {result['quantity_discrepancies']}")
    assert result['score'] < 1.0, "Quantity difference should reduce score"
    
    # Test missing items
    receipt_items = [
        {'description': 'laptop computer', 'quantity': 2, 'unit_price': 500.00}
    ]
    po_items = [
        {'name': 'laptop computer', 'quantity': 2, 'unit_price': 500.00},
        {'name': 'wireless mouse', 'quantity': 2, 'unit_price': 25.00}
    ]
    
    result = _compare_items_detailed(receipt_items, po_items)
    # print(f"Missing items score: {result['score']:.2f} - {result['details']}")
    # print(f"Missing items: {result['missing_items']}")
    assert len(result['missing_items']) > 0, "Should detect missing items"
    
    # print("✓ Items comparison tests passed\n")


def test_comprehensive_validation():
    """Test the complete receipt validation process."""
    # print("Testing comprehensive validation...")
    
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
    # print(f"Good receipt validation score: {result['overall_score']:.2f}")
    # print(f"Confidence level: {result['confidence_level']}")
    # print(f"Flags: {result['flags']}")
    # print(f"Discrepancies: {len(result['discrepancies'])}")
    
    assert result['overall_score'] >= 0.8, "Good receipt should score high"
    assert result['confidence_level'] in ['HIGH', 'MEDIUM'], "Should have reasonable confidence"
    
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
    # print(f"\nBad receipt validation score: {result_bad['overall_score']:.2f}")
    # print(f"Confidence level: {result_bad['confidence_level']}")
    # print(f"Flags: {result_bad['flags']}")
    # print(f"Discrepancies: {len(result_bad['discrepancies'])}")
    
    assert result_bad['overall_score'] < 0.6, "Bad receipt should score low"
    assert 'REQUIRES_MANUAL_REVIEW' in result_bad['flags'], "Should flag for manual review"
    assert len(result_bad['discrepancies']) > 0, "Should detect discrepancies"
    
    # print("✓ Comprehensive validation tests passed\n")


def test_fraud_detection():
    """Test fraud indicator detection."""
    # print("Testing fraud detection...")
    
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
    # print(f"Fraud indicators detected: {fraud_flags}")
    
    assert 'SUSPICIOUS_AMOUNT_INCREASE' in fraud_flags, "Should detect suspicious amount increase"
    assert 'POTENTIAL_VENDOR_FRAUD' in fraud_flags, "Should detect potential vendor fraud"
    
    # print("✓ Fraud detection tests passed\n")


def main():
    """Run all tests."""
    # print("Starting receipt validation tests...\n")
    
    try:
        test_vendor_comparison()
        test_totals_comparison()
        test_items_comparison()
        test_comprehensive_validation()
        test_fraud_detection()
        
        # print("🎉 All tests passed! Receipt validation implementation is working correctly.")
        # print("\nImplemented features:")
        # print("✓ Requirement 6.2: Receipt comparison against purchase orders")
        # print("✓ Requirement 6.3: Match score calculation for vendor, items, and totals")
        # print("✓ Requirement 6.4: Discrepancy detection and manual review flagging")
        # print("✓ Enhanced fraud detection capabilities")
        # print("✓ Detailed validation reporting with confidence levels")
        
    except Exception as e:
        # print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == '__main__':
    exit(main())