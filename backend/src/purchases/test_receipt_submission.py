"""
Test cases for receipt submission functionality.

This module tests the receipt submission endpoint and validation status tracking
as required by task 7.2.
"""

import tempfile
import os
from decimal import Decimal
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status

from .models import PurchaseRequest, RequestItem, PurchaseOrder
from documents.models import Document

User = get_user_model()


class ReceiptSubmissionTestCase(TestCase):
    """
    Test cases for receipt submission functionality.
    """
    
    def setUp(self):
        """Set up test data."""
        # Create test users
        self.staff_user = User.objects.create_user(
            username='staff_user',
            email='staff@example.com',
            password='testpass123',
            role='staff'
        )
        
        self.finance_user = User.objects.create_user(
            username='finance_user',
            email='finance@example.com',
            password='testpass123',
            role='finance'
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
        
        # Now change status to APPROVED (must be approved to submit receipts)
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
        
        # Set up API client
        self.client = APIClient()
    
    def create_test_file(self, filename='test_receipt.pdf', content=b'test file content'):
        """Create a test file for upload."""
        return SimpleUploadedFile(
            filename,
            content,
            content_type='application/pdf'
        )
    
    def test_submit_receipt_success(self):
        """Test successful receipt submission."""
        self.client.force_authenticate(user=self.staff_user)
        
        test_file = self.create_test_file()
        
        response = self.client.post(
            f'/api/requests/{self.purchase_request.id}/submit-receipt/',
            {
                'receipt_file': test_file,
                'title': 'Test Receipt'
            },
            format='multipart'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('message', response.data)
        self.assertIn('receipt', response.data)
        self.assertEqual(response.data['message'], 'Receipt submitted successfully')
        
        # Verify document was created
        receipt_doc = Document.objects.filter(doc_type='RECEIPT').first()
        self.assertIsNotNone(receipt_doc)
        self.assertEqual(receipt_doc.uploaded_by, self.staff_user)
        self.assertEqual(receipt_doc.title, 'Test Receipt')
    
    def test_submit_receipt_unauthenticated(self):
        """Test receipt submission without authentication."""
        test_file = self.create_test_file()
        
        response = self.client.post(
            f'/api/requests/{self.purchase_request.id}/submit-receipt/',
            {
                'receipt_file': test_file,
                'title': 'Test Receipt'
            },
            format='multipart'
        )
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_submit_receipt_unauthorized_user(self):
        """Test receipt submission by unauthorized user."""
        other_user = User.objects.create_user(
            username='other_user',
            email='other@example.com',
            password='testpass123',
            role='staff'
        )
        
        self.client.force_authenticate(user=other_user)
        
        test_file = self.create_test_file()
        
        response = self.client.post(
            f'/api/requests/{self.purchase_request.id}/submit-receipt/',
            {
                'receipt_file': test_file,
                'title': 'Test Receipt'
            },
            format='multipart'
        )
        
        # Unauthorized users get 404 due to queryset filtering (better security)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_submit_receipt_pending_request(self):
        """Test receipt submission for pending request (should fail)."""
        # Create pending request
        pending_request = PurchaseRequest.objects.create(
            title='Pending Request',
            description='Test description',
            amount=Decimal('300.00'),
            status='PENDING',
            created_by=self.staff_user
        )
        
        self.client.force_authenticate(user=self.staff_user)
        
        test_file = self.create_test_file()
        
        response = self.client.post(
            f'/api/requests/{pending_request.id}/submit-receipt/',
            {
                'receipt_file': test_file,
                'title': 'Test Receipt'
            },
            format='multipart'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('REQUEST_NOT_APPROVED', response.data['error']['code'])
    
    def test_submit_receipt_no_purchase_order(self):
        """Test receipt submission for request without purchase order."""
        # Create approved request without PO
        request_without_po = PurchaseRequest.objects.create(
            title='Request Without PO',
            description='Test description',
            amount=Decimal('300.00'),
            status='APPROVED',
            created_by=self.staff_user
        )
        
        self.client.force_authenticate(user=self.staff_user)
        
        test_file = self.create_test_file()
        
        response = self.client.post(
            f'/api/requests/{request_without_po.id}/submit-receipt/',
            {
                'receipt_file': test_file,
                'title': 'Test Receipt'
            },
            format='multipart'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('PURCHASE_ORDER_NOT_FOUND', response.data['error']['code'])
    
    def test_submit_receipt_invalid_file(self):
        """Test receipt submission with invalid file type."""
        self.client.force_authenticate(user=self.staff_user)
        
        # Create invalid file type
        invalid_file = SimpleUploadedFile(
            'test.txt',
            b'test content',
            content_type='text/plain'
        )
        
        response = self.client.post(
            f'/api/requests/{self.purchase_request.id}/submit-receipt/',
            {
                'receipt_file': invalid_file,
                'title': 'Test Receipt'
            },
            format='multipart'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_receipt_validation_status(self):
        """Test receipt validation status endpoint."""
        # First submit a receipt
        self.client.force_authenticate(user=self.staff_user)
        
        test_file = self.create_test_file()
        
        submit_response = self.client.post(
            f'/api/requests/{self.purchase_request.id}/submit-receipt/',
            {
                'receipt_file': test_file,
                'title': 'Test Receipt'
            },
            format='multipart'
        )
        
        self.assertEqual(submit_response.status_code, status.HTTP_201_CREATED)
        
        # Now check validation status
        status_response = self.client.get(
            f'/api/requests/{self.purchase_request.id}/receipt-validation-status/'
        )
        
        self.assertEqual(status_response.status_code, status.HTTP_200_OK)
        self.assertIn('purchase_request_id', status_response.data)
        self.assertIn('validation_results', status_response.data)
        self.assertEqual(
            str(status_response.data['purchase_request_id']), 
            str(self.purchase_request.id)
        )
    
    def test_receipt_validation_status_unauthorized(self):
        """Test receipt validation status with unauthorized user."""
        other_user = User.objects.create_user(
            username='other_user',
            email='other@example.com',
            password='testpass123',
            role='staff'
        )
        
        self.client.force_authenticate(user=other_user)
        
        response = self.client.get(
            f'/api/requests/{self.purchase_request.id}/receipt-validation-status/'
        )
        
        # Unauthorized users get 404 due to queryset filtering (better security)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_finance_user_can_access_receipt_status(self):
        """Test that finance users can access receipt validation status."""
        # Submit receipt as staff user
        self.client.force_authenticate(user=self.staff_user)
        
        test_file = self.create_test_file()
        
        submit_response = self.client.post(
            f'/api/requests/{self.purchase_request.id}/submit-receipt/',
            {
                'receipt_file': test_file,
                'title': 'Test Receipt'
            },
            format='multipart'
        )
        
        self.assertEqual(submit_response.status_code, status.HTTP_201_CREATED)
        
        # Check status as finance user
        self.client.force_authenticate(user=self.finance_user)
        
        status_response = self.client.get(
            f'/api/requests/{self.purchase_request.id}/receipt-validation-status/'
        )
        
        self.assertEqual(status_response.status_code, status.HTTP_200_OK)
        self.assertIn('validation_results', status_response.data)