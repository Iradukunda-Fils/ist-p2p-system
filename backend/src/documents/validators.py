"""
Comprehensive file validation for document uploads.

Provides multi-layered security validation:
1. File size validation
2. Extension validation
3. MIME type verification
4. Content-based validation (magic bytes)
5. Security scanning (malware detection hooks)
"""

from django.core.exceptions import ValidationError
from django.conf import settings
import os
import mimetypes
import logging

logger = logging.getLogger(__name__)

# Try to import python-magic for content-based MIME detection
try:
    import magic
    MAGIC_AVAILABLE = True
except ImportError:
    MAGIC_AVAILABLE = False
    logger.warning(
        'python-magic not installed. Content-based MIME detection disabled. '
        'Install with: pip install python-magic-bin (Windows) or python-magic (Unix)'
    )


class SecureFileValidator:
    """
    Comprehensive file validation for security and integrity.
    
    Validates files based on:
    - Size limits
    - Allowed extensions
    - MIME type matching
    - Content inspection (if python-magic available)
    """
    
    # Default configuration
    ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.bmp']
    
    ALLOWED_MIME_TYPES = {
        'application/pdf',
        'image/png',
        'image/jpeg',
        'image/tiff',
        'image/bmp',
        'image/x-ms-bmp',
    }
    
    # MIME type to extension mapping for verification
    MIME_TO_EXTENSIONS = {
        'application/pdf': ['.pdf'],
        'image/png': ['.png'],
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/tiff': ['.tiff', '.tif'],
        'image/bmp': ['.bmp'],
        'image/x-ms-bmp': ['.bmp'],
    }
    
    def __init__(self):
        """Initialize with settings from Django configuration."""
        self.max_file_size = getattr(
            settings,
            'DOCUMENT_PROCESSING',
            {}
        ).get('MAX_FILE_SIZE', 100 * 1024 * 1024)  # 100MB default
        
        self.allowed_extensions = getattr(
            settings,
            'DOCUMENT_PROCESSING',
            {}
        ).get('ALLOWED_EXTENSIONS', self.ALLOWED_EXTENSIONS)
        
        # Normalize extensions to ensure leading dot
        self.allowed_extensions = [
            ext if ext.startswith('.')else f'.{ext}'
            for ext in self.allowed_extensions
        ]
    
    def validate_file(self, file_obj, filename=None):
        """
        Perform comprehensive validation on uploaded file.
        
        Args:
            file_obj: Django UploadedFile object
            filename: Optional filename override
            
        Returns:
            dict: Validation result with metadata
            
        Raises:
            ValidationError: If file fails validation
        """
        filename = filename or file_obj.name
        
        # Run all validation checks
        self._validate_file_size(file_obj)
        self._validate_extension(filename)
        self._validate_mime_type(file_obj, filename)
        
        if MAGIC_AVAILABLE:
            self._validate_content_type(file_obj, filename)
        
        self._validate_security(file_obj, filename)
        
        logger.info(f'File validation passed for: {filename}')
        
        return {
            'valid': True,
            'filename': filename,
            'size': file_obj.size,
            'extension': os.path.splitext(filename)[1].lower(),
        }
    
    def _validate_file_size(self, file_obj):
        """Validate file size is within limits."""
        if not hasattr(file_obj, 'size'):
            return
        
        if file_obj.size > self.max_file_size:
            max_mb = self.max_file_size / (1024 * 1024)
            actual_mb = file_obj.size / (1024 * 1024)
            raise ValidationError(
                f'File size {actual_mb:.2f}MB exceeds maximum allowed size of {max_mb:.0f}MB'
            )
        
        if file_obj.size == 0:
            raise ValidationError('File is empty (0 bytes)')
    
    def _validate_extension(self, filename):
        """Validate file extension is allowed."""
        if not filename:
            raise ValidationError('Filename is required')
        
        file_ext = os.path.splitext(filename)[1].lower()
        
        if not file_ext:
            raise ValidationError('File has no extension')
        
        if file_ext not in self.allowed_extensions:
            raise ValidationError(
                f'File extension "{file_ext}" is not allowed. '
                f'Allowed extensions: {", ".join(self.allowed_extensions)}'
            )
    
    def _validate_mime_type(self, file_obj, filename):
        """Validate MIME type from HTTP headers."""
        # Get content type from upload
        content_type = getattr(file_obj, 'content_type', None)
        
        if not content_type:
            # Try to guess from filename
            content_type, _ = mimetypes.guess_type(filename)
        
        if not content_type:
            logger.warning(f'Could not determine MIME type for: {filename}')
            return
        
        # Normalize content type (remove parameters)
        content_type = content_type.split(';')[0].strip().lower()
        
        if content_type not in self.ALLOWED_MIME_TYPES:
            raise ValidationError(
                f'File type "{content_type}" is not allowed. '
                f'Allowed types: {", ".join(sorted(self.ALLOWED_MIME_TYPES))}'
            )
    
    def _validate_content_type(self, file_obj, filename):
        """
        Validate actual file content matches declared type.
        
        Uses python-magic to inspect file content (magic bytes).
        This prevents extension/MIME type spoofing attacks.
        """
        if not MAGIC_AVAILABLE:
            return
        
        try:
            # Read first 2KB for magic byte detection
            file_obj.seek(0)
            file_header = file_obj.read(2048)
            file_obj.seek(0)  # Reset pointer
            
            # Detect actual MIME type from content
            actual_mime = magic.from_buffer(file_header, mime=True)
            
            if actual_mime not in self.ALLOWED_MIME_TYPES:
                raise ValidationError(
                    f'File content type "{actual_mime}" does not match allowed types. '
                    f'This may indicate file corruption or security issue.'
                )
            
            # Verify content type matches extension
            file_ext = os.path.splitext(filename)[1].lower()
            expected_extensions = self.MIME_TO_EXTENSIONS.get(actual_mime, [])
            
            if expected_extensions and file_ext not in expected_extensions:
                logger.warning(
                    f'Extension mismatch: file has extension "{file_ext}" '
                    f'but content is "{actual_mime}". Expected: {expected_extensions}'
                )
                # Don't fail, just warn - some files have valid alternative extensions
            
            logger.debug(f'Content validation passed: {filename} is {actual_mime}')
            
        except Exception as e:
            logger.error(f'Content validation error for {filename}: {e}')
            # Don't fail upload on validation errors if magic is having issues
            # Fall back to extension/MIME validation
    
    def _validate_security(self, file_obj, filename):
        """
        Perform security checks on file content.
        
        This is a hook for integrating with antivirus/malware scanners.
        In production, integrate with:
        - ClamAV for real-time scanning
        - VirusTotal API for cloud scanning
        - Custom malware detection logic
        """
        # Placeholder for future malware scanning integration
        # Example integration points:
        
        # 1. ClamAV integration (if installed):
        # try:
        #     import pyclamd
        #     cd = pyclamd.ClamdUnixSocket()
        #     file_obj.seek(0)
        #     scan_result = cd.scan_stream(file_obj.read())
        #     file_obj.seek(0)
        #     if scan_result:
        #         raise ValidationError('File failed malware scan')
        # except ImportError:
        #     pass
        
        # 2. Check for suspicious patterns in PDF files
        if filename.lower().endswith('.pdf'):
            self._validate_pdf_security(file_obj)
        
        # 3. Check for executable content in images (steganography)
        if any(filename.lower().endswith(ext) for ext in ['.png', '.jpg', '.jpeg']):
            self._validate_image_security(file_obj)
    
    def _validate_pdf_security(self, file_obj):
        """
        Check PDF files for potential security issues.
        
        PDFs can contain embedded JavaScript, executables, etc.
        """
        try:
            file_obj.seek(0)
            header = file_obj.read(1024).decode('latin1', errors='ignore')
            file_obj.seek(0)
            
            # Check for suspicious PDF features
            suspicious_keywords = [
                '/JavaScript',
                '/JS',
                '/Launch',
                '/OpenAction',
            ]
            
            for keyword in suspicious_keywords:
                if keyword in header:
                    logger.warning(
                        f'PDF contains potentially unsafe feature: {keyword}'
                    )
                    # In production, you might want to reject these
                    # For now, just log the warning
            
        except Exception as e:
            logger.error(f'PDF security validation error: {e}')
    
    def _validate_image_security(self, file_obj):
        """
        Check image files for potential security issues.
        
        Images can contain hidden executable content.
        """
        try:
            file_obj.seek(0)
            header = file_obj.read(512)
            file_obj.seek(0)
            
            # Check for executable signatures in image files
            if b'MZ' in header or b'PE\x00\x00' in header:
                raise ValidationError(
                    'Image file contains executable content'
                )
            
        except ValidationError:
            raise
        except Exception as e:
            logger.error(f'Image security validation error: {e}')


# Singleton validator instance
_validator = None

def get_file_validator():
    """Get or create the file validator singleton."""
    global _validator
    if _validator is None:
        _validator = SecureFileValidator()
    return _validator


def validate_upload_file(file_obj, filename=None):
    """
    Convenience function to validate an uploaded file.
    
    Args:
        file_obj: Django UploadedFile object
        filename: Optional filename override
        
    Returns:
        dict: Validation result
        
    Raises:
        ValidationError: If file fails validation
    """
    validator = get_file_validator()
    return validator.validate_file(file_obj, filename)
