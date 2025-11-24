from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator
import uuid
import os

User = get_user_model()


def document_upload_path(instance, filename):
    """
    Generate upload path for documents based on type and date.
    
    Format: documents/{doc_type}/{year}/{month}/{day}/{uuid}_{filename}
    """
    import datetime
    
    # Get current date
    now = datetime.datetime.now()
    
    # Clean filename and add UUID prefix for uniqueness
    clean_filename = f"{uuid.uuid4().hex[:8]}_{filename}"
    
    # Create path
    return os.path.join(
        'documents',
        instance.doc_type.lower(),
        str(now.year),
        f"{now.month:02d}",
        f"{now.day:02d}",
        clean_filename
    )


class Document(models.Model):
    """
    Model for storing documents and their metadata in the P2P system.
    
    Supports various document types with file validation, metadata extraction,
    and processing status tracking.
    """
    
    DOC_TYPE_CHOICES = [
        ('PROFORMA', 'Proforma Invoice'),
        ('RECEIPT', 'Receipt'),
        ('PO', 'Purchase Order'),
        ('INVOICE', 'Invoice'),
        ('CONTRACT', 'Contract'),
        ('OTHER', 'Other'),
    ]
    
    PROCESSING_STATUS_CHOICES = [
        ('PENDING', 'Pending Processing'),
        ('PROCESSING', 'Processing'),
        ('COMPLETED', 'Processing Completed'),
        ('FAILED', 'Processing Failed'),
        ('SKIPPED', 'Processing Skipped'),
    ]
    
    # Supported file extensions
    ALLOWED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'tiff', 'bmp']
    
    # Core fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # File storage
    file = models.FileField(
        upload_to=document_upload_path,
        validators=[FileExtensionValidator(allowed_extensions=ALLOWED_EXTENSIONS)],
        help_text='Document file (PDF or image formats)'
    )
    original_filename = models.CharField(
        max_length=255,
        help_text='Original filename when uploaded'
    )
    file_size = models.PositiveIntegerField(
        help_text='File size in bytes'
    )
    file_hash = models.CharField(
        max_length=64,
        unique=True,
        help_text='SHA-256 hash of file content for deduplication'
    )
    
    # Document metadata
    doc_type = models.CharField(
        max_length=16,
        choices=DOC_TYPE_CHOICES,
        help_text='Type of document'
    )
    title = models.CharField(
        max_length=255,
        blank=True,
        help_text='Document title or description'
    )
    
    # Relationships
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='uploaded_documents',
        help_text='User who uploaded this document'
    )
    
    # Processing and metadata
    processing_status = models.CharField(
        max_length=20,
        choices=PROCESSING_STATUS_CHOICES,
        default='PENDING',
        help_text='Status of document processing'
    )
    extracted_text = models.TextField(
        null=True,
        blank=True,
        help_text='Text extracted from document via OCR'
    )
    metadata = models.JSONField(
        null=True,
        blank=True,
        default=dict,
        help_text='Structured metadata extracted from document'
    )
    processing_error = models.TextField(
        null=True,
        blank=True,
        help_text='Error message if processing failed'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    processed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Timestamp when processing completed'
    )
    
    class Meta:
        db_table = 'documents_document'
        indexes = [
            models.Index(fields=['doc_type'], name='idx_document_doc_type'),
            models.Index(fields=['uploaded_by'], name='idx_document_uploaded_by'),
            models.Index(fields=['processing_status'], name='idx_document_processing_status'),
            models.Index(fields=['created_at'], name='idx_document_created_at'),
            models.Index(fields=['file_hash'], name='idx_document_file_hash'),
        ]
        ordering = ['-created_at']
    
    def clean(self):
        """
        Validate document data before saving.
        """
        super().clean()
        
        # Validate file exists
        if not self.file:
            raise ValidationError({'file': 'Document file is required.'})
        
        # Validate file size (max 50MB)
        max_size = 50 * 1024 * 1024  # 50MB in bytes
        if self.file and hasattr(self.file, 'size') and self.file.size > max_size:
            raise ValidationError({
                'file': f'File size cannot exceed {max_size // (1024*1024)}MB.'
            })
        
        # Validate document type
        if self.doc_type not in [choice[0] for choice in self.DOC_TYPE_CHOICES]:
            raise ValidationError({
                'doc_type': f'Invalid document type: {self.doc_type}'
            })
    
    def save(self, *args, **kwargs):
        """
        Override save to handle file metadata and validation.
        """
        # Set original filename and file size if not already set
        if self.file and not self.original_filename:
            self.original_filename = self.file.name
        
        if self.file and hasattr(self.file, 'size') and not self.file_size:
            self.file_size = self.file.size
        
        # Generate file hash if not set
        if self.file and not self.file_hash:
            self.file_hash = self._calculate_file_hash()
        
        # Set default title if not provided
        if not self.title:
            self.title = self.original_filename or f"{self.get_doc_type_display()} Document"
        
        self.full_clean()
        
        # Check if this is a new document before saving
        is_new_document = self.pk is None
        
        super().save(*args, **kwargs)
        
        # Trigger processing asynchronously for new documents only
        if is_new_document and not kwargs.get('update_fields') and self.processing_status == 'PENDING':
            # Use Django's transaction.on_commit to ensure the document is saved before queuing
            from django.db import transaction
            transaction.on_commit(lambda: self._trigger_processing_async())
    
    def __str__(self):
        """
        String representation of the document.
        """
        return f"{self.title} ({self.get_doc_type_display()})"
    
    def _calculate_file_hash(self):
        """
        Calculate SHA-256 hash of the file content.
        """
        import hashlib
        
        if not self.file:
            return ''
        
        hash_sha256 = hashlib.sha256()
        
        # Read file in chunks to handle large files
        self.file.seek(0)
        for chunk in iter(lambda: self.file.read(4096), b""):
            hash_sha256.update(chunk)
        self.file.seek(0)  # Reset file pointer
        
        return hash_sha256.hexdigest()
    
    def _trigger_processing(self):
        """
        Trigger asynchronous document processing.
        """
        try:
            from documents.tasks import extract_document_metadata
            # Queue the document for processing
            extract_document_metadata.delay(str(self.id))
        except ImportError:
            # Celery tasks not available, skip processing
            pass
        except Exception as e:
            # Log error but don't fail the save operation
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to queue document processing for {self.id}: {e}")
    
    @property
    def is_processed(self):
        """Check if document processing is completed."""
        return self.processing_status == 'COMPLETED'
    
    @property
    def is_processing(self):
        """Check if document is currently being processed."""
        return self.processing_status == 'PROCESSING'
    
    @property
    def has_processing_error(self):
        """Check if document processing failed."""
        return self.processing_status == 'FAILED'
    
    @property
    def file_extension(self):
        """Get file extension from original filename."""
        if self.original_filename:
            return os.path.splitext(self.original_filename)[1].lower().lstrip('.')
        return ''
    
    @property
    def is_pdf(self):
        """Check if document is a PDF file."""
        return self.file_extension == 'pdf'
    
    @property
    def is_image(self):
        """Check if document is an image file."""
        image_extensions = ['png', 'jpg', 'jpeg', 'tiff', 'bmp']
        return self.file_extension in image_extensions
    
    def get_file_url(self):
        """
        Get secure URL for file access.
        
        This will return a signed URL when using S3 storage.
        """
        if self.file:
            return self.file.url
        return None
    
    def get_metadata_value(self, key, default=None):
        """
        Get a specific value from the metadata JSON field.
        
        Args:
            key: The key to look for in metadata
            default: Default value if key not found
            
        Returns:
            The value associated with the key, or default
        """
        if not self.metadata:
            return default
        
        # Support nested key access with dot notation
        keys = key.split('.')
        value = self.metadata
        
        try:
            for k in keys:
                value = value[k]
            return value
        except (KeyError, TypeError):
            return default
    
    def set_metadata_value(self, key, value):
        """
        Set a specific value in the metadata JSON field.
        
        Args:
            key: The key to set (supports dot notation for nested keys)
            value: The value to set
        """
        if not self.metadata:
            self.metadata = {}
        
        # Support nested key setting with dot notation
        keys = key.split('.')
        current = self.metadata
        
        # Navigate to the parent of the target key
        for k in keys[:-1]:
            if k not in current:
                current[k] = {}
            current = current[k]
        
        # Set the final value
        current[keys[-1]] = value
    
    def mark_processing_completed(self, extracted_text=None, metadata=None):
        """
        Mark document processing as completed and update results.
        
        Args:
            extracted_text: Text extracted from the document
            metadata: Structured metadata extracted from the document
        """
        from django.utils import timezone
        
        self.processing_status = 'COMPLETED'
        self.processed_at = timezone.now()
        
        if extracted_text is not None:
            self.extracted_text = extracted_text
        
        if metadata is not None:
            self.metadata = metadata
        
        self.processing_error = None  # Clear any previous errors
        self.save(update_fields=[
            'processing_status', 'processed_at', 'extracted_text', 
            'metadata', 'processing_error', 'updated_at'
        ])
    
    def mark_processing_failed(self, error_message):
        """
        Mark document processing as failed with error message.
        
        Args:
            error_message: Description of the processing error
        """
        from django.utils import timezone
        
        self.processing_status = 'FAILED'
        self.processed_at = timezone.now()
        self.processing_error = error_message
        
        self.save(update_fields=[
            'processing_status', 'processed_at', 'processing_error', 'updated_at'
        ])
