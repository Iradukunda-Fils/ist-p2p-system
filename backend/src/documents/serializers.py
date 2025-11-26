"""
Serializers for the documents app.

This module provides DRF serializers for document upload, metadata management,
and API responses with proper validation and security controls.
"""

from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError
from django.conf import settings
from .models import Document
import os
from users.serializers import UserMiniSerializer


class DocumentUploadSerializer(serializers.ModelSerializer):
    """
    Serializer for document upload operations.
    
    Handles file upload validation, metadata extraction triggering,
    and secure document creation with proper user association.
    """
    
    # uploaded_by is populated from request.user in the view
    # Returns full user object to match frontend types
    uploaded_by = UserMiniSerializer(read_only=True)
    
    # Add computed fields for API responses
    file_url = serializers.SerializerMethodField()
    file_extension = serializers.ReadOnlyField()
    is_processed = serializers.ReadOnlyField()
    is_processing = serializers.ReadOnlyField()
    has_processing_error = serializers.ReadOnlyField()
    
    class Meta:
        model = Document
        fields = [
            'id',
            'file',
            'original_filename',
            'file_size',
            'file_hash',
            'doc_type',
            'title',
            'uploaded_by',
            'processing_status',
            'extracted_text',
            'metadata',
            'processing_error',
            'created_at',
            'updated_at',
            'processed_at',
            'file_url',
            'file_extension',
            'is_processed',
            'is_processing',
            'has_processing_error',
        ]
        read_only_fields = [
            'id',
            'original_filename',
            'file_size',
            'file_hash',
            'uploaded_by',
            'processing_status',
            'extracted_text',
            'metadata',
            'processing_error',
            'created_at',
            'updated_at',
            'processed_at',
        ]
    
    def get_file_url(self, obj):
        """
        Get secure file URL for download.
        
        Returns a signed URL when using S3 storage, or regular URL for local storage.
        """
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None
    
    def validate_file(self, value):
        """
        Validate uploaded file for type, size, and security.
        
        Args:
            value: The uploaded file object
            
        Returns:
            The validated file object
            
        Raises:
            serializers.ValidationError: If file validation fails
        """
        if not value:
            raise serializers.ValidationError("File is required.")
        
        # Check file size
        max_size = getattr(settings, 'DOCUMENT_PROCESSING', {}).get(
            'MAX_FILE_SIZE', 50 * 1024 * 1024  # 50MB default
        )
        
        if hasattr(value, 'size') and value.size > max_size:
            max_size_mb = max_size // (1024 * 1024)
            raise serializers.ValidationError(
                f"File size cannot exceed {max_size_mb}MB. "
                f"Current file size: {value.size // (1024 * 1024)}MB"
            )
        
        # Check file extension
        if hasattr(value, 'name'):
            file_ext = os.path.splitext(value.name)[1].lower()
            allowed_extensions = getattr(settings, 'DOCUMENT_PROCESSING', {}).get(
                'ALLOWED_EXTENSIONS', ['.pdf', '.png', '.jpg', '.jpeg', '.tiff']
            )
            
            if file_ext not in allowed_extensions:
                raise serializers.ValidationError(
                    f"File type '{file_ext}' is not supported. "
                    f"Allowed types: {', '.join(allowed_extensions)}"
                )
        
        # Log content type for debugging but don't reject based on it
        # Strict MIME type checking can cause false rejections
        if hasattr(value, 'content_type'):
            import logging
            logger = logging.getLogger(__name__)
            logger.debug(f"Uploaded file content type: {value.content_type}")
        
        return value
    
    def validate_doc_type(self, value):
        """
        Validate document type.
        
        Args:
            value: The document type string
            
        Returns:
            The validated document type
        """
        valid_types = [choice[0] for choice in Document.DOC_TYPE_CHOICES]
        if value not in valid_types:
            raise serializers.ValidationError(
                f"Invalid document type '{value}'. "
                f"Valid types: {', '.join(valid_types)}"
            )
        return value
    
    def create(self, validated_data):
        """
        Create a new Document instance with duplicate detection.
        
        Args:
            validated_data: Validated serializer data
            
        Returns:
            Created Document instance
        """
        import logging
        import hashlib
        from django.core.files.storage import default_storage
        
        logger = logging.getLogger('documents.upload')
        
        # Set the uploaded_by field from request user
        request = self.context.get('request')
        if request and request.user:
            validated_data['uploaded_by'] = request.user
        
        # Calculate file hash BEFORE attempting to save
        file_obj = validated_data.get('file')
        if file_obj and not validated_data.get('file_hash'):
            file_obj.seek(0)  # Reset file pointer
            file_hash = hashlib.sha256(file_obj.read()).hexdigest()
            file_obj.seek(0)  # Reset again for actual save
            validated_data['file_hash'] = file_hash
            logger.debug(f"Calculated file hash: {file_hash}")
        else:
            file_hash = validated_data.get('file_hash')
        
        # Set metadata fields
        if file_obj:
            if not validated_data.get('original_filename'):
                validated_data['original_filename'] = file_obj.name
            if not validated_data.get('file_size') and hasattr(file_obj, 'size'):
                validated_data['file_size'] = file_obj.size
        
        try:
            return super().create(validated_data)
        except DjangoValidationError as e:
            # Handle duplicate file hash error with resilience
            if 'file_hash' in e.message_dict:
                logger.info(f"Duplicate file hash detected: {file_hash}")
                
                # Try to find the existing document with this hash
                try:
                    existing_doc = Document.objects.get(file_hash=file_hash)
                    
                    # Check if the physical file actually exists
                    if existing_doc.file and default_storage.exists(existing_doc.file.name):
                        # File exists in storage - this is a genuine duplicate
                        logger.warning(
                            f"Duplicate file upload attempt. Hash: {file_hash}, "
                            f"Existing document ID: {existing_doc.id}, "
                            f"File: {existing_doc.file.name}"
                        )
                        raise serializers.ValidationError({
                            'file': (
                                f'This file has already been uploaded as "{existing_doc.title or existing_doc.original_filename}". '
                                f'The existing document is available in the system. '
                                f'Please use the existing document or upload a different file.'
                            )
                        })
                    else:
                        # File record exists but physical file is missing - delete stale record
                        logger.warning(
                            f"Found stale document record (ID: {existing_doc.id}) with missing file. "
                            f"Hash: {file_hash}. Deleting stale record to allow re-upload."
                        )
                        existing_doc.delete()
                        
                        # Retry the creation now that stale record is removed
                        logger.info(f"Re-attempting upload after removing stale record")
                        return super().create(validated_data)
                        
                except Document.DoesNotExist:
                    # This shouldn't happen but handle it gracefully
                    logger.error(f"Duplicate hash error but no document found with hash: {file_hash}")
                    # Try to proceed anyway - maybe concurrent request
                    raise serializers.ValidationError({
                        'file': 'A duplicate file was detected. Please try again or contact support if the problem persists.'
                    })
            
            # Convert other Django validation errors to DRF format
            raise serializers.ValidationError(e.message_dict)


class DocumentDetailSerializer(serializers.ModelSerializer):
    """
    Detailed serializer for document retrieval and updates.
    
    Provides full document information including processing results
    and metadata for authenticated users with proper permissions.
    """
    
    uploaded_by = serializers.StringRelatedField(read_only=True)
    file_url = serializers.SerializerMethodField()
    file_extension = serializers.ReadOnlyField()
    is_processed = serializers.ReadOnlyField()
    is_processing = serializers.ReadOnlyField()
    has_processing_error = serializers.ReadOnlyField()
    
    class Meta:
        model = Document
        fields = [
            'id',
            'file',
            'original_filename',
            'file_size',
            'file_hash',
            'doc_type',
            'title',
            'uploaded_by',
            'processing_status',
            'extracted_text',
            'metadata',
            'processing_error',
            'created_at',
            'updated_at',
            'processed_at',
            'file_url',
            'file_extension',
            'is_processed',
            'is_processing',
            'has_processing_error',
        ]
        read_only_fields = [
            'id',
            'file',
            'original_filename',
            'file_size',
            'file_hash',
            'uploaded_by',
            'processing_status',
            'extracted_text',
            'metadata',
            'processing_error',
            'created_at',
            'updated_at',
            'processed_at',
        ]
    
    def get_file_url(self, obj):
        """Get secure file URL for download."""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class DocumentListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for document list views.
    
    Provides essential document information without heavy fields
    like extracted_text for better performance in list operations.
    """
    
    uploaded_by = UserMiniSerializer(read_only=True)
    file_url = serializers.SerializerMethodField()
    file_extension = serializers.ReadOnlyField()
    is_processed = serializers.ReadOnlyField()
    uploaded_at = serializers.DateTimeField(source='created_at', read_only=True)
    
    class Meta:
        model = Document
        fields = [
            'id',
            'original_filename',
            'file_size',
            'doc_type',
            'title',
            'uploaded_by',
            'processing_status',
            'created_at',
            'updated_at',
            'file_url',
            'file_extension',
            'is_processed',
            'uploaded_at',
        ]
    
    def get_file_url(self, obj):
        """Get secure file URL for download."""
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class DocumentMetadataSerializer(serializers.ModelSerializer):
    """
    Serializer focused on document metadata operations.
    
    Used for updating document metadata and processing results
    without exposing file upload functionality.
    """
    
    class Meta:
        model = Document
        fields = [
            'id',
            'doc_type',
            'title',
            'processing_status',
            'extracted_text',
            'metadata',
            'processing_error',
            'processed_at',
        ]
        read_only_fields = [
            'id',
            'processing_status',
            'extracted_text',
            'metadata',
            'processing_error',
            'processed_at',
        ]


class DocumentDownloadSerializer(serializers.Serializer):
    """
    Serializer for document download requests.
    
    Handles secure file download with proper authentication
    and permission checking.
    """
    
    download_url = serializers.URLField(read_only=True)
    expires_at = serializers.DateTimeField(read_only=True, required=False)
    content_type = serializers.CharField(read_only=True)
    file_size = serializers.IntegerField(read_only=True)
    
    def to_representation(self, instance):
        """
        Generate secure download URL for the document.
        
        Args:
            instance: Document instance
            
        Returns:
            Dictionary with download information
        """
        if not instance.file:
            return {
                'download_url': None,
                'content_type': None,
                'file_size': 0,
            }
        
        request = self.context.get('request')
        
        # For local storage, return direct URL
        # For S3 storage, this would generate a signed URL
        download_url = instance.file.url
        if request:
            download_url = request.build_absolute_uri(download_url)
        
        # Determine content type based on file extension
        content_type_map = {
            'pdf': 'application/pdf',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'tiff': 'image/tiff',
            'bmp': 'image/bmp',
        }
        
        content_type = content_type_map.get(
            instance.file_extension, 
            'application/octet-stream'
        )
        
        return {
            'download_url': download_url,
            'content_type': content_type,
            'file_size': instance.file_size,
        }