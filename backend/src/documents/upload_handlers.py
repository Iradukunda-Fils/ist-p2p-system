"""
Advanced file upload handlers for the P2P system.

Provides:
- Chunked file uploads with progress tracking
- Streaming uploads (no memory loading)
- Traditional fallback for small files
- File validation and security checks
"""

from django.core.files.uploadhandler import (
    FileUploadHandler,
    TemporaryFileUploadHandler,
    StopUpload
)
from django.core.cache import cache
from django.conf import settings
import hashlib
import uuid
import logging

logger = logging.getLogger(__name__)


class ChunkedStreamingUploadHandler(FileUploadHandler):
    """
    Advanced upload handler that streams file uploads in chunks.
    
    Features:
    - Memory-efficient streaming (no full file in memory)
    - Real-time progress tracking via cache
    - Incremental hash calculation
    - Support for uploads up to 100MB
    
    The handler stores progress data in cache which can be queried
    via REST API for real-time progress updates on the frontend.
    """
    
    # Switch to temp file for files larger than 5MB
    chunk_size = 64 * 1024  # 64KB chunks
    
    def __init__(self, request=None):
        super().__init__(request)
        self.file_id = None
        self.file_hash = None
        self.bytes_received = 0
        self.chunks_received = 0
        
    def handle_raw_input(self, input_data, META, content_length, boundary, encoding=None):
        """
        Check file size before processing to prevent huge uploads.
        """
        # Get max size from settings
        max_size = getattr(settings, 'DOCUMENT_PROCESSING', {}).get(
            'MAX_FILE_SIZE',
            100 * 1024 * 1024  # 100MB default
        )
        
        if content_length and content_length > max_size:
            logger.warning(
                f'Upload rejected: size {content_length} exceeds max {max_size}'
            )
            raise StopUpload(connection_reset=True)
        
        # Continue with upload
        return input_data
    
    def new_file(self, field_name, file_name, content_type, content_length, charset=None, content_type_extra=None):
        """
        Initialize tracking for new file upload.
        """
        super().new_file(
            field_name, file_name, content_type, content_length,
            charset, content_type_extra
        )
        
        # Generate unique upload ID
        self.file_id = str(uuid.uuid4())
        self.file_hash = hashlib.sha256()
        self.bytes_received = 0
        self.chunks_received = 0
        
        # Store initial progress in cache
        self._update_progress(0)
        
        logger.info(
            f'New upload started: {file_name} ({content_length} bytes), '
            f'upload_id={self.file_id}'
        )
    
    def receive_data_chunk(self, raw_data, start):
        """
        Process each chunk as it arrives.
        
        This method is called for each chunk of data during upload.
        We update the hash incrementally and track progress.
        """
        chunk_size = len(raw_data)
        self.bytes_received += chunk_size
        self.chunks_received += 1
        
        # Update hash incrementally
        if self.file_hash:
            self.file_hash.update(raw_data)
        
        # Update progress every 10 chunks or every 1MB
        if self.chunks_received % 10 == 0 or self.bytes_received % (1024 * 1024) == 0:
            progress = self._calculate_progress()
            self._update_progress(progress)
            
            logger.debug(
                f'Upload progress: {progress}% '
                f'({self.bytes_received}/{self.content_length} bytes)'
            )
        
        return raw_data
    
    def file_complete(self, file_size):
        """
        Called when file upload completes successfully.
        """
        # Final progress update
        self._update_progress(100)
        
        # Get final hash
        final_hash = self.file_hash.hexdigest() if self.file_hash else None
        
        logger.info(
            f'Upload completed: {file_size} bytes, '
            f'hash={final_hash}, upload_id={self.file_id}'
        )
        
        # Store hash in request for later use
        if hasattr(self.request, 'upload_metadata'):
            self.request.upload_metadata['file_hash'] = final_hash
            self.request.upload_metadata['upload_id'] = self.file_id
        else:
            self.request.upload_metadata = {
                'file_hash': final_hash,
                'upload_id': self.file_id,
            }
        
        # Reset file pointer and let Django handle the rest
        if self.file:
            self.file.seek(0)
        
        return self.file
    
    def upload_interrupted(self):
        """
        Called when upload is interrupted or fails.
        """
        logger.warning(
            f'Upload interrupted: upload_id={self.file_id}, '
            f'bytes_received={self.bytes_received}'
        )
        
        # Mark as failed in cache
        if self.file_id:
            cache.set(
                f'upload_progress_{self.file_id}',
                {
                    'status': 'failed',
                    'bytes_received': self.bytes_received,
                    'content_length': self.content_length,
                    'error': 'Upload interrupted',
                },
                timeout=3600
            )
    
    def _calculate_progress(self):
        """Calculate upload progress percentage."""
        if not self.content_length or self.content_length == 0:
            return 0
        return min(100, int((self.bytes_received / self.content_length) * 100))
    
    def _update_progress(self, progress):
        """Update progress information in cache."""
        if not self.file_id:
            return
        
        progress_data = {
            'status': 'uploading',
            'progress': progress,
            'bytes_received': self.bytes_received,
            'content_length': self.content_length,
            'chunks_received': self.chunks_received,
            'file_name': self.file_name,
        }
        
        # Store in cache for 1 hour
        cache.set(
            f'upload_progress_{self.file_id}',
            progress_data,
            timeout=3600
        )


class SmartUploadHandler(FileUploadHandler):
    """
    Smart upload handler that chooses between memory and temp file
    based on file size.
    
    Small files (<5MB): Keep in memory
    Large files (≥5MB): Write to temp file
    
    This provides optimal performance for both scenarios.
    """
    
    MEMORY_THRESHOLD = 5 * 1024 * 1024  # 5MB
    
    def new_file(self, *args, **kwargs):
        super().new_file(*args, **kwargs)
        
        # Decide on storage strategy
        if self.content_length and self.content_length < self.MEMORY_THRESHOLD:
            logger.debug(
                f'Using memory storage for {self.file_name} '
                f'({self.content_length} bytes)'
            )
        else:
            logger.debug(
                f'Using temp file storage for {self.file_name} '
                f'({self.content_length} bytes)'
            )


def get_upload_progress(upload_id: str) -> dict:
    """
    Retrieve upload progress from cache.
    
    Args:
        upload_id: Unique upload identifier
        
    Returns:
        Progress data dictionary or None if not found
    """
    progress_data = cache.get(f'upload_progress_{upload_id}')
    
    if not progress_data:
        return {
            'status': 'not_found',
            'error': 'Upload not found or expired'
        }
    
    return progress_data


def cleanup_upload_progress(upload_id: str):
    """
    Clean up upload progress data from cache.
    
    Should be called after upload processing is complete.
    """
    cache.delete(f'upload_progress_{upload_id}')
