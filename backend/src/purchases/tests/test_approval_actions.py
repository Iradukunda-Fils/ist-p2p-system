#!/usr/bin/env python
"""
Unit tests for approval actions implementation.

This script tests the custom approval actions to ensure they work correctly
with concurrency control and proper validation.
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

from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework.test import APIClient
from rest_framework import status
from purchases.models import PurchaseRequest, RequestItem, Approval
from documents.models import Document

User = get_user_model()


class ApprovalActionsTest(TransactionTestCase):
    """Test the custom approval actions implementation."""
    
    def setUp(self):
        """Set up test data."""
        # Create users with different roles
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
        
        # Create a purchase request
        self.purchase_request = PurchaseRequest.objects.create(
            title='Test Purchase Request',
            description='Test description',
            amount=Decimal('500.00'),
            created_by=self.staff_user
        )
        
        # Add items to the request
        RequestItem.objects.create(
            request=self.purchase_request,
            name='Test Item 1',
            quantity=2,
            unit_price=Decimal('250.00')
        )
        
        self.client = APIClient()
    
    def test_approve_level_1_success(self):
        """Test successful level 1 approval."""
        self.client.force_authenticate(user=self.approver_l1)
        
        response = self.client.post(
            f'/api/requests/{self.purchase_request.id}/approve/',
            {
                'level': 1,
                'comment': 'Approved for level 1'
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Request approved at level 1')
        self.assertEqual(response.data['action'], 'created')
        self.assertEqual(response.data['request_status'], 'APPROVED')  # Should be approved since amount <= $1000
        self.assertTrue(response.data['is_fully_approved'])
        
        # Verify approval record was created
        approval = Approval.objects.get(request=self.purchase_request, level=1)
        self.assertEqual(approval.decision, 'APPROVED')
        self.assertEqual(approval.approver, self.approver_l1)
        self.assertEqual(approval.comment, 'Approved for level 1')
    
    def test_approve_level_2_required(self):
        """Test approval for request requiring level 2."""
        # Update request amount to require level 2 approval
        self.purchase_request.amount = Decimal('1500.00')
        self.purchase_request.save()
        
        # First approve at level 1
        self.client.force_authenticate(user=self.approver_l1)
        response = self.client.post(
            f'/api/requests/{self.purchase_request.id}/approve/',
            {
                'level': 1,
                'comment': 'Level 1 approved'
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['request_status'], 'PENDING')  # Still pending level 2
        self.assertFalse(response.data['is_fully_approved'])
        self.assertEqual(response.data['pending_levels'], [2])
        
        # Now approve at level 2
        self.client.force_authenticate(user=self.approver_l2)
        response = self.client.post(
            f'/api/requests/{self.purchase_request.id}/approve/',
            {
                'level': 2,
                'comment': 'Level 2 approved'
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['request_status'], 'APPROVED')
        self.assertTrue(response.data['is_fully_approved'])
        self.assertEqual(response.data['pending_levels'], [])
    
    def test_reject_request(self):
        """Test request rejection."""
        self.client.force_authenticate(user=self.approver_l1)
        
        response = self.client.post(
            f'/api/requests/{self.purchase_request.id}/reject/',
            {
                'level': 1,
                'comment': 'Rejected due to insufficient justification'
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Request rejected at level 1')
        self.assertEqual(response.data['request_status'], 'REJECTED')
        self.assertFalse(response.data['is_fully_approved'])
        
        # Verify approval record was created with rejection
        approval = Approval.objects.get(request=self.purchase_request, level=1)
        self.assertEqual(approval.decision, 'REJECTED')
        self.assertEqual(approval.comment, 'Rejected due to insufficient justification')
    
    def test_reject_without_comment_fails(self):
        """Test that rejection without comment fails."""
        self.client.force_authenticate(user=self.approver_l1)
        
        response = self.client.post(
            f'/api/requests/{self.purchase_request.id}/reject/',
            {
                'level': 1,
                'comment': ''
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error']['code'], 'REJECTION_COMMENT_REQUIRED')
    
    def test_insufficient_permissions(self):
        """Test approval with insufficient permissions."""
        # Staff user trying to approve
        self.client.force_authenticate(user=self.staff_user)
        
        response = self.client.post(
            f'/api/requests/{self.purchase_request.id}/approve/',
            {
                'level': 1,
                'comment': 'Trying to approve'
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Level 1 approver trying to approve level 2
        self.client.force_authenticate(user=self.approver_l1)
        
        response = self.client.post(
            f'/api/requests/{self.purchase_request.id}/approve/',
            {
                'level': 2,
                'comment': 'Trying level 2'
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_approve_non_pending_request(self):
        """Test approval of non-pending request fails."""
        # First approve the request
        self.client.force_authenticate(user=self.approver_l1)
        self.client.post(
            f'/api/requests/{self.purchase_request.id}/approve/',
            {
                'level': 1,
                'comment': 'Initial approval'
            }
        )
        
        # Try to approve again
        response = self.client.post(
            f'/api/requests/{self.purchase_request.id}/approve/',
            {
                'level': 1,
                'comment': 'Second approval attempt'
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error']['code'], 'REQUEST_NOT_PENDING')
    
    def test_idempotent_approval(self):
        """Test that duplicate approvals by same user are idempotent."""
        self.client.force_authenticate(user=self.approver_l1)
        
        # First approval
        response1 = self.client.post(
            f'/api/requests/{self.purchase_request.id}/approve/',
            {
                'level': 1,
                'comment': 'First approval'
            }
        )
        
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        self.assertEqual(response1.data['action'], 'created')
        
        # Reset request to pending for second test
        self.purchase_request.status = 'PENDING'
        self.purchase_request.save()
        
        # Second approval by same user (should update)
        response2 = self.client.post(
            f'/api/requests/{self.purchase_request.id}/approve/',
            {
                'level': 1,
                'comment': 'Updated approval'
            }
        )
        
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        self.assertEqual(response2.data['action'], 'updated')
        
        # Verify only one approval record exists
        approvals = Approval.objects.filter(request=self.purchase_request, level=1)
        self.assertEqual(approvals.count(), 1)
        self.assertEqual(approvals.first().comment, 'Updated approval')
    
    def test_approval_level_not_required(self):
        """Test approval at level not required for request amount."""
        # Request amount is $500, so only level 1 is required
        self.client.force_authenticate(user=self.approver_l2)
        
        response = self.client.post(
            f'/api/requests/{self.purchase_request.id}/approve/',
            {
                'level': 2,
                'comment': 'Level 2 approval'
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error']['code'], 'APPROVAL_LEVEL_NOT_REQUIRED')
    
    def test_approve_after_rejection_fails(self):
        """Test that approval after rejection fails."""
        # First reject the request
        self.client.force_authenticate(user=self.approver_l1)
        self.client.post(
            f'/api/requests/{self.purchase_request.id}/reject/',
            {
                'level': 1,
                'comment': 'Rejected'
            }
        )
        
        # Reset to pending and try to approve
        self.purchase_request.status = 'PENDING'
        self.purchase_request.save()
        
        response = self.client.post(
            f'/api/requests/{self.purchase_request.id}/approve/',
            {
                'level': 1,
                'comment': 'Trying to approve after rejection'
            }
        )
        # First approve at level 1
        self.client.force_authenticate(user=self.approver_l1)
        response = self.client.post(
            f'/api/requests/{self.purchase_request.id}/approve/',
            {
                'level': 1,
                'comment': 'Level 1 approved'
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['request_status'], 'PENDING')  # Still pending level 2
        self.assertFalse(response.data['is_fully_approved'])
        self.assertEqual(response.data['pending_levels'], [2])
        
        # Now approve at level 2
        self.client.force_authenticate(user=self.approver_l2)
        response = self.client.post(
            f'/api/requests/{self.purchase_request.id}/approve/',
            {
                'level': 2,
                'comment': 'Level 2 approved'
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['request_status'], 'APPROVED')
        self.assertTrue(response.data['is_fully_approved'])
        self.assertEqual(response.data['pending_levels'], [])
    
    def test_reject_request(self):
        """Test request rejection."""
        self.client.force_authenticate(user=self.approver_l1)
        
        response = self.client.post(
            f'/api/requests/{self.purchase_request.id}/reject/',
            {
                'level': 1,
                'comment': 'Rejected due to insufficient justification'
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Request rejected at level 1')
        self.assertEqual(response.data['request_status'], 'REJECTED')
        self.assertFalse(response.data['is_fully_approved'])
        
        # Verify approval record was created with rejection
        approval = Approval.objects.get(request=self.purchase_request, level=1)
        self.assertEqual(approval.decision, 'REJECTED')
        self.assertEqual(approval.comment, 'Rejected due to insufficient justification')
    
    def test_reject_without_comment_fails(self):
        """Test that rejection without comment fails."""
        self.client.force_authenticate(user=self.approver_l1)
        
        response = self.client.post(
            f'/api/requests/{self.purchase_request.id}/reject/',
            {
                'level': 1,
                'comment': ''
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error']['code'], 'REJECTION_COMMENT_REQUIRED')
    
    def test_insufficient_permissions(self):
        """Test approval with insufficient permissions."""
        # Staff user trying to approve
        self.client.force_authenticate(user=self.staff_user)
        
        response = self.client.post(
            f'/api/requests/{self.purchase_request.id}/approve/',
            {
                'level': 1,
                'comment': 'Trying to approve'
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Level 1 approver trying to approve level 2
        self.client.force_authenticate(user=self.approver_l1)
        
        response = self.client.post(
            f'/api/requests/{self.purchase_request.id}/approve/',
            {
                'level': 2,
                'comment': 'Trying level 2'
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_approve_non_pending_request(self):
        """Test approval of non-pending request fails."""
        # First approve the request
        self.client.force_authenticate(user=self.approver_l1)
        self.client.post(
            f'/api/requests/{self.purchase_request.id}/approve/',
            {
                'level': 1,
                'comment': 'Initial approval'
            }
        )
        
        # Try to approve again
        response = self.client.post(
            f'/api/requests/{self.purchase_request.id}/approve/',
            {
                'level': 1,
                'comment': 'Second approval attempt'
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error']['code'], 'REQUEST_NOT_PENDING')
    
    def test_idempotent_approval(self):
        """Test that duplicate approvals by same user are idempotent."""
        self.client.force_authenticate(user=self.approver_l1)
        
        # First approval
        response1 = self.client.post(
            f'/api/requests/{self.purchase_request.id}/approve/',
            {
                'level': 1,
                'comment': 'First approval'
            }
        )
        
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        self.assertEqual(response1.data['action'], 'created')
        
        # Reset request to pending for second test
        self.purchase_request.status = 'PENDING'
        self.purchase_request.save()
        
        # Second approval by same user (should update)
        response2 = self.client.post(
            f'/api/requests/{self.purchase_request.id}/approve/',
            {
                'level': 1,
                'comment': 'Updated approval'
            }
        )
        
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        self.assertEqual(response2.data['action'], 'updated')
        
        # Verify only one approval record exists
        approvals = Approval.objects.filter(request=self.purchase_request, level=1)
        self.assertEqual(approvals.count(), 1)
        self.assertEqual(approvals.first().comment, 'Updated approval')
    
    def test_approval_level_not_required(self):
        """Test approval at level not required for request amount."""
        # Request amount is $500, so only level 1 is required
        self.client.force_authenticate(user=self.approver_l2)
        
        response = self.client.post(
            f'/api/requests/{self.purchase_request.id}/approve/',
            {
                'level': 2,
                'comment': 'Level 2 approval'
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error']['code'], 'APPROVAL_LEVEL_NOT_REQUIRED')
    
    def test_approve_after_rejection_fails(self):
        """Test that approval after rejection fails."""
        # First reject the request
        self.client.force_authenticate(user=self.approver_l1)
        self.client.post(
            f'/api/requests/{self.purchase_request.id}/reject/',
            {
                'level': 1,
                'comment': 'Rejected'
            }
        )
        
        # Reset to pending and try to approve
        self.purchase_request.status = 'PENDING'
        self.purchase_request.save()
        
        response = self.client.post(
            f'/api/requests/{self.purchase_request.id}/approve/',
            {
                'level': 1,
                'comment': 'Trying to approve after rejection'
            }
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error']['code'], 'REQUEST_ALREADY_REJECTED')