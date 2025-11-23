from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.exceptions import ValidationError


class User(AbstractUser):
    """
    Custom User model extending AbstractUser with role-based access control.
    
    Roles define the authorization levels for different procurement functions:
    - staff: Can create purchase requests
    - approver_lvl1: Can approve requests up to level 1
    - approver_lvl2: Can approve requests up to level 2  
    - finance: Can manage purchase orders and receipts
    - admin: Full system access
    """
    
    ROLE_CHOICES = [
        ('staff', 'Staff'),
        ('approver_lvl1', 'Approver Level 1'),
        ('approver_lvl2', 'Approver Level 2'),
        ('finance', 'Finance'),
        ('admin', 'Admin'),
    ]
    
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='staff',
        help_text='User role determines access permissions in the system'
    )
    
    class Meta:
        db_table = 'users_user'
        indexes = [
            models.Index(fields=['role'], name='idx_user_role'),
            models.Index(fields=['email'], name='idx_user_email'),
        ]
    
    def clean(self):
        """
        Validate user data before saving.
        """
        super().clean()
        
        # Ensure email is provided and unique
        if not self.email:
            raise ValidationError({'email': 'Email address is required.'})
        
        # Validate role choice
        valid_roles = [choice[0] for choice in self.ROLE_CHOICES]
        if self.role not in valid_roles:
            raise ValidationError({
                'role': f'Invalid role. Must be one of: {", ".join(valid_roles)}'
            })
    
    def save(self, *args, **kwargs):
        """
        Override save to run full_clean validation.
        """
        self.full_clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        """
        String representation showing username and role.
        """
        return f"{self.username} ({self.get_role_display()})"
    

    
    @property
    def can_approve_level_1(self):
        """Check if user can approve level 1 requests."""
        return self.role in ['approver_lvl1', 'approver_lvl2', 'admin']
    
    @property
    def can_approve_level_2(self):
        """Check if user can approve level 2 requests."""
        return self.role in ['approver_lvl2', 'admin']
    
    @property
    def can_manage_finance(self):
        """Check if user can manage financial operations."""
        return self.role in ['finance', 'admin']
    
    @property
    def is_admin_user(self):
        """Check if user has admin privileges."""
        return self.role == 'admin' or self.is_superuser
