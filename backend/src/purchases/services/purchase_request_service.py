"""
Purchase request service for managing request lifecycle.

This service handles creation, updates, and business logic for purchase requests.
"""

import logging
from typing import Dict, Any, Optional, List
from decimal import Decimal

from django.db import transaction
from django.core.exceptions import ValidationError, PermissionDenied

from purchases.models import PurchaseRequest, RequestItem

logger = logging.getLogger(__name__)


class PurchaseRequestService:
    """Service class for managing purchase request operations."""
    
    @classmethod
    @transaction.atomic
    def create_purchase_request(
        cls, 
        user, 
        title: str,
        description: str,
        items: List[Dict[str, Any]],
        proforma_id: Optional[str] = None
    ) -> PurchaseRequest:
        """
        Create a new purchase request with items.
        
        Args:
            user: User creating the request
            title: Request title
            description: Request description
            items: List of item dictionaries with name, quantity, unit_price
            proforma_id: Optional proforma document ID
            
        Returns:
            Created PurchaseRequest instance
            
        Raises:
            ValidationError: If validation fails
        """
        # Validate items
        if not items:
            raise ValidationError('At least one item is required')
        
        # Create purchase request with initial amount of 0
        purchase_request = PurchaseRequest.objects.create(
            title=title,
            description=description,
            amount=Decimal('0.00'),
            created_by=user,
            proforma_id=proforma_id if proforma_id else None
        )
        
        # Create request items
        total_amount = Decimal('0.00')
        for item_data in items:
            item = RequestItem.objects.create(
                request=purchase_request,
                name=item_data['name'],
                quantity=item_data['quantity'],
                unit_price=Decimal(str(item_data['unit_price'])),
                description=item_data.get('description', ''),
                unit_of_measure=item_data.get('unit_of_measure', 'pcs')
            )
            total_amount += item.line_total
        
        # Update request amount to match calculated total
        purchase_request.amount = total_amount
        purchase_request.save()
        
        logger.info(
            f'Purchase request {purchase_request.id} created by {user.username} '
            f'with {len(items)} items, total: ${total_amount}'
        )
        
        return purchase_request
    
    @classmethod
    @transaction.atomic
    def update_purchase_request(
        cls,
        request_id: str,
        user,
        **update_fields
    ) -> PurchaseRequest:
        """
        Update a purchase request.
        
        Args:
            request_id: UUID of the request
            user: User performing the update
            **update_fields: Fields to update
            
        Returns:
            Updated PurchaseRequest instance
            
        Raises:
            ValidationError: If request cannot be modified
            PermissionDenied: If user lacks permission
        """
        purchase_request = PurchaseRequest.objects.get(pk=request_id)
        
        # Check permissions
        if not cls._can_modify_request(purchase_request, user):
            raise PermissionDenied(
                'You do not have permission to modify this request'
            )
        
        # Check if modifiable
        if not purchase_request.is_modifiable:
            raise ValidationError(
                f'Cannot modify request in {purchase_request.status} status'
            )
        
        # Update allowed fields
        allowed_fields = ['title', 'description']
        for field in allowed_fields:
            if field in update_fields:
                setattr(purchase_request, field, update_fields[field])
        
        purchase_request.save()
        
        logger.info(
            f'Purchase request {request_id} updated by {user.username}'
        )
        
        return purchase_request
    
    @classmethod
    def delete_purchase_request(cls, request_id: str, user) -> None:
        """
        Delete a purchase request (admin only).
        
        Args:
            request_id: UUID of the request
            user: User performing the deletion
            
        Raises:
            PermissionDenied: If user is not admin
        """
        if not user.is_admin_user:
            raise PermissionDenied('Only admin users can delete purchase requests')
        
        purchase_request = PurchaseRequest.objects.get(pk=request_id)
        purchase_request.delete()
        
        logger.info(
            f'Purchase request {request_id} deleted by {user.username}'
        )
    
    @staticmethod
    def _can_modify_request(purchase_request: PurchaseRequest, user) -> bool:
        """
        Check if user can modify the purchase request.
        
        Args:
            purchase_request: PurchaseRequest instance
            user: User to check
            
        Returns:
            True if user can modify, False otherwise
        """
        # Admin users can modify any request
        if user.is_admin_user:
            return True
        
        # Users can modify their own pending requests
        return (
            purchase_request.created_by == user and
            purchase_request.is_modifiable
        )
