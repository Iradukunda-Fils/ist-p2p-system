from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Sum, F
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import PurchaseRequest, RequestItem, Approval, PurchaseOrder
import json


# Inline admin classes
class RequestItemInline(admin.TabularInline):
    """Inline admin for RequestItem - allows editing items within PurchaseRequest."""
    model = RequestItem
    extra = 1
    fields = ('name', 'quantity', 'unit_price', 'unit_of_measure', 'description', 'line_total_display')
    readonly_fields = ('line_total_display',)
    
    @admin.display(description='Line Total')
    def line_total_display(self, obj):
        if obj.pk:
            return f'${obj.line_total:,.2f}'
        return '-'


class ApprovalInline(admin.TabularInline):
    """Inline admin for Approval - read-only display of approval history."""
    model = Approval
    extra = 0
    can_delete = False
    fields = ('level', 'decision_badge', 'approver', 'comment', 'created_at')
    readonly_fields = ('level', 'decision_badge', 'approver', 'comment', 'created_at')
    
    def has_add_permission(self, request, obj=None):
        return False
    
    @admin.display(description='Decision')
    def decision_badge(self, obj):
        colors = {
            'APPROVED': '#28a745',
            'REJECTED': '#dc3545',
        }
        color = colors.get(obj.decision, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px; font-weight: bold;">{}</span>',
            color,
            obj.get_decision_display()
        )


# Main admin classes
@admin.register(PurchaseRequest)
class PurchaseRequestAdmin(admin.ModelAdmin):
    """Advanced admin interface for PurchaseRequest with filtering, search, and inlines."""
    
    list_display = (
        'title',
        'amount_display',
        'status_badge',
        'created_by',
        'approval_status_display',
        'created_at',
        'updated_at'
    )
    list_filter = ('status', 'created_by', 'created_at', 'updated_at')
    search_fields = ('title', 'description', 'created_by__username', 'created_by__email')
    readonly_fields = (
        'id',
        'version',
        'calculated_total_display',
        'approval_status_display',
        'created_at',
        'updated_at',
        'approved_at'
    )
    inlines = [RequestItemInline, ApprovalInline]
    list_per_page = 25
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Core Information', {
            'fields': ('title', 'description', 'created_by')
        }),
        ('Financial Details', {
            'fields': ('amount', 'calculated_total_display')
        }),
        ('Status & Approvals', {
            'fields': ('status', 'approval_status_display', 'last_approved_by', 'approved_at')
        }),
        ('Proforma Document', {
            'fields': ('proforma',),
            'classes': ('collapse',)
        }),
        ('System Fields', {
            'fields': ('id', 'version', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    @admin.display(description='Amount', ordering='amount')
    def amount_display(self, obj):
        if obj.amount:
            return f'${obj.amount:,.2f}'
        return '-'
    
    @admin.display(description='Status', ordering='status')
    def status_badge(self, obj):
        colors = {
            'PENDING': '#ffc107',
            'APPROVED': '#28a745',
            'REJECTED': '#dc3545',
        }
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    
    @admin.display(description='Calculated Total')
    def calculated_total_display(self, obj):
        total = obj.calculated_total
        return f'${total:,.2f}'
    
    @admin.display(description='Approval Status')
    def approval_status_display(self, obj):
        if obj.status != 'PENDING':
            return obj.get_status_display()
        
        required_levels = obj.get_required_approval_levels()
        pending_levels = obj.get_pending_approval_levels()
        
        if not pending_levels:
            status = f'All approvals complete ({len(required_levels)} levels)'
            color = '#28a745'
        else:
            status = f'Pending: Level {", ".join(map(str, pending_levels))}'
            color = '#ffc107'
        
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            status
        )


@admin.register(RequestItem)
class RequestItemAdmin(admin.ModelAdmin):
    """Admin interface for RequestItem with filtering and search."""
    
    list_display = (
        'name',
        'request_title',
        'quantity',
        'unit_price_display',
        'line_total_display',
        'unit_of_measure'
    )
    list_filter = ('unit_of_measure', 'request__status')
    search_fields = ('name', 'description', 'request__title')
    readonly_fields = ('line_total_display', 'created_at', 'updated_at')
    list_per_page = 50
    
    fieldsets = (
        ('Item Details', {
            'fields': ('request', 'name', 'description')
        }),
        ('Pricing', {
            'fields': ('quantity', 'unit_price', 'unit_of_measure', 'line_total_display')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    @admin.display(description='Request', ordering='request__title')
    def request_title(self, obj):
        return obj.request.title
    
    @admin.display(description='Unit Price', ordering='unit_price')
    def unit_price_display(self, obj):
        return f'${obj.unit_price:,.2f}'
    
    @admin.display(description='Line Total')
    def line_total_display(self, obj):
        return f'${obj.line_total:,.2f}'


@admin.register(Approval)
class ApprovalAdmin(admin.ModelAdmin):
    """Admin interface for Approval with filtering and search."""
    
    list_display = (
        'request_title',
        'level_badge',
        'decision_badge',
        'approver',
        'created_at'
    )
    list_filter = ('level', 'decision', 'approver', 'created_at')
    search_fields = ('request__title', 'approver__username', 'comment')
    readonly_fields = ('created_at',)
    list_per_page = 50
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Approval Details', {
            'fields': ('request', 'level', 'decision', 'approver')
        }),
        ('Comments', {
            'fields': ('comment',)
        }),
        ('Timestamp', {
            'fields': ('created_at',)
        }),
    )
    
    @admin.display(description='Request', ordering='request__title')
    def request_title(self, obj):
        return obj.request.title
    
    @admin.display(description='Level', ordering='level')
    def level_badge(self, obj):
        colors = {1: '#0d6efd', 2: '#6610f2'}
        color = colors.get(obj.level, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px; font-weight: bold;">Level {}</span>',
            color,
            obj.level
        )
    
    @admin.display(description='Decision', ordering='decision')
    def decision_badge(self, obj):
        colors = {
            'APPROVED': '#28a745',
            'REJECTED': '#dc3545',
        }
        color = colors.get(obj.decision, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px; font-weight: bold;">{}</span>',
            color,
            obj.get_decision_display()
        )


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    """Advanced admin interface for PurchaseOrder with custom actions and JSON display."""
    
    list_display = (
        'po_number_display',
        'vendor',
        'total_display',
        'status_badge',
        'request_link',
        'created_at'
    )
    list_filter = ('status', 'created_at')
    search_fields = ('po_number', 'vendor', 'vendor_contact', 'request__title')
    readonly_fields = ('id', 'po_number', 'created_at', 'metadata_display')
    list_per_page = 25
    date_hierarchy = 'created_at'
    actions = ['mark_as_sent', 'mark_as_fulfilled']
    
    fieldsets = (
        ('PO Details', {
            'fields': ('po_number', 'request', 'status')
        }),
        ('Vendor Information', {
            'fields': ('vendor', 'vendor_contact')
        }),
        ('Financial', {
            'fields': ('total',)
        }),
        ('Metadata', {
            'fields': ('metadata_display',),
            'classes': ('collapse',)
        }),
        ('System Fields', {
            'fields': ('id', 'created_at'),
            'classes': ('collapse',)
        }),
    )
    
    @admin.display(description='PO Number', ordering='po_number')
    def po_number_display(self, obj):
        return format_html(
            '<span style="font-family: monospace; font-weight: bold; color: #0d6efd;">{}</span>',
            obj.po_number
        )
    
    @admin.display(description='Total', ordering='total')
    def total_display(self, obj):
        return f'${obj.total:,.2f}'
    
    @admin.display(description='Status', ordering='status')
    def status_badge(self, obj):
        colors = {
            'DRAFT': '#6c757d',
            'SENT': '#0d6efd',
            'ACKNOWLEDGED': '#17a2b8',
            'FULFILLED': '#28a745',
            'CANCELLED': '#dc3545',
        }
        color = colors.get(obj.status, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    
    @admin.display(description='Related Request')
    def request_link(self, obj):
        url = reverse('admin:purchases_purchaserequest_change', args=[obj.request.id])
        return format_html('<a href="{}">{}</a>', url, obj.request.title)
    
    @admin.display(description='Metadata (JSON)')
    def metadata_display(self, obj):
        if obj.metadata:
            json_str = json.dumps(obj.metadata, indent=2)
            return format_html('<pre style="background: #f5f5f5; padding: 10px; border-radius: 4px;">{}</pre>', json_str)
        return '-'
    
    @admin.action(description='Mark selected POs as Sent')
    def mark_as_sent(self, request, queryset):
        updated = queryset.filter(status='DRAFT').update(status='SENT')
        self.message_user(request, f'{updated} purchase order(s) marked as Sent.')
    
    @admin.action(description='Mark selected POs as Fulfilled')
    def mark_as_fulfilled(self, request, queryset):
        updated = queryset.filter(status__in=['SENT', 'ACKNOWLEDGED']).update(status='FULFILLED')
        self.message_user(request, f'{updated} purchase order(s) marked as Fulfilled.')
