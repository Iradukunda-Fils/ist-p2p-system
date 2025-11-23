"""
Core views for the P2P system.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from core.utils import get_storage_info, validate_storage_configuration, test_s3_connection


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def health_check(request):
    """
    Health check endpoint that includes storage status.
    
    Returns system health information including storage configuration.
    """
    # Basic health info
    health_data = {
        'status': 'healthy',
        'environment': getattr(settings, 'ENVIRONMENT', 'unknown'),
        'debug': settings.DEBUG,
    }
    
    # Storage information
    storage_info = get_storage_info()
    health_data['storage'] = storage_info
    
    # Validate storage configuration
    storage_issues = validate_storage_configuration()
    if storage_issues:
        health_data['storage']['issues'] = storage_issues
        health_data['status'] = 'degraded'
    
    # Test S3 connection if configured
    if storage_info.get('use_s3'):
        s3_test = test_s3_connection()
        health_data['storage']['s3_test'] = s3_test
        
        if s3_test['status'] == 'error':
            health_data['status'] = 'degraded'
    
    # Determine HTTP status code
    http_status = status.HTTP_200_OK
    if health_data['status'] == 'degraded':
        http_status = status.HTTP_206_PARTIAL_CONTENT
    elif health_data['status'] == 'unhealthy':
        http_status = status.HTTP_503_SERVICE_UNAVAILABLE
    
    return Response(health_data, status=http_status)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def storage_status(request):
    """
    Detailed storage status endpoint for administrators.
    
    Returns comprehensive storage configuration and test results.
    """
    # Check if user has admin permissions
    if not request.user.is_staff:
        return Response(
            {'error': 'Admin permissions required'}, 
            status=status.HTTP_403_FORBIDDEN
        )
    
    storage_info = get_storage_info()
    storage_issues = validate_storage_configuration()
    
    response_data = {
        'configuration': storage_info,
        'validation_issues': storage_issues,
        'status': 'healthy' if not storage_issues else 'issues_detected'
    }
    
    # Test S3 if configured
    if storage_info.get('use_s3'):
        s3_test = test_s3_connection()
        response_data['s3_connection_test'] = s3_test
        
        if s3_test['status'] == 'error':
            response_data['status'] = 'connection_failed'
    
    return Response(response_data)