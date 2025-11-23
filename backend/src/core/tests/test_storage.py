"""
Tests for storage configuration and functionality.
"""

import os
import tempfile
from unittest.mock import patch, MagicMock
from django.test import TestCase, override_settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.exceptions import ValidationError
from core.storage import (
    SecureFileSystemStorage,
    SecureS3Storage,
    DocumentStorage,
    get_document_upload_path,
    validate_file_upload
)
from core.utils.storage_utils import (
    test_s3_connection,
    get_storage_info,
    validate_storage_configuration,
    generate_secure_filename
)


class SecureFileSystemStorageTest(TestCase):
    """Test SecureFileSystemStorage functionality."""
    
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.storage = SecureFileSystemStorage(location=self.temp_dir)
    
    def tearDown(self):
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_directory_creation(self):
        """Test that storage creates directory with proper permissions."""
        new_dir = os.path.join(self.temp_dir, 'new_storage')
        storage = SecureFileSystemStorage(location=new_dir)
        
        self.assertTrue(os.path.exists(new_dir))
        # On Windows, permissions work differently, so just check directory exists
        import platform
        if platform.system() != 'Windows':
            # Check permissions (755 = rwxr-xr-x) on Unix systems only
            self.assertEqual(oct(os.stat(new_dir).st_mode)[-3:], '755')
    
    def test_file_save_permissions(self):
        """Test that saved files have secure permissions."""
        content = ContentFile(b'test content')
        name = self.storage.save('test.txt', content)
        
        file_path = self.storage.path(name)
        self.assertTrue(os.path.exists(file_path))
        # On Windows, permissions work differently, so just check file exists
        import platform
        if platform.system() != 'Windows':
            # Check file permissions (644 = rw-r--r--) on Unix systems only
            self.assertEqual(oct(os.stat(file_path).st_mode)[-3:], '644')
    
    def test_filename_sanitization(self):
        """Test that filenames are properly sanitized."""
        dangerous_name = '../../../etc/passwd'
        safe_name = self.storage.get_valid_name(dangerous_name)
        
        self.assertNotIn('..', safe_name)
        self.assertNotIn('/', safe_name)
        self.assertNotIn('\\', safe_name)


class SecureS3StorageTest(TestCase):
    """Test SecureS3Storage functionality."""
    
    @patch('storages.backends.s3boto3.S3Boto3Storage.__init__')
    def test_secure_defaults(self, mock_init):
        """Test that S3 storage sets secure defaults."""
        mock_init.return_value = None
        
        storage = SecureS3Storage()
        
        # Check that secure defaults were passed to parent
        mock_init.assert_called_once()
        args, kwargs = mock_init.call_args
        
        self.assertEqual(kwargs.get('default_acl'), 'private')
        self.assertTrue(kwargs.get('querystring_auth'))
        self.assertEqual(kwargs.get('querystring_expire'), 3600)
        self.assertFalse(kwargs.get('file_overwrite'))
    
    def test_security_headers(self):
        """Test that security headers are set for objects."""
        storage = SecureS3Storage()
        params = storage.get_object_parameters('test.pdf')
        
        self.assertEqual(params['ContentDisposition'], 'attachment')
        self.assertIn('private', params['CacheControl'])
        self.assertEqual(params['ServerSideEncryption'], 'AES256')


class DocumentStorageTest(TestCase):
    """Test DocumentStorage factory class."""
    
    @override_settings(USE_S3=False)
    def test_local_storage_selection(self):
        """Test that local storage is returned when S3 is disabled."""
        storage = DocumentStorage.get_storage()
        self.assertIsInstance(storage, SecureFileSystemStorage)
    
    @override_settings(
        USE_S3=True,
        AWS_ACCESS_KEY_ID='test_key',
        AWS_SECRET_ACCESS_KEY='test_secret',
        AWS_STORAGE_BUCKET_NAME='test_bucket'
    )
    @patch('core.storage.SecureS3Storage')
    def test_s3_storage_selection(self, mock_s3_storage):
        """Test that S3 storage is returned when properly configured."""
        mock_s3_storage.return_value = MagicMock()
        
        storage = DocumentStorage.get_storage()
        
        mock_s3_storage.assert_called_once()
    
    @override_settings(USE_S3=True, AWS_ACCESS_KEY_ID='')
    def test_s3_fallback_to_local(self):
        """Test fallback to local storage when S3 config is incomplete."""
        storage = DocumentStorage.get_storage()
        self.assertIsInstance(storage, SecureFileSystemStorage)


class FileUploadValidationTest(TestCase):
    """Test file upload validation."""
    
    def create_mock_file(self, name, size, content_type):
        """Create a mock uploaded file."""
        mock_file = MagicMock()
        mock_file.name = name
        mock_file.size = size
        mock_file.content_type = content_type
        return mock_file
    
    @override_settings(DOCUMENT_PROCESSING={
        'MAX_FILE_SIZE': 1024 * 1024,  # 1MB
        'ALLOWED_EXTENSIONS': ['.pdf', '.jpg']
    })
    def test_valid_file_passes(self):
        """Test that valid files pass validation."""
        valid_file = self.create_mock_file('test.pdf', 500000, 'application/pdf')
        
        # Should not raise an exception
        validate_file_upload(valid_file)
    
    @override_settings(DOCUMENT_PROCESSING={
        'MAX_FILE_SIZE': 1024 * 1024,  # 1MB
        'ALLOWED_EXTENSIONS': ['.pdf', '.jpg']
    })
    def test_oversized_file_rejected(self):
        """Test that oversized files are rejected."""
        large_file = self.create_mock_file('large.pdf', 2 * 1024 * 1024, 'application/pdf')
        
        with self.assertRaises(ValidationError) as cm:
            validate_file_upload(large_file)
        
        self.assertIn('exceeds maximum allowed size', str(cm.exception))
    
    @override_settings(DOCUMENT_PROCESSING={
        'MAX_FILE_SIZE': 1024 * 1024,
        'ALLOWED_EXTENSIONS': ['.pdf', '.jpg']
    })
    def test_invalid_extension_rejected(self):
        """Test that files with invalid extensions are rejected."""
        invalid_file = self.create_mock_file('test.exe', 500000, 'application/octet-stream')
        
        with self.assertRaises(ValidationError) as cm:
            validate_file_upload(invalid_file)
        
        self.assertIn('is not allowed', str(cm.exception))
    
    @override_settings(DOCUMENT_PROCESSING={
        'MAX_FILE_SIZE': 1024 * 1024,
        'ALLOWED_EXTENSIONS': ['.pdf', '.jpg']
    })
    def test_content_type_mismatch_rejected(self):
        """Test that files with mismatched content types are rejected."""
        mismatched_file = self.create_mock_file('test.pdf', 500000, 'image/jpeg')
        
        with self.assertRaises(ValidationError) as cm:
            validate_file_upload(mismatched_file)
        
        self.assertIn("doesn't match file extension", str(cm.exception))
    
    def test_malicious_filename_rejected(self):
        """Test that malicious filenames are rejected."""
        malicious_files = [
            self.create_mock_file('../../../etc/passwd', 1000, 'text/plain'),
            self.create_mock_file('.hidden_file.pdf', 1000, 'application/pdf'),
            self.create_mock_file('file/with/slashes.pdf', 1000, 'application/pdf'),
        ]
        
        for malicious_file in malicious_files:
            with self.assertRaises(ValidationError):
                validate_file_upload(malicious_file)


class StorageUtilsTest(TestCase):
    """Test storage utility functions."""
    
    def test_generate_secure_filename(self):
        """Test secure filename generation."""
        filename = generate_secure_filename('test document.pdf', 'proforma')
        
        # Should contain UUID and preserve extension
        self.assertTrue(filename.endswith('.pdf'))
        self.assertIn('proforma', filename)
        self.assertIn('documents/', filename)
        # Should not contain original filename
        self.assertNotIn('test document', filename)
    
    @override_settings(USE_S3=False, MEDIA_ROOT='/tmp/media')
    def test_get_storage_info_local(self):
        """Test storage info for local storage."""
        info = get_storage_info()
        
        self.assertFalse(info['use_s3'])
        self.assertIn('FileSystemStorage', info['backend'])
        # Just check that location contains the expected path components
        self.assertIn('tmp', info['location'])
        self.assertIn('media', info['location'])
    
    @override_settings(
        USE_S3=True,
        AWS_STORAGE_BUCKET_NAME='test-bucket',
        AWS_S3_REGION_NAME='us-west-2'
    )
    def test_validate_storage_configuration_s3(self):
        """Test storage configuration validation for S3."""
        issues = validate_storage_configuration()
        
        # Should have issues due to missing credentials
        self.assertTrue(any('AWS_ACCESS_KEY_ID' in issue for issue in issues))
        self.assertTrue(any('AWS_SECRET_ACCESS_KEY' in issue for issue in issues))
    
    @override_settings(USE_S3=False, MEDIA_ROOT='')
    def test_validate_storage_configuration_local(self):
        """Test storage configuration validation for local storage."""
        issues = validate_storage_configuration()
        
        # Should have issue with missing MEDIA_ROOT
        self.assertTrue(any('MEDIA_ROOT not configured' in issue for issue in issues))


class DocumentUploadPathTest(TestCase):
    """Test document upload path generation."""
    
    def test_upload_path_generation(self):
        """Test that upload paths are generated correctly."""
        mock_instance = MagicMock()
        mock_instance.doc_type = 'PROFORMA'
        
        path = get_document_upload_path(mock_instance, 'invoice.pdf')
        
        # Should contain document type and date structure
        self.assertIn('documents/proforma/', path)
        self.assertTrue(path.endswith('.pdf'))
        # Should contain date structure (YYYY/MM/DD)
        import re
        date_pattern = r'\d{4}/\d{2}/\d{2}'
        self.assertTrue(re.search(date_pattern, path))
    
    def test_upload_path_without_doc_type(self):
        """Test upload path generation without document type."""
        mock_instance = MagicMock()
        mock_instance.doc_type = None
        
        path = get_document_upload_path(mock_instance, 'document.pdf')
        
        # Should use 'general' as default
        self.assertIn('documents/general/', path)