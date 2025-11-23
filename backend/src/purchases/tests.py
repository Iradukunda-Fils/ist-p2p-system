from django.test import TestCase
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
from django.contrib.auth import get_user_model
from decimal import Decimal
from unittest.mock import patch
from datetime import datetime

from .models import PurchaseRequest, RequestItem, Approval, PurchaseOrder

User = get_user_model()


class PurchaseRequestModelTest(TestCase):
    """Test cases for PurchaseRequest model validation and business logic."""
    
    def setUp(self):
        """Set up test data."""
        self.staff_user = User.objects.create_user(
            username='staff1',
            email='staff1@example.com',
            password='testpass123',
            role='staff'
        )
        self.approver_l1 = User.objects.create_user(
            username='approver1',
            email='approver1@example.com',
            password='testpass123',
            role='approver_lvl1'
        )
        self.approver_l2 = User.objects.create_user(
            username='approver2',
            email='approver2@example.com',
            password='testpass123',
            role='approver_lvl2'
        )
        self.admin_user = User.objects.create_user(
            username='admin1',
            email='admin1@example.com',
            password='testpass123',
            role='admin'
        )
    
    def test_purchase_request_creation_valid(self):
        """Test creating a valid purchase request."""
        pr = PurchaseRequest.objects.create(
            title='Test Purchase Request',
            description='Test description',
            amount=Decimal('500.00'),
            created_by=self.staff_user
        )
        
        self.assertEqual(pr.title, 'Test Purchase Request')
        self.assertEqual(pr.description, 'Test description')
        self.assertEqual(pr.amount, Decimal('500.00'))
        self.assertEqual(pr.status, 'PENDING')
        self.assertEqual(pr.created_by, self.staff_user)
        self.assertEqual(pr.version, 0)
        self.assertTrue(pr.is_pending)
        self.assertFalse(pr.is_approved)
        self.assertFalse(pr.is_rejected)
        self.assertTrue(pr.is_modifiable)
    
    def test_purchase_request_validation_empty_title(self):
        """Test validation fails for empty title."""
        pr = PurchaseRequest(
            title='',
            amount=Decimal('500.00'),
            created_by=self.staff_user
        )
        
        with self.assertRaises(ValidationError) as cm:
            pr.full_clean()
        
        self.assertIn('title', cm.exception.message_dict)
        self.assertIn('Title cannot be empty', str(cm.exception.message_dict['title']))
    
    def test_purchase_request_validation_negative_amount(self):
        """Test validation fails for negative amount."""
        pr = PurchaseRequest(
            title='Test Request',
            amount=Decimal('-100.00'),
            created_by=self.staff_user
        )
        
        with self.assertRaises(ValidationError) as cm:
            pr.full_clean()
        
        self.assertIn('amount', cm.exception.message_dict)
    
    def test_purchase_request_validation_zero_amount(self):
        """Test validation fails for zero amount."""
        pr = PurchaseRequest(
            title='Test Request',
            amount=Decimal('0.00'),
            created_by=self.staff_user
        )
        
        with self.assertRaises(ValidationError) as cm:
            pr.full_clean()
        
        self.assertIn('amount', cm.exception.message_dict)
    
    def test_purchase_request_status_transitions_valid(self):
        """Test valid status transitions."""
        pr = PurchaseRequest.objects.create(
            title='Test Request',
            amount=Decimal('500.00'),
            created_by=self.staff_user
        )
        
        # PENDING -> APPROVED should be valid
        pr.status = 'APPROVED'
        pr.full_clean()  # Should not raise
        
        # Reset to PENDING
        pr.status = 'PENDING'
        pr.save()
        
        # PENDING -> REJECTED should be valid
        pr.status = 'REJECTED'
        pr.full_clean()  # Should not raise
    
    def test_purchase_request_status_transitions_invalid(self):
        """Test invalid status transitions."""
        pr = PurchaseRequest.objects.create(
            title='Test Request',
            amount=Decimal('500.00'),
            created_by=self.staff_user,
            status='APPROVED'
        )
        
        # APPROVED -> REJECTED should be invalid
        pr.status = 'REJECTED'
        with self.assertRaises(ValidationError) as cm:
            pr.full_clean()
        
        self.assertIn('status', cm.exception.message_dict)
        self.assertIn('Invalid status transition', str(cm.exception.message_dict['status']))
    
    def test_purchase_request_version_increment(self):
        """Test version field increments on save."""
        pr = PurchaseRequest.objects.create(
            title='Test Request',
            amount=Decimal('500.00'),
            created_by=self.staff_user
        )
        
        initial_version = pr.version
        
        pr.description = 'Updated description'
        pr.save()
        
        self.assertEqual(pr.version, initial_version + 1)
    
    def test_purchase_request_approval_levels_low_amount(self):
        """Test required approval levels for amounts <= $1000."""
        pr = PurchaseRequest.objects.create(
            title='Small Purchase',
            amount=Decimal('500.00'),
            created_by=self.staff_user
        )
        
        required_levels = pr.get_required_approval_levels()
        self.assertEqual(required_levels, [1])
    
    def test_purchase_request_approval_levels_high_amount(self):
        """Test required approval levels for amounts > $1000."""
        pr = PurchaseRequest.objects.create(
            title='Large Purchase',
            amount=Decimal('2000.00'),
            created_by=self.staff_user
        )
        
        required_levels = pr.get_required_approval_levels()
        self.assertEqual(set(required_levels), {1, 2})
    
    def test_purchase_request_can_be_modified_by_creator(self):
        """Test that creator can modify pending requests."""
        pr = PurchaseRequest.objects.create(
            title='Test Request',
            amount=Decimal('500.00'),
            created_by=self.staff_user
        )
        
        self.assertTrue(pr.can_be_modified_by(self.staff_user))
        self.assertFalse(pr.can_be_modified_by(self.approver_l1))
    
    def test_purchase_request_can_be_modified_by_admin(self):
        """Test that admin can always modify requests."""
        pr = PurchaseRequest.objects.create(
            title='Test Request',
            amount=Decimal('500.00'),
            created_by=self.staff_user,
            status='APPROVED'
        )
        
        self.assertTrue(pr.can_be_modified_by(self.admin_user))
        self.assertFalse(pr.can_be_modified_by(self.staff_user))  # Creator can't modify approved
    
    def test_purchase_request_calculated_total(self):
        """Test calculated total from request items."""
        pr = PurchaseRequest.objects.create(
            title='Test Request',
            amount=Decimal('1.00'),  # Minimum valid amount, will be updated by items
            created_by=self.staff_user
        )
        
        # Add some items
        RequestItem.objects.create(
            request=pr,
            name='Item 1',
            quantity=2,
            unit_price=Decimal('100.00')
        )
        RequestItem.objects.create(
            request=pr,
            name='Item 2',
            quantity=1,
            unit_price=Decimal('300.00')
        )
        
        # Refresh from database
        pr.refresh_from_db()
        
        calculated_total = pr.calculated_total
        expected_total = Decimal('500.00')  # (2 * 100) + (1 * 300)
        
        self.assertEqual(calculated_total, expected_total)


class RequestItemModelTest(TestCase):
    """Test cases for RequestItem model validation and business logic."""
    
    def setUp(self):
        """Set up test data."""
        self.staff_user = User.objects.create_user(
            username='staff1',
            email='staff1@example.com',
            password='testpass123',
            role='staff'
        )
        self.purchase_request = PurchaseRequest.objects.create(
            title='Test Request',
            amount=Decimal('500.00'),
            created_by=self.staff_user
        )
    
    def test_request_item_creation_valid(self):
        """Test creating a valid request item."""
        item = RequestItem.objects.create(
            request=self.purchase_request,
            name='Test Item',
            quantity=2,
            unit_price=Decimal('100.00'),
            description='Test description',
            unit_of_measure='pieces'
        )
        
        self.assertEqual(item.name, 'Test Item')
        self.assertEqual(item.quantity, 2)
        self.assertEqual(item.unit_price, Decimal('100.00'))
        self.assertEqual(item.line_total, Decimal('200.00'))
        self.assertEqual(item.description, 'Test description')
        self.assertEqual(item.unit_of_measure, 'pieces')
    
    def test_request_item_validation_empty_name(self):
        """Test validation fails for empty name."""
        item = RequestItem(
            request=self.purchase_request,
            name='',
            quantity=1,
            unit_price=Decimal('100.00')
        )
        
        with self.assertRaises(ValidationError) as cm:
            item.full_clean()
        
        self.assertIn('name', cm.exception.message_dict)
    
    def test_request_item_validation_zero_quantity(self):
        """Test validation fails for zero quantity."""
        item = RequestItem(
            request=self.purchase_request,
            name='Test Item',
            quantity=0,
            unit_price=Decimal('100.00')
        )
        
        with self.assertRaises(ValidationError) as cm:
            item.full_clean()
        
        self.assertIn('quantity', cm.exception.message_dict)
    
    def test_request_item_validation_negative_price(self):
        """Test validation fails for negative unit price."""
        item = RequestItem(
            request=self.purchase_request,
            name='Test Item',
            quantity=1,
            unit_price=Decimal('-50.00')
        )
        
        with self.assertRaises(ValidationError) as cm:
            item.full_clean()
        
        self.assertIn('unit_price', cm.exception.message_dict)
    
    def test_request_item_updates_parent_amount(self):
        """Test that adding items updates parent request amount."""
        initial_amount = self.purchase_request.amount
        
        RequestItem.objects.create(
            request=self.purchase_request,
            name='Test Item',
            quantity=2,
            unit_price=Decimal('150.00')
        )
        
        # Refresh parent from database
        self.purchase_request.refresh_from_db()
        
        # Amount should be updated to match calculated total
        expected_total = Decimal('300.00')  # 2 * 150
        self.assertEqual(self.purchase_request.amount, expected_total)
    
    def test_request_item_line_total_calculation(self):
        """Test line total calculation."""
        item = RequestItem.objects.create(
            request=self.purchase_request,
            name='Test Item',
            quantity=3,
            unit_price=Decimal('75.50')
        )
        
        expected_total = Decimal('226.50')  # 3 * 75.50
        self.assertEqual(item.line_total, expected_total)


class ApprovalModelTest(TestCase):
    """Test cases for Approval model validation and workflow logic."""
    
    def setUp(self):
        """Set up test data."""
        self.staff_user = User.objects.create_user(
            username='staff1',
            email='staff1@example.com',
            password='testpass123',
            role='staff'
        )
        self.approver_l1 = User.objects.create_user(
            username='approver1',
            email='approver1@example.com',
            password='testpass123',
            role='approver_lvl1'
        )
        self.approver_l2 = User.objects.create_user(
            username='approver2',
            email='approver2@example.com',
            password='testpass123',
            role='approver_lvl2'
        )
        
        self.purchase_request = PurchaseRequest.objects.create(
            title='Test Request',
            amount=Decimal('500.00'),
            created_by=self.staff_user
        )
    
    def test_approval_creation_valid(self):
        """Test creating a valid approval."""
        approval = Approval.objects.create(
            request=self.purchase_request,
            approver=self.approver_l1,
            level=1,
            decision='APPROVED',
            comment='Looks good'
        )
        
        self.assertEqual(approval.request, self.purchase_request)
        self.assertEqual(approval.approver, self.approver_l1)
        self.assertEqual(approval.level, 1)
        self.assertEqual(approval.decision, 'APPROVED')
        self.assertEqual(approval.comment, 'Looks good')
    
    def test_approval_validation_insufficient_permissions(self):
        """Test validation fails when approver lacks permissions."""
        approval = Approval(
            request=self.purchase_request,
            approver=self.staff_user,  # Staff can't approve
            level=1,
            decision='APPROVED'
        )
        
        with self.assertRaises(ValidationError) as cm:
            approval.full_clean()
        
        self.assertIn('approver', cm.exception.message_dict)
    
    def test_approval_validation_non_pending_request(self):
        """Test validation fails for non-pending requests."""
        self.purchase_request.status = 'APPROVED'
        self.purchase_request.save()
        
        approval = Approval(
            request=self.purchase_request,
            approver=self.approver_l1,
            level=1,
            decision='APPROVED'
        )
        
        with self.assertRaises(ValidationError) as cm:
            approval.full_clean()
        
        self.assertIn('request', cm.exception.message_dict)
    
    def test_approval_unique_constraint(self):
        """Test unique constraint for request and level combination."""
        # Create a high-value request that requires both level 1 and 2 approvals
        high_value_request = PurchaseRequest.objects.create(
            title='High Value Request',
            amount=Decimal('2000.00'),
            created_by=self.staff_user
        )
        
        # Create first approval
        Approval.objects.create(
            request=high_value_request,
            approver=self.approver_l1,
            level=1,
            decision='APPROVED'
        )
        
        # Try to create another approval for same request and level
        with self.assertRaises(ValidationError):
            Approval.objects.create(
                request=high_value_request,
                approver=self.approver_l2,  # Different approver
                level=1,  # Same level
                decision='APPROVED'
            )
    
    def test_approval_updates_request_status_single_level(self):
        """Test that approval updates request status for single-level approval."""
        # Create approval for level 1 (sufficient for $500 request)
        Approval.objects.create(
            request=self.purchase_request,
            approver=self.approver_l1,
            level=1,
            decision='APPROVED'
        )
        
        # Refresh request from database
        self.purchase_request.refresh_from_db()
        
        self.assertEqual(self.purchase_request.status, 'APPROVED')
        self.assertEqual(self.purchase_request.last_approved_by, self.approver_l1)
        self.assertIsNotNone(self.purchase_request.approved_at)
    
    def test_approval_rejection_updates_status(self):
        """Test that rejection immediately updates request status."""
        Approval.objects.create(
            request=self.purchase_request,
            approver=self.approver_l1,
            level=1,
            decision='REJECTED',
            comment='Insufficient justification'
        )
        
        # Refresh request from database
        self.purchase_request.refresh_from_db()
        
        self.assertEqual(self.purchase_request.status, 'REJECTED')
    
    def test_approval_multi_level_workflow(self):
        """Test multi-level approval workflow for high-value requests."""
        # Create high-value request requiring both levels
        high_value_request = PurchaseRequest.objects.create(
            title='Expensive Request',
            amount=Decimal('2000.00'),
            created_by=self.staff_user
        )
        
        # First level approval
        Approval.objects.create(
            request=high_value_request,
            approver=self.approver_l1,
            level=1,
            decision='APPROVED'
        )
        
        # Request should still be pending
        high_value_request.refresh_from_db()
        self.assertEqual(high_value_request.status, 'PENDING')
        
        # Second level approval
        Approval.objects.create(
            request=high_value_request,
            approver=self.approver_l2,
            level=2,
            decision='APPROVED'
        )
        
        # Now request should be approved
        high_value_request.refresh_from_db()
        self.assertEqual(high_value_request.status, 'APPROVED')


class PurchaseOrderModelTest(TestCase):
    """Test cases for PurchaseOrder model validation and business logic."""
    
    def setUp(self):
        """Set up test data."""
        self.staff_user = User.objects.create_user(
            username='staff1',
            email='staff1@example.com',
            password='testpass123',
            role='staff'
        )
        self.purchase_request = PurchaseRequest.objects.create(
            title='Test Request',
            amount=Decimal('500.00'),
            created_by=self.staff_user,
            status='APPROVED'
        )
    
    def test_purchase_order_creation_valid(self):
        """Test creating a valid purchase order."""
        po = PurchaseOrder.objects.create(
            request=self.purchase_request,
            vendor='Test Vendor Inc.',
            total=Decimal('500.00')
        )
        
        self.assertEqual(po.request, self.purchase_request)
        self.assertEqual(po.vendor, 'Test Vendor Inc.')
        self.assertEqual(po.total, Decimal('500.00'))
        self.assertEqual(po.status, 'DRAFT')
        self.assertEqual(po.currency, 'USD')
        self.assertTrue(po.is_draft)
        self.assertFalse(po.is_sent)
        self.assertFalse(po.is_fulfilled)
        
        # PO number should be auto-generated
        self.assertIsNotNone(po.po_number)
        self.assertTrue(po.po_number.startswith('PO-'))
    
    def test_purchase_order_validation_empty_vendor(self):
        """Test validation fails for empty vendor."""
        po = PurchaseOrder(
            request=self.purchase_request,
            vendor='',
            total=Decimal('500.00')
        )
        
        with self.assertRaises(ValidationError) as cm:
            po.full_clean()
        
        self.assertIn('vendor', cm.exception.message_dict)
    
    def test_purchase_order_validation_negative_total(self):
        """Test validation fails for negative total."""
        po = PurchaseOrder(
            request=self.purchase_request,
            vendor='Test Vendor',
            total=Decimal('-100.00')
        )
        
        with self.assertRaises(ValidationError) as cm:
            po.full_clean()
        
        self.assertIn('total', cm.exception.message_dict)
    
    def test_purchase_order_po_number_generation(self):
        """Test PO number generation format and uniqueness."""
        po1 = PurchaseOrder.objects.create(
            request=self.purchase_request,
            vendor='Vendor 1',
            total=Decimal('500.00')
        )
        
        # Create another request for second PO
        request2 = PurchaseRequest.objects.create(
            title='Test Request 2',
            amount=Decimal('300.00'),
            created_by=self.staff_user,
            status='APPROVED'
        )
        
        po2 = PurchaseOrder.objects.create(
            request=request2,
            vendor='Vendor 2',
            total=Decimal('300.00')
        )
        
        # Both should have valid PO numbers
        self.assertIsNotNone(po1.po_number)
        self.assertIsNotNone(po2.po_number)
        
        # PO numbers should be unique
        self.assertNotEqual(po1.po_number, po2.po_number)
        
        # Should follow format PO-YYYYNNNNNNXXX
        import re
        pattern = r'^PO-\d{4}\d{6}\d{3}$'
        self.assertTrue(re.match(pattern, po1.po_number))
        self.assertTrue(re.match(pattern, po2.po_number))
    
    def test_purchase_order_update_from_request_data(self):
        """Test updating PO data from request and items."""
        # Create a pending request first so we can add items
        pending_request = PurchaseRequest.objects.create(
            title='Test Request with Items',
            amount=Decimal('500.00'),
            created_by=self.staff_user,
            status='PENDING'  # Keep it pending so we can add items
        )
        
        # Add items to the request
        RequestItem.objects.create(
            request=pending_request,
            name='Item 1',
            quantity=2,
            unit_price=Decimal('100.00'),
            description='Test item 1'
        )
        RequestItem.objects.create(
            request=pending_request,
            name='Item 2',
            quantity=1,
            unit_price=Decimal('300.00'),
            description='Test item 2'
        )
        
        # Now approve the request so we can create a PO
        pending_request.status = 'APPROVED'
        pending_request.save()
        
        po = PurchaseOrder.objects.create(
            request=pending_request,  # Use the request with items
            vendor='Test Vendor',
            total=Decimal('500.00')
        )
        
        # Update PO data from request
        po.update_from_request_data()
        
        # Check that data was populated
        self.assertIn('items', po.data)
        self.assertIn('request_details', po.data)
        
        items = po.data['items']
        self.assertEqual(len(items), 2)
        
        # Check first item
        item1 = items[0]
        self.assertEqual(item1['name'], 'Item 1')
        self.assertEqual(item1['quantity'], 2)
        self.assertEqual(item1['unit_price'], 100.00)
        self.assertEqual(item1['line_total'], 200.00)
    
    def test_purchase_order_get_items_from_data(self):
        """Test extracting items from JSON data."""
        po = PurchaseOrder.objects.create(
            request=self.purchase_request,
            vendor='Test Vendor',
            total=Decimal('500.00'),
            data={
                'items': [
                    {
                        'name': 'Test Item',
                        'quantity': 2,
                        'unit_price': 100.00,
                        'line_total': 200.00
                    }
                ]
            }
        )
        
        items = po.get_items_from_data()
        self.assertEqual(len(items), 1)
        
        item = items[0]
        self.assertEqual(item['name'], 'Test Item')
        self.assertEqual(item['quantity'], 2)
        self.assertEqual(item['unit_price'], 100.00)
        self.assertEqual(item['line_total'], 200.00)
