"""
Role-based permission classes for the Django P2P system.

This module provides custom DRF permission classes that implement
role-based access control based on the User model's role field.
"""

from rest_framework import permissions
from functools import wraps
from django.http import JsonResponse
from django.core.exceptions import PermissionDenied


class IsStaffUser(permissions.BasePermission):
    """
    Permission class that allows access only to staff users.
    Staff users can create and manage their own purchase requests.
    """
    
    def has_permission(self, request, view):
        """Check if user has staff role or higher."""
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['staff', 'approver_lvl1', 'approver_lvl2', 'finance', 'admin']
        )
    
    def has_object_permission(self, request, view, obj):
        """Staff users can only access their own objects unless they have higher privileges."""
        if request.user.role in ['admin', 'finance']:
            return True
            
        # Allow approvers to view pending requests
        if request.user.role in ['approver_lvl1', 'approver_lvl2']:
            if hasattr(obj, 'status') and obj.status == 'PENDING':
                return True
        
        # Check if object has a created_by or user field
        if hasattr(obj, 'created_by'):
            return obj.created_by == request.user
        elif hasattr(obj, 'user'):
            return obj.user == request.user
        
        return True


class IsApproverLevel1(permissions.BasePermission):
    """
    Permission class for Level 1 approvers.
    Can approve purchase requests at level 1.
    """
    
    def has_permission(self, request, view):
        """Check if user can approve at level 1."""
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.can_approve_level_1
        )


class IsApproverLevel2(permissions.BasePermission):
    """
    Permission class for Level 2 approvers.
    Can approve purchase requests at level 2 (highest level).
    """
    
    def has_permission(self, request, view):
        """Check if user can approve at level 2."""
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.can_approve_level_2
        )


class IsFinanceUser(permissions.BasePermission):
    """
    Permission class for finance users.
    Can manage purchase orders, receipts, and financial operations.
    """
    
    def has_permission(self, request, view):
        """Check if user has finance role."""
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.can_manage_finance
        )


class IsAdminUser(permissions.BasePermission):
    """
    Permission class for admin users.
    Has full access to all system operations.
    """
    
    def has_permission(self, request, view):
        """Check if user has admin privileges."""
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.is_admin_user
        )


class CanApproveAtLevel(permissions.BasePermission):
    """
    Dynamic permission class that checks if user can approve at a specific level.
    The level should be passed in the view context or determined from the request.
    """
    
    def has_permission(self, request, view):
        """Check if user can approve at the required level."""
        if not (request.user and request.user.is_authenticated):
            return False
        
        # Get the approval level from view kwargs, request data, or default to 1
        level = getattr(view, 'approval_level', None)
        if level is None:
            if hasattr(request, 'data') and request.data:
                level = request.data.get('level', 1)
            else:
                level = 1
        
        if level == 1:
            return request.user.can_approve_level_1
        elif level == 2:
            return request.user.can_approve_level_2
        
        return False


class CanModifyPurchaseRequest(permissions.BasePermission):
    """
    Permission class for purchase request modifications.
    Users can only modify their own requests when in PENDING status.
    """
    
    def has_object_permission(self, request, view, obj):
        """Check if user can modify the purchase request."""
        # Admin users can modify any request
        if request.user.is_admin_user:
            return True
        
        # Users can only modify their own requests
        if hasattr(obj, 'created_by') and obj.created_by != request.user:
            return False
        
        # Can only modify requests in PENDING status
        if hasattr(obj, 'status') and obj.status != 'PENDING':
            return False
        
        return True


class RoleBasedPermission(permissions.BasePermission):
    """
    Generic role-based permission class that can be configured
    with required roles for different operations.
    """
    
    # Default role requirements for different HTTP methods
    role_requirements = {
        'GET': ['staff', 'approver_lvl1', 'approver_lvl2', 'finance', 'admin'],
        'POST': ['staff', 'approver_lvl1', 'approver_lvl2', 'finance', 'admin'],
        'PUT': ['staff', 'approver_lvl1', 'approver_lvl2', 'finance', 'admin'],
        'PATCH': ['staff', 'approver_lvl1', 'approver_lvl2', 'finance', 'admin'],
        'DELETE': ['admin'],
    }
    
    def has_permission(self, request, view):
        """Check if user's role is allowed for the HTTP method."""
        if not (request.user and request.user.is_authenticated):
            return False
        
        # Get role requirements for this view if customized
        role_reqs = getattr(view, 'role_requirements', self.role_requirements)
        required_roles = role_reqs.get(request.method, [])
        
        return request.user.role in required_roles


# Permission decorators for view methods
def require_role(*roles):
    """
    Decorator that requires user to have one of the specified roles.
    
    Usage:
        @require_role('admin', 'finance')
        def my_view(request):
            # View logic here
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return JsonResponse(
                    {'error': {'code': 'AUTHENTICATION_REQUIRED', 'message': 'Authentication required'}},
                    status=401
                )
            
            if request.user.role not in roles and not request.user.is_admin_user:
                return JsonResponse(
                    {
                        'error': {
                            'code': 'INSUFFICIENT_PERMISSIONS',
                            'message': f'User role "{request.user.role}" is not authorized. Required roles: {", ".join(roles)}',
                            'details': {
                                'user_role': request.user.role,
                                'required_roles': list(roles)
                            }
                        }
                    },
                    status=403
                )
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


def require_approval_level(level):
    """
    Decorator that requires user to be able to approve at the specified level.
    
    Usage:
        @require_approval_level(2)
        def approve_high_value_request(request):
            # Approval logic here
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            if not request.user.is_authenticated:
                return JsonResponse(
                    {'error': {'code': 'AUTHENTICATION_REQUIRED', 'message': 'Authentication required'}},
                    status=401
                )
            
            can_approve = False
            if level == 1:
                can_approve = request.user.can_approve_level_1
            elif level == 2:
                can_approve = request.user.can_approve_level_2
            
            if not can_approve:
                return JsonResponse(
                    {
                        'error': {
                            'code': 'INSUFFICIENT_APPROVAL_LEVEL',
                            'message': f'User cannot approve at level {level}',
                            'details': {
                                'user_role': request.user.role,
                                'required_level': level
                            }
                        }
                    },
                    status=403
                )
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


def require_finance_access(view_func):
    """
    Decorator that requires finance role access.
    
    Usage:
        @require_finance_access
        def manage_purchase_orders(request):
            # Finance operations here
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse(
                {'error': {'code': 'AUTHENTICATION_REQUIRED', 'message': 'Authentication required'}},
                status=401
            )
        
        if not request.user.can_manage_finance:
            return JsonResponse(
                {
                    'error': {
                        'code': 'FINANCE_ACCESS_REQUIRED',
                        'message': 'Finance role required for this operation',
                        'details': {
                            'user_role': request.user.role,
                            'required_roles': ['finance', 'admin']
                        }
                    }
                },
                status=403
            )
        
        return view_func(request, *args, **kwargs)
    return wrapper


def admin_required(view_func):
    """
    Decorator that requires admin access.
    
    Usage:
        @admin_required
        def admin_only_view(request):
            # Admin operations here
    """
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse(
                {'error': {'code': 'AUTHENTICATION_REQUIRED', 'message': 'Authentication required'}},
                status=401
            )
        
        if not request.user.is_admin_user:
            return JsonResponse(
                {
                    'error': {
                        'code': 'ADMIN_ACCESS_REQUIRED',
                        'message': 'Admin privileges required for this operation',
                        'details': {
                            'user_role': request.user.role
                        }
                    }
                },
                status=403
            )
        
        return view_func(request, *args, **kwargs)
    return wrapper