"""
Tests for PurchaseOrder model implementation.

This test file verifies that the PurchaseOrder model meets the requirements:
- Create model for generated purchase orders
- Add unique PO number generation logic  
- Implement JSON field for structured PO data
"""

from decimal import Decimal
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.contrib.auth import get_user_model
from purchases.models import PurchaseRequest, PurchaseOrder, RequestItem
from documents.models import Document

User = get_user_model()


class PurchaseOrderModelTest(TestCase):
    """Test cases for PurchaseOrder model functionality."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='staff'
        )
        
        # Create a purchase request
        self.purchase_request = PurchaseRequest.objects.create(
            title='Test Purchase Request',
            description='Test description',
            amount=Decimal('1500.00'),
            created_by=self.user,
            status='APPROVED'
        )
        
        # Add some items to the request
        RequestItem.objects.create(
            request=self.purchase_request,
            name='Test Item 1',
            quantity=2,
            unit_price=Decimal('500.00')
        )
        RequestItem.objects.create(
            request=self.purchase_request,
            name='Test Item 2',
            quantity=1,
            unit_price=Decimal('500.00')
        )
    
    def test_purchase_order_creation(self):
        """Test basic PurchaseOrder creation."""
        po = PurchaseOrder.objects.create(
            request=self.purchase_request,
            vendor='Test Vendor Inc.',
            total=self.purchase_request.amount
        )
        
        self.assertIsNotNone(po.id)
        self.assertIsNotNone(po.po_number)
        self.assertEqual(po.vendor, 'Test Vendor Inc.')
        self.assertEqual(po.total, Decimal('1500.00'))
        self.assertEqual(po.status, 'DRAFT')
        self.assertEqual(po.currency, 'USD')
        self.assertIsInstance(po.data, dict)
    
    def test_po_number_generation(self):
        """Test unique PO number generation."""
        po1 = PurchaseOrder.objects.create(
            request=self.purchase_request,
            vendor='Vendor 1',
            total=Decimal('1000.00')
        )
        
        # Create another request for second PO
        request2 = PurchaseRequest.objects.create(
            title='Test Request 2',
            description='Test description 2',
            amount=Decimal('2000.00'),
            created_by=self.user,
            status='APPROVED'
        )
        
        po2 = PurchaseOrder.objects.create(
            request=request2,
            vendor='Vendor 2',
            total=Decimal('2000.00')
        )
        
        # Verify PO numbers are unique and follow format
        self.assertNotEqual(po1.po_number, po2.po_number)
        self.assertTrue(po1.po_number.startswith('PO-'))
        self.assertTrue(po2.po_number.startswith('PO-'))
        self.assertEqual(len(po1.po_number), 17)  # PO-YYYYNNNNNNXXX format
        self.assertEqual(len(po2.po_number), 17)
    
    def test_po_number_uniqueness_constraint(self):
        """Test that PO numbers must be unique."""
        po1 = PurchaseOrder.objects.create(
            request=self.purchase_request,
            vendor='Vendor 1',
            total=Decimal('1000.00')
        )
        
        # Create another request
        request2 = PurchaseRequest.objects.create(
            title='Test Request 2',
            description='Test description 2',
            amount=Decimal('2000.00'),
            created_by=self.user,
            status='APPROVED'
        )
        
        # Try to create PO with same number (should fail)
        with self.assertRaises(IntegrityError):
            PurchaseOrder.objects.create(
                request=request2,
                vendor='Vendor 2',
                total=Decimal('2000.00'),
                po_number=po1.po_number  # Duplicate PO number
            )
    
    def test_json_data_field(self):
        """Test JSON field for structured PO data."""
        test_data = {
            'items': [
                {
                    'name': 'Test Item 1',
                    'quantity': 2,
                    'unit_price': 500.00,
                    'line_total': 1000.00
                }
            ],
            'terms': {
                'payment_terms': 'Net 30',
                'delivery_terms': 'FOB Destination'
            },
            'vendor_info': {
                'contact_person': 'John Doe',
                'phone': '+1-555-0123'
            }
        }
        
        po = PurchaseOrder.objects.create(
            request=self.purchase_request,
            vendor='Test Vendor',
            total=Decimal('1000.00'),
            data=test_data
        )
        
        # Verify data is stored and retrieved correctly
        self.assertEqual(po.data['items'][0]['name'], 'Test Item 1')
        self.assertEqual(po.data['terms']['payment_terms'], 'Net 30')
        self.assertEqual(po.data['vendor_info']['contact_person'], 'John Doe')
    
    def test_update_from_request_data(self):
        """Test updating PO data from purchase request."""
        po = PurchaseOrder.objects.create(
            request=self.purchase_request,
            vendor='Test Vendor',
            total=self.purchase_request.amount
        )
        
        # Update PO with request data
        po.update_from_request_data()
        
        # Verify data was populated from request
        self.assertEqual(len(po.data['items']), 2)
        self.assertEqual(po.data['items'][0]['name'], 'Test Item 1')
        self.assertEqual(po.data['items'][0]['quantity'], 2)
        self.assertEqual(po.data['items'][1]['name'], 'Test Item 2')
        self.assertEqual(po.data['request_details']['title'], 'Test Purchase Request')
    
    def test_get_items_from_data(self):
        """Test extracting items from JSON data."""
        test_data = {
            'items': [
                {
                    'name': 'Item 1',
                    'quantity': 2,
                    'unit_price': 100.00,
                    'line_total': 200.00
                },
                {
                    'name': 'Item 2',
                    'quantity': 1,
                    'unit_price': 300.00,
                    'line_total': 300.00
                }
            ]
        }
        
        po = PurchaseOrder.objects.create(
            request=self.purchase_request,
            vendor='Test Vendor',
            total=Decimal('500.00'),
            data=test_data
        )
        
        items = po.get_items_from_data()
        self.assertEqual(len(items), 2)
        self.assertEqual(items[0]['name'], 'Item 1')
        self.assertEqual(items[1]['quantity'], 1)
    
    def test_model_validation(self):
        """Test model validation rules."""
        # Test empty vendor validation
        with self.assertRaises(ValidationError):
            po = PurchaseOrder(
                request=self.purchase_request,
                vendor='',  # Empty vendor
                total=Decimal('1000.00')
            )
            po.full_clean()
        
        # Test negative total validation
        with self.assertRaises(ValidationError):
            po = PurchaseOrder(
                request=self.purchase_request,
                vendor='Test Vendor',
                total=Decimal('-100.00')  # Negative total
            )
            po.full_clean()
        
        # Test invalid currency code
        with self.assertRaises(ValidationError):
            po = PurchaseOrder(
                request=self.purchase_request,
                vendor='Test Vendor',
                total=Decimal('1000.00'),
                currency='INVALID'  # Invalid currency code
            )
            po.full_clean()
    
    def test_status_properties(self):
        """Test status property methods."""
        po = PurchaseOrder.objects.create(
            request=self.purchase_request,
            vendor='Test Vendor',
            total=Decimal('1000.00')
        )
        
        # Test draft status
        self.assertTrue(po.is_draft)
        self.assertFalse(po.is_sent)
        self.assertFalse(po.is_fulfilled)
        
        # Test sent status
        po.status = 'SENT'
        po.save()
        self.assertFalse(po.is_draft)
        self.assertTrue(po.is_sent)
        self.assertFalse(po.is_fulfilled)
        
        # Test fulfilled status
        po.status = 'FULFILLED'
        po.save()
        self.assertFalse(po.is_draft)
        self.assertTrue(po.is_sent)
        self.assertTrue(po.is_fulfilled)
    
    def test_string_representation(self):
        """Test string representation of PurchaseOrder."""
        po = PurchaseOrder.objects.create(
            request=self.purchase_request,
            vendor='Test Vendor Inc.',
            total=Decimal('1500.00')
        )
        
        expected_str = f"{po.po_number} - Test Vendor Inc. ($1500.00)"
        self.assertEqual(str(po), expected_str)
    
    def test_one_to_one_relationship_with_request(self):
        """Test one-to-one relationship with PurchaseRequest."""
        po = PurchaseOrder.objects.create(
            request=self.purchase_request,
            vendor='Test Vendor',
            total=Decimal('1000.00')
        )
        
        # Verify relationship works both ways
        self.assertEqual(po.request, self.purchase_request)
        self.assertEqual(self.purchase_request.purchase_order, po)
        
        # Test that only one PO can be created per request
        request2 = PurchaseRequest.objects.create(
            title='Test Request 2',
            description='Test description 2',
            amount=Decimal('2000.00'),
            created_by=self.user,
            status='APPROVED'
        )
        
        with self.assertRaises(IntegrityError):
            # Try to create second PO for same request
            PurchaseOrder.objects.create(
                request=self.purchase_request,  # Same request as po
                vendor='Another Vendor',
                total=Decimal('2000.00')
            )


if __name__ == '__main__':
    import unittest
    unittest.main()