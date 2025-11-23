"""
Purchase order service for PO generation and management.

This service handles purchase order creation from approved requests
and manages PO-related operations including PDF generation.
"""

import logging
import random
from datetime import datetime
from typing import Dict, Any, Optional
from decimal import Decimal

from django.db import transaction
from django.core.exceptions import ValidationError

from purchases.models import PurchaseOrder, PurchaseRequest
from documents.models import Document

logger = logging.getLogger(__name__)


class PurchaseOrderService:
    """Service class for managing purchase order operations."""
    
    @classmethod
    @transaction.atomic
    def generate_purchase_order(cls, request_id: str) -> PurchaseOrder:
        """
        Generate a purchase order from an approved purchase request.
        
        Args:
            request_id: UUID of the approved purchase request
            
        Returns:
            Created PurchaseOrder instance
            
        Raises:
            ValidationError: If request is not approved or PO already exists
        """
        purchase_request = PurchaseRequest.objects.select_related(
            'proforma'
        ).prefetch_related('items').get(pk=request_id)
        
        # Validate request is approved
        if not purchase_request.is_approved:
            raise ValidationError(
                'Purchase order can only be generated for approved requests'
            )
        
        # Check if PO already exists
        if hasattr(purchase_request, 'purchase_order'):
            logger.warning(
                f'Purchase order already exists for request {request_id}'
            )
            return purchase_request.purchase_order
        
        # Compile PO data from request and proforma
        po_data = cls._compile_po_data(purchase_request)
        
        # Create purchase order
        purchase_order = PurchaseOrder.objects.create(
            request=purchase_request,
            vendor=po_data.get('vendor', 'Unknown Vendor'),
            total=purchase_request.amount,
            data=po_data
        )
        
        logger.info(
            f'Purchase order {purchase_order.po_number} generated for '
            f'request {request_id}, vendor: {purchase_order.vendor}, '
            f'total: ${purchase_order.total}'
        )
        
        return purchase_order
    
    @classmethod
    def generate_po_pdf(cls, po_id: str) -> PurchaseOrder:
        """
        Generate PDF document for a purchase order.
        
        Args:
            po_id: UUID of the purchase order
            
        Returns:
            Updated PurchaseOrder with PDF file
        """
        purchase_order = PurchaseOrder.objects.select_related('request').get(pk=po_id)
        
        # Import PDF service
        from .pdf_service import POPDFGenerator
        
        # Generate PDF
        pdf_generator = POPDFGenerator()
        pdf_content = pdf_generator.generate_pdf(purchase_order)
        
        # Save PDF to purchase order
        purchase_order.pdf_file = pdf_content
        purchase_order.save()
        
        logger.info(
            f'PDF generated for purchase order {purchase_order.po_number}'
        )
        
        return purchase_order
    
    @staticmethod
    def _compile_po_data(purchase_request: PurchaseRequest) -> Dict[str, Any]:
        """
        Compile purchase order data from request and proforma metadata.
        
        Args:
            purchase_request: Approved PurchaseRequest instance
            
        Returns:
            Dictionary with compiled PO data
        """
        po_data = {
            'request_title': purchase_request.title,
            'request_description': purchase_request.description,
            'created_by': purchase_request.created_by.get_full_name() or purchase_request.created_by.username,
            'approved_at': purchase_request.approved_at.isoformat() if purchase_request.approved_at else None,
            'items': [],
            'vendor': 'Unknown Vendor',
            'terms': {},
        }
        
        # Add request items
        for item in purchase_request.items.all():
            po_data['items'].append({
                'name': item.name,
                'description': item.description,
                'quantity': item.quantity,
                'unit_price': float(item.unit_price),
                'unit_of_measure': item.unit_of_measure,
                'line_total': float(item.line_total),
            })
        
        # Extract vendor and terms from proforma if available
        if purchase_request.proforma:
            proforma_metadata = purchase_request.proforma.metadata or {}
            
            # Extract vendor information
            vendor_info = proforma_metadata.get('vendor', {})
            if vendor_info:
                po_data['vendor'] = vendor_info.get('name', 'Unknown Vendor')
                po_data['vendor_details'] = {
                    'email': vendor_info.get('email'),
                    'phone': vendor_info.get('phone'),
                    'address': vendor_info.get('address'),
                }
            
            # Extract payment terms
            terms_info = proforma_metadata.get('terms', {})
            if terms_info:
                po_data['terms'] = {
                    'payment_terms': terms_info.get('payment'),
                    'delivery_terms': terms_info.get('delivery'),
                    'validity': terms_info.get('validity'),
                }
        
        return po_data
    
    @staticmethod
    def get_po_for_finance(po_id: str, user) -> PurchaseOrder:
        """
        Get purchase order for finance user with permission check.
        
        Args:
            po_id: UUID of the purchase order
            user: User requesting access
            
        Returns:
            PurchaseOrder instance
            
        Raises:
            PermissionDenied: If user lacks finance permissions
        """
        from django.core.exceptions import PermissionDenied
        
        if not (user.can_manage_finance or user.is_admin_user):
            raise PermissionDenied(
                'Only finance users can access purchase orders'
            )
        
        return PurchaseOrder.objects.select_related(
            'request', 'request__created_by'
        ).get(pk=po_id)
