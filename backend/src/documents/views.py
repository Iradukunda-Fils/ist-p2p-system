"""
Views for the documents app.

This module provides DRF ViewSets and custom actions for document management,
including upload, download, metadata management, and proper permission controls.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.http import HttpResponse, Http404
from django.shortcuts import get_object_or_404
from django.core.exceptions import PermissionDenied
from django.db.models import Q
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter, SearchFilter

from .models import Document
from .serializers import (
    DocumentUploadSerializer,
    DocumentDetailSerializer,
    DocumentListSerializer,
    DocumentMetadataSerializer,
    DocumentDownloadSerializer,
)
from core.permissions import IsStaffUser, IsFinanceUser, IsAdminUser


class DocumentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for document management operations.
    
    Provides CRUD operations for documents with proper role-based permissions,
    file upload validation, and secure download functionality.
    
    Permissions:
    - List/Retrieve: Staff users can see their own documents, finance/admin see all
    - Create: All authenticated staff users
    - Update: Document owner or admin users
    - Delete: Admin users only
    """
    
    queryset = Document.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsStaffUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    
    # Filtering options
    filterset_fields = ['doc_type', 'processing_status', 'uploaded_by']
    search_fields = ['title', 'original_filename', 'extracted_text']
    ordering_fields = ['created_at', 'updated_at', 'file_size', 'title']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """
        Return appropriate serializer based on action.
        """
        if self.action == 'create':
            return DocumentUploadSerializer
        elif self.action == 'list':
            return DocumentListSerializer
        elif self.action in ['update', 'partial_update']:
            return DocumentMetadataSerializer
        elif self.action == 'download':
            return DocumentDownloadSerializer
        else:
            return DocumentDetailSerializer
    
    def get_queryset(self):
        """
        Filter queryset based on user permissions.
        
        Staff users see only their own documents.
        Finance and admin users see all documents.
        """
        user = self.request.user
        
        if not user.is_authenticated:
            return Document.objects.none()
        
        # Admin and finance users can see all documents
        if user.is_admin_user or user.can_manage_finance:
            return Document.objects.all()
        
        # Staff users see only their own documents
        return Document.objects.filter(uploaded_by=user)
    
    def perform_create(self, serializer):
        """
        Create document with proper user association.
        """
        serializer.save(uploaded_by=self.request.user)
    
    def create(self, request, *args, **kwargs):
        """
        Handle document upload with validation and processing trigger.
        """
        import logging
        logger = logging.getLogger('documents.upload')
        
        logger.info(f"Document upload attempt by user: {request.user.username}")
        logger.debug(f"Request data keys: {list(request.data.keys())}")
        
        serializer = self.get_serializer(data=request.data)
        
        try:
            serializer.is_valid(raise_exception=True)
        except Exception as e:
            # Check if this is a duplicate file (409 Conflict)
            if hasattr(e, 'detail') and isinstance(e.detail, dict):
                if e.detail.get('duplicate'):
                    # This is a duplicate file - return 409 with existing document info
                    # Use INFO level since this is expected business logic, not an error
                    logger.info(
                        f"Duplicate file detected for user {request.user.username}. "
                        f"Returning existing document: {e.detail.get('existing_document', {}).get('id')}"
                    )
                    return Response(
                        {
                            'duplicate': True,
                            'message': e.detail.get('message'),
                            'existing_document': e.detail.get('existing_document'),
                        },
                        status=status.HTTP_409_CONFLICT
                    )
            
            # Log actual validation errors (invalid data, missing fields, etc.)
            logger.warning(f"Document upload validation failed for user {request.user.username}: {str(e)}")
            raise
        
        try:
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            
            logger.info(f"Document uploaded successfully: {serializer.data.get('id')}")
            
            return Response(
                {
                    'message': 'Document uploaded successfully',
                    'document': serializer.data
                },
                status=status.HTTP_201_CREATED,
                headers=headers
            )
        except Exception as e:
            logger.error(f"Document upload failed during save for user {request.user.username}: {str(e)}")
            return Response(
                {
                    'error': {
                        'code': 'UPLOAD_FAILED',
                        'message': 'Failed to upload document',
                        'details': str(e)
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def update(self, request, *args, **kwargs):
        """
        Handle document metadata updates.
        
        Only allows updating title and doc_type fields.
        Processing fields are read-only.
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Check if user can modify this document
        if not self._can_modify_document(instance):
            raise PermissionDenied("You don't have permission to modify this document.")
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response({
            'message': 'Document updated successfully',
            'document': serializer.data
        })
    
    def destroy(self, request, *args, **kwargs):
        """
        Handle document deletion.
        
        Only admin users can delete documents.
        """
        if not request.user.is_admin_user:
            raise PermissionDenied("Only admin users can delete documents.")
        
        instance = self.get_object()
        
        # Delete the physical file
        if instance.file:
            try:
                instance.file.delete(save=False)
            except Exception:
                pass  # File might already be deleted or not exist
        
        self.perform_destroy(instance)
        
        return Response(
            {'message': 'Document deleted successfully'},
            status=status.HTTP_204_NO_CONTENT
        )
    
    @action(detail=True, methods=['get'], url_path='download')
    def download(self, request, pk=None):
        """
        Secure document download endpoint.
        
        Returns document download information with proper permission checking.
        """
        document = self.get_object()
        
        # Check if user can access this document
        if not self._can_access_document(document):
            raise PermissionDenied("You don't have permission to download this document.")
        
        if not document.file:
            return Response(
                {
                    'error': {
                        'code': 'FILE_NOT_FOUND',
                        'message': 'Document file not found'
                    }
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = self.get_serializer(document)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'], url_path='download-direct')
    def download_direct(self, request, pk=None):
        """
        Direct file download endpoint.
        
        Returns the actual file content with proper headers.
        """
        document = self.get_object()
        
        # Check if user can access this document
        if not self._can_access_document(document):
            raise PermissionDenied("You don't have permission to download this document.")
        
        if not document.file:
            raise Http404("Document file not found")
        
        try:
            # Open and read the file
            file_content = document.file.read()
            
            # Determine content type
            content_type_map = {
                'pdf': 'application/pdf',
                'png': 'image/png',
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'tiff': 'image/tiff',
                'bmp': 'image/bmp',
            }
            
            content_type = content_type_map.get(
                document.file_extension,
                'application/octet-stream'
            )
            
            # Create HTTP response with file content
            response = HttpResponse(file_content, content_type=content_type)
            response['Content-Disposition'] = f'attachment; filename="{document.original_filename}"'
            response['Content-Length'] = len(file_content)
            
            return response
            
        except Exception as e:
            return Response(
                {
                    'error': {
                        'code': 'DOWNLOAD_FAILED',
                        'message': 'Failed to download document',
                        'details': str(e)
                    }
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['get'], url_path='metadata')
    def metadata(self, request, pk=None):
        """
        Get document processing metadata.
        
        Returns extracted text and structured metadata from document processing.
        """
        document = self.get_object()
        
        # Check if user can access this document
        if not self._can_access_document(document):
            raise PermissionDenied("You don't have permission to access this document metadata.")
        
        return Response({
            'id': document.id,
            'processing_status': document.processing_status,
            'extracted_text': document.extracted_text,
            'metadata': document.metadata,
            'processing_error': document.processing_error,
            'processed_at': document.processed_at,
            'is_processed': document.is_processed,
            'is_processing': document.is_processing,
            'has_processing_error': document.has_processing_error,
        })
    
    @action(detail=True, methods=['post'], url_path='reprocess')
    def reprocess(self, request, pk=None):
        """
        Trigger document reprocessing.
        
        Only admin users can trigger reprocessing.
        """
        if not request.user.is_admin_user:
            raise PermissionDenied("Only admin users can trigger document reprocessing.")
        
        document = self.get_object()
        
        # Reset processing status
        document.processing_status = 'PENDING'
        document.processing_error = None
        document.processed_at = None
        document.save(update_fields=[
            'processing_status', 'processing_error', 'processed_at', 'updated_at'
        ])
        
        # Trigger processing (will be implemented when Celery is set up)
        # document._trigger_processing()
        
        return Response({
            'message': 'Document reprocessing triggered successfully',
            'processing_status': document.processing_status
        })
    
    @action(detail=False, methods=['get'], url_path='processing-status')
    def processing_status(self, request):
        """
        Get processing status summary for user's documents.
        """
        queryset = self.get_queryset()
        
        status_counts = {}
        for choice in Document.PROCESSING_STATUS_CHOICES:
            status_key = choice[0]
            status_counts[status_key] = queryset.filter(processing_status=status_key).count()
        
        return Response({
            'total_documents': queryset.count(),
            'status_breakdown': status_counts,
            'pending_processing': status_counts.get('PENDING', 0),
            'currently_processing': status_counts.get('PROCESSING', 0),
            'completed_processing': status_counts.get('COMPLETED', 0),
            'failed_processing': status_counts.get('FAILED', 0),
        })
    
    @action(detail=False, methods=['get'], url_path='upload-progress/(?P<upload_id>[^/.]+)')
    def upload_progress(self, request, upload_id=None):
        """
        Get real-time upload progress for chunked uploads.
        
        Returns progress data stored in cache during file upload.
        This allows frontend to poll for progress updates.
        
        Args:
            upload_id: Unique identifier for the upload
            
        Returns:
            Progress data with status, bytes received, and percentage
        """
        from .upload_handlers import get_upload_progress
        
        if not upload_id:
            return Response(
                {
                    'error': {
                        'code': 'MISSING_UPLOAD_ID',
                        'message': 'Upload ID is required'
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        progress_data = get_upload_progress(upload_id)
        
        if progress_data.get('status') == 'not_found':
            return Response(
                {
                    'error': {
                        'code': 'UPLOAD_NOT_FOUND',
                        'message': 'Upload not found or expired',
                        'details': 'Upload progress data may have expired (1 hour timeout)'
                    }
                },
                status=status.HTTP_404_NOT_FOUND
            )
        
        return Response(progress_data)

    
    def _can_access_document(self, document):
        """
        Check if current user can access the given document.
        
        Args:
            document: Document instance
            
        Returns:
            bool: True if user can access the document
        """
        user = self.request.user
        
        # Admin and finance users can access all documents
        if user.is_admin_user or user.can_manage_finance:
            return True
        
        # Users can access their own documents
        return document.uploaded_by == user
    
    def _can_modify_document(self, document):
        """
        Check if current user can modify the given document.
        
        Args:
            document: Document instance
            
        Returns:
            bool: True if user can modify the document
        """
        user = self.request.user
        
        # Admin users can modify any document
        if user.is_admin_user:
            return True
        
        # Users can modify their own documents
        return document.uploaded_by == user
