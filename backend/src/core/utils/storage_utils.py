"""
Storage utility functions for the P2P system.
"""

import logging
from django.conf import settings
from django.core.files.storage import default_storage

logger = logging.getLogger(__name__)


def test_s3_connection():
    """
    Test S3 connection and permissions.
    
    Returns:
        dict: Test results with status and details
    """
    if not getattr(settings, 'USE_S3', False):
        return {
            'status': 'skipped',
            'message': 'S3 not configured (USE_S3=False)'
        }
    
    try:
        from django.core.files.base import ContentFile
        
        # Test basic connectivity
        test_content = ContentFile(b'S3 connection test')
        test_filename = 'test_s3_connection.txt'
        
        # Try to save a file
        saved_name = default_storage.save(test_filename, test_content)
        
        # Try to read it back
        if default_storage.exists(saved_name):
            with default_storage.open(saved_name, 'rb') as f:
                retrieved_content = f.read()
            
            # Clean up
            default_storage.delete(saved_name)
            
            if retrieved_content == b'S3 connection test':
                return {
                    'status': 'success',
                    'message': 'S3 connection successful',
                    'bucket': getattr(default_storage, 'bucket_name', 'unknown'),
                    'region': getattr(default_storage, 'region_name', 'unknown')
                }
            else:
                return {
                    'status': 'error',
                    'message': 'S3 file content mismatch'
                }
        else:
            return {
                'status': 'error',
                'message': 'S3 file not found after upload'
            }
            
    except Exception as e:
        logger.error(f"S3 connection test failed: {e}")
        return {
            'status': 'error',
            'message': f'S3 connection failed: {str(e)}'
        }


def get_storage_info():
    """
    Get information about the current storage configuration.
    
    Returns:
        dict: Storage configuration details
    """
    storage = default_storage
    
    info = {
        'backend': storage.__class__.__name__,
        'module': storage.__class__.__module__,
        'use_s3': getattr(settings, 'USE_S3', False),
    }
    
    if hasattr(storage, 'location'):
        info['location'] = storage.location
    
    if hasattr(storage, 'bucket_name'):
        info['bucket_name'] = storage.bucket_name
        info['region_name'] = getattr(storage, 'region_name', 'unknown')
        info['custom_domain'] = getattr(storage, 'custom_domain', None)
    
    # Add document processing settings
    doc_settings = getattr(settings, 'DOCUMENT_PROCESSING', {})
    info['max_file_size'] = doc_settings.get('MAX_FILE_SIZE', 'not configured')
    info['allowed_extensions'] = doc_settings.get('ALLOWED_EXTENSIONS', 'not configured')
    
    return info


def generate_secure_filename(original_filename, doc_type=None):
    """
    Generate a secure filename for document uploads.
    
    Args:
        original_filename (str): Original filename
        doc_type (str, optional): Document type for organization
        
    Returns:
        str: Secure filename with path
    """
    import uuid
    import os
    from datetime import datetime
    
    # Extract file extension
    _, ext = os.path.splitext(original_filename)
    ext = ext.lower()
    
    # Generate unique filename
    unique_id = uuid.uuid4().hex
    secure_filename = f"{unique_id}{ext}"
    
    # Create organized path
    date_path = datetime.now().strftime('%Y/%m/%d')
    
    if doc_type:
        doc_type = doc_type.lower().replace(' ', '_')
        return f"documents/{doc_type}/{date_path}/{secure_filename}"
    else:
        return f"documents/general/{date_path}/{secure_filename}"


def validate_storage_configuration():
    """
    Validate the current storage configuration.
    
    Returns:
        list: List of validation issues (empty if all good)
    """
    issues = []
    
    # Check if USE_S3 is properly configured
    use_s3 = getattr(settings, 'USE_S3', False)
    
    if use_s3:
        # Check required S3 settings
        required_s3_settings = [
            'AWS_ACCESS_KEY_ID',
            'AWS_SECRET_ACCESS_KEY',
            'AWS_STORAGE_BUCKET_NAME'
        ]
        
        for setting in required_s3_settings:
            if not getattr(settings, setting, None):
                issues.append(f"Missing required S3 setting: {setting}")
        
        # Check optional but recommended settings
        if not getattr(settings, 'AWS_S3_REGION_NAME', None):
            issues.append("AWS_S3_REGION_NAME not set (will use default region)")
    
    else:
        # Check local storage settings
        media_root = getattr(settings, 'MEDIA_ROOT', None)
        if not media_root:
            issues.append("MEDIA_ROOT not configured for local storage")
        else:
            import os
            if not os.path.exists(media_root):
                issues.append(f"MEDIA_ROOT directory does not exist: {media_root}")
            elif not os.access(media_root, os.W_OK):
                issues.append(f"MEDIA_ROOT directory is not writable: {media_root}")
    
    # Check document processing settings
    doc_settings = getattr(settings, 'DOCUMENT_PROCESSING', {})
    
    if not doc_settings.get('MAX_FILE_SIZE'):
        issues.append("DOCUMENT_PROCESSING.MAX_FILE_SIZE not configured")
    
    if not doc_settings.get('ALLOWED_EXTENSIONS'):
        issues.append("DOCUMENT_PROCESSING.ALLOWED_EXTENSIONS not configured")
    
    return issues


def get_file_url(file_path, expires_in=3600):
    """
    Get a URL for accessing a file, handling both S3 and local storage.
    
    Args:
        file_path (str): Path to the file in storage
        expires_in (int): Expiration time in seconds (for S3 signed URLs)
        
    Returns:
        str: URL to access the file
    """
    try:
        if getattr(settings, 'USE_S3', False):
            # For S3, generate a signed URL
            return default_storage.url(file_path)
        else:
            # For local storage, return the media URL
            return default_storage.url(file_path)
    except Exception as e:
        logger.error(f"Failed to generate URL for {file_path}: {e}")
        return None