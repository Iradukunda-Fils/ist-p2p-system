from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from .models import Document
import json


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    """
    Advanced admin interface for Document with file management and processing status tracking.
    """
    
    list_display = (
        'title',
        'doc_type_badge',
        'uploaded_by',
        'file_size_display',
        'processing_status_badge',
        'created_at'
    )
    list_filter = ('doc_type', 'processing_status', 'uploaded_by', 'created_at')
    search_fields = ('title', 'original_filename', 'extracted_text', 'uploaded_by__username')
    readonly_fields = (
        'id',
        'file_hash',
        'file_size',
        'file_size_display',
        'original_filename',
        'file_extension_display',
        'processing_status',
        'processing_error',
        'extracted_text',
        'metadata_display',
        'created_at',
        'updated_at',
        'processed_at'
    )
    list_per_page = 25
    date_hierarchy = 'created_at'
    actions = ['retry_processing']
    
    fieldsets = (
        ('Document Information', {
            'fields': ('title', 'doc_type', 'uploaded_by')
        }),
        ('File Details', {
            'fields': (
                'file',
                'original_filename',
                'file_extension_display',
                'file_size_display',
                'file_hash'
            )
        }),
        ('Processing Status', {
            'fields': (
                'processing_status',
                'processed_at',
                'processing_error'
            )
        }),
        ('Extracted Data', {
            'fields': ('extracted_text', 'metadata_display'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
        ('System Fields', {
            'fields': ('id',),
            'classes': ('collapse',)
        }),
    )
    
    @admin.display(description='Doc Type', ordering='doc_type')
    def doc_type_badge(self, obj):
        colors = {
            'PROFORMA': '#6610f2',
            'RECEIPT': '#28a745',
            'PO': '#0d6efd',
            'INVOICE': '#fd7e14',
            'CONTRACT': '#dc3545',
            'OTHER': '#6c757d',
        }
        color = colors.get(obj.doc_type, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px; font-weight: bold;">{}</span>',
            color,
            obj.get_doc_type_display()
        )
    
    @admin.display(description='File Size', ordering='file_size')
    def file_size_display(self, obj):
        """Format file size in human-readable format."""
        if not obj.file_size:
            return '-'
        
        size = obj.file_size
        for unit in ['B', 'KB', 'MB', 'GB']:
            if size < 1024.0:
                return f'{size:.1f} {unit}'
            size /= 1024.0
        return f'{size:.1f} TB'
    
    @admin.display(description='Processing Status', ordering='processing_status')
    def processing_status_badge(self, obj):
        colors = {
            'PENDING': '#ffc107',
            'PROCESSING': '#17a2b8',
            'COMPLETED': '#28a745',
            'FAILED': '#dc3545',
            'SKIPPED': '#6c757d',
        }
        color = colors.get(obj.processing_status, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px; font-weight: bold;">{}</span>',
            color,
            obj.get_processing_status_display()
        )
    
    @admin.display(description='File Extension')
    def file_extension_display(self, obj):
        ext = obj.file_extension
        if ext:
            return format_html(
                '<span style="font-family: monospace; background-color: #e9ecef; padding: 2px 6px; border-radius: 3px;">.{}</span>',
                ext
            )
        return '-'
    
    @admin.display(description='Metadata (JSON)')
    def metadata_display(self, obj):
        """Display formatted JSON metadata."""
        if obj.metadata:
            json_str = json.dumps(obj.metadata, indent=2, ensure_ascii=False)
            return format_html(
                '<pre style="background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; max-height: 400px;">{}</pre>',
                json_str
            )
        return format_html('<em style="color: #6c757d;">No metadata extracted</em>')
    
    @admin.action(description='Retry processing for selected documents')
    def retry_processing(self, request, queryset):
        """Retry processing for failed documents."""
        failed_docs = queryset.filter(processing_status='FAILED')
        
        try:
            from documents.tasks import extract_document_metadata
            count = 0
            
            for doc in failed_docs:
                # Reset status to pending
                doc.processing_status = 'PENDING'
                doc.processing_error = None
                doc.save(update_fields=['processing_status', 'processing_error', 'updated_at'])
                
                # Queue for reprocessing
                extract_document_metadata.delay(str(doc.id))
                count += 1
            
            self.message_user(
                request,
                f'{count} document(s) queued for reprocessing.'
            )
        except ImportError:
            self.message_user(
                request,
                'Document processing tasks not available (Celery not configured).',
                level='warning'
            )
        except Exception as e:
            self.message_user(
                request,
                f'Error queueing documents for processing: {str(e)}',
                level='error'
            )
    
    def has_delete_permission(self, request, obj=None):
        """Restrict deletion to superusers only."""
        return request.user.is_superuser
