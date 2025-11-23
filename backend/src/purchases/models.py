from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from decimal import Decimal
import uuid

User = get_user_model()


class PurchaseRequest(models.Model):
    """
    Model representing a purchase request in the procurement workflow.
    
    Supports multi-level approval workflow with optimistic locking to handle
    concurrent operations safely.
    """
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]
    
    # Core fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(
        max_length=255,
        help_text='Brief title describing the purchase request'
    )
    description = models.TextField(
        blank=True,
        help_text='Detailed description of the purchase request'
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        null=True,
        blank=True,
        help_text='Total amount for the purchase request'
    )
    status = models.CharField(
        max_length=16,
        choices=STATUS_CHOICES,
        default='PENDING',
        help_text='Current status of the purchase request'
    )
    
    # Relationships
    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='created_requests',    
        help_text='User who created this purchase request'
    )
    last_approved_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='approved_requests',
        null=True,
        blank=True,
        help_text='User who provided the final approval'
    )
    
    # Optimistic locking
    version = models.PositiveIntegerField(
        default=0,
        help_text='Version field for optimistic locking'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    approved_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Timestamp when request was fully approved'
    )
    
    # Optional proforma document reference
    proforma = models.ForeignKey(
        'documents.Document',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='purchase_requests',
        help_text='Associated proforma document'
    )
    
    class Meta:
        db_table = 'purchases_purchaserequest'
        indexes = [
            models.Index(fields=['status'], name='idx_pr_status'),
            models.Index(fields=['created_by'], name='idx_pr_created_by'),
            models.Index(fields=['amount'], name='idx_pr_amount'),
            models.Index(fields=['created_at'], name='idx_pr_created_at'),
            models.Index(fields=['status', 'created_at'], name='idx_pr_status_created'),
        ]
        ordering = ['-created_at']
    
    def clean(self):
        """
        Validate purchase request data before saving.
        """
        super().clean()
        
        # Validate title is not empty
        if not self.title or not self.title.strip():
            raise ValidationError({'title': 'Title cannot be empty.'})
        
        # Validate amount is positive
        if self.amount is not None and self.amount <= 0:
            raise ValidationError({'amount': 'Amount must be greater than zero.'})
        
        # Validate status transitions
        if self.pk:  # Only check for existing instances
            try:
                old_instance = PurchaseRequest.objects.get(pk=self.pk)
                if not self._is_valid_status_transition(old_instance.status, self.status):
                    raise ValidationError({
                        'status': f'Invalid status transition from {old_instance.status} to {self.status}'
                    })
            except PurchaseRequest.DoesNotExist:
                pass
    
    def save(self, *args, **kwargs):
        """
        Override save to run validation and handle version updates.
        """
        self.full_clean()
        
        # Auto-increment version on updates (not on creation)
        if self.pk and not kwargs.get('force_insert', False):
            self.version += 1
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        """
        String representation of the purchase request.
        """
        return f"{self.title} - {self.get_status_display()} (${self.amount})"
    
    @property
    def is_pending(self):
        """Check if request is in pending status."""
        return self.status == 'PENDING'
    
    @property
    def is_approved(self):
        """Check if request is approved."""
        return self.status == 'APPROVED'
    
    @property
    def is_rejected(self):
        """Check if request is rejected."""
        return self.status == 'REJECTED'
    
    @property
    def is_modifiable(self):
        """Check if request can be modified (only when pending)."""
        return self.status == 'PENDING'
    
    @property
    def calculated_total(self):
        """Calculate total from related RequestItem objects."""
        return self.items.aggregate(
            total=models.Sum(
                models.F('quantity') * models.F('unit_price'),
                output_field=models.DecimalField(max_digits=12, decimal_places=2)
            )
        )['total'] or Decimal('0.00')
    
    def _is_valid_status_transition(self, old_status, new_status):
        """
        Validate status transitions according to business rules.
        
        Valid transitions:
        - PENDING -> APPROVED
        - PENDING -> REJECTED
        - No transitions from APPROVED or REJECTED
        """
        if old_status == new_status:
            return True
        
        valid_transitions = {
            'PENDING': ['APPROVED', 'REJECTED'],
            'APPROVED': [],  # No transitions allowed from approved
            'REJECTED': [],  # No transitions allowed from rejected
        }
        
        return new_status in valid_transitions.get(old_status, [])
    
    def can_be_modified_by(self, user):
        """
        Check if the request can be modified by the given user.
        
        Rules:
        - Only creator can modify pending requests
        - No modifications allowed for approved/rejected requests
        - Admins can always modify
        """
        if user.is_admin_user:
            return True
        
        return self.is_pending and self.created_by == user
    
    def get_required_approval_levels(self):
        """
        Determine required approval levels based on amount.
        
        Business rules:
        - Amount <= $1000: Level 1 approval required
        - Amount > $1000: Level 1 and Level 2 approval required
        """
        levels = [1]  # Level 1 always required
        
        if self.amount > Decimal('1000.00'):
            levels.append(2)
        
        return levels
    
    def get_pending_approval_levels(self):
        """Get list of approval levels still pending."""
        required_levels = self.get_required_approval_levels()
        approved_levels = list(
            self.approvals.filter(decision='APPROVED').values_list('level', flat=True)
        )
        
        return [level for level in required_levels if level not in approved_levels]
    
    def is_fully_approved(self):
        """Check if all required approval levels are satisfied."""
        return len(self.get_pending_approval_levels()) == 0
    
    def has_rejection(self):
        """Check if any approval level has been rejected."""
        return self.approvals.filter(decision='REJECTED').exists()


class RequestItem(models.Model):
    """
    Model representing individual line items within a purchase request.
    
    Each purchase request can have multiple items with quantities and pricing.
    """
    
    # Relationships
    request = models.ForeignKey(
        PurchaseRequest,
        on_delete=models.CASCADE,
        related_name='items',
        help_text='Purchase request this item belongs to'
    )
    
    # Item details
    name = models.CharField(
        max_length=255,
        help_text='Name or description of the item'
    )
    quantity = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text='Quantity of items requested'
    )
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text='Price per unit'
    )
    
    # Optional fields
    description = models.TextField(
        blank=True,
        help_text='Additional description or specifications'
    )
    unit_of_measure = models.CharField(
        max_length=50,
        blank=True,
        help_text='Unit of measure (e.g., pieces, kg, hours)'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'purchases_requestitem'
        indexes = [
            models.Index(fields=['request'], name='idx_request_item_request'),
            models.Index(fields=['name'], name='idx_request_item_name'),
        ]
        ordering = ['id']
    
    def clean(self):
        """
        Validate request item data before saving.
        """
        super().clean()
        
        # Validate name is not empty
        if not self.name or not self.name.strip():
            raise ValidationError({'name': 'Item name cannot be empty.'})
        
        # Validate quantity is positive
        if self.quantity is not None and self.quantity <= 0:
            raise ValidationError({'quantity': 'Quantity must be greater than zero.'})
        
        # Validate unit price is positive
        if self.unit_price is not None and self.unit_price <= 0:
            raise ValidationError({'unit_price': 'Unit price must be greater than zero.'})
        
        # Validate that parent request is modifiable (if it exists)
        if self.request_id and hasattr(self.request, 'is_modifiable'):
            if not self.request.is_modifiable:
                raise ValidationError({
                    '__all__': 'Cannot modify items for non-pending purchase requests.'
                })
    
    def save(self, *args, **kwargs):
        """
        Override save to run validation.
        """
        self.full_clean()
        super().save(*args, **kwargs)
        
        # Update parent request's amount if needed
        if self.request_id:
            self._update_parent_amount()
    
    def delete(self, *args, **kwargs):
        """
        Override delete to update parent amount.
        """
        request_id = self.request_id
        super().delete(*args, **kwargs)
        
        # Update parent request's amount after deletion
        if request_id:
            try:
                request = PurchaseRequest.objects.get(pk=request_id)
                request.amount = request.calculated_total
                request.save()
            except PurchaseRequest.DoesNotExist:
                pass
    
    def __str__(self):
        """
        String representation of the request item.
        """
        return f"{self.name} (Qty: {self.quantity}, Price: ${self.unit_price})"
    
    @property
    def line_total(self):
        """Calculate total for this line item."""
        return self.quantity * self.unit_price
    
    def _update_parent_amount(self):
        """
        Update the parent request's total amount based on all items.
        """
        try:
            # Recalculate total from all items
            new_total = self.request.calculated_total
            
            # Only update if the total has changed
            if self.request.amount != new_total:
                # Use update to avoid triggering save() validation loops
                PurchaseRequest.objects.filter(pk=self.request.pk).update(
                    amount=new_total,
                    updated_at=models.functions.Now()
                )
        except Exception:
            # Silently fail to avoid breaking the save operation
            # The amount can be recalculated later if needed
            pass


class Approval(models.Model):
    """
    Model for tracking approval decisions in the multi-level approval workflow.
    
    Each approval represents a decision at a specific level for a purchase request.
    Unique constraint ensures only one approval per request per level.
    """
    
    DECISION_CHOICES = [
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]
    
    LEVEL_CHOICES = [
        (1, 'Level 1'),
        (2, 'Level 2'),
    ]
    
    # Relationships
    request = models.ForeignKey(
        PurchaseRequest,
        on_delete=models.CASCADE,
        related_name='approvals',
        help_text='Purchase request being approved'
    )
    approver = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='approvals_given',
        help_text='User who made the approval decision'
    )
    
    # Approval details
    level = models.PositiveSmallIntegerField(
        choices=LEVEL_CHOICES,
        help_text='Approval level (1 or 2)'
    )
    decision = models.CharField(
        max_length=16,
        choices=DECISION_CHOICES,
        help_text='Approval decision'
    )
    comment = models.TextField(
        blank=True,
        help_text='Optional comment explaining the decision'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'purchases_approval'
        constraints = [
            models.UniqueConstraint(
                fields=['request', 'level'],
                name='unique_approval_per_request_level'
            )
        ]
        indexes = [
            models.Index(fields=['request'], name='idx_approval_request'),
            models.Index(fields=['approver'], name='idx_approval_approver'),
            models.Index(fields=['level'], name='idx_approval_level'),
            models.Index(fields=['decision'], name='idx_approval_decision'),
            models.Index(fields=['created_at'], name='idx_approval_created_at'),
        ]
        ordering = ['level', 'created_at']
    
    def clean(self):
        """
        Validate approval data before saving.
        """
        super().clean()
        
        # Validate approver has permission for the level
        if self.approver and self.level:
            if not self._approver_can_approve_level():
                raise ValidationError({
                    'approver': f'User {self.approver.username} cannot approve at level {self.level}'
                })
        
        # Validate request is in pending status
        if self.request and not self.request.is_pending:
            raise ValidationError({
                'request': 'Cannot approve non-pending requests'
            })
        
        # Validate level is required for the request amount
        if self.request and self.level:
            required_levels = self.request.get_required_approval_levels()
            if self.level not in required_levels:
                raise ValidationError({
                    'level': f'Level {self.level} approval not required for this request amount'
                })
        
        # Validate no existing rejection at any level
        if self.request and self.decision == 'APPROVED':
            if self.request.has_rejection():
                raise ValidationError({
                    'decision': 'Cannot approve request that has been rejected at any level'
                })
    
    def save(self, *args, **kwargs):
        """
        Override save to run validation and handle workflow logic.
        """
        self.full_clean()
        super().save(*args, **kwargs)
        
        # Update parent request status if needed
        self._update_request_status()
    
    def __str__(self):
        """
        String representation of the approval.
        """
        return f"Level {self.level} {self.decision} by {self.approver.username}"
    
    def _approver_can_approve_level(self):
        """
        Check if the approver has permission for the specified level.
        """
        if self.level == 1:
            return self.approver.can_approve_level_1
        elif self.level == 2:
            return self.approver.can_approve_level_2
        return False
    
    def _update_request_status(self):
        """
        Update the parent request status based on approval workflow rules.
        
        Rules:
        - If any level is rejected, set request to REJECTED
        - If all required levels are approved, set request to APPROVED
        - Otherwise, keep as PENDING
        """
        try:
            # Check for any rejections
            if self.decision == 'REJECTED' or self.request.has_rejection():
                self.request.status = 'REJECTED'
                self.request.save()
                return
            
            # Check if all required approvals are complete
            if self.decision == 'APPROVED' and self.request.is_fully_approved():
                from django.utils import timezone
                self.request.status = 'APPROVED'
                self.request.last_approved_by = self.approver
                self.request.approved_at = timezone.now()
                self.request.save()
                
                # Trigger PO generation
                try:
                    from purchases.tasks import generate_purchase_order
                    generate_purchase_order.delay(str(self.request.id))
                except ImportError:
                    # Celery tasks not available, skip PO generation
                    pass
        
        except Exception:
            # Silently fail to avoid breaking the approval save
            # Status can be updated later if needed
            pass


import uuid
from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator


class PurchaseOrder(models.Model):
    """
    Model representing generated purchase orders from approved requests.

    Contains structured data compiled from purchase requests and proforma metadata.
    Includes unique PO number generation and JSON field for flexible data storage.
    """

    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('SENT', 'Sent to Vendor'),
        ('ACKNOWLEDGED', 'Acknowledged by Vendor'),
        ('FULFILLED', 'Fulfilled'),
        ('CANCELLED', 'Cancelled'),
    ]

    # Core fields
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    po_number = models.CharField(
        max_length=50,
        unique=True,
        help_text='Unique purchase order number'
    )

    # Relationships
    request = models.OneToOneField(
        'PurchaseRequest',
        on_delete=models.PROTECT,
        related_name='purchase_order',
        help_text='Original purchase request'
    )

    # Vendor information
    vendor = models.CharField(
        max_length=255,
        help_text='Vendor name extracted from proforma or manually entered'
    )
    vendor_contact = models.TextField(
        blank=True,
        help_text='Vendor contact information'
    )

    # Financial details
    total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )

    # Status + timestamps
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='DRAFT'
    )

    created_at = models.DateTimeField(auto_now_add=True)

    # Flexible JSON metadata for line items, vendor info, etc.
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Additional structured data for PO'
    )

    class Meta:
        indexes = [
            models.Index(fields=['po_number'], name='idx_po_number'),
            models.Index(fields=['vendor'], name='idx_po_vendor'),
            models.Index(fields=['status'], name='idx_po_status'),
            models.Index(fields=['created_at'], name='idx_po_created_at'),
            models.Index(fields=['total'], name='idx_po_total'),
        ]
        ordering = ['-created_at']


    def clean(self):
        """
        Validate purchase order data before saving.
        """
        super().clean()
        
        # Validate vendor name is not empty
        if not self.vendor or not self.vendor.strip():
            raise ValidationError({'vendor': 'Vendor name cannot be empty.'})
        
        # Validate total is positive
        if self.total is not None and self.total <= 0:
            raise ValidationError({'total': 'Total must be greater than zero.'})
        
        # Validate currency code format
        if self.currency and len(self.currency) != 3:
            raise ValidationError({'currency': 'Currency must be a 3-letter ISO code.'})
        
        # Validate PO number format if provided
        if self.po_number and not self._is_valid_po_number_format():
            raise ValidationError({
                'po_number': 'PO number must follow the format PO-YYYYNNNNNNXXX'
            })
    
    def save(self, *args, **kwargs):
        """
        Override save to generate PO number and run validation.
        """
        # Generate PO number if not provided
        if not self.po_number:
            self.po_number = self._generate_po_number()
        
        self.full_clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        """
        String representation of the purchase order.
        """
        return f"{self.po_number} - {self.vendor} (${self.total})"
    
    @classmethod
    def _generate_po_number(cls):
        """
        Generate a unique PO number with format: PO-YYYYNNNNNNXXX
        Where:
        - YYYY = Current year
        - NNNNNN = Sequential number (6 digits)
        - XXX = Random suffix for uniqueness (3 digits)
        """
        from datetime import datetime
        import random
        
        current_year = datetime.now().year
        
        # Get the highest existing PO number for this year
        year_prefix = f"PO-{current_year}"
        existing_pos = cls.objects.filter(
            po_number__startswith=year_prefix
        ).order_by('-po_number').first()
        
        if existing_pos:
            try:
                # Extract the sequential part (positions 8-13)
                existing_seq = int(existing_pos.po_number[8:14])
                next_seq = existing_seq + 1
            except (ValueError, IndexError):
                next_seq = 1
        else:
            next_seq = 1
        
        # Generate random suffix for additional uniqueness
        random_suffix = random.randint(100, 999)
        
        # Format: PO-YYYYNNNNNNXXX
        po_number = f"PO-{current_year}{next_seq:06d}{random_suffix}"
        
        # Ensure uniqueness (retry if collision occurs)
        max_retries = 10
        retry_count = 0
        
        while cls.objects.filter(po_number=po_number).exists() and retry_count < max_retries:
            random_suffix = random.randint(100, 999)
            po_number = f"PO-{current_year}{next_seq:06d}{random_suffix}"
            retry_count += 1
        
        if retry_count >= max_retries:
            raise ValidationError("Unable to generate unique PO number after multiple attempts")
        
        return po_number
    
    def _is_valid_po_number_format(self):
        """
        Validate PO number format: PO-YYYYNNNNNNXXX
        """
        import re
        pattern = r'^PO-\d{4}\d{6}\d{3}$'
        return bool(re.match(pattern, self.po_number))
    
    @property
    def is_draft(self):
        """Check if PO is in draft status."""
        return self.status == 'DRAFT'
    
    @property
    def is_sent(self):
        """Check if PO has been sent to vendor."""
        return self.status in ['SENT', 'ACKNOWLEDGED', 'FULFILLED']
    
    @property
    def is_fulfilled(self):
        """Check if PO has been fulfilled."""
        return self.status == 'FULFILLED'
    
    def get_items_from_data(self):
        """
        Extract items list from the JSON data field.
        
        Returns a list of item dictionaries with standardized structure.
        """
        items = self.data.get('items', [])
        
        # Ensure each item has required fields
        standardized_items = []
        for item in items:
            standardized_item = {
                'name': item.get('name', ''),
                'quantity': item.get('quantity', 0),
                'unit_price': item.get('unit_price', 0),
                'line_total': item.get('line_total', 0),
                'description': item.get('description', ''),
                'unit_of_measure': item.get('unit_of_measure', ''),
            }
            standardized_items.append(standardized_item)
        
        return standardized_items
    
    def update_from_request_data(self):
        """
        Update PO data from the associated purchase request and proforma metadata.
        
        This method compiles data from:
        - Purchase request items
        - Proforma document metadata (if available)
        - Request details
        """
        if not self.request:
            return
        
        # Compile items from request
        items_data = []
        for item in self.request.items.all():
            item_data = {
                'name': item.name,
                'quantity': item.quantity,
                'unit_price': float(item.unit_price),
                'line_total': float(item.line_total),
                'description': item.description,
                'unit_of_measure': item.unit_of_measure,
            }
            items_data.append(item_data)
        
        # Extract proforma metadata if available
        proforma_data = {}
        if self.request.proforma and self.request.proforma.metadata:
            proforma_data = self.request.proforma.metadata
        
        # Compile structured PO data
        self.data = {
            'items': items_data,
            'request_details': {
                'title': self.request.title,
                'description': self.request.description,
                'created_by': self.request.created_by.username,
                'created_at': self.request.created_at.isoformat(),
            },
            'proforma_metadata': proforma_data,
            'terms': proforma_data.get('terms', {}),
            'delivery_info': proforma_data.get('delivery', {}),
            'payment_terms': proforma_data.get('payment_terms', ''),
        }
        
        # Update vendor information from proforma if available
        if proforma_data.get('vendor'):
            self.vendor = proforma_data['vendor'].get('name', self.vendor)
            self.vendor_contact = proforma_data['vendor'].get('contact', self.vendor_contact)
        
        # Update total to match request amount
        self.total = self.request.amount