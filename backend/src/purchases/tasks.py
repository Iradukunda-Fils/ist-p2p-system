"""
Celery tasks for purchase order generation and management in the P2P system.

This module contains tasks for:
- Generating purchase orders from approved requests
- Creating PO PDFs
- Receipt validation against purchase orders
- Notification tasks
"""

import os
import json
import logging
import random
from typing import Dict, Any, Optional, List
from decimal import Decimal
from datetime import datetime

from celery import shared_task
from django.conf import settings
from django.utils import timezone
from django.db import transaction
from django.core.exceptions import ValidationError

logger = logging.getLogger(__name__)


class POGenerationError(Exception):
    """Custom exception for PO generation errors."""
    pass


class ReceiptValidationError(Exception):
    """Custom exception for receipt validation errors."""
    pass


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def generate_purchase_order(self, request_id: str) -> Dict[str, Any]:
    """
    Generate a purchase order from an approved purchase request.
    
    This task:
    1. Creates a unique PO number
    2. Compiles data from request and proforma metadata
    3. Creates PurchaseOrder record
    4. Optionally triggers PDF generation
    
    Args:
        request_id: UUID of the approved purchase request
        
    Returns:
        Dict containing PO generation results
    """
    try:
        from purchases.models import PurchaseRequest, PurchaseOrder
        
        # Get the purchase request
        try:
            pr = PurchaseRequest.objects.select_related('created_by', 'proforma').get(id=request_id)
        except PurchaseRequest.DoesNotExist:
            logger.error(f"Purchase request {request_id} not found")
            return {'error': 'Purchase request not found'}
        
        # Validate request is approved
        if not pr.is_approved:
            logger.error(f"Purchase request {request_id} is not approved (status: {pr.status})")
            return {'error': 'Purchase request is not approved'}
        
        # Check if PO already exists
        if hasattr(pr, 'purchase_order') and pr.purchase_order:
            logger.info(f"PO already exists for request {request_id}: {pr.purchase_order.po_number}")
            return {
                'request_id': request_id,
                'po_id': str(pr.purchase_order.id),
                'po_number': pr.purchase_order.po_number,
                'status': 'already_exists'
            }
        
        logger.info(f"Starting PO generation for request {request_id}")
        
        # Use database transaction for atomicity
        with transaction.atomic():
            # Generate unique PO number
            po_number = _generate_unique_po_number()
            
            # Extract vendor information from proforma or use default
            vendor_info = _extract_vendor_from_proforma(pr.proforma)
            
            # Create purchase order
            po = PurchaseOrder.objects.create(
                po_number=po_number,
                request=pr,
                vendor=vendor_info.get('name', 'Unknown Vendor'),
                vendor_contact=vendor_info.get('contact', ''),
                total=pr.amount,
                status='DRAFT'
            )
            
            # Update PO with compiled data
            po.update_from_request_data()
            po.save()
            
            logger.info(f"Successfully created PO {po_number} for request {request_id}")
            
            # Optionally trigger PDF generation
            if getattr(settings, 'PO_AUTO_GENERATE_PDF', True):
                generate_po_pdf.delay(str(po.id))
            
            return {
                'request_id': request_id,
                'po_id': str(po.id),
                'po_number': po_number,
                'vendor': po.vendor,
                'total': float(po.total),
                'status': 'created'
            }
            
    except Exception as exc:
        logger.error(f"PO generation failed for request {request_id}: {exc}")
        
        # Retry with exponential backoff
        if self.request.retries < self.max_retries:
            countdown = 60 * (2 ** self.request.retries)
            logger.info(f"Retrying PO generation for {request_id} in {countdown} seconds")
            raise self.retry(countdown=countdown, exc=exc)
        
        return {'error': str(exc), 'request_id': request_id}


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def generate_po_pdf(self, po_id: str) -> Dict[str, Any]:
    """
    Generate PDF document for a purchase order.
    
    Args:
        po_id: UUID of the purchase order
        
    Returns:
        Dict containing PDF generation results
    """
    try:
        from purchases.models import PurchaseOrder
        from documents.models import Document
        
        # Get the purchase order
        try:
            po = PurchaseOrder.objects.select_related('request__created_by').get(id=po_id)
        except PurchaseOrder.DoesNotExist:
            logger.error(f"Purchase order {po_id} not found")
            return {'error': 'Purchase order not found'}
        
        logger.info(f"Starting PDF generation for PO {po.po_number}")
        
        # Generate PDF content
        pdf_content = _generate_po_pdf_content(po)
        
        # Create document record
        from django.core.files.base import ContentFile
        
        pdf_filename = f"{po.po_number}.pdf"
        pdf_file = ContentFile(pdf_content, name=pdf_filename)
        
        # Create Document instance
        document = Document.objects.create(
            file=pdf_file,
            original_filename=pdf_filename,
            file_size=len(pdf_content),
            doc_type='PO',
            title=f"Purchase Order {po.po_number}",
            uploaded_by=po.request.created_by,
            processing_status='SKIPPED'  # No need to process generated PDFs
        )
        
        # Link document to PO
        po.pdf_document = document
        po.save(update_fields=['pdf_document', 'updated_at'])
        
        logger.info(f"Successfully generated PDF for PO {po.po_number}")
        
        return {
            'po_id': po_id,
            'po_number': po.po_number,
            'document_id': str(document.id),
            'pdf_url': document.get_file_url(),
            'status': 'generated'
        }
        
    except Exception as exc:
        logger.error(f"PDF generation failed for PO {po_id}: {exc}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=30, exc=exc)
        
        return {'error': str(exc), 'po_id': po_id}


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def validate_receipt_against_po(self, receipt_doc_id: str, po_id: str) -> Dict[str, Any]:
    """
    Validate a receipt document against a purchase order.
    
    This task:
    1. Extracts data from the receipt document
    2. Compares it against the purchase order
    3. Calculates match scores and identifies discrepancies
    4. Stores validation results
    
    Args:
        receipt_doc_id: UUID of the receipt document
        po_id: UUID of the purchase order to validate against
        
    Returns:
        Dict containing validation results
    """
    try:
        from documents.models import Document
        from purchases.models import PurchaseOrder
        
        # Get receipt document and PO
        try:
            receipt = Document.objects.get(id=receipt_doc_id)
            po = PurchaseOrder.objects.get(id=po_id)
        except (Document.DoesNotExist, PurchaseOrder.DoesNotExist) as e:
            logger.error(f"Document or PO not found: {e}")
            return {'error': str(e)}
        
        # Ensure receipt has been processed
        if not receipt.is_processed:
            logger.info(f"Receipt {receipt_doc_id} not yet processed, triggering processing")
            from documents.tasks import extract_document_metadata
            extract_document_metadata.delay(receipt_doc_id)
            
            # Retry this task after processing
            raise self.retry(countdown=30, exc=Exception("Receipt processing in progress"))
        
        logger.info(f"Starting receipt validation for {receipt_doc_id} against PO {po.po_number}")
        
        # Extract receipt data
        receipt_data = _extract_receipt_data(receipt)
        
        # Extract PO data for comparison
        po_data = _extract_po_data(po)
        
        # Perform validation comparisons
        validation_result = _perform_receipt_validation(receipt_data, po_data)
        
        # Store validation results in receipt metadata
        if not receipt.metadata:
            receipt.metadata = {}
        
        receipt.metadata['validation'] = {
            'po_number': po.po_number,
            'validation_date': timezone.now().isoformat(),
            'results': validation_result,
            'validated_against': str(po_id)
        }
        receipt.save(update_fields=['metadata', 'updated_at'])
        
        # Check if manual review is needed
        needs_review = validation_result['overall_score'] < getattr(settings, 'RECEIPT_VALIDATION_THRESHOLD', 0.8)
        
        if needs_review:
            logger.warning(f"Receipt validation score below threshold: {validation_result['overall_score']}")
            notify_finance_team.delay(po_id, validation_result)
        
        logger.info(f"Receipt validation completed with score: {validation_result['overall_score']}")
        
        return {
            'receipt_id': receipt_doc_id,
            'po_id': po_id,
            'po_number': po.po_number,
            'validation_score': validation_result['overall_score'],
            'needs_review': needs_review,
            'discrepancies': validation_result.get('discrepancies', []),
            'status': 'completed'
        }
        
    except Exception as exc:
        logger.error(f"Receipt validation failed: {exc}")
        
        if self.request.retries < self.max_retries:
            countdown = 60 * (2 ** self.request.retries)
            raise self.retry(countdown=countdown, exc=exc)
        
        return {'error': str(exc), 'receipt_id': receipt_doc_id, 'po_id': po_id}


@shared_task(bind=True, max_retries=2)
def notify_finance_team(self, po_id: str, validation_result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Notify finance team of receipt validation issues.
    
    Args:
        po_id: UUID of the purchase order
        validation_result: Results from receipt validation
        
    Returns:
        Dict containing notification results
    """
    try:
        from purchases.models import PurchaseOrder
        from django.contrib.auth import get_user_model
        
        User = get_user_model()
        
        # Get PO details
        try:
            po = PurchaseOrder.objects.select_related('request__created_by').get(id=po_id)
        except PurchaseOrder.DoesNotExist:
            return {'error': 'Purchase order not found'}
        
        # Get finance team users
        finance_users = User.objects.filter(role='finance')
        
        if not finance_users.exists():
            logger.warning("No finance team users found for notification")
            return {'warning': 'No finance team users to notify'}
        
        # Prepare notification data
        notification_data = {
            'po_number': po.po_number,
            'vendor': po.vendor,
            'total': float(po.total),
            'validation_score': validation_result.get('overall_score', 0),
            'discrepancies': validation_result.get('discrepancies', []),
            'requires_review': True
        }
        
        # In a real implementation, this would send emails or create notifications
        # For now, we'll log the notification
        logger.info(f"Finance team notification for PO {po.po_number}: {notification_data}")
        
        # Here you would integrate with your notification system:
        # - Send emails using Django's email backend
        # - Create in-app notifications
        # - Send to Slack/Teams
        # - Create tickets in issue tracking system
        
        return {
            'po_id': po_id,
            'po_number': po.po_number,
            'notified_users': list(finance_users.values_list('username', flat=True)),
            'notification_data': notification_data,
            'status': 'sent'
        }
        
    except Exception as exc:
        logger.error(f"Finance team notification failed: {exc}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=30, exc=exc)
        
        return {'error': str(exc), 'po_id': po_id}


# Helper functions for PO generation and validation

def _generate_unique_po_number() -> str:
    """
    Generate a unique PO number with format: PO-YYYYNNNNNNXXX
    """
    from purchases.models import PurchaseOrder
    
    current_year = datetime.now().year
    
    # Get the highest existing PO number for this year
    year_prefix = f"PO-{current_year}"
    existing_pos = PurchaseOrder.objects.filter(
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
    
    while PurchaseOrder.objects.filter(po_number=po_number).exists() and retry_count < max_retries:
        random_suffix = random.randint(100, 999)
        po_number = f"PO-{current_year}{next_seq:06d}{random_suffix}"
        retry_count += 1
    
    if retry_count >= max_retries:
        raise POGenerationError("Unable to generate unique PO number after multiple attempts")
    
    return po_number


def _extract_vendor_from_proforma(proforma_doc) -> Dict[str, str]:
    """
    Extract vendor information from proforma document metadata.
    
    Args:
        proforma_doc: Document instance or None
        
    Returns:
        Dict containing vendor information
    """
    vendor_info = {'name': 'Unknown Vendor', 'contact': ''}
    
    if not proforma_doc or not proforma_doc.metadata:
        return vendor_info
    
    # Extract vendor data from metadata
    vendor_data = proforma_doc.metadata.get('vendor', {})
    
    if isinstance(vendor_data, dict):
        vendor_info['name'] = vendor_data.get('name', 'Unknown Vendor')
        
        # Compile contact information
        contact_parts = []
        if vendor_data.get('email'):
            contact_parts.append(f"Email: {vendor_data['email']}")
        if vendor_data.get('phone'):
            contact_parts.append(f"Phone: {vendor_data['phone']}")
        if vendor_data.get('address'):
            contact_parts.append(f"Address: {vendor_data['address']}")
        
        vendor_info['contact'] = '\n'.join(contact_parts)
    
    return vendor_info


def _generate_po_pdf_content(po) -> bytes:
    """
    Generate PDF content for a purchase order.
    
    Args:
        po: PurchaseOrder instance
        
    Returns:
        PDF content as bytes
    """
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.lib import colors
        from io import BytesIO
        
        # Create PDF buffer
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=1*inch)
        
        # Get styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            spaceAfter=30,
            alignment=1  # Center alignment
        )
        
        # Build PDF content
        story = []
        
        # Title
        story.append(Paragraph(f"Purchase Order {po.po_number}", title_style))
        story.append(Spacer(1, 20))
        
        # PO Details
        po_details = [
            ['PO Number:', po.po_number],
            ['Date:', po.created_at.strftime('%Y-%m-%d')],
            ['Vendor:', po.vendor],
            ['Total Amount:', f"${po.total:,.2f}"],
            ['Status:', po.get_status_display()],
        ]
        
        details_table = Table(po_details, colWidths=[2*inch, 4*inch])
        details_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        story.append(details_table)
        story.append(Spacer(1, 30))
        
        # Items table
        if po.data.get('items'):
            story.append(Paragraph("Items:", styles['Heading2']))
            story.append(Spacer(1, 10))
            
            # Table headers
            items_data = [['Description', 'Quantity', 'Unit Price', 'Total']]
            
            # Add items
            for item in po.data['items']:
                items_data.append([
                    item.get('name', ''),
                    str(item.get('quantity', 0)),
                    f"${item.get('unit_price', 0):.2f}",
                    f"${item.get('line_total', 0):.2f}"
                ])
            
            items_table = Table(items_data, colWidths=[3*inch, 1*inch, 1.5*inch, 1.5*inch])
            items_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(items_table)
        
        # Build PDF
        doc.build(story)
        
        # Get PDF content
        pdf_content = buffer.getvalue()
        buffer.close()
        
        return pdf_content
        
    except ImportError:
        # Fallback if reportlab is not available
        logger.warning("reportlab not available, generating simple PDF placeholder")
        return _generate_simple_pdf_placeholder(po)


def _generate_simple_pdf_placeholder(po) -> bytes:
    """
    Generate a simple text-based PDF placeholder when reportlab is not available.
    """
    content = f"""
Purchase Order: {po.po_number}
Date: {po.created_at.strftime('%Y-%m-%d')}
Vendor: {po.vendor}
Total: ${po.total:,.2f}

This is a placeholder PDF. Install reportlab for full PDF generation.
"""
    return content.encode('utf-8')


def _extract_receipt_data(receipt_doc) -> Dict[str, Any]:
    """
    Extract structured data from receipt document for validation.
    
    Args:
        receipt_doc: Document instance
        
    Returns:
        Dict containing receipt data
    """
    receipt_data = {
        'vendor': {'name': ''},
        'items': [],
        'totals': {'total': 0},
        'transaction': {},
        'payment': {}
    }
    
    if not receipt_doc.metadata:
        return receipt_data
    
    metadata = receipt_doc.metadata
    
    # Extract vendor information
    if metadata.get('vendor'):
        receipt_data['vendor'] = metadata['vendor']
    
    # Extract items
    if metadata.get('items'):
        receipt_data['items'] = metadata['items']
    
    # Extract totals
    if metadata.get('totals'):
        receipt_data['totals'] = metadata['totals']
    
    # Extract transaction details
    if metadata.get('transaction'):
        receipt_data['transaction'] = metadata['transaction']
    
    # Extract payment information
    if metadata.get('payment'):
        receipt_data['payment'] = metadata['payment']
    
    return receipt_data


def _extract_po_data(po) -> Dict[str, Any]:
    """
    Extract structured data from purchase order for validation.
    
    Args:
        po: PurchaseOrder instance
        
    Returns:
        Dict containing PO data
    """
    po_data = {
        'vendor': {'name': po.vendor},
        'items': po.get_items_from_data(),
        'totals': {'total': float(po.total)},
        'po_number': po.po_number
    }
    
    return po_data


def _perform_receipt_validation(receipt_data: Dict[str, Any], po_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Perform comprehensive validation comparison between receipt and PO data.
    
    This function implements requirements 6.2, 6.3, and 6.4:
    - Compares receipt against purchase order data
    - Calculates match scores for vendor, items, and totals
    - Identifies discrepancies and flags for manual review
    
    Args:
        receipt_data: Extracted receipt data
        po_data: Extracted PO data
        
    Returns:
        Dict containing detailed validation results
    """
    validation_result = {
        'vendor_match': 0.0,
        'total_match': 0.0,
        'items_match': 0.0,
        'date_match': 0.0,
        'overall_score': 0.0,
        'discrepancies': [],
        'validation_details': {},
        'flags': [],
        'confidence_level': 'HIGH'
    }
    
    # 1. Validate vendor information
    vendor_comparison = _compare_vendors_detailed(
        receipt_data.get('vendor', {}),
        po_data.get('vendor', {})
    )
    validation_result['vendor_match'] = vendor_comparison['score']
    validation_result['validation_details']['vendor'] = vendor_comparison
    
    if vendor_comparison['score'] < 0.8:
        discrepancy = {
            'type': 'vendor_mismatch',
            'severity': 'HIGH' if vendor_comparison['score'] < 0.5 else 'MEDIUM',
            'receipt_vendor': receipt_data.get('vendor', {}).get('name', ''),
            'po_vendor': po_data.get('vendor', {}).get('name', ''),
            'score': vendor_comparison['score'],
            'details': vendor_comparison.get('details', ''),
            'suggested_action': 'Verify vendor identity and contact information'
        }
        validation_result['discrepancies'].append(discrepancy)
        
        if vendor_comparison['score'] < 0.5:
            validation_result['flags'].append('VENDOR_MAJOR_MISMATCH')
    
    # 2. Validate total amounts
    total_comparison = _compare_totals_detailed(
        receipt_data.get('totals', {}),
        po_data.get('totals', {})
    )
    validation_result['total_match'] = total_comparison['score']
    validation_result['validation_details']['totals'] = total_comparison
    
    if total_comparison['score'] < 0.9:
        discrepancy = {
            'type': 'total_mismatch',
            'severity': 'HIGH' if total_comparison['score'] < 0.7 else 'MEDIUM',
            'receipt_total': receipt_data.get('totals', {}).get('total', 0),
            'po_total': po_data.get('totals', {}).get('total', 0),
            'difference': total_comparison.get('difference', 0),
            'percentage_diff': total_comparison.get('percentage_diff', 0),
            'score': total_comparison['score'],
            'suggested_action': 'Review pricing and tax calculations'
        }
        validation_result['discrepancies'].append(discrepancy)
        
        if total_comparison['score'] < 0.7:
            validation_result['flags'].append('AMOUNT_MAJOR_DISCREPANCY')
    
    # 3. Validate line items
    items_comparison = _compare_items_detailed(
        receipt_data.get('items', []),
        po_data.get('items', [])
    )
    validation_result['items_match'] = items_comparison['score']
    validation_result['validation_details']['items'] = items_comparison
    
    if items_comparison['score'] < 0.7:
        discrepancy = {
            'type': 'items_mismatch',
            'severity': 'MEDIUM' if items_comparison['score'] > 0.4 else 'HIGH',
            'score': items_comparison['score'],
            'matched_items': items_comparison.get('matched_count', 0),
            'total_items': items_comparison.get('total_items', 0),
            'missing_items': items_comparison.get('missing_items', []),
            'extra_items': items_comparison.get('extra_items', []),
            'suggested_action': 'Verify item quantities and descriptions'
        }
        validation_result['discrepancies'].append(discrepancy)
        
        if items_comparison['score'] < 0.4:
            validation_result['flags'].append('ITEMS_MAJOR_MISMATCH')
    
    # 4. Validate dates (if available)
    date_comparison = _compare_dates(
        receipt_data.get('transaction', {}),
        po_data
    )
    validation_result['date_match'] = date_comparison['score']
    validation_result['validation_details']['dates'] = date_comparison
    
    if date_comparison['score'] < 0.5:
        validation_result['discrepancies'].append({
            'type': 'date_mismatch',
            'severity': 'LOW',
            'score': date_comparison['score'],
            'details': date_comparison.get('details', ''),
            'suggested_action': 'Verify transaction timing'
        })
    
    # 5. Calculate overall score with weighted components
    weights = {
        'vendor': 0.25,
        'total': 0.40,
        'items': 0.30,
        'date': 0.05
    }
    
    validation_result['overall_score'] = (
        validation_result['vendor_match'] * weights['vendor'] +
        validation_result['total_match'] * weights['total'] +
        validation_result['items_match'] * weights['items'] +
        validation_result['date_match'] * weights['date']
    )
    
    # 6. Determine confidence level and additional flags
    validation_result['confidence_level'] = _determine_confidence_level(validation_result)
    
    # Add summary flags based on overall assessment
    if validation_result['overall_score'] < 0.6:
        validation_result['flags'].append('REQUIRES_MANUAL_REVIEW')
    
    if len(validation_result['discrepancies']) >= 3:
        validation_result['flags'].append('MULTIPLE_DISCREPANCIES')
    
    # Check for potential fraud indicators
    fraud_indicators = _check_fraud_indicators(receipt_data, po_data, validation_result)
    if fraud_indicators:
        validation_result['flags'].extend(fraud_indicators)
        validation_result['confidence_level'] = 'LOW'
    
    return validation_result


def _compare_vendors(receipt_vendor: Dict[str, Any], po_vendor: Dict[str, Any]) -> float:
    """
    Compare vendor information between receipt and PO.
    
    Returns:
        Float score between 0.0 and 1.0
    """
    receipt_name = receipt_vendor.get('name', '').lower().strip()
    po_name = po_vendor.get('name', '').lower().strip()
    
    if not receipt_name or not po_name:
        return 0.0
    
    # Simple string similarity check
    if receipt_name == po_name:
        return 1.0
    
    # Check if one name contains the other
    if receipt_name in po_name or po_name in receipt_name:
        return 0.8
    
    # Check for common words
    receipt_words = set(receipt_name.split())
    po_words = set(po_name.split())
    
    if receipt_words & po_words:  # Intersection
        return 0.6
    
    return 0.2  # Some minimal score for any comparison


def _compare_totals(receipt_totals: Dict[str, Any], po_totals: Dict[str, Any]) -> float:
    """
    Compare total amounts between receipt and PO.
    
    Returns:
        Float score between 0.0 and 1.0
    """
    receipt_total = float(receipt_totals.get('total', 0))
    po_total = float(po_totals.get('total', 0))
    
    if receipt_total == 0 or po_total == 0:
        return 0.0
    
    # Calculate percentage difference
    diff = abs(receipt_total - po_total)
    max_amount = max(receipt_total, po_total)
    
    percentage_diff = diff / max_amount
    
    # Score based on percentage difference
    if percentage_diff == 0:
        return 1.0
    elif percentage_diff <= 0.01:  # 1% difference
        return 0.95
    elif percentage_diff <= 0.05:  # 5% difference
        return 0.8
    elif percentage_diff <= 0.1:   # 10% difference
        return 0.6
    else:
        return 0.0


def _compare_items(receipt_items: List[Dict[str, Any]], po_items: List[Dict[str, Any]]) -> float:
    """
    Compare items between receipt and PO.
    
    Returns:
        Float score between 0.0 and 1.0
    """
    if not receipt_items or not po_items:
        return 0.0
    
    # Simple comparison based on item count and names
    receipt_count = len(receipt_items)
    po_count = len(po_items)
    
    # Count matching items
    matches = 0
    for receipt_item in receipt_items:
        receipt_name = receipt_item.get('description', '').lower().strip()
        for po_item in po_items:
            po_name = po_item.get('name', '').lower().strip()
            if receipt_name and po_name:
                if receipt_name == po_name or receipt_name in po_name or po_name in receipt_name:
                    matches += 1
                    break
    
    # Calculate score based on matches vs total items
    total_items = max(receipt_count, po_count)
    return matches / total_items if total_items > 0 else 0.0


def _compare_vendors_detailed(receipt_vendor: Dict[str, Any], po_vendor: Dict[str, Any]) -> Dict[str, Any]:
    """
    Perform detailed vendor comparison with scoring and analysis.
    
    Args:
        receipt_vendor: Vendor info from receipt
        po_vendor: Vendor info from PO
        
    Returns:
        Dict with score and detailed comparison results
    """
    result = {
        'score': 0.0,
        'details': '',
        'name_match': False,
        'contact_match': False,
        'confidence': 'LOW'
    }
    
    receipt_name = receipt_vendor.get('name', '').lower().strip()
    po_name = po_vendor.get('name', '').lower().strip()
    
    if not receipt_name or not po_name:
        result['details'] = 'Missing vendor name in receipt or PO'
        return result
    
    # Name comparison with fuzzy matching
    if receipt_name == po_name:
        result['score'] = 1.0
        result['name_match'] = True
        result['confidence'] = 'HIGH'
        result['details'] = 'Exact vendor name match'
    elif receipt_name in po_name or po_name in receipt_name:
        result['score'] = 0.8
        result['name_match'] = True
        result['confidence'] = 'MEDIUM'
        result['details'] = 'Partial vendor name match'
    else:
        # Check for common words
        receipt_words = set(receipt_name.split())
        po_words = set(po_name.split())
        common_words = receipt_words & po_words
        
        if common_words:
            # Score based on percentage of common words
            total_words = len(receipt_words | po_words)
            common_ratio = len(common_words) / total_words
            result['score'] = min(0.6, common_ratio * 1.2)  # Cap at 0.6 for partial matches
            result['confidence'] = 'MEDIUM' if result['score'] > 0.4 else 'LOW'
            result['details'] = f'Common words found: {", ".join(common_words)}'
        else:
            result['score'] = 0.2
            result['confidence'] = 'LOW'
            result['details'] = 'No matching vendor name elements found'
    
    # Check contact information if available
    receipt_contact = receipt_vendor.get('email', '') or receipt_vendor.get('phone', '')
    po_contact = po_vendor.get('email', '') or po_vendor.get('phone', '')
    
    if receipt_contact and po_contact:
        if receipt_contact.lower() == po_contact.lower():
            result['contact_match'] = True
            result['score'] = min(1.0, result['score'] + 0.1)  # Boost score for contact match
            result['details'] += ' | Contact information matches'
    
    return result


def _compare_totals_detailed(receipt_totals: Dict[str, Any], po_totals: Dict[str, Any]) -> Dict[str, Any]:
    """
    Perform detailed total amount comparison with analysis.
    
    Args:
        receipt_totals: Total amounts from receipt
        po_totals: Total amounts from PO
        
    Returns:
        Dict with score and detailed comparison results
    """
    result = {
        'score': 0.0,
        'difference': 0.0,
        'percentage_diff': 0.0,
        'within_tolerance': False,
        'details': ''
    }
    
    receipt_total = float(receipt_totals.get('total', 0))
    po_total = float(po_totals.get('total', 0))
    
    if receipt_total == 0 or po_total == 0:
        result['details'] = 'Missing total amount in receipt or PO'
        return result
    
    # Calculate differences
    difference = abs(receipt_total - po_total)
    percentage_diff = (difference / max(receipt_total, po_total)) * 100
    
    result['difference'] = difference
    result['percentage_diff'] = percentage_diff
    
    # Define tolerance levels
    tolerance_levels = [
        (0.0, 1.0, 'Exact match'),
        (1.0, 0.95, 'Within 1% - excellent match'),
        (2.0, 0.90, 'Within 2% - very good match'),
        (5.0, 0.80, 'Within 5% - acceptable match'),
        (10.0, 0.60, 'Within 10% - requires review'),
        (20.0, 0.30, 'Within 20% - significant discrepancy'),
        (float('inf'), 0.0, 'Major discrepancy - manual review required')
    ]
    
    for threshold, score, description in tolerance_levels:
        if percentage_diff <= threshold:
            result['score'] = score
            result['details'] = description
            result['within_tolerance'] = percentage_diff <= 5.0  # 5% tolerance
            break
    
    return result


def _compare_items_detailed(receipt_items: List[Dict[str, Any]], po_items: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Perform detailed item comparison with matching analysis.
    
    Args:
        receipt_items: Items from receipt
        po_items: Items from PO
        
    Returns:
        Dict with score and detailed comparison results
    """
    result = {
        'score': 0.0,
        'matched_count': 0,
        'total_items': 0,
        'missing_items': [],
        'extra_items': [],
        'quantity_discrepancies': [],
        'price_discrepancies': []
    }
    
    if not receipt_items and not po_items:
        result['score'] = 1.0
        return result
    
    if not receipt_items or not po_items:
        result['total_items'] = len(receipt_items) + len(po_items)
        result['missing_items'] = po_items if not receipt_items else []
        result['extra_items'] = receipt_items if not po_items else []
        return result
    
    result['total_items'] = max(len(receipt_items), len(po_items))
    
    # Create matching matrix
    matched_po_indices = set()
    
    for receipt_item in receipt_items:
        receipt_desc = receipt_item.get('description', '').lower().strip()
        receipt_qty = receipt_item.get('quantity', 0)
        receipt_price = receipt_item.get('unit_price', 0)
        
        best_match_idx = None
        best_match_score = 0.0
        
        # Find best matching PO item
        for idx, po_item in enumerate(po_items):
            if idx in matched_po_indices:
                continue
                
            po_desc = po_item.get('name', '').lower().strip()
            
            # Calculate description similarity
            if receipt_desc == po_desc:
                match_score = 1.0
            elif receipt_desc in po_desc or po_desc in receipt_desc:
                match_score = 0.8
            else:
                # Check for common words
                receipt_words = set(receipt_desc.split())
                po_words = set(po_desc.split())
                common_words = receipt_words & po_words
                
                if common_words:
                    total_words = len(receipt_words | po_words)
                    match_score = len(common_words) / total_words * 0.6
                else:
                    match_score = 0.0
            
            if match_score > best_match_score and match_score >= 0.5:  # Minimum threshold
                best_match_score = match_score
                best_match_idx = idx
        
        # Process the best match
        if best_match_idx is not None:
            result['matched_count'] += 1
            matched_po_indices.add(best_match_idx)
            
            po_item = po_items[best_match_idx]
            po_qty = po_item.get('quantity', 0)
            po_price = po_item.get('unit_price', 0)
            
            # Check for quantity discrepancies
            if receipt_qty != po_qty:
                result['quantity_discrepancies'].append({
                    'item': receipt_desc,
                    'receipt_qty': receipt_qty,
                    'po_qty': po_qty,
                    'difference': abs(receipt_qty - po_qty)
                })
            
            # Check for price discrepancies
            if abs(receipt_price - po_price) > 0.01:  # Allow for small rounding differences
                result['price_discrepancies'].append({
                    'item': receipt_desc,
                    'receipt_price': receipt_price,
                    'po_price': po_price,
                    'difference': abs(receipt_price - po_price)
                })
        else:
            # Item in receipt but not in PO
            result['extra_items'].append({
                'description': receipt_desc,
                'quantity': receipt_qty,
                'unit_price': receipt_price
            })
    
    # Find items in PO but not matched in receipt
    for idx, po_item in enumerate(po_items):
        if idx not in matched_po_indices:
            result['missing_items'].append({
                'name': po_item.get('name', ''),
                'quantity': po_item.get('quantity', 0),
                'unit_price': po_item.get('unit_price', 0)
            })
    
    # Calculate overall score
    if result['total_items'] > 0:
        base_score = result['matched_count'] / result['total_items']
        
        # Apply penalties for discrepancies
        penalty = 0.0
        penalty += len(result['quantity_discrepancies']) * 0.05  # 5% penalty per qty discrepancy
        penalty += len(result['price_discrepancies']) * 0.1     # 10% penalty per price discrepancy
        penalty += len(result['extra_items']) * 0.15            # 15% penalty per extra item
        penalty += len(result['missing_items']) * 0.2           # 20% penalty per missing item
        
        result['score'] = max(0.0, base_score - penalty)
    
    return result


def _compare_dates(receipt_transaction: Dict[str, Any], po_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Compare transaction dates between receipt and PO.
    
    Args:
        receipt_transaction: Transaction info from receipt
        po_data: PO data
        
    Returns:
        Dict with score and comparison details
    """
    result = {
        'score': 0.5,  # Default neutral score
        'details': 'Date comparison not available',
        'receipt_date': None,
        'po_date': None
    }
    
    # Extract dates (this is a simplified implementation)
    receipt_date_str = receipt_transaction.get('date', '')
    
    if receipt_date_str:
        result['receipt_date'] = receipt_date_str
        result['score'] = 0.8  # Give higher score if receipt has date
        result['details'] = 'Receipt date available for verification'
    
    return result


def _determine_confidence_level(validation_result: Dict[str, Any]) -> str:
    """
    Determine confidence level based on validation scores and flags.
    
    Args:
        validation_result: Complete validation result
        
    Returns:
        Confidence level string
    """
    overall_score = validation_result.get('overall_score', 0.0)
    flags = validation_result.get('flags', [])
    
    # Check for major red flags
    major_flags = ['VENDOR_MAJOR_MISMATCH', 'AMOUNT_MAJOR_DISCREPANCY', 'ITEMS_MAJOR_MISMATCH']
    if any(flag in flags for flag in major_flags):
        return 'LOW'
    
    # Determine based on overall score
    if overall_score >= 0.9:
        return 'HIGH'
    elif overall_score >= 0.7:
        return 'MEDIUM'
    else:
        return 'LOW'


def _check_fraud_indicators(receipt_data: Dict[str, Any], po_data: Dict[str, Any], 
                          validation_result: Dict[str, Any]) -> List[str]:
    """
    Check for potential fraud indicators in the receipt validation.
    
    Args:
        receipt_data: Receipt data
        po_data: PO data
        validation_result: Validation results
        
    Returns:
        List of fraud indicator flags
    """
    indicators = []
    
    # Check for suspicious amount differences
    total_comparison = validation_result.get('validation_details', {}).get('totals', {})
    percentage_diff = total_comparison.get('percentage_diff', 0)
    
    if percentage_diff > 50:
        indicators.append('SUSPICIOUS_AMOUNT_DIFFERENCE')
    
    # Check for completely different vendor
    vendor_comparison = validation_result.get('validation_details', {}).get('vendor', {})
    vendor_score = vendor_comparison.get('score', 1.0)
    
    if vendor_score < 0.3:
        indicators.append('SUSPICIOUS_VENDOR_MISMATCH')
    
    # Check for too many extra items
    items_comparison = validation_result.get('validation_details', {}).get('items', {})
    extra_items = len(items_comparison.get('extra_items', []))
    total_items = items_comparison.get('total_items', 1)
    
    if extra_items > 0 and (extra_items / total_items) > 0.5:
        indicators.append('SUSPICIOUS_EXTRA_ITEMS')
    
    return indicatorsimilarity
    count_score = 1.0 - abs(receipt_count - po_count) / max(receipt_count, po_count)
    
    # Name similarity (simplified)
    receipt_names = {item.get('description', '').lower() for item in receipt_items}
    po_names = {item.get('name', '').lower() for item in po_items}
    
    if receipt_names & po_names:  # Any intersection
        name_score = len(receipt_names & po_names) / len(receipt_names | po_names)
    else:
        name_score = 0.0
    
    # Combined score
    return (count_score * 0.4 + name_score * 0.6)


# Enhanced detailed comparison functions for comprehensive receipt validation

def _compare_vendors_detailed(receipt_vendor: Dict[str, Any], po_vendor: Dict[str, Any]) -> Dict[str, Any]:
    """
    Perform detailed vendor comparison with comprehensive scoring.
    
    Args:
        receipt_vendor: Vendor data from receipt
        po_vendor: Vendor data from PO
        
    Returns:
        Dict containing detailed comparison results
    """
    result = {
        'score': 0.0,
        'details': '',
        'name_match': 0.0,
        'contact_match': 0.0,
        'address_match': 0.0
    }
    
    receipt_name = receipt_vendor.get('name', '').lower().strip()
    po_name = po_vendor.get('name', '').lower().strip()
    
    if not receipt_name or not po_name:
        result['details'] = 'Missing vendor name in receipt or PO'
        return result
    
    # Name comparison with fuzzy matching
    name_score = _calculate_string_similarity(receipt_name, po_name)
    result['name_match'] = name_score
    
    # Contact information comparison (if available)
    contact_score = 0.0
    contact_matches = 0
    
    if receipt_vendor.get('phone') and po_vendor.get('phone'):
        phone_score = _compare_phone_numbers(
            receipt_vendor['phone'], po_vendor.get('phone', '')
        )
        contact_score += phone_score
        contact_matches += 1
    
    if receipt_vendor.get('email') and po_vendor.get('email'):
        email_score = _calculate_string_similarity(
            receipt_vendor['email'].lower(), po_vendor.get('email', '').lower()
        )
        contact_score += email_score
        contact_matches += 1
    
    # Average contact score if we have contact info, otherwise use neutral score
    if contact_matches > 0:
        result['contact_match'] = contact_score / contact_matches
    else:
        result['contact_match'] = 0.8  # Neutral score when no contact info to compare
    
    # Address comparison (if available)
    address_score = 0.8  # Default neutral score when no address to compare
    if receipt_vendor.get('address') and po_vendor.get('address'):
        address_score = _calculate_string_similarity(
            receipt_vendor['address'].lower(), po_vendor.get('address', '').lower()
        )
    
    result['address_match'] = address_score
    
    # Calculate overall vendor score (weighted)
    weights = {'name': 0.7, 'contact': 0.2, 'address': 0.1}
    result['score'] = (
        name_score * weights['name'] +
        contact_score * weights['contact'] +
        address_score * weights['address']
    )
    
    # Generate details message
    if result['score'] >= 0.9:
        result['details'] = 'Excellent vendor match'
    elif result['score'] >= 0.7:
        result['details'] = 'Good vendor match with minor differences'
    elif result['score'] >= 0.5:
        result['details'] = 'Partial vendor match - review recommended'
    else:
        result['details'] = 'Poor vendor match - manual verification required'
    
    return result


def _compare_totals_detailed(receipt_totals: Dict[str, Any], po_totals: Dict[str, Any]) -> Dict[str, Any]:
    """
    Perform detailed total amount comparison with breakdown analysis.
    
    Args:
        receipt_totals: Total amounts from receipt
        po_totals: Total amounts from PO
        
    Returns:
        Dict containing detailed comparison results
    """
    result = {
        'score': 0.0,
        'difference': 0.0,
        'percentage_diff': 0.0,
        'subtotal_match': 0.0,
        'tax_match': 0.0,
        'details': ''
    }
    
    receipt_total = float(receipt_totals.get('total', 0))
    po_total = float(po_totals.get('total', 0))
    
    if receipt_total == 0 or po_total == 0:
        result['details'] = 'Missing total amount in receipt or PO'
        return result
    
    # Calculate difference and percentage
    difference = abs(receipt_total - po_total)
    result['difference'] = difference
    result['percentage_diff'] = (difference / max(receipt_total, po_total)) * 100
    
    # Main total comparison
    if difference == 0:
        result['score'] = 1.0
    elif result['percentage_diff'] <= 1:  # 1% tolerance
        result['score'] = 0.95
    elif result['percentage_diff'] <= 3:  # 3% tolerance
        result['score'] = 0.85
    elif result['percentage_diff'] <= 5:  # 5% tolerance
        result['score'] = 0.75
    elif result['percentage_diff'] <= 10:  # 10% tolerance
        result['score'] = 0.60
    else:
        result['score'] = 0.0
    
    # Subtotal comparison (if available)
    receipt_subtotal = float(receipt_totals.get('subtotal', 0))
    po_subtotal = float(po_totals.get('subtotal', 0))
    
    if receipt_subtotal > 0 and po_subtotal > 0:
        subtotal_diff = abs(receipt_subtotal - po_subtotal)
        subtotal_pct = (subtotal_diff / max(receipt_subtotal, po_subtotal)) * 100
        result['subtotal_match'] = max(0, 1.0 - (subtotal_pct / 10))  # 10% max penalty
    
    # Tax comparison (if available)
    receipt_tax = float(receipt_totals.get('tax', 0))
    po_tax = float(po_totals.get('tax', 0))
    
    if receipt_tax > 0 and po_tax > 0:
        tax_diff = abs(receipt_tax - po_tax)
        tax_pct = (tax_diff / max(receipt_tax, po_tax)) * 100
        result['tax_match'] = max(0, 1.0 - (tax_pct / 15))  # 15% max penalty for tax
    
    # Generate details message
    if result['score'] >= 0.95:
        result['details'] = f'Excellent total match (${difference:.2f} difference)'
    elif result['score'] >= 0.8:
        result['details'] = f'Good total match ({result["percentage_diff"]:.1f}% difference)'
    elif result['score'] >= 0.6:
        result['details'] = f'Acceptable total difference ({result["percentage_diff"]:.1f}%)'
    else:
        result['details'] = f'Significant total discrepancy ({result["percentage_diff"]:.1f}% difference)'
    
    return result


def _compare_items_detailed(receipt_items: List[Dict[str, Any]], po_items: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Perform detailed item-by-item comparison with matching analysis.
    
    Args:
        receipt_items: Items from receipt
        po_items: Items from PO
        
    Returns:
        Dict containing detailed comparison results
    """
    result = {
        'score': 0.0,
        'matched_count': 0,
        'total_items': 0,
        'missing_items': [],
        'extra_items': [],
        'quantity_discrepancies': [],
        'price_discrepancies': [],
        'details': ''
    }
    
    if not receipt_items and not po_items:
        result['score'] = 1.0
        result['details'] = 'No items to compare'
        return result
    
    if not receipt_items or not po_items:
        result['details'] = 'Missing items in receipt or PO'
        return result
    
    result['total_items'] = max(len(receipt_items), len(po_items))
    
    # Create normalized item lists for comparison
    receipt_normalized = _normalize_items_for_comparison(receipt_items)
    po_normalized = _normalize_items_for_comparison(po_items)
    
    # Find matches using fuzzy string matching
    matches = []
    unmatched_receipt = receipt_normalized.copy()
    unmatched_po = po_normalized.copy()
    
    for r_item in receipt_normalized:
        best_match = None
        best_score = 0.0
        
        for p_item in po_normalized:
            if p_item in unmatched_po:  # Only consider unmatched PO items
                similarity = _calculate_string_similarity(
                    r_item['description'], p_item['description']
                )
                
                if similarity > best_score and similarity >= 0.6:  # Minimum threshold
                    best_match = p_item
                    best_score = similarity
        
        if best_match:
            matches.append({
                'receipt_item': r_item,
                'po_item': best_match,
                'similarity': best_score
            })
            unmatched_receipt.remove(r_item)
            unmatched_po.remove(best_match)
    
    result['matched_count'] = len(matches)
    result['missing_items'] = [item['description'] for item in unmatched_po]
    result['extra_items'] = [item['description'] for item in unmatched_receipt]
    
    # Analyze quantity and price discrepancies for matched items
    for match in matches:
        r_item = match['receipt_item']
        p_item = match['po_item']
        
        # Quantity comparison
        r_qty = r_item.get('quantity', 0)
        p_qty = p_item.get('quantity', 0)
        
        if r_qty != p_qty and p_qty > 0:
            qty_diff_pct = abs(r_qty - p_qty) / p_qty * 100
            if qty_diff_pct > 5:  # 5% threshold
                result['quantity_discrepancies'].append({
                    'item': r_item['description'],
                    'receipt_qty': r_qty,
                    'po_qty': p_qty,
                    'difference_pct': qty_diff_pct
                })
        
        # Price comparison
        r_price = r_item.get('unit_price', 0)
        p_price = p_item.get('unit_price', 0)
        
        if r_price != p_price and p_price > 0:
            price_diff_pct = abs(r_price - p_price) / p_price * 100
            if price_diff_pct > 2:  # 2% threshold
                result['price_discrepancies'].append({
                    'item': r_item['description'],
                    'receipt_price': r_price,
                    'po_price': p_price,
                    'difference_pct': price_diff_pct
                })
    
    # Calculate overall items score
    if result['total_items'] == 0:
        result['score'] = 1.0
    else:
        match_ratio = result['matched_count'] / result['total_items']
        
        # Penalize for discrepancies
        qty_penalty = min(0.2, len(result['quantity_discrepancies']) * 0.05)
        price_penalty = min(0.2, len(result['price_discrepancies']) * 0.05)
        
        result['score'] = max(0.0, match_ratio - qty_penalty - price_penalty)
    
    # Generate details message
    if result['score'] >= 0.9:
        result['details'] = f'Excellent item match ({result["matched_count"]}/{result["total_items"]} items)'
    elif result['score'] >= 0.7:
        result['details'] = f'Good item match with minor discrepancies'
    elif result['score'] >= 0.5:
        result['details'] = f'Partial item match - review recommended'
    else:
        result['details'] = f'Poor item match - significant discrepancies found'
    
    return result


def _compare_dates(receipt_transaction: Dict[str, Any], po_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Compare transaction dates between receipt and PO.
    
    Args:
        receipt_transaction: Transaction data from receipt
        po_data: PO data including creation date
        
    Returns:
        Dict containing date comparison results
    """
    result = {
        'score': 0.5,  # Default neutral score
        'details': 'Date comparison not available'
    }
    
    receipt_date_str = receipt_transaction.get('date', '')
    
    if not receipt_date_str:
        return result
    
    try:
        from datetime import datetime, timedelta
        import re
        
        # Try to parse receipt date (multiple formats)
        receipt_date = None
        date_formats = [
            '%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y', 
            '%Y-%m-%d %H:%M:%S', '%m/%d/%Y %H:%M:%S'
        ]
        
        for fmt in date_formats:
            try:
                receipt_date = datetime.strptime(receipt_date_str.strip(), fmt)
                break
            except ValueError:
                continue
        
        if not receipt_date:
            # Try regex parsing for common formats
            date_match = re.search(r'(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})', receipt_date_str)
            if date_match:
                month, day, year = date_match.groups()
                if len(year) == 2:
                    year = '20' + year
                receipt_date = datetime(int(year), int(month), int(day))
        
        if receipt_date:
            # Compare with PO creation date (assuming it's available in po_data)
            # For now, we'll use a reasonable date range check
            now = datetime.now()
            days_ago = (now - receipt_date).days
            
            if 0 <= days_ago <= 90:  # Within 90 days
                result['score'] = 1.0
                result['details'] = f'Receipt date within acceptable range ({days_ago} days ago)'
            elif days_ago <= 180:  # Within 6 months
                result['score'] = 0.7
                result['details'] = f'Receipt date older than expected ({days_ago} days ago)'
            else:
                result['score'] = 0.3
                result['details'] = f'Receipt date significantly old ({days_ago} days ago)'
        
    except Exception as e:
        result['details'] = f'Date parsing error: {str(e)}'
    
    return result


def _determine_confidence_level(validation_result: Dict[str, Any]) -> str:
    """
    Determine confidence level based on validation results.
    
    Args:
        validation_result: Complete validation results
        
    Returns:
        Confidence level string
    """
    overall_score = validation_result['overall_score']
    discrepancy_count = len(validation_result['discrepancies'])
    flags = validation_result.get('flags', [])
    
    # Check for serious fraud indicators
    serious_flags = ['VENDOR_MAJOR_MISMATCH', 'AMOUNT_MAJOR_DISCREPANCY', 'POTENTIAL_VENDOR_FRAUD']
    has_serious_flags = any(flag in flags for flag in serious_flags)
    
    if has_serious_flags:
        return 'LOW'
    elif overall_score >= 0.85 and discrepancy_count <= 1:
        return 'HIGH'
    elif overall_score >= 0.7 and discrepancy_count <= 2:
        return 'MEDIUM'
    else:
        return 'LOW'


def _check_fraud_indicators(receipt_data: Dict[str, Any], po_data: Dict[str, Any], 
                          validation_result: Dict[str, Any]) -> List[str]:
    """
    Check for potential fraud indicators in the receipt validation.
    
    Args:
        receipt_data: Receipt data
        po_data: PO data
        validation_result: Current validation results
        
    Returns:
        List of fraud indicator flags
    """
    flags = []
    
    # Check for suspicious amount patterns
    receipt_total = receipt_data.get('totals', {}).get('total', 0)
    po_total = po_data.get('totals', {}).get('total', 0)
    
    if receipt_total > po_total * 1.5:  # 50% over PO amount
        flags.append('SUSPICIOUS_AMOUNT_INCREASE')
    
    # Check for vendor name manipulation
    vendor_score = validation_result.get('vendor_match', 1.0)
    if vendor_score < 0.3:
        flags.append('POTENTIAL_VENDOR_FRAUD')
    
    # Check for suspicious round numbers (only very round amounts like $1000, $2000)
    if receipt_total > 0 and receipt_total % 100 == 0 and receipt_total >= 1000:
        # Only flag if it's also significantly different from PO
        if abs(receipt_total - po_total) / max(receipt_total, po_total) > 0.1:
            flags.append('SUSPICIOUS_ROUND_AMOUNT')
    
    # Check for missing critical information
    if not receipt_data.get('vendor', {}).get('name'):
        flags.append('MISSING_VENDOR_INFO')
    
    if not receipt_data.get('transaction', {}).get('date'):
        flags.append('MISSING_TRANSACTION_DATE')
    
    return flags


def _calculate_string_similarity(str1: str, str2: str) -> float:
    """
    Calculate similarity between two strings using multiple methods.
    
    Args:
        str1: First string
        str2: Second string
        
    Returns:
        Similarity score between 0.0 and 1.0
    """
    if not str1 or not str2:
        return 0.0
    
    str1 = str1.lower().strip()
    str2 = str2.lower().strip()
    
    if str1 == str2:
        return 1.0
    
    # Exact substring match
    if str1 in str2 or str2 in str1:
        return 0.8
    
    # Word-based similarity
    words1 = set(str1.split())
    words2 = set(str2.split())
    
    if words1 and words2:
        intersection = words1 & words2
        union = words1 | words2
        jaccard_similarity = len(intersection) / len(union)
        
        if jaccard_similarity > 0:
            return min(0.9, 0.4 + jaccard_similarity * 0.5)
    
    # Character-based similarity (simplified Levenshtein-like)
    max_len = max(len(str1), len(str2))
    if max_len == 0:
        return 1.0
    
    # Count matching characters in similar positions
    matches = sum(1 for i, c in enumerate(str1) if i < len(str2) and c == str2[i])
    position_similarity = matches / max_len
    
    return min(0.7, position_similarity)


def _compare_phone_numbers(phone1: str, phone2: str) -> float:
    """
    Compare phone numbers with normalization.
    
    Args:
        phone1: First phone number
        phone2: Second phone number
        
    Returns:
        Similarity score between 0.0 and 1.0
    """
    import re
    
    # Normalize phone numbers (remove non-digits)
    digits1 = re.sub(r'\D', '', phone1)
    digits2 = re.sub(r'\D', '', phone2)
    
    if not digits1 or not digits2:
        return 0.0
    
    # Remove country code if present (assume US +1)
    if digits1.startswith('1') and len(digits1) == 11:
        digits1 = digits1[1:]
    if digits2.startswith('1') and len(digits2) == 11:
        digits2 = digits2[1:]
    
    if digits1 == digits2:
        return 1.0
    
    # Check if one is a substring of the other (partial match)
    if digits1 in digits2 or digits2 in digits1:
        return 0.7
    
    return 0.0


def _normalize_items_for_comparison(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Normalize item data for consistent comparison.
    
    Args:
        items: List of item dictionaries
        
    Returns:
        List of normalized item dictionaries
    """
    normalized = []
    
    for item in items:
        # Handle different field names between receipt and PO items
        description = (
            item.get('description', '') or 
            item.get('name', '') or 
            str(item.get('item', ''))
        ).lower().strip()
        
        quantity = float(item.get('quantity', 0))
        unit_price = float(item.get('unit_price', 0) or item.get('price', 0))
        
        if description:  # Only include items with descriptions
            normalized.append({
                'description': description,
                'quantity': quantity,
                'unit_price': unit_price,
                'line_total': quantity * unit_price
            })
    
    return normalized