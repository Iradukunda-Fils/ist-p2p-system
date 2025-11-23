"""
ViewSet for Purchase Order management.

This module provides read-only API access to purchase orders for finance users.
"""

import logging
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.http import FileResponse, Http404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter, SearchFilter

from .models import PurchaseOrder
from .serializers import PurchaseOrderListSerializer, PurchaseOrderDetailSerializer
from core.permissions import IsFinanceUser, IsAdminUser

logger = logging.getLogger(__name__)


class PurchaseOrderViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for purchase order management (read-only for finance users).
    
    Provides list and detail views for purchase orders with filtering,
    search, and PDF download capabilities.
    
    Permissions:
    - Finance users and admins can access all POs
    - Other users are denied access
    """
    
    queryset = PurchaseOrder.objects.select_related('request', 'request__created_by').all()
    permission_classes = [permissions.IsAuthenticated, IsFinanceUser | IsAdminUser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    
    # Filtering options  
    filterset_fields = ['status', 'vendor', 'po_number']
    search_fields = ['po_number', 'vendor', 'request__title']
    ordering_fields = ['created_at', 'total', 'po_number', 'status']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action."""
        if self.action == 'list':
            return PurchaseOrderListSerializer
        return PurchaseOrderDetailSerializer
    
    @action(detail=True, methods=['get'], url_path='generate-pdf')
    def generate_pdf(self, request, pk=None):
        """
        Generate PDF for purchase order on-demand.
        
        This endpoint triggers PDF generation if not already generated.
        """
        purchase_order = self.get_object()
        
        try:
            from purchases.services.purchase_order_service import PurchaseOrderService
            
            # Generate PDF
            purchase_order = PurchaseOrderService.generate_po_pdf(str(purchase_order.id))
            
            return Response({
                'message': 'PDF generated successfully',
                'po_number': purchase_order.po_number,
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f'Failed to generate PDF for PO {pk}: {str(e)}')
            return Response({
                'error': {
                    'code': 'PDF_GENERATION_FAILED',
                    'message': 'Failed to generate PDF',
                    'details': str(e)
                }
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='summary')
    def summary(self, request):
        """
        Get purchase order summary statistics.
        
        Returns counts by status and total value.
        """
        queryset = self.get_queryset()
        
        summary_data = {
            'total_pos': queryset.count(),
            'draft_pos': queryset.filter(status='DRAFT').count(),
            'sent_pos': queryset.filter(status='SENT').count(),
            'acknowledged_pos': queryset.filter(status='ACKNOWLEDGED').count(),
            'fulfilled_pos': queryset.filter(status='FULFILLED').count(),
            'total_value': sum(po.total for po in queryset),
        }
        
        return Response(summary_data)
