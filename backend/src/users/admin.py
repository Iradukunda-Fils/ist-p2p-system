from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils.html import format_html
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """
    Enhanced admin interface for the custom User model with advanced features.
    """
    
    # Fields to display in the user list
    list_display = (
        'username', 
        'email', 
        'first_name', 
        'last_name', 
        'role_badge',
        'approval_permissions',
        'is_active', 
        'is_staff',
        'date_joined'
    )
    list_filter = ('role', 'is_active', 'is_staff', 'is_superuser', 'date_joined')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('-date_joined',)
    list_per_page = 25
    
    # Custom actions
    actions = ['make_staff', 'make_approver_lvl1', 'make_approver_lvl2', 'make_finance', 'make_admin']
    
    # Add role field and permissions to the user form
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Role & Permissions', {
            'fields': ('role',),
            'description': 'User role determines access permissions in the procurement system.'
        }),
        ('Calculated Permissions (Read-only)', {
            'fields': ('display_can_approve_level_1', 'display_can_approve_level_2', 'display_can_manage_finance', 'display_is_admin_user'),
            'classes': ('collapse',),
        }),
    )
    
    # Add role field to the add user form
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Role Information', {
            'fields': ('role', 'email'),
        }),
    )
    
    # Make calculated permission fields readonly
    readonly_fields = (
        'display_can_approve_level_1', 
        'display_can_approve_level_2', 
        'display_can_manage_finance', 
        'display_is_admin_user'
    )
    
    # Custom display methods
    @admin.display(description='Role', ordering='role')
    def role_badge(self, obj):
        """Display role with colored badge."""
        colors = {
            'staff': '#6c757d',      # gray
            'approver_lvl1': '#0d6efd',  # blue
            'approver_lvl2': '#6610f2',  # indigo
            'finance': '#fd7e14',    # orange
            'admin': '#dc3545',      # red
        }
        color = colors.get(obj.role, '#6c757d')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px; font-weight: bold;">{}</span>',
            color,
            obj.get_role_display()
        )
    
    @admin.display(description='Approval Permissions')
    def approval_permissions(self, obj):
        """Display approval permissions badges."""
        badges = []
        if obj.can_approve_level_1:
            badges.append('<span style="background-color: #28a745; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px; margin-right: 3px;">L1</span>')
        if obj.can_approve_level_2:
            badges.append('<span style="background-color: #17a2b8; color: white; padding: 2px 6px; border-radius: 3px; font-size: 11px; margin-right: 3px;">L2</span>')
        if obj.can_manage_finance:
            badges.append('<span style="background-color: #ffc107; color: black; padding: 2px 6px; border-radius: 3px; font-size: 11px; margin-right: 3px;">FIN</span>')
        return format_html(''.join(badges)) if badges else '-'
    
    # Readonly field displays
    @admin.display(description='Can Approve Level 1', boolean=True)
    def display_can_approve_level_1(self, obj):
        return obj.can_approve_level_1
    
    @admin.display(description='Can Approve Level 2', boolean=True)
    def display_can_approve_level_2(self, obj):
        return obj.can_approve_level_2
    
    @admin.display(description='Can Manage Finance', boolean=True)
    def display_can_manage_finance(self, obj):
        return obj.can_manage_finance
    
    @admin.display(description='Is Admin User', boolean=True)
    def display_is_admin_user(self, obj):
        return obj.is_admin_user
    
    # Bulk actions for role assignment
    @admin.action(description='Set role to Staff')
    def make_staff(self, request, queryset):
        updated = queryset.update(role='staff')
        self.message_user(request, f'{updated} user(s) updated to Staff role.')
    
    @admin.action(description='Set role to Approver Level 1')
    def make_approver_lvl1(self, request, queryset):
        updated = queryset.update(role='approver_lvl1')
        self.message_user(request, f'{updated} user(s) updated to Approver Level 1 role.')
    
    @admin.action(description='Set role to Approver Level 2')
    def make_approver_lvl2(self, request, queryset):
        updated = queryset.update(role='approver_lvl2')
        self.message_user(request, f'{updated} user(s) updated to Approver Level 2 role.')
    
    @admin.action(description='Set role to Finance')
    def make_finance(self, request, queryset):
        updated = queryset.update(role='finance')
        self.message_user(request, f'{updated} user(s) updated to Finance role.')
    
    @admin.action(description='Set role to Admin')
    def make_admin(self, request, queryset):
        updated = queryset.update(role='admin')
        self.message_user(request, f'{updated} user(s) updated to Admin role.')
