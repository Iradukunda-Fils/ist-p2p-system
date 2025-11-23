"""
URL configuration for purchases app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PurchaseRequestViewSet
from .views_po import PurchaseOrderViewSet

app_name = 'purchases'

router = DefaultRouter()
router.register(r'requests', PurchaseRequestViewSet, basename='purchaserequest')
router.register(r'purchase-orders', PurchaseOrderViewSet, basename='purchaseorder')

urlpatterns = [
    path('', include(router.urls)),
]