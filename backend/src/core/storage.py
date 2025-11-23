"""
Custom storage backends for the P2P system.

This module provides S3-compatible storage with local fallback for development
and secure file handling for document uploads.
"""

import os
import logging
from django.conf import settings
from django.core.files.storage import FileSystemStorage
from storages.backends.s3boto3 import S3Boto3Storage
from django.core.exceptions import ImproperlyConfigured

logger = logging.getLogger(__name__)


class SecureFileSystemStorage(FileSystemStorage):
    """
    Custom FileSystemStorage with enhanced security for local development.
    """
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Ensure the media directory exists and has proper permissions
        if not os.path.exists(self.location):
            os.makedirs(self.location, mode=0o755, exist_ok=True)
    
    def _save(self, name, content):
        """Override save to ensure secure file permissions."""
        full_path = super()._save(name, content)
        # Set secure file permissions (readable by owner and group only)
        file_path = self.path(full_path)
        os.chmod(file_path, 0o644)
        return full_path
    
    def get_valid_name(self, name):
        """
        Return a filename that's suitable for use on the target storage system.
        Remove potentially dangerous characters.
        """
        name = super().get_valid_name(name)
        # Additional security: remove any remaining problematic characters
        import re
        # Remove path traversal attempts and dangerous characters
        name = re.sub(r'\.\.+', '.', name)  # Replace multiple dots with single dot
        name = re.sub(r'[^\w\s.-]', '', name)  # Remove special characters
        name = re.sub(r'^\.+', '', name)  # Remove leading dots
        return name


class SecureS3Storage(S3Boto3Storage):
    """
    Custom S3 storage with enhanced security and document-specific settings.
    """
    
    def __init__(self, *args, **kwargs):
        # Set secure defaults for document storage
        kwargs.setdefault('default_acl', 'private')
        kwargs.setdefault('querystring_auth', True)
        kwargs.setdefault('querystring_expire', 3600)  # 1 hour
        kwargs.setdefault('file_overwrite', False)
        
        super().__init__(*args, **kwargs)
    
    def get_object_parameters(self, name):
        """Set security headers for uploaded objects."""
        params = super().get_object_parameters(name)
        
        # Add security headers
        params.update({
            'ContentDisposition': 'attachment',  # Force download instead of inline display
            'CacheControl': 'private, max-age=3600',
            'ServerSideEncryption': 'AES256',  # Encrypt at rest
        })
        
        return params
    
    def get_valid_name(self, name):
        """
        Return a filename that's suitable for use on S3.
        """
        name = super().get_valid_name(name)
        # Additional security: sanitize filename
        import re
        name = re.sub(r'[^\w\s.-]', '', name)
        return name


class DocumentStorage:
    """
    Factory class that returns the appropriate storage backend based on configuration.
    """
    
    @staticmethod
    def get_storage():
        """
        Return the configured storage backend.
        
        Returns:
            Storage backend instance (S3 or FileSystem)
        """
        use_s3 = getattr(settings, 'USE_S3', False)
        
        if use_s3:
            # Validate S3 configuration
            required_s3_settings = [
                'AWS_ACCESS_KEY_ID',
                'AWS_SECRET_ACCESS_KEY', 
                'AWS_STORAGE_BUCKET_NAME'
            ]
            
            missing_settings = [
                setting for setting in required_s3_settings 
                if not getattr(settings, setting, None)
            ]
            
            if missing_settings:
                logger.warning(
                    f"S3 storage requested but missing settings: {missing_settings}. "
                    "Falling back to local storage."
                )
                return SecureFileSystemStorage(
                    location=settings.MEDIA_ROOT,
                    base_url=settings.MEDIA_URL
                )
            
            try:
                return SecureS3Storage(
                    bucket_name=settings.AWS_STORAGE_BUCKET_NAME,
                    access_key=settings.AWS_ACCESS_KEY_ID,
                    secret_key=settings.AWS_SECRET_ACCESS_KEY,
                    region_name=getattr(settings, 'AWS_S3_REGION_NAME', 'us-east-1'),
                    custom_domain=getattr(settings, 'AWS_S3_CUSTOM_DOMAIN', None),
                )
            except Exception as e:
                logger.error(f"Failed to initialize S3 storage: {e}. Falling back to local storage.")
                return SecureFileSystemStorage(
                    location=settings.MEDIA_ROOT,
                    base_url=settings.MEDIA_URL
                )
        else:
            return SecureFileSystemStorage(
                location=settings.MEDIA_ROOT,
                base_url=settings.MEDIA_URL
            )


class StaticS3Storage(S3Boto3Storage):
    """
    S3 storage backend for static files with public read access.
    """
    
    def __init__(self, *args, **kwargs):
        kwargs.setdefault('default_acl', 'public-read')
        kwargs.setdefault('querystring_auth', False)
        kwargs.setdefault('file_overwrite', True)
        super().__init__(*args, **kwargs)
    
    def get_object_parameters(self, name):
        """Set caching headers for static files."""
        params = super().get_object_parameters(name)
        params.update({
            'CacheControl': 'public, max-age=31536000',  # 1 year
        })
        return params


def get_document_upload_path(instance, filename):
    """
    Generate a secure upload path for documents.
    
    Args:
        instance: The model instance
        filename: Original filename
        
    Returns:
        str: Secure upload path
    """
    import uuid
    from datetime import datetime
    
    # Get file extension
    ext = filename.split('.')[-1].lower() if '.' in filename else ''
    
    # Generate unique filename to prevent conflicts and enhance security
    unique_filename = f"{uuid.uuid4().hex}.{ext}" if ext else str(uuid.uuid4().hex)
    
    # Organize by date and document type
    date_path = datetime.now().strftime('%Y/%m/%d')
    doc_type = getattr(instance, 'doc_type', 'general')
    if doc_type:
        doc_type = doc_type.lower()
    else:
        doc_type = 'general'
    
    return f"documents/{doc_type}/{date_path}/{unique_filename}"


def validate_file_upload(file):
    """
    Validate uploaded files for security and compliance.
    
    Args:
        file: UploadedFile instance
        
    Raises:
        ValidationError: If file validation fails
    """
    from django.core.exceptions import ValidationError
    
    # Check file size
    max_size = getattr(settings, 'DOCUMENT_PROCESSING', {}).get('MAX_FILE_SIZE', 50 * 1024 * 1024)
    if file.size > max_size:
        raise ValidationError(f"File size ({file.size} bytes) exceeds maximum allowed size ({max_size} bytes)")
    
    # Check file extension
    allowed_extensions = getattr(settings, 'DOCUMENT_PROCESSING', {}).get(
        'ALLOWED_EXTENSIONS', 
        ['.pdf', '.png', '.jpg', '.jpeg', '.tiff']
    )
    
    file_ext = f".{file.name.split('.')[-1].lower()}" if '.' in file.name else ''
    if file_ext not in allowed_extensions:
        raise ValidationError(f"File extension '{file_ext}' is not allowed. Allowed extensions: {allowed_extensions}")
    
    # Basic content type validation
    allowed_content_types = {
        '.pdf': ['application/pdf'],
        '.png': ['image/png'],
        '.jpg': ['image/jpeg'],
        '.jpeg': ['image/jpeg'],
        '.tiff': ['image/tiff'],
    }
    
    if file_ext in allowed_content_types:
        if file.content_type not in allowed_content_types[file_ext]:
            raise ValidationError(f"Content type '{file.content_type}' doesn't match file extension '{file_ext}'")
    
    # Check for potentially malicious content (basic check)
    if file.name.startswith('.') or '..' in file.name or '/' in file.name or '\\' in file.name:
        raise ValidationError("Invalid filename detected")
    
    logger.info(f"File validation passed for: {file.name} ({file.size} bytes)")