"""
Example usage of the role-based permission classes.

This file demonstrates how to use the custom permission classes
in Django REST Framework views and regular Django views.
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods

from .permissions import (
    IsStaffUser, IsApproverLevel1, IsApproverLevel2, IsFinanceUser,
    IsAdminUser, CanModifyPurchaseRequest, RoleBasedPermission,
    require_role, require_approval_level, require_finance_access, admin_required
)


# Example DRF ViewSet using permission classes
class PurchaseRequestViewSet(viewsets.ModelViewSet):
    """
    Example ViewSet showing how to use role-based permissions.
    """
    
    # Default permission for all actions
    permission_classes = [IsStaffUser]
    
    def get_permissions(self):
        """
        Instantiate and return the list of permissions that this view requires.
        """
        if self.action == 'create':
            # Only staff and above can create requests
            permission_classes = [IsStaffUser]
        elif self.action in ['update', 'partial_update']:
            # Only allow modification of own pending requests
            permission_classes = [CanModifyPurchaseRequest]
        elif self.action == 'approve_level_1':
            # Only level 1 approvers and above
            permission_classes = [IsApproverLevel1]
        elif self.action == 'approve_level_2':
            # Only level 2 approvers and above
            permission_classes = [IsApproverLevel2]
        elif self.action == 'finance_review':
            # Only finance users
            permission_classes = [IsFinanceUser]
        elif self.action == 'admin_override':
            # Only admin users
            permission_classes = [IsAdminUser]
        else:
            # Default permissions for list, retrieve, etc.
            permission_classes = [IsStaffUser]
        
        return [permission() for permission in permission_classes]
    
    @action(detail=True, methods=['patch'])
    def approve_level_1(self, request, pk=None):
        """Custom action for level 1 approval."""
        # Permission is handled by get_permissions()
        return Response({'message': 'Approved at level 1'})
    
    @action(detail=True, methods=['patch'])
    def approve_level_2(self, request, pk=None):
        """Custom action for level 2 approval."""
        # Permission is handled by get_permissions()
        return Response({'message': 'Approved at level 2'})
    
    @action(detail=True, methods=['get'])
    def finance_review(self, request, pk=None):
        """Custom action for finance review."""
        # Permission is handled by get_permissions()
        return Response({'message': 'Finance review data'})
    
    @action(detail=True, methods=['patch'])
    def admin_override(self, request, pk=None):
        """Custom action for admin override."""
        # Permission is handled by get_permissions()
        return Response({'message': 'Admin override applied'})


# Example ViewSet using RoleBasedPermission with custom requirements
class DocumentViewSet(viewsets.ModelViewSet):
    """
    Example ViewSet using the generic RoleBasedPermission class.
    """
    
    permission_classes = [RoleBasedPermission]
    
    # Custom role requirements for different HTTP methods
    role_requirements = {
        'GET': ['staff', 'approver_lvl1', 'approver_lvl2', 'finance', 'admin'],
        'POST': ['staff', 'approver_lvl1', 'approver_lvl2', 'finance', 'admin'],
        'PUT': ['approver_lvl1', 'approver_lvl2', 'finance', 'admin'],
        'PATCH': ['approver_lvl1', 'approver_lvl2', 'finance', 'admin'],
        'DELETE': ['admin'],
    }


# Example regular Django views using decorators
@require_role('finance', 'admin')
@require_http_methods(["GET", "POST"])
def purchase_orders_view(request):
    """
    Example view that requires finance or admin role.
    """
    if request.method == 'GET':
        return JsonResponse({'purchase_orders': []})
    elif request.method == 'POST':
        return JsonResponse({'message': 'Purchase order created'})


@require_approval_level(2)
@require_http_methods(["POST"])
def high_value_approval_view(request):
    """
    Example view that requires level 2 approval capability.
    """
    return JsonResponse({'message': 'High value request approved'})


@require_finance_access
@require_http_methods(["GET"])
def financial_reports_view(request):
    """
    Example view that requires finance access.
    """
    return JsonResponse({'reports': ['Q1 Report', 'Q2 Report']})


@admin_required
@require_http_methods(["GET", "POST", "DELETE"])
def admin_panel_view(request):
    """
    Example view that requires admin access.
    """
    if request.method == 'GET':
        return JsonResponse({'admin_data': 'sensitive information'})
    elif request.method == 'POST':
        return JsonResponse({'message': 'Admin action performed'})
    elif request.method == 'DELETE':
        return JsonResponse({'message': 'Admin deletion performed'})


# Example of combining multiple decorators
@require_role('approver_lvl1', 'approver_lvl2', 'admin')
@require_http_methods(["PATCH"])
def approval_workflow_view(request, request_id):
    """
    Example view that combines role checking with HTTP method restriction.
    """
    # Additional logic to check approval level based on request data
    approval_level = request.POST.get('level', 1)
    
    if approval_level == 2 and not request.user.can_approve_level_2:
        return JsonResponse(
            {
                'error': {
                    'code': 'INSUFFICIENT_APPROVAL_LEVEL',
                    'message': 'Level 2 approval required'
                }
            },
            status=403
        )
    
    return JsonResponse({'message': f'Request {request_id} approved at level {approval_level}'})


# Example of a view that uses object-level permissions
class PurchaseRequestDetailView:
    """
    Example class-based view showing object-level permission checking.
    """
    
    def get(self, request, pk):
        """Get purchase request details."""
        # This would typically get the object from the database
        purchase_request = self.get_object(pk)
        
        # Check object-level permissions
        permission = IsStaffUser()
        if not permission.has_object_permission(request, self, purchase_request):
            return JsonResponse(
                {'error': {'code': 'PERMISSION_DENIED', 'message': 'Access denied'}},
                status=403
            )
        
        return JsonResponse({'request': 'details'})
    
    def put(self, request, pk):
        """Update purchase request."""
        purchase_request = self.get_object(pk)
        
        # Check if user can modify this request
        permission = CanModifyPurchaseRequest()
        if not permission.has_object_permission(request, self, purchase_request):
            return JsonResponse(
                {
                    'error': {
                        'code': 'MODIFICATION_NOT_ALLOWED',
                        'message': 'Cannot modify this request'
                    }
                },
                status=403
            )
        
        return JsonResponse({'message': 'Request updated'})
    
    def get_object(self, pk):
        """Mock method to get object - would typically query database."""
        # This is a mock object for demonstration
        class MockPurchaseRequest:
            def __init__(self):
                self.created_by = None  # Would be set to actual user
                self.status = 'PENDING'
        
        return MockPurchaseRequest()


# URL patterns example (would go in urls.py)
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import example_usage

router = DefaultRouter()
router.register(r'purchase-requests', example_usage.PurchaseRequestViewSet, basename='purchaserequest')
router.register(r'documents', example_usage.DocumentViewSet, basename='document')

urlpatterns = [
    path('api/', include(router.urls)),
    path('api/purchase-orders/', example_usage.purchase_orders_view, name='purchase-orders'),
    path('api/high-value-approval/', example_usage.high_value_approval_view, name='high-value-approval'),
    path('api/financial-reports/', example_usage.financial_reports_view, name='financial-reports'),
    path('api/admin-panel/', example_usage.admin_panel_view, name='admin-panel'),
    path('api/approval-workflow/<int:request_id>/', example_usage.approval_workflow_view, name='approval-workflow'),
]
"""