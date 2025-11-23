"""
Tests for the documents app.

This module provides comprehensive tests for document upload, download,
metadata management, and permission controls.
"""

import os
import tempfile
from io import BytesIO
from PIL import Image
from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Document
from .serializers import DocumentUploadSerializer, DocumentDetailSerializer

User = get_user_model()


class DocumentModelTest(TestCase):
    """Test cases for Document model functionality."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='staff'
        )
    
    def create_test_file(self, filename='test.pdf', content=b'test content'):
        """Create a test file for upload."""
        return SimpleUploadedFile(
            filename,
            content,
            content_type='application/pdf'
        )
    
    def test_document_creation(self):
        """Test basic document creation."""
        test_file = self.create_test_file()
        
        document = Document.objects.create(
            file=test_file,
            doc_type='PROFORMA',
            uploaded_by=self.user
        )
        
        self.assertEqual(document.doc_type, 'PROFORMA')
        self.assertEqual(document.uploaded_by, self.user)
        self.assertEqual(document.processing_status, 'PENDING')
        self.assertTrue(document.original_filename)
        self.assertTrue(document.file_size > 0)
    
    def test_file_hash_generation(self):
        """Test that file hash is generated correctly."""
        test_file = self.create_test_file(content=b'unique content')
        
        document = Document.objects.create(
            file=test_file,
            doc_type='RECEIPT',
            uploaded_by=self.user
        )
        
        self.assertTrue(document.file_hash)
        self.assertEqual(len(document.file_hash), 64)  # SHA-256 hex length
    
    def test_file_extension_property(self):
        """Test file extension detection."""
        test_file = self.create_test_file('document.pdf')
        
        document = Document.objects.create(
            file=test_file,
            doc_type='PO',
            uploaded_by=self.user
        )
        
        self.assertEqual(document.file_extension, 'pdf')
        self.assertTrue(document.is_pdf)
        self.assertFalse(document.is_image)
    
    def test_metadata_operations(self):
        """Test metadata get/set operations."""
        document = Document.objects.create(
            file=self.create_test_file(),
            doc_type='INVOICE',
            uploaded_by=self.user
        )
        
        # Test setting nested metadata
        document.set_metadata_value('vendor.name', 'Test Vendor')
        document.set_metadata_value('amount', 1000.50)
        document.save()
        
        # Test getting metadata values
        self.assertEqual(document.get_metadata_value('vendor.name'), 'Test Vendor')
        self.assertEqual(document.get_metadata_value('amount'), 1000.50)
        self.assertIsNone(document.get_metadata_value('nonexistent'))
        self.assertEqual(document.get_metadata_value('nonexistent', 'default'), 'default')
    
    def test_processing_status_methods(self):
        """Test processing status helper methods."""
        document = Document.objects.create(
            file=self.create_test_file(),
            doc_type='CONTRACT',
            uploaded_by=self.user
        )
        
        # Test initial status
        self.assertFalse(document.is_processed)
        self.assertFalse(document.is_processing)
        self.assertFalse(document.has_processing_error)
        
        # Test completed processing
        document.mark_processing_completed(
            extracted_text='Extracted text',
            metadata={'key': 'value'}
        )
        
        self.assertTrue(document.is_processed)
        self.assertFalse(document.is_processing)
        self.assertFalse(document.has_processing_error)
        self.assertEqual(document.extracted_text, 'Extracted text')
        self.assertEqual(document.metadata['key'], 'value')
        
        # Test failed processing
        document.mark_processing_failed('Processing error')
        
        self.assertFalse(document.is_processed)
        self.assertFalse(document.is_processing)
        self.assertTrue(document.has_processing_error)
        self.assertEqual(document.processing_error, 'Processing error')


class DocumentSerializerTest(TestCase):
    """Test cases for document serializers."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='staff'
        )
    
    def create_test_file(self, filename='test.pdf', content=b'test content', content_type='application/pdf'):
        """Create a test file for upload."""
        return SimpleUploadedFile(filename, content, content_type=content_type)
    
    def test_upload_serializer_validation(self):
        """Test document upload serializer validation."""
        # Valid data
        valid_file = self.create_test_file()
        serializer = DocumentUploadSerializer(data={
            'file': valid_file,
            'doc_type': 'PROFORMA'
        })
        
        self.assertTrue(serializer.is_valid())
    
    def test_file_size_validation(self):
        """Test file size validation."""
        # Create a large file (simulate > 50MB)
        large_content = b'x' * (51 * 1024 * 1024)  # 51MB
        large_file = self.create_test_file(content=large_content)
        
        serializer = DocumentUploadSerializer(data={
            'file': large_file,
            'doc_type': 'RECEIPT'
        })
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('file', serializer.errors)
    
    def test_file_type_validation(self):
        """Test file type validation."""
        # Invalid file type
        invalid_file = self.create_test_file(
            filename='test.txt',
            content_type='text/plain'
        )
        
        serializer = DocumentUploadSerializer(data={
            'file': invalid_file,
            'doc_type': 'PO'
        })
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('file', serializer.errors)
    
    def test_doc_type_validation(self):
        """Test document type validation."""
        valid_file = self.create_test_file()
        
        serializer = DocumentUploadSerializer(data={
            'file': valid_file,
            'doc_type': 'INVALID_TYPE'
        })
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('doc_type', serializer.errors)


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class DocumentAPITest(APITestCase):
    """Test cases for document API endpoints."""
    
    def setUp(self):
        """Set up test data and authentication."""
        # Create test users
        self.staff_user = User.objects.create_user(
            username='staff',
            email='staff@example.com',
            password='testpass123',
            role='staff'
        )
        
        self.finance_user = User.objects.create_user(
            username='finance',
            email='finance@example.com',
            password='testpass123',
            role='finance'
        )
        
        self.admin_user = User.objects.create_user(
            username='admin',
            email='admin@example.com',
            password='testpass123',
            role='admin'
        )
        
        # Set up API client
        self.client = APIClient()
    
    def get_jwt_token(self, user):
        """Get JWT token for user authentication."""
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)
    
    def authenticate_user(self, user):
        """Authenticate user with JWT token."""
        token = self.get_jwt_token(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    
    def create_test_file(self, filename='test.pdf', content=b'test content'):
        """Create a test file for upload."""
        return SimpleUploadedFile(
            filename,
            content,
            content_type='application/pdf'
        )
    
    def create_test_image(self, filename='test.png'):
        """Create a test image file."""
        image = Image.new('RGB', (100, 100), color='red')
        image_io = BytesIO()
        image.save(image_io, format='PNG')
        image_io.seek(0)
        
        return SimpleUploadedFile(
            filename,
            image_io.getvalue(),
            content_type='image/png'
        )
    
    def test_document_upload_success(self):
        """Test successful document upload."""
        self.authenticate_user(self.staff_user)
        
        test_file = self.create_test_file()
        
        response = self.client.post('/api/documents/', {
            'file': test_file,
            'doc_type': 'PROFORMA',
            'title': 'Test Document'
        }, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('message', response.data)
        self.assertIn('document', response.data)
        
        # Verify document was created
        document = Document.objects.get(id=response.data['document']['id'])
        self.assertEqual(document.uploaded_by, self.staff_user)
        self.assertEqual(document.doc_type, 'PROFORMA')
        self.assertEqual(document.title, 'Test Document')
    
    def test_document_upload_unauthenticated(self):
        """Test document upload without authentication."""
        test_file = self.create_test_file()
        
        response = self.client.post('/api/documents/', {
            'file': test_file,
            'doc_type': 'RECEIPT'
        }, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_document_upload_invalid_file(self):
        """Test document upload with invalid file."""
        self.authenticate_user(self.staff_user)
        
        # Test with no file
        response = self.client.post('/api/documents/', {
            'doc_type': 'PO'
        })
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_document_list_permissions(self):
        """Test document list permissions."""
        # Create documents for different users
        staff_doc = Document.objects.create(
            file=self.create_test_file('staff_doc.pdf'),
            doc_type='PROFORMA',
            uploaded_by=self.staff_user
        )
        
        finance_doc = Document.objects.create(
            file=self.create_test_file('finance_doc.pdf'),
            doc_type='RECEIPT',
            uploaded_by=self.finance_user
        )
        
        # Staff user should only see their own documents
        self.authenticate_user(self.staff_user)
        response = self.client.get('/api/documents/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], str(staff_doc.id))
        
        # Finance user should see all documents
        self.authenticate_user(self.finance_user)
        response = self.client.get('/api/documents/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
    
    def test_document_download(self):
        """Test document download functionality."""
        self.authenticate_user(self.staff_user)
        
        # Create a document
        document = Document.objects.create(
            file=self.create_test_file('download_test.pdf'),
            doc_type='INVOICE',
            uploaded_by=self.staff_user
        )
        
        # Test download info endpoint
        response = self.client.get(f'/api/documents/{document.id}/download/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('download_url', response.data)
        self.assertIn('content_type', response.data)
        self.assertIn('file_size', response.data)
    
    def test_document_download_permissions(self):
        """Test document download permission checking."""
        # Create document for staff user
        document = Document.objects.create(
            file=self.create_test_file('permission_test.pdf'),
            doc_type='CONTRACT',
            uploaded_by=self.staff_user
        )
        
        # Create another staff user
        other_staff = User.objects.create_user(
            username='other_staff',
            email='other@example.com',
            password='testpass123',
            role='staff'
        )
        
        # Other staff user should not be able to download
        self.authenticate_user(other_staff)
        response = self.client.get(f'/api/documents/{document.id}/download/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # Finance user should be able to download
        self.authenticate_user(self.finance_user)
        response = self.client.get(f'/api/documents/{document.id}/download/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_document_metadata_endpoint(self):
        """Test document metadata endpoint."""
        self.authenticate_user(self.staff_user)
        
        # Create document with metadata
        document = Document.objects.create(
            file=self.create_test_file('metadata_test.pdf'),
            doc_type='PROFORMA',
            uploaded_by=self.staff_user
        )
        
        # Add some metadata
        document.mark_processing_completed(
            extracted_text='Sample extracted text',
            metadata={'vendor': 'Test Vendor', 'amount': 1000}
        )
        
        # Test metadata endpoint
        response = self.client.get(f'/api/documents/{document.id}/metadata/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['extracted_text'], 'Sample extracted text')
        self.assertEqual(response.data['metadata']['vendor'], 'Test Vendor')
        self.assertEqual(response.data['metadata']['amount'], 1000)
    
    def test_document_processing_status_endpoint(self):
        """Test processing status summary endpoint."""
        self.authenticate_user(self.staff_user)
        
        # Create documents with different statuses
        Document.objects.create(
            file=self.create_test_file('pending1.pdf'),
            doc_type='PROFORMA',
            uploaded_by=self.staff_user,
            processing_status='PENDING'
        )
        
        Document.objects.create(
            file=self.create_test_file('completed1.pdf'),
            doc_type='RECEIPT',
            uploaded_by=self.staff_user,
            processing_status='COMPLETED'
        )
        
        response = self.client.get('/api/documents/processing-status/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_documents'], 2)
        self.assertEqual(response.data['status_breakdown']['PENDING'], 1)
        self.assertEqual(response.data['status_breakdown']['COMPLETED'], 1)
    
    def test_document_update_permissions(self):
        """Test document update permissions."""
        # Create document
        document = Document.objects.create(
            file=self.create_test_file('update_test.pdf'),
            doc_type='PROFORMA',
            uploaded_by=self.staff_user
        )
        
        # Owner should be able to update
        self.authenticate_user(self.staff_user)
        response = self.client.patch(f'/api/documents/{document.id}/', {
            'title': 'Updated Title'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify update
        document.refresh_from_db()
        self.assertEqual(document.title, 'Updated Title')
    
    def test_document_delete_permissions(self):
        """Test document deletion permissions."""
        # Create document
        document = Document.objects.create(
            file=self.create_test_file('delete_test.pdf'),
            doc_type='INVOICE',
            uploaded_by=self.staff_user
        )
        
        # Staff user should not be able to delete
        self.authenticate_user(self.staff_user)
        response = self.client.delete(f'/api/documents/{document.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        
        # Admin user should be able to delete
        self.authenticate_user(self.admin_user)
        response = self.client.delete(f'/api/documents/{document.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify document was deleted
        self.assertFalse(Document.objects.filter(id=document.id).exists())
    
    def test_image_file_upload(self):
        """Test uploading image files."""
        self.authenticate_user(self.staff_user)
        
        test_image = self.create_test_image('test_image.png')
        
        response = self.client.post('/api/documents/', {
            'file': test_image,
            'doc_type': 'RECEIPT',
            'title': 'Test Image'
        }, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify document properties
        document = Document.objects.get(id=response.data['document']['id'])
        self.assertEqual(document.file_extension, 'png')
        self.assertTrue(document.is_image)
        self.assertFalse(document.is_pdf)