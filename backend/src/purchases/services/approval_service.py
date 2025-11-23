"""
Approval service for managing multi-level approval workflows.

This service encapsulates the business logic for approving and rejecting
purchase requests with proper concurrency control and validation.
"""

import logging
from typing import Dict, Any
from decimal import Decimal

from django.db import transaction
from django.core.exceptions import ValidationError, PermissionDenied
from django.utils import timezone

from purchases.models import PurchaseRequest, Approval

logger = logging.getLogger(__name__)


class ApprovalService:
    """
    Service class for managing purchase request approvals.
    
    Handles concurrency-safe approval/rejection workflows with proper
    validation of business rules and user permissions.
    """
    
    @classmethod
    @transaction.atomic
    def approve_request(cls, request_id: str, approver, level: int, comment: str = '') -> Dict[str, Any]:
        """
        Approve a purchase request at the specified level.
        
        This method implements concurrency-safe approval logic using database
        locking and handles all approval workflow business rules.
        
        Args:
            request_id: UUID of the purchase request
            approver: User object performing the approval
            level: Approval level (1 or 2)
            comment: Optional comment for the approval
            
        Returns:
            Dictionary containing approval result with status and metadata
            
        Raises:
            ValidationError: If business rules are violated
            PermissionDenied: If user lacks permission for the approval level
            PurchaseRequest.DoesNotExist: If request not found
        """
        # Validate approval permission
        cls._validate_approval_permission(approver, level)
        
        # Use SELECT FOR UPDATE to prevent race conditions
        purchase_request = PurchaseRequest.objects.select_for_update().get(pk=request_id)
        
        # Validate request state
        if not purchase_request.is_pending:
            raise ValidationError(
                f'Cannot approve request in {purchase_request.status} status. '
                f'Only PENDING requests can be approved.'
            )
        
        # Check if level is required for this request
        required_levels = purchase_request.get_required_approval_levels()
        if level not in required_levels:
            raise ValidationError(
                f'Level {level} approval not required for request amount '
                f'${purchase_request.amount}. Required levels: {required_levels}'
            )
        
        # Check for existing rejections
        if purchase_request.has_rejection():
            raise ValidationError(
                'Cannot approve request that has been rejected at any level'
            )
        
        # Create or update approval record (idempotent operation)
        approval, created = Approval.objects.get_or_create(
            request=purchase_request,
            level=level,
            defaults={
                'approver': approver,
                'decision': 'APPROVED',
                'comment': comment
            }
        )
        
        if not created:
            # Handle duplicate approval attempt
            if approval.approver != approver:
                raise ValidationError(
                    f'Level {level} already decided by {approval.approver.username}. '
                    f'Only the same approver can update their decision.'
                )
            
            # Update existing approval
            approval.decision = 'APPROVED'
            approval.comment = comment
            approval.save()
            action_taken = 'updated'
        else:
            action_taken = 'created'
        
        # Check if all required approvals are complete
        po_generation_status = None
        if purchase_request.is_fully_approved():
            purchase_request.status = 'APPROVED'
            purchase_request.last_approved_by = approver
            purchase_request.approved_at = timezone.now()
            purchase_request.save()
            
            # Trigger PO generation asynchronously
            po_generation_status = cls._trigger_po_generation(purchase_request)
            
            logger.info(
                f'Purchase request {request_id} fully approved by {approver.username}. '
                f'PO generation triggered.'
            )
        else:
            logger.info(
                f'Purchase request {request_id} approved at level {level} by {approver.username}. '
                f'Pending levels: {purchase_request.get_pending_approval_levels()}'
            )
        
        # Build response
        result = {
            'message': f'Request approved at level {level}',
            'action': action_taken,
            'approval': {
                'id': str(approval.id),
                'level': approval.level,
                'decision': approval.decision,
                'approver': approval.approver.username,
                'comment': approval.comment,
                'created_at': approval.created_at.isoformat(),
            },
            'request_status': purchase_request.status,
            'pending_levels': purchase_request.get_pending_approval_levels(),
            'is_fully_approved': purchase_request.is_fully_approved(),
        }
        
        if po_generation_status:
            result['po_generation_status'] = po_generation_status
        
        return result
    
    @classmethod
    @transaction.atomic
    def reject_request(cls, request_id: str, approver, level: int, comment: str) -> Dict[str, Any]:
        """
        Reject a purchase request at the specified level.
        
        Args:
            request_id: UUID of the purchase request
            approver: User object performing the rejection
            level: Approval level (1 or 2)
            comment: Required comment explaining the rejection
            
        Returns:
            Dictionary containing rejection result
            
        Raises:
            ValidationError: If business rules are violated or comment is missing
            PermissionDenied: If user lacks permission for the approval level
        """
        # Validate comment is provided
        if not comment or not comment.strip():
            raise ValidationError('Comment is required when rejecting a request')
        
        # Validate approval permission
        cls._validate_approval_permission(approver, level)
        
        # Use SELECT FOR UPDATE to prevent race conditions
        purchase_request = PurchaseRequest.objects.select_for_update().get(pk=request_id)
        
        # Validate request state
        if not purchase_request.is_pending:
            raise ValidationError(
                f'Cannot reject request in {purchase_request.status} status. '
                f'Only PENDING requests can be rejected.'
            )
        
        # Check if level is required for this request
        required_levels = purchase_request.get_required_approval_levels()
        if level not in required_levels:
            raise ValidationError(
                f'Level {level} approval not required for request amount '
                f'${purchase_request.amount}'
            )
        
        # Create or update approval record with rejection
        approval, created = Approval.objects.get_or_create(
            request=purchase_request,
            level=level,
            defaults={
                'approver': approver,
                'decision': 'REJECTED',
                'comment': comment
            }
        )
        
        if not created:
            # Handle duplicate rejection attempt
            if approval.approver != approver:
                raise ValidationError(
                    f'Level {level} already decided by {approval.approver.username}'
                )
            
            # Update existing approval
            approval.decision = 'REJECTED'
            approval.comment = comment
            approval.save()
            action_taken = 'updated'
        else:
            action_taken = 'created'
        
        # Set request status to REJECTED
        purchase_request.status = 'REJECTED'
        purchase_request.save()
        
        logger.info(
            f'Purchase request {request_id} rejected at level {level} by {approver.username}. '
            f'Reason: {comment}'
        )
        
        return {
            'message': f'Request rejected at level {level}',
            'action': action_taken,
            'approval': {
                'id': str(approval.id),
                'level': approval.level,
                'decision': approval.decision,
                'approver': approval.approver.username,
                'comment': approval.comment,
                'created_at': approval.created_at.isoformat(),
            },
            'request_status': purchase_request.status,
            'pending_levels': [],  # No pending levels after rejection
            'is_fully_approved': False,
        }
    
    @staticmethod
    def _validate_approval_permission(approver, level: int) -> None:
        """
        Validate that the approver has permission for the specified level.
        
        Args:
            approver: User object to validate
            level: Approval level to check
            
        Raises:
            PermissionDenied: If user lacks required permission
        """
        if level == 1 and not approver.can_approve_level_1:
            raise PermissionDenied(
                'User does not have permission to approve at level 1'
            )
        elif level == 2 and not approver.can_approve_level_2:
            raise PermissionDenied(
                'User does not have permission to approve at level 2'
            )
    
    @staticmethod
    def _trigger_po_generation(purchase_request: PurchaseRequest) -> str:
        """
        Trigger asynchronous purchase order generation.
        
        Args:
            purchase_request: Approved purchase request
            
        Returns:
            Status message about PO generation
        """
        try:
            from purchases.tasks import generate_purchase_order
            generate_purchase_order.delay(str(purchase_request.id))
            return 'Purchase order generation initiated'
        except ImportError:
            logger.warning('Celery tasks not available for PO generation')
            return 'Purchase order generation not available (Celery not configured)'
        except Exception as e:
            logger.error(f'Failed to trigger PO generation: {str(e)}')
            return f'Purchase order generation failed: {str(e)}'
