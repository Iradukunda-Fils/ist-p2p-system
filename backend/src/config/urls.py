"""
URL configuration for P2P system.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from django.http import JsonResponse

def simple_health_check(request):
    """Simple health check without authentication for Docker/Nginx monitoring."""
    return JsonResponse({"status": "healthy"})


urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # Simple Health Check (unauthenticated for Docker/Nginx)
    path('api/health/', simple_health_check, name='simple_health_check'),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # API Endpoints
    path('api/auth/', include('users.urls')),
    path('api/purchases/', include('purchases.urls')),
    path('api/documents/', include('documents.urls')),
    path('api/core/', include('core.urls')),
]


# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
