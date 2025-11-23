"""
Unit tests for purchase services.

Tests the service layer including ApprovalService, PurchaseRequestService,
and PurchaseOrderService.
"""

from decimal import Decimal
from django.test import TestCase
from django.core.exceptions import ValidationError, PermissionDenied
from django.contrib.auth import get_user_model

from purchases.models import PurchaseRequest, RequestItem, Approval, PurchaseOrder
from purchases.services.approval_service import ApprovalService
from purchases.services.purchase_request_service import PurchaseRequestService
from purchases.services.purchase_order_service import PurchaseOrderService

User = get_user_model()


class ApprovalServiceTestCase(TestCase):
    """Test cases for ApprovalService."""
    
    def setUp(self):
        """Set up test data."""
        # Create users with different permissions
        self.staff_user = User.objects.create_user(
            username='staff',
            email='staff@test.com',
            password='test123'
        )
        self.staff_user.role = 'staff'
        self.staff_user.save()
        
        self.approver_l1 = User.objects.create_user(
            username='approver1',
            email='approver1@test.com',
            password='test123'
        )
        self.approver_l1.role = 'approver_lvl1'
        self.approver_l1.save()
        
        self.approver_l2 = User.objects.create_user(
            username='approver2',
            email='approver2@test.com',
            password='test123'
        )
        self.approver_l2.role = 'approver_lvl2'
        self.approver_l2.save()
        
        # Create a purchase request
        self.pr = PurchaseRequest.objects.create(
            title='Test PR',
            description='Test description',
            amount=Decimal('500.00'),
            created_by=self.staff_user,
            status='PENDING'
        )
    
    def test_approve_request_level1_success(self):
        """Test successful Level 1 approval."""
        approval, pr = ApprovalService.approve_request(
            request_id=str(self.pr.id),
            approver=self.approver_l1,
            level=1,
            comment='Approved'
        )
        
        self.assertEqual(approval.decision, 'APPROVED')
        self.assertEqual(approval.level, 1)
        self.assertEqual(approval.approver, self.approver_l1)
        self.assertEqual(pr.status, 'APPROVED')  # Amount <= $1000, only L1 needed
    
    def test_approve_request_without_permission(self):
        """Test approval fails without proper permissions."""
        with self.assertRaises(PermissionDenied):
            ApprovalService.approve_request(
                request_id=str(self.pr.id),
                approver=self.staff_user,  # No approval permissions
                level=1,
                comment='Approved'
            )
    
    def test_approve_high_value_requires_both_levels(self):
        """Test that high-value requests require both approval levels."""
        # Create high-value request
        high_pr = PurchaseRequest.objects.create(
            title='High Value PR',
            description='Test',
            amount=Decimal('2000.00'),
            created_by=self.staff_user,
            status='PENDING'
        )
        
        # Approve Level 1
        approval1, pr = ApprovalService.approve_request(
            request_id=str(high_pr.id),
            approver=self.approver_l1,
            level=1,
            comment='L1 Approved'
        )
        
        self.assertEqual(pr.status, 'PENDING')  # Still pending L2
        self.assertFalse(pr.is_fully_approved())
        
        # Approve Level 2
        approval2, pr = ApprovalService.approve_request(
            request_id=str(high_pr.id),
            approver=self.approver_l2,
            level=2,
            comment='L2 Approved'
        )
        
        self.assertEqual(pr.status, 'APPROVED')  # Now fully approved
        self.assertTrue(pr.is_fully_approved())
    
    def test_reject_request(self):
        """Test request rejection."""
        approval, pr = ApprovalService.reject_request(
            request_id=str(self.pr.id),
            approver=self.approver_l1,
            level=1,
            comment='Not approved'
        )
        
        self.assertEqual(approval.decision, 'REJECTED')
        self.assertEqual(pr.status, 'REJECTED')
    
    def test_reject_requires_comment(self):
        """Test that rejection requires a comment."""
        with self.assertRaises(ValidationError):
            ApprovalService.reject_request(
                request_id=str(self.pr.id),
                approver=self.approver_l1,
                level=1,
                comment=''  # Empty comment
            )
    
    def test_cannot_approve_already_rejected(self):
        """Test that approved request cannot be approved after rejection."""
        # First reject
        ApprovalService.reject_request(
            request_id=str(self.pr.id),
            approver=self.approver_l1,
            level=1,
            comment='Rejected'
        )
        
        # Try to approve
        with self.assertRaises(ValidationError):
            ApprovalService.approve_request(
                request_id=str(self.pr.id),
                approver=self.approver_l1,
                level=1,
                comment='Trying to approve'
            )


class PurchaseRequestServiceTestCase(TestCase):
    """Test cases for PurchaseRequestService."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@test.com',
            password='test123',
            is_staff_user=True
        )
    
    def test_create_purchase_request(self):
        """Test creating a purchase request with items."""
        items = [
            {
                'name': 'Item 1',
                'quantity': 2,
                'unit_price': '100.00',
                'description': 'Test item',
                'unit_of_measure': 'pcs'
            },
            {
                'name': 'Item 2',
                'quantity': 1,
                'unit_price': '50.00'
            }
        ]
        
        pr = PurchaseRequestService.create_purchase_request(
            user=self.user,
            title='Test PR',
            description='Test',
            items=items
        )
        
        self.assertEqual(pr.title, 'Test PR')
        self.assertEqual(pr.created_by, self.user)
        self.assertEqual(pr.items.count(), 2)
        self.assertEqual(pr.amount, Decimal('250.00'))  # 2*100 + 1*50
        self.assertEqual(pr.status, 'PENDING')
    
    def test_create_request_requires_items(self):
        """Test that creating request without items fails."""
        with self.assertRaises(ValidationError):
            PurchaseRequestService.create_purchase_request(
                user=self.user,
                title='Test PR',
                description='Test',
                items=[]  # No items
            )
    
    def test_update_purchase_request(self):
        """Test updating a purchase request."""
        pr = PurchaseRequest.objects.create(
            title='Original Title',
            description='Original',
            amount=Decimal('100.00'),
            created_by=self.user,
            status='PENDING'
        )
        
        updated_pr = PurchaseRequestService.update_purchase_request(
            request_id=str(pr.id),
            user=self.user,
            title='Updated Title',
            description='Updated description'
        )
        
        self.assertEqual(updated_pr.title, 'Updated Title')
        self.assertEqual(updated_pr.description, 'Updated description')
    
    def test_cannot_update_approved_request(self):
        """Test that approved requests cannot be updated."""
        pr = PurchaseRequest.objects.create(
            title='Test',
            description='Test',
            amount=Decimal('100.00'),
            created_by=self.user,
            status='APPROVED'
        )
        
        with self.assertRaises(ValidationError):
            PurchaseRequestService.update_purchase_request(
                request_id=str(pr.id),
                user=self.user,
                title='New Title'
            )


class PurchaseOrderServiceTestCase(TestCase):
    """Test cases for PurchaseOrderService."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@test.com',
            password='test123'
        )
        self.user.role = 'staff'
        self.user.save()
        
        # Create approved purchase request
        self.pr = PurchaseRequest.objects.create(
            title='Test PR',
            description='Test',
            amount=Decimal('500.00'),
            created_by=self.user,
            status='APPROVED'
        )
        
        # Add items
        RequestItem.objects.create(
            request=self.pr,
            name='Test Item',
            quantity=5,
            unit_price=Decimal('100.00')
        )
    
    def test_generate_purchase_order(self):
        """Test generating a purchase order from approved request."""
        po = PurchaseOrderService.generate_purchase_order(
            request_id=str(self.pr.id)
        )
        
        self.assertIsNotNone(po.po_number)
        self.assertEqual(po.request, self.pr)
        self.assertEqual(po.total, self.pr.amount)
        self.assertEqual(po.status, 'DRAFT')
        self.assertIn('items', po.metadata)
    
    def test_cannot_generate_po_for_pending_request(self):
        """Test that PO cannot be generated for pending requests."""
        pending_pr = PurchaseRequest.objects.create(
            title='Pending',
            description='Test',
            amount=Decimal('100.00'),
            created_by=self.user,
            status='PENDING'
        )
        
        with self.assertRaises(ValidationError):
            PurchaseOrderService.generate_purchase_order(
                request_id=str(pending_pr.id)
            )
    
    def test_po_number_uniqueness(self):
        """Test that PO numbers are unique."""
        po1 = PurchaseOrderService.generate_purchase_order(str(self.pr.id))
        
        # Create another approved request
        pr2 = PurchaseRequest.objects.create(
            title='Test PR 2',
            description='Test',
            amount=Decimal('300.00'),
            created_by=self.user,
            status='APPROVED'
        )
        RequestItem.objects.create(
            request=pr2,
            name='Item',
            quantity=1,
            unit_price=Decimal('300.00')
        )
        
        po2 = PurchaseOrderService.generate_purchase_order(str(pr2.id))
        
        self.assertNotEqual(po1.po_number, po2.po_number)
    
    def test_po_metadata_compilation(self):
        """Test that PO metadata is properly compiled from request."""
        po = PurchaseOrderService.generate_purchase_order(str(self.pr.id))
        
        # Check metadata structure
        self.assertIn('items', po.metadata)
        self.assertIn('request_title', po.metadata)
        self.assertEqual(len(po.metadata['items']), 1)
        self.assertEqual(po.metadata['items'][0]['name'], 'Test Item')
        self.assertEqual(po.metadata['items'][0]['quantity'], 5)


class ServiceIntegrationTestCase(TestCase):
    """Integration tests for service layer workflow."""
    
    def setUp(self):
        """Set up test data."""
        self.staff = User.objects.create_user(
            username='staff',
            email='staff@test.com',
            password='test123'
        )
        self.staff.role = 'staff'
        self.staff.save()
        
        self.approver = User.objects.create_user(
            username='approver',
            email='approver@test.com',
            password='test123'
        )
        self.approver.role = 'approver_lvl1'
        self.approver.save()
    
    def test_complete_workflow(self):
        """Test complete workflow from PR creation to PO generation."""
        # Step 1: Create purchase request
        pr = PurchaseRequestService.create_purchase_request(
            user=self.staff,
            title='Integration Test PR',
            description='Testing complete workflow',
            items=[{
                'name': 'Test Product',
                'quantity': 3,
                'unit_price': '250.00'
            }]
        )
        
        self.assertEqual(pr.status, 'PENDING')
        self.assertEqual(pr.amount, Decimal('750.00'))
        
        # Step 2: Approve request
        approval, pr = ApprovalService.approve_request(
            request_id=str(pr.id),
            approver=self.approver,
            level=1,
            comment='Approved for testing'
        )
        
        self.assertEqual(pr.status, 'APPROVED')
        self.assertTrue(pr.is_fully_approved())
        
        # Step 3: Generate PO
        po = PurchaseOrderService.generate_purchase_order(str(pr.id))
        
        self.assertIsNotNone(po.po_number)
        self.assertEqual(po.total, Decimal('750.00'))
        self.assertEqual(len(po.metadata['items']), 1)
        self.assertEqual(po.metadata['items'][0]['quantity'], 3)
