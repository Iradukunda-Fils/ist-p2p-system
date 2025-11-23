"""
Test cases for the Approval model to verify it meets requirements 3.5 and 3.6.

Requirements being tested:
- 3.5: THE system SHALL record all approval decisions with timestamps and comments
- 3.6: IF duplicate approvals are attempted THEN the system SHALL handle them idempotently
"""

from django.test import TestCase
from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.contrib.auth import get_user_model
from decimal import Decimal

from .models import PurchaseRequest, Approval

User = get_user_model()


class ApprovalModelTest(TestCase):
    """Test cases for the Approval model functionality."""
    
    def setUp(self):
        """Set up test data."""
        # Create test users with different roles
        self.staff_user = User.objects.create_user(
            username='staff1',
            email='staff1@example.com',
            role='staff'
        )
        
        self.approver_lvl1 = User.objects.create_user(
            username='approver1',
            email='approver1@example.com',
            role='approver_lvl1'
        )
        
        self.approver_lvl2 = User.objects.create_user(
            username='approver2',
            email='approver2@example.com',
            role='approver_lvl2'
        )
        
        # Create a test purchase request
        self.purchase_request = PurchaseRequest.objects.create(
            title='Test Purchase Request',
            description='Test description',
            amount=Decimal('500.00'),
            created_by=self.staff_user
        )
    
    def test_approval_records_decision_with_timestamp_and_comment(self):
        """
        Test requirement 3.5: System SHALL record all approval decisions 
        with timestamps and comments.
        """
        # Create an approval with comment
        approval = Approval.objects.create(
            request=self.purchase_request,
            approver=self.approver_lvl1,
            level=1,
            decision='APPROVED',
            comment='Looks good, approved for procurement'
        )
        
        # Verify all required fields are recorded
        self.assertEqual(approval.request, self.purchase_request)
        self.assertEqual(approval.approver, self.approver_lvl1)
        self.assertEqual(approval.level, 1)
        self.assertEqual(approval.decision, 'APPROVED')
        self.assertEqual(approval.comment, 'Looks good, approved for procurement')
        
        # Verify timestamp is automatically set
        self.assertIsNotNone(approval.created_at)
        
        # Verify the approval is properly saved and retrievable
        saved_approval = Approval.objects.get(pk=approval.pk)
        self.assertEqual(saved_approval.comment, 'Looks good, approved for procurement')
        self.assertIsNotNone(saved_approval.created_at)
    
    def test_approval_handles_duplicate_attempts_idempotently(self):
        """
        Test requirement 3.6: IF duplicate approvals are attempted 
        THEN the system SHALL handle them idempotently.
        """
        # Create a high-value request that needs multiple approvals
        # This prevents the first approval from completing the workflow
        high_value_request = PurchaseRequest.objects.create(
            title='High Value Test Request',
            description='Test description',
            amount=Decimal('2000.00'),  # > $1000, needs both levels
            created_by=self.staff_user
        )
        
        # Create first approval at level 1
        approval1 = Approval.objects.create(
            request=high_value_request,
            approver=self.approver_lvl1,
            level=1,
            decision='APPROVED',
            comment='First approval'
        )
        
        # Attempt to create duplicate approval (same request + level)
        with self.assertRaises(ValidationError):
            Approval.objects.create(
                request=high_value_request,
                approver=self.approver_lvl2,  # Different approver
                level=1,  # Same level - should fail due to unique constraint
                decision='APPROVED',
                comment='Duplicate approval attempt'
            )
        
        # Verify only one approval exists at level 1
        approvals = Approval.objects.filter(
            request=high_value_request,
            level=1
        )
        self.assertEqual(approvals.count(), 1)
        self.assertEqual(approvals.first().comment, 'First approval')
    
    def test_unique_constraint_for_request_and_level_combination(self):
        """
        Test that the unique constraint prevents duplicate approvals 
        at the same level for the same request.
        """
        # Create a high-value request that needs multiple approvals
        high_value_request = PurchaseRequest.objects.create(
            title='High Value Constraint Test',
            description='Test description',
            amount=Decimal('3000.00'),  # > $1000, needs both levels
            created_by=self.staff_user
        )
        
        # Create approval at level 1
        Approval.objects.create(
            request=high_value_request,
            approver=self.approver_lvl1,
            level=1,
            decision='APPROVED'
        )
        
        # Try to create another approval at the same level
        with self.assertRaises(ValidationError):
            Approval.objects.create(
                request=high_value_request,
                approver=self.approver_lvl2,  # Different approver
                level=1,  # Same level - should fail
                decision='APPROVED'
            )
    
    def test_approval_validation_logic(self):
        """Test the approval validation logic in the clean() method."""
        
        # Test 1: Approver must have permission for the level
        approval = Approval(
            request=self.purchase_request,
            approver=self.staff_user,  # Staff user cannot approve
            level=1,
            decision='APPROVED'
        )
        
        with self.assertRaises(ValidationError) as cm:
            approval.full_clean()
        
        self.assertIn('cannot approve at level', str(cm.exception))
        
        # Test 2: Cannot approve non-pending requests
        self.purchase_request.status = 'APPROVED'
        self.purchase_request.save()
        
        approval = Approval(
            request=self.purchase_request,
            approver=self.approver_lvl1,
            level=1,
            decision='APPROVED'
        )
        
        with self.assertRaises(ValidationError) as cm:
            approval.full_clean()
        
        self.assertIn('Cannot approve non-pending requests', str(cm.exception))
    
    def test_approval_updates_request_status(self):
        """Test that approvals update the parent request status correctly."""
        
        # Create level 1 approval for a small amount (only needs level 1)
        approval = Approval.objects.create(
            request=self.purchase_request,
            approver=self.approver_lvl1,
            level=1,
            decision='APPROVED',
            comment='Level 1 approved'
        )
        
        # Refresh the purchase request from database
        self.purchase_request.refresh_from_db()
        
        # For amounts <= $1000, level 1 approval should be sufficient
        # The request should be approved
        self.assertEqual(self.purchase_request.status, 'APPROVED')
        self.assertEqual(self.purchase_request.last_approved_by, self.approver_lvl1)
        self.assertIsNotNone(self.purchase_request.approved_at)
    
    def test_rejection_makes_request_immutable(self):
        """Test that rejection at any level makes the request immutable."""
        
        # Create a rejection at level 1
        approval = Approval.objects.create(
            request=self.purchase_request,
            approver=self.approver_lvl1,
            level=1,
            decision='REJECTED',
            comment='Budget not available'
        )
        
        # Refresh the purchase request
        self.purchase_request.refresh_from_db()
        
        # Request should be rejected
        self.assertEqual(self.purchase_request.status, 'REJECTED')
        
        # Attempting to approve at level 2 should fail
        approval2 = Approval(
            request=self.purchase_request,
            approver=self.approver_lvl2,
            level=2,
            decision='APPROVED'
        )
        
        with self.assertRaises(ValidationError):
            approval2.full_clean()
    
    def test_multi_level_approval_workflow(self):
        """Test multi-level approval workflow for high-value requests."""
        
        # Create a high-value request requiring both levels
        high_value_request = PurchaseRequest.objects.create(
            title='High Value Purchase',
            description='Expensive equipment',
            amount=Decimal('5000.00'),  # > $1000, needs both levels
            created_by=self.staff_user
        )
        
        # Level 1 approval
        approval1 = Approval.objects.create(
            request=high_value_request,
            approver=self.approver_lvl1,
            level=1,
            decision='APPROVED',
            comment='Level 1 approved'
        )
        
        # Request should still be pending (needs level 2)
        high_value_request.refresh_from_db()
        self.assertEqual(high_value_request.status, 'PENDING')
        
        # Level 2 approval
        approval2 = Approval.objects.create(
            request=high_value_request,
            approver=self.approver_lvl2,
            level=2,
            decision='APPROVED',
            comment='Level 2 approved'
        )
        
        # Now request should be fully approved
        high_value_request.refresh_from_db()
        self.assertEqual(high_value_request.status, 'APPROVED')
        self.assertEqual(high_value_request.last_approved_by, self.approver_lvl2)
    
    def test_approval_string_representation(self):
        """Test the string representation of approval objects."""
        
        approval = Approval.objects.create(
            request=self.purchase_request,
            approver=self.approver_lvl1,
            level=1,
            decision='APPROVED'
        )
        
        expected_str = f"Level 1 APPROVED by {self.approver_lvl1.username}"
        self.assertEqual(str(approval), expected_str)
    
    def test_approval_with_empty_comment(self):
        """Test that approvals work with empty comments (optional field)."""
        
        approval = Approval.objects.create(
            request=self.purchase_request,
            approver=self.approver_lvl1,
            level=1,
            decision='APPROVED'
            # No comment provided
        )
        
        self.assertEqual(approval.comment, '')
        self.assertIsNotNone(approval.created_at)