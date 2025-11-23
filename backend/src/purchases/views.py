"""
Views for the purchases app.

This module provides DRF ViewSets for purchase request management,
approval workflows, and receipt submission with proper permission controls.
"""

import logging
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from django.core.exceptions import PermissionDenied
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter, SearchFilter

logger = logging.getLogger(__name__)

from .models import PurchaseRequest, Approval
from documents.models import Document
from .serializers import (
    PurchaseRequestCreateSerializer,
    PurchaseRequestDetailSerializer,
    PurchaseRequestListSerializer,
    ApprovalSerializer,
    ReceiptSubmissionSerializer,
    ReceiptValidationStatusSerializer,
)
from core.permissions import (
    IsStaffUser,
    IsApproverLevel1,
    IsApproverLevel2,
    IsFinanceUser,
    IsAdminUser,
    CanModifyPurchaseRequest,
)


class PurchaseRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for purchase request management operations.
    
    Provides CRUD operations for purchase requests with proper role-based permissions,
    approval workflow, and receipt submission functionality.
    
    Permissions:
    - List/Retrieve: Staff users can see their own requests, finance/admin see all
    - Create: All authenticated staff users
    - Update: Request owner (only when PENDING) or admin users
    - Delete: Admin users only
    """
    
    queryset = PurchaseRequest.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsStaffUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    
    # Filtering options
    filterset_fields = ['status', 'created_by', 'amount']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'updated_at', 'amount', 'title']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        """
        Return appropriate serializer based on action.
        """
        if self.action == 'create':
            return PurchaseRequestCreateSerializer
        elif self.action == 'list':
            return PurchaseRequestListSerializer
        elif self.action == 'submit_receipt':
            return ReceiptSubmissionSerializer
        elif self.action == 'receipt_validation_status':
            return ReceiptValidationStatusSerializer
        else:
            return PurchaseRequestDetailSerializer
    
    def get_queryset(self):
        """
        Filter queryset based on user permissions.
        
        Staff users see only their own requests.
        Finance and admin users see all requests.
        """
        user = self.request.user
        
        if not user.is_authenticated:
            return PurchaseRequest.objects.none()
        
        # Admin and finance users can see all requests
        if user.is_admin_user or user.can_manage_finance:
            return PurchaseRequest.objects.all()
            
        # Approvers need to see pending requests to approve them
        if user.can_approve_level_1 or user.can_approve_level_2:
             return PurchaseRequest.objects.filter(Q(created_by=user) | Q(status='PENDING'))
        
        # Staff users see only their own requests
        return PurchaseRequest.objects.filter(created_by=user)
    
    def perform_create(self, serializer):
        """
        Create purchase request with proper user association.
        """
        serializer.save(created_by=self.request.user)
    
    def create(self, request, *args, **kwargs):
        """
        Handle purchase request creation with validation.
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            
            return Response(
                {
                    'message': 'Purchase request created successfully',
                    'request': serializer.data
                },
                status=status.HTTP_201_CREATED,
                headers=headers
            )
        except Exception as e:
            return Response(
                {
                    'error': {
                        'code': 'CREATION_FAILED',
                        'message': 'Failed to create purchase request',
                        'details': str(e)
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def update(self, request, *args, **kwargs):
        """
        Handle purchase request updates.
        
        Only allows updating when request is in PENDING status.
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        
        # Check if user can modify this request
        if not self._can_modify_request(instance):
            raise PermissionDenied("You don't have permission to modify this request.")
        
        # Check if request is modifiable
        if not instance.is_modifiable:
            return Response(
                {
                    'error': {
                        'code': 'REQUEST_NOT_MODIFIABLE',
                        'message': f'Cannot modify request in {instance.status} status'
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        return Response({
            'message': 'Purchase request updated successfully',
            'request': serializer.data
        })
    
    def destroy(self, request, *args, **kwargs):
        """
        Handle purchase request deletion.
        
        Only admin users can delete requests.
        """
        if not request.user.is_admin_user:
            raise PermissionDenied("Only admin users can delete purchase requests.")
        
        instance = self.get_object()
        self.perform_destroy(instance)
        
        return Response(
            {'message': 'Purchase request deleted successfully'},
            status=status.HTTP_204_NO_CONTENT
        )
    
    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        """
        Approve purchase request at specified level.
        
        Implements concurrency-safe approval workflow with proper validation.
        Requirements: 3.1, 3.2, 3.3, 3.4, 8.1, 8.2
        """
        # Validate request data
        approval_serializer = ApprovalSerializer(data=request.data)
        approval_serializer.is_valid(raise_exception=True)
        
        level = approval_serializer.validated_data['level']
        comment = approval_serializer.validated_data.get('comment', '')
        
        # Check approval permissions
        if level == 1 and not request.user.can_approve_level_1:
            raise PermissionDenied("User does not have permission to approve at level 1.")
        elif level == 2 and not request.user.can_approve_level_2:
            raise PermissionDenied("User does not have permission to approve at level 2.")
        
        try:
            with transaction.atomic():
                # Use select_for_update to prevent race conditions (Requirement 8.1)
                pr = PurchaseRequest.objects.select_for_update().get(pk=pk)
                
                # Validate request state
                if not pr.is_pending:
                    return Response(
                        {
                            'error': {
                                'code': 'REQUEST_NOT_PENDING',
                                'message': f'Cannot approve request in {pr.status} status'
                            }
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Check if level is required for this request
                required_levels = pr.get_required_approval_levels()
                if level not in required_levels:
                    return Response(
                        {
                            'error': {
                                'code': 'APPROVAL_LEVEL_NOT_REQUIRED',
                                'message': f'Level {level} approval not required for request amount ${pr.amount}'
                            }
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Check for existing rejections (Requirement 3.2)
                if pr.has_rejection():
                    return Response(
                        {
                            'error': {
                                'code': 'REQUEST_ALREADY_REJECTED',
                                'message': 'Cannot approve request that has been rejected at any level'
                            }
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Create or update approval record (idempotent operation - Requirement 3.6)
                approval, created = Approval.objects.get_or_create(
                    request=pr,
                    level=level,
                    defaults={
                        'approver': request.user,
                        'decision': 'APPROVED',
                        'comment': comment
                    }
                )
                
                if not created:
                    # Update existing approval if it's the same approver
                    if approval.approver == request.user:
                        approval.decision = 'APPROVED'
                        approval.comment = comment
                        approval.save()
                        action_taken = 'updated'
                    else:
                        return Response(
                            {
                                'error': {
                                    'code': 'APPROVAL_ALREADY_EXISTS',
                                    'message': f'Level {level} already approved by {approval.approver.username}'
                                }
                            },
                            status=status.HTTP_409_CONFLICT
                        )
                else:
                    action_taken = 'created'
                
                # Check if all required approvals are complete (Requirement 3.3)
                if pr.is_fully_approved():
                    pr.status = 'APPROVED'
                    pr.last_approved_by = request.user
                    pr.approved_at = timezone.now()
                    pr.save()
                    
                    # Trigger PO generation (Requirement 3.4)
                    try:
                        from .tasks import generate_purchase_order
                        generate_purchase_order.delay(str(pr.id))
                        po_generation_status = "Purchase order generation initiated"
                    except ImportError:
                        po_generation_status = "Purchase order generation not available"
                    except Exception as e:
                        po_generation_status = f"Purchase order generation failed: {str(e)}"
                else:
                    po_generation_status = None
                
                # Prepare response data
                response_data = {
                    'message': f'Request approved at level {level}',
                    'action': action_taken,
                    'approval': ApprovalSerializer(approval).data,
                    'request_status': pr.status,
                    'pending_levels': pr.get_pending_approval_levels(),
                    'is_fully_approved': pr.is_fully_approved()
                }
                
                if po_generation_status:
                    response_data['po_generation_status'] = po_generation_status
                
                return Response(response_data, status=status.HTTP_200_OK)
                
        except PurchaseRequest.DoesNotExist:
            return Response(
                {
                    'error': {
                        'code': 'REQUEST_NOT_FOUND',
                        'message': 'Purchase request not found'
                    }
                },
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Approval failed for request {pk}: {str(e)}")
            return Response(
                {
                    'error': {
                        'code': 'APPROVAL_FAILED',
                        'message': 'Failed to process approval',
                        'details': str(e)
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        """
        Reject purchase request at specified level.
        
        Implements concurrency-safe rejection workflow with proper validation.
        Requirements: 3.1, 3.2, 3.3, 3.4, 8.1, 8.2
        """
        # Validate request data
        approval_serializer = ApprovalSerializer(data=request.data)
        approval_serializer.is_valid(raise_exception=True)
        
        level = approval_serializer.validated_data['level']
        comment = approval_serializer.validated_data.get('comment', '')
        
        # Require comment for rejections
        if not comment or not comment.strip():
            return Response(
                {
                    'error': {
                        'code': 'REJECTION_COMMENT_REQUIRED',
                        'message': 'Comment is required when rejecting a request'
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check approval permissions
        if level == 1 and not request.user.can_approve_level_1:
            raise PermissionDenied("User does not have permission to reject at level 1.")
        elif level == 2 and not request.user.can_approve_level_2:
            raise PermissionDenied("User does not have permission to reject at level 2.")
        
        try:
            with transaction.atomic():
                # Use select_for_update to prevent race conditions (Requirement 8.1)
                pr = PurchaseRequest.objects.select_for_update().get(pk=pk)
                
                # Validate request state
                if not pr.is_pending:
                    return Response(
                        {
                            'error': {
                                'code': 'REQUEST_NOT_PENDING',
                                'message': f'Cannot reject request in {pr.status} status'
                            }
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Check if level is required for this request
                required_levels = pr.get_required_approval_levels()
                if level not in required_levels:
                    return Response(
                        {
                            'error': {
                                'code': 'APPROVAL_LEVEL_NOT_REQUIRED',
                                'message': f'Level {level} approval not required for request amount ${pr.amount}'
                            }
                        },
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Create or update approval record with rejection
                approval, created = Approval.objects.get_or_create(
                    request=pr,
                    level=level,
                    defaults={
                        'approver': request.user,
                        'decision': 'REJECTED',
                        'comment': comment
                    }
                )
                
                if not created:
                    # Update existing approval if it's the same approver
                    if approval.approver == request.user:
                        approval.decision = 'REJECTED'
                        approval.comment = comment
                        approval.save()
                        action_taken = 'updated'
                    else:
                        return Response(
                            {
                                'error': {
                                    'code': 'APPROVAL_ALREADY_EXISTS',
                                    'message': f'Level {level} already decided by {approval.approver.username}'
                                }
                            },
                            status=status.HTTP_409_CONFLICT
                        )
                else:
                    action_taken = 'created'
                
                # Set request status to REJECTED (Requirement 3.2)
                pr.status = 'REJECTED'
                pr.save()
                
                response_data = {
                    'message': f'Request rejected at level {level}',
                    'action': action_taken,
                    'approval': ApprovalSerializer(approval).data,
                    'request_status': pr.status,
                    'pending_levels': [],  # No pending levels after rejection
                    'is_fully_approved': False
                }
                
                return Response(response_data, status=status.HTTP_200_OK)
                
        except PurchaseRequest.DoesNotExist:
            return Response(
                {
                    'error': {
                        'code': 'REQUEST_NOT_FOUND',
                        'message': 'Purchase request not found'
                    }
                },
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Rejection failed for request {pk}: {str(e)}")
            return Response(
                {
                    'error': {
                        'code': 'REJECTION_FAILED',
                        'message': 'Failed to process rejection',
                        'details': str(e)
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'], url_path='submit-receipt', parser_classes=[MultiPartParser, FormParser])
    def submit_receipt(self, request, pk=None):
        """
        Submit receipt document for purchase request validation.
        
        Creates receipt document and triggers validation against purchase order.
        Requirements: 6.1, 6.5
        """
        purchase_request = self.get_object()
        
        # Check if user can submit receipt for this request
        if not self._can_access_request(purchase_request):
            raise PermissionDenied("You don't have permission to submit receipt for this request.")
        
        # Check if request is approved (has associated PO)
        if not purchase_request.is_approved:
            return Response(
                {
                    'error': {
                        'code': 'REQUEST_NOT_APPROVED',
                        'message': 'Can only submit receipts for approved requests with purchase orders'
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if purchase order exists
        if not hasattr(purchase_request, 'purchase_order'):
            return Response(
                {
                    'error': {
                        'code': 'PURCHASE_ORDER_NOT_FOUND',
                        'message': 'No purchase order found for this request'
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate and create receipt document
        serializer = self.get_serializer(
            data=request.data,
            context={
                'request': request,
                'purchase_request': purchase_request
            }
        )
        serializer.is_valid(raise_exception=True)
        
        try:
            result = serializer.save()
            document = result['document']
            
            # Trigger receipt validation
            try:
                from .receipt_validation import validate_receipt_against_po
                validation_result = validate_receipt_against_po(
                    str(document.id), 
                    str(purchase_request.purchase_order.id)
                )
                validation_status = f"Receipt validation completed. Match score: {validation_result.get('match_score', 0):.2f}"
                if validation_result.get('needs_manual_review'):
                    validation_status += " (Manual review required)"
            except Exception as e:
                validation_status = f"Receipt validation failed: {str(e)}"
            
            return Response({
                'message': 'Receipt submitted successfully',
                'receipt': {
                    'id': document.id,
                    'filename': document.original_filename,
                    'processing_status': document.processing_status,
                    'created_at': document.created_at
                },
                'validation_status': validation_status
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {
                    'error': {
                        'code': 'RECEIPT_SUBMISSION_FAILED',
                        'message': 'Failed to submit receipt',
                        'details': str(e)
                    }
                },
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['get'], url_path='receipt-validation-status')
    def receipt_validation_status(self, request, pk=None):
        """
        Get receipt validation status and results for purchase request.
        
        Returns validation results for all receipts associated with the request.
        Requirements: 6.5
        """
        purchase_request = self.get_object()
        
        # Check if user can access this request
        if not self._can_access_request(purchase_request):
            raise PermissionDenied("You don't have permission to access this request.")
        
        # Find receipt documents associated with this request
        # We'll look for receipts uploaded by users who can access this request
        receipt_documents = Document.objects.filter(
            doc_type='RECEIPT',
            uploaded_by=purchase_request.created_by
        ).order_by('-created_at')
        
        # For now, we'll return all receipts by the request creator
        # In a more sophisticated system, we'd have explicit relationships
        
        validation_results = []
        for document in receipt_documents:
            serializer = self.get_serializer(document)
            validation_results.append(serializer.data)
        
        return Response({
            'purchase_request_id': purchase_request.id,
            'purchase_request_title': purchase_request.title,
            'receipt_count': len(validation_results),
            'validation_results': validation_results
        })
    
    @action(detail=False, methods=['get'], url_path='approval-summary')
    def approval_summary(self, request):
        """
        Get approval summary for user's accessible requests.
        """
        # 1. My Requests Stats (always based on user's own requests)
        my_requests = PurchaseRequest.objects.filter(created_by=request.user)
        
        summary = {
            'total_requests': my_requests.count(),
            'pending_requests': my_requests.filter(status='PENDING').count(),
            'approved_requests': my_requests.filter(status='APPROVED').count(),
            'rejected_requests': my_requests.filter(status='REJECTED').count(),
        }
        
        # 2. Approval Tasks (if user is an approver)
        if request.user.can_approve_level_1 or request.user.can_approve_level_2:
            # Find ALL requests needing approval (not just mine)
            pending_requests = PurchaseRequest.objects.filter(status='PENDING')
            
            level_1_pending = 0
            level_2_pending = 0
            
            for pr in pending_requests:
                pending_levels = pr.get_pending_approval_levels()
                if 1 in pending_levels and request.user.can_approve_level_1:
                    level_1_pending += 1
                if 2 in pending_levels and request.user.can_approve_level_2:
                    level_2_pending += 1
            
            summary.update({
                'pending_level_1_approvals': level_1_pending,
                'pending_level_2_approvals': level_2_pending,
            })
        
        return Response(summary)
    
    def _can_access_request(self, purchase_request):
        """
        Check if current user can access the given purchase request.
        """
        user = self.request.user
        
        # Admin and finance users can access all requests
        if user.is_admin_user or user.can_manage_finance:
            return True
        
        # Users can access their own requests
        return purchase_request.created_by == user
    
    def _can_modify_request(self, purchase_request):
        """
        Check if current user can modify the given purchase request.
        """
        user = self.request.user
        
        # Admin users can modify any request
        if user.is_admin_user:
            return True
        
        # Users can modify their own pending requests
        return (
            purchase_request.created_by == user and 
            purchase_request.is_modifiable
        )
