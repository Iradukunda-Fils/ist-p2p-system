"""
Celery tasks for document processing in the P2P system.

This module contains tasks for:
- OCR and text extraction from documents
- Metadata extraction using various methods
- Fallback LLM integration for complex documents
"""

import os
import json
import logging
from typing import Dict, Any, Optional, Tuple
from decimal import Decimal
from datetime import datetime

from celery import shared_task
from django.conf import settings
from django.utils import timezone
from django.core.files.storage import default_storage

# Document processing libraries
try:
    import pytesseract
    from PIL import Image
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    logging.warning("pytesseract or PIL not available - OCR functionality disabled")

try:
    import pdfplumber
    import PyPDF2
    PDF_PROCESSING_AVAILABLE = True
except ImportError:
    PDF_PROCESSING_AVAILABLE = False
    logging.warning("pdfplumber or PyPDF2 not available - PDF processing disabled")

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logging.warning("openai not available - LLM fallback disabled")

logger = logging.getLogger(__name__)


class DocumentProcessingError(Exception):
    """Custom exception for document processing errors."""
    pass


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def extract_document_metadata(self, document_id: str) -> Dict[str, Any]:
    """
    Main task to extract metadata from a document.
    
    This task orchestrates the document processing pipeline:
    1. Extract text using OCR/PDF parsing
    2. Extract structured metadata
    3. Fallback to LLM if needed
    
    Args:
        document_id: UUID of the document to process
        
    Returns:
        Dict containing processing results
    """
    try:
        from documents.models import Document
        
        # Get document instance
        try:
            document = Document.objects.get(id=document_id)
        except Document.DoesNotExist:
            logger.error(f"Document {document_id} not found")
            return {'error': 'Document not found'}
        
        logger.info(f"Starting processing for document {document_id} ({document.original_filename})")
        
        # Update state to show task is actively processing
        self.update_state(
            state='PROGRESS',
            meta={
                'document_id': document_id,
                'stage': 'starting',
                'progress': 0
            }
        )
        
        # Update status to processing
        document.processing_status = 'PROCESSING'
        document.save(update_fields=['processing_status', 'updated_at'])
        
        # Step 1: Extract text
        extracted_text = ""
        try:
            self.update_state(
                state='PROGRESS',
                meta={
                    'document_id': document_id,
                    'stage': 'extracting_text',
                    'progress': 25
                }
            )
            
            if document.is_pdf:
                extracted_text = extract_text_from_pdf(document)
            elif document.is_image:
                extracted_text = extract_text_from_image(document)
            else:
                raise DocumentProcessingError(f"Unsupported file type: {document.file_extension}")
                
        except Exception as e:
            logger.warning(f"Text extraction failed for {document_id}: {e}")
            extracted_text = ""
        
        # Step 2: Extract structured metadata
        metadata = {}
        try:
            self.update_state(
                state='PROGRESS',
                meta={
                    'document_id': document_id,
                    'stage': 'extracting_metadata',
                    'progress': 50
                }
            )
            
            if document.doc_type == 'PROFORMA':
                metadata = extract_proforma_metadata(extracted_text, document)
            elif document.doc_type == 'RECEIPT':
                metadata = extract_receipt_metadata(extracted_text, document)
            elif document.doc_type == 'INVOICE':
                metadata = extract_invoice_metadata(extracted_text, document)
            else:
                metadata = extract_generic_metadata(extracted_text, document)
                
        except Exception as e:
            logger.warning(f"Metadata extraction failed for {document_id}: {e}")
            metadata = {'extraction_error': str(e)}
        
        # Step 3: Fallback to LLM if extraction was poor
        if should_use_llm_fallback(extracted_text, metadata):
            try:
                self.update_state(
                    state='PROGRESS',
                    meta={
                        'document_id': document_id,
                        'stage': 'llm_enhancement',
                        'progress': 75
                    }
                )
                
                llm_result = extract_with_llm.delay(document_id, extracted_text, document.doc_type).get()
                if llm_result and not llm_result.get('error'):
                    metadata.update(llm_result.get('metadata', {}))
                    metadata['llm_enhanced'] = True
            except Exception as e:
                logger.warning(f"LLM fallback failed for {document_id}: {e}")
                metadata['llm_fallback_error'] = str(e)
        
        # Update document with results
        self.update_state(
            state='PROGRESS',
            meta={
                'document_id': document_id,
                'stage': 'finalizing',
                'progress': 95
            }
        )
        
        document.mark_processing_completed(
            extracted_text=extracted_text,
            metadata=metadata
        )
        
        logger.info(f"Successfully processed document {document_id}")
        
        # Return success result - this ensures Celery marks task as SUCCESS
        result = {
            'success': True,
            'document_id': document_id,
            'status': 'completed',
            'text_length': len(extracted_text),
            'metadata_keys': list(metadata.keys()),
            'processing_status': 'COMPLETED'
        }
        
        return result
        
    except Exception as exc:
        logger.error(f"Document processing failed for {document_id}: {exc}")
        
        # Update document status
        try:
            from documents.models import Document
            document = Document.objects.get(id=document_id)
            document.mark_processing_failed(str(exc))
        except Exception:
            pass
        
        # Retry with exponential backoff (only on transient errors)
        if self.request.retries < self.max_retries:
            countdown = 60 * (2 ** self.request.retries)
            logger.info(f"Retrying document processing for {document_id} in {countdown} seconds")
            raise self.retry(countdown=countdown, exc=exc)
        
        # Final failure - return error result so task is marked as FAILURE
        return {
            'success': False,
            'error': str(exc),
            'document_id': document_id,
            'status': 'failed',
            'processing_status': 'FAILED'
        }


@shared_task(bind=True, max_retries=2)
def process_document_ocr(self, document_id: str) -> Dict[str, Any]:
    """
    Task specifically for OCR processing of image documents.
    
    Args:
        document_id: UUID of the document to process
        
    Returns:
        Dict containing OCR results
    """
    try:
        from documents.models import Document
        
        document = Document.objects.get(id=document_id)
        
        if not document.is_image:
            return {'error': 'Document is not an image file'}
        
        if not TESSERACT_AVAILABLE:
            return {'error': 'OCR functionality not available'}
        
        # Extract text using OCR
        extracted_text = extract_text_from_image(document)
        
        return {
            'document_id': document_id,
            'extracted_text': extracted_text,
            'text_length': len(extracted_text)
        }
        
    except Exception as exc:
        logger.error(f"OCR processing failed for {document_id}: {exc}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=30, exc=exc)
        
        return {'error': str(exc), 'document_id': document_id}


@shared_task(bind=True, max_retries=2)
def extract_with_llm(self, document_id: str, extracted_text: str, doc_type: str) -> Dict[str, Any]:
    """
    Fallback task using LLM for complex document processing.
    
    Args:
        document_id: UUID of the document
        extracted_text: Text extracted from the document
        doc_type: Type of document (PROFORMA, RECEIPT, etc.)
        
    Returns:
        Dict containing LLM extraction results
    """
    try:
        if not OPENAI_AVAILABLE:
            return {'error': 'OpenAI integration not available'}
        
        api_key = getattr(settings, 'DOCUMENT_PROCESSING', {}).get('OPENAI_API_KEY')
        if not api_key:
            return {'error': 'OpenAI API key not configured'}
        
        # Configure OpenAI client
        openai.api_key = api_key
        
        # Create prompt based on document type
        prompt = create_llm_prompt(doc_type, extracted_text)
        
        # Call OpenAI API
        response = openai.ChatCompletion.create(
            model=getattr(settings, 'DOCUMENT_PROCESSING', {}).get('OPENAI_MODEL', 'gpt-3.5-turbo'),
            messages=[
                {"role": "system", "content": "You are a document processing assistant that extracts structured data from business documents."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=1000,
            temperature=0.1
        )
        
        # Parse response
        llm_response = response.choices[0].message.content
        
        try:
            # Try to parse as JSON
            metadata = json.loads(llm_response)
        except json.JSONDecodeError:
            # If not JSON, create structured response
            metadata = {
                'llm_response': llm_response,
                'extraction_method': 'llm_text'
            }
        
        logger.info(f"LLM processing completed for document {document_id}")
        
        return {
            'document_id': document_id,
            'metadata': metadata,
            'llm_model': response.model,
            'tokens_used': response.usage.total_tokens
        }
        
    except Exception as exc:
        logger.error(f"LLM processing failed for {document_id}: {exc}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=60, exc=exc)
        
        return {'error': str(exc), 'document_id': document_id}


def extract_text_from_pdf(document) -> str:
    """
    Extract text from PDF document using pdfplumber and PyPDF2.
    
    Args:
        document: Document model instance
        
    Returns:
        Extracted text string
    """
    if not PDF_PROCESSING_AVAILABLE:
        raise DocumentProcessingError("PDF processing libraries not available")
    
    extracted_text = ""
    
    try:
        # Try pdfplumber first (better for complex layouts)
        with pdfplumber.open(document.file.path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    extracted_text += page_text + "\n"
    except Exception as e:
        logger.warning(f"pdfplumber failed for {document.id}: {e}")
        
        # Fallback to PyPDF2
        try:
            with open(document.file.path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        extracted_text += page_text + "\n"
        except Exception as e2:
            logger.error(f"PyPDF2 also failed for {document.id}: {e2}")
            raise DocumentProcessingError(f"PDF text extraction failed: {e2}")
    
    return extracted_text.strip()


def extract_text_from_image(document) -> str:
    """
    Extract text from image document using OCR.
    
    Args:
        document: Document model instance
        
    Returns:
        Extracted text string
    """
    if not TESSERACT_AVAILABLE:
        raise DocumentProcessingError("OCR functionality not available")
    
    try:
        # Open image
        image = Image.open(document.file.path)
        
        # Configure OCR settings
        ocr_config = getattr(settings, 'DOCUMENT_PROCESSING', {})
        language = ocr_config.get('OCR_LANGUAGE', 'eng')
        
        # Perform OCR
        extracted_text = pytesseract.image_to_string(
            image,
            lang=language,
            config='--psm 6'  # Assume uniform block of text
        )
        
        return extracted_text.strip()
        
    except Exception as e:
        logger.error(f"OCR failed for {document.id}: {e}")
        raise DocumentProcessingError(f"OCR text extraction failed: {e}")


def extract_proforma_metadata(text: str, document) -> Dict[str, Any]:
    """
    Extract structured metadata from proforma invoice text.
    
    Args:
        text: Extracted text from document
        document: Document model instance
        
    Returns:
        Dict containing structured metadata
    """
    metadata = {
        'document_type': 'proforma',
        'extraction_method': 'rule_based',
        'extraction_timestamp': timezone.now().isoformat()
    }
    
    # Extract vendor information
    vendor_info = extract_vendor_info(text)
    if vendor_info:
        metadata['vendor'] = vendor_info
    
    # Extract line items
    items = extract_line_items(text)
    if items:
        metadata['items'] = items
    
    # Extract totals
    totals = extract_totals(text)
    if totals:
        metadata['totals'] = totals
    
    # Extract dates
    dates = extract_dates(text)
    if dates:
        metadata['dates'] = dates
    
    # Extract reference numbers
    references = extract_reference_numbers(text)
    if references:
        metadata['references'] = references
    
    return metadata


def extract_receipt_metadata(text: str, document) -> Dict[str, Any]:
    """
    Extract structured metadata from receipt text.
    
    Args:
        text: Extracted text from document
        document: Document model instance
        
    Returns:
        Dict containing structured metadata
    """
    metadata = {
        'document_type': 'receipt',
        'extraction_method': 'rule_based',
        'extraction_timestamp': timezone.now().isoformat()
    }
    
    # Extract vendor information
    vendor_info = extract_vendor_info(text)
    if vendor_info:
        metadata['vendor'] = vendor_info
    
    # Extract transaction details
    transaction = extract_transaction_details(text)
    if transaction:
        metadata['transaction'] = transaction
    
    # Extract line items
    items = extract_line_items(text)
    if items:
        metadata['items'] = items
    
    # Extract totals
    totals = extract_totals(text)
    if totals:
        metadata['totals'] = totals
    
    # Extract payment information
    payment = extract_payment_info(text)
    if payment:
        metadata['payment'] = payment
    
    return metadata


def extract_invoice_metadata(text: str, document) -> Dict[str, Any]:
    """
    Extract structured metadata from invoice text.
    
    Args:
        text: Extracted text from document
        document: Document model instance
        
    Returns:
        Dict containing structured metadata
    """
    metadata = {
        'document_type': 'invoice',
        'extraction_method': 'rule_based',
        'extraction_timestamp': timezone.now().isoformat()
    }
    
    # Extract vendor information
    vendor_info = extract_vendor_info(text)
    if vendor_info:
        metadata['vendor'] = vendor_info
    
    # Extract invoice details
    invoice_details = extract_invoice_details(text)
    if invoice_details:
        metadata['invoice'] = invoice_details
    
    # Extract line items
    items = extract_line_items(text)
    if items:
        metadata['items'] = items
    
    # Extract totals
    totals = extract_totals(text)
    if totals:
        metadata['totals'] = totals
    
    return metadata


def extract_generic_metadata(text: str, document) -> Dict[str, Any]:
    """
    Extract basic metadata from any document type.
    
    Args:
        text: Extracted text from document
        document: Document model instance
        
    Returns:
        Dict containing basic metadata
    """
    metadata = {
        'document_type': 'generic',
        'extraction_method': 'basic',
        'extraction_timestamp': timezone.now().isoformat(),
        'text_length': len(text),
        'word_count': len(text.split()) if text else 0
    }
    
    # Extract basic information that might be useful
    dates = extract_dates(text)
    if dates:
        metadata['dates'] = dates
    
    amounts = extract_amounts(text)
    if amounts:
        metadata['amounts'] = amounts
    
    return metadata


# Helper functions for metadata extraction

def extract_vendor_info(text: str) -> Optional[Dict[str, Any]]:
    """Extract vendor information from text."""
    import re
    
    vendor_info = {}
    
    # Look for company names (lines with common business suffixes)
    company_pattern = r'([A-Z][A-Za-z\s&]+(?:Ltd|LLC|Inc|Corp|Company|Co\.|Limited)\.?)'
    companies = re.findall(company_pattern, text)
    if companies:
        vendor_info['name'] = companies[0].strip()
    
    # Look for email addresses
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    emails = re.findall(email_pattern, text)
    if emails:
        vendor_info['email'] = emails[0]
    
    # Look for phone numbers
    phone_pattern = r'(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})'
    phones = re.findall(phone_pattern, text)
    if phones:
        vendor_info['phone'] = f"({phones[0][0]}) {phones[0][1]}-{phones[0][2]}"
    
    return vendor_info if vendor_info else None


def extract_line_items(text: str) -> Optional[list]:
    """Extract line items from text."""
    import re
    
    items = []
    
    # Look for patterns like: "Item Name ... Qty ... Price"
    # This is a simplified pattern - real implementation would be more sophisticated
    item_pattern = r'([A-Za-z][A-Za-z\s]+)\s+(\d+)\s+\$?(\d+\.?\d*)'
    matches = re.findall(item_pattern, text)
    
    for match in matches:
        items.append({
            'description': match[0].strip(),
            'quantity': int(match[1]),
            'unit_price': float(match[2])
        })
    
    return items if items else None


def extract_totals(text: str) -> Optional[Dict[str, Any]]:
    """Extract total amounts from text."""
    import re
    
    totals = {}
    
    # Look for total patterns
    total_pattern = r'(?:Total|TOTAL|Grand Total)[\s:]*\$?(\d+\.?\d*)'
    total_matches = re.findall(total_pattern, text, re.IGNORECASE)
    if total_matches:
        totals['total'] = float(total_matches[-1])  # Take the last match
    
    # Look for subtotal
    subtotal_pattern = r'(?:Subtotal|SUBTOTAL|Sub Total)[\s:]*\$?(\d+\.?\d*)'
    subtotal_matches = re.findall(subtotal_pattern, text, re.IGNORECASE)
    if subtotal_matches:
        totals['subtotal'] = float(subtotal_matches[-1])
    
    # Look for tax
    tax_pattern = r'(?:Tax|TAX|VAT)[\s:]*\$?(\d+\.?\d*)'
    tax_matches = re.findall(tax_pattern, text, re.IGNORECASE)
    if tax_matches:
        totals['tax'] = float(tax_matches[-1])
    
    return totals if totals else None


def extract_dates(text: str) -> Optional[Dict[str, str]]:
    """Extract dates from text."""
    import re
    from datetime import datetime
    
    dates = {}
    
    # Common date patterns
    date_patterns = [
        r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',  # MM/DD/YYYY or MM-DD-YYYY
        r'(\d{4}[/-]\d{1,2}[/-]\d{1,2})',    # YYYY/MM/DD or YYYY-MM-DD
        r'([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})'  # Month DD, YYYY
    ]
    
    all_dates = []
    for pattern in date_patterns:
        matches = re.findall(pattern, text)
        all_dates.extend(matches)
    
    if all_dates:
        dates['found_dates'] = all_dates[:5]  # Limit to first 5 dates
        dates['primary_date'] = all_dates[0]
    
    return dates if dates else None


def extract_amounts(text: str) -> Optional[list]:
    """Extract monetary amounts from text."""
    import re
    
    # Pattern for monetary amounts
    amount_pattern = r'\$(\d+(?:,\d{3})*\.?\d*)'
    amounts = re.findall(amount_pattern, text)
    
    if amounts:
        # Convert to float and remove duplicates
        float_amounts = []
        for amount in amounts:
            try:
                clean_amount = amount.replace(',', '')
                float_amounts.append(float(clean_amount))
            except ValueError:
                continue
        
        return list(set(float_amounts))  # Remove duplicates
    
    return None


def extract_reference_numbers(text: str) -> Optional[Dict[str, str]]:
    """Extract reference numbers from text."""
    import re
    
    references = {}
    
    # Look for invoice numbers
    invoice_pattern = r'(?:Invoice|INV|Invoice #|INV#)[\s:]*([A-Z0-9-]+)'
    invoice_matches = re.findall(invoice_pattern, text, re.IGNORECASE)
    if invoice_matches:
        references['invoice_number'] = invoice_matches[0]
    
    # Look for PO numbers
    po_pattern = r'(?:PO|P\.O\.|Purchase Order)[\s#:]*([A-Z0-9-]+)'
    po_matches = re.findall(po_pattern, text, re.IGNORECASE)
    if po_matches:
        references['po_number'] = po_matches[0]
    
    return references if references else None


def extract_transaction_details(text: str) -> Optional[Dict[str, Any]]:
    """Extract transaction details from receipt text."""
    import re
    
    transaction = {}
    
    # Look for transaction ID
    trans_pattern = r'(?:Transaction|Trans|Receipt)[\s#:]*([A-Z0-9-]+)'
    trans_matches = re.findall(trans_pattern, text, re.IGNORECASE)
    if trans_matches:
        transaction['transaction_id'] = trans_matches[0]
    
    # Look for store/location info
    store_pattern = r'(?:Store|Location)[\s#:]*([A-Z0-9-]+)'
    store_matches = re.findall(store_pattern, text, re.IGNORECASE)
    if store_matches:
        transaction['store_id'] = store_matches[0]
    
    return transaction if transaction else None


def extract_payment_info(text: str) -> Optional[Dict[str, str]]:
    """Extract payment information from text."""
    import re
    
    payment = {}
    
    # Look for payment method
    payment_methods = ['CASH', 'CREDIT', 'DEBIT', 'CHECK', 'CARD']
    for method in payment_methods:
        if method in text.upper():
            payment['method'] = method
            break
    
    # Look for card last 4 digits
    card_pattern = r'(?:ending in|last 4|xxxx)[\s]*(\d{4})'
    card_matches = re.findall(card_pattern, text, re.IGNORECASE)
    if card_matches:
        payment['card_last_four'] = card_matches[0]
    
    return payment if payment else None


def extract_invoice_details(text: str) -> Optional[Dict[str, Any]]:
    """Extract invoice-specific details."""
    import re
    
    details = {}
    
    # Look for due date
    due_pattern = r'(?:Due Date|Payment Due)[\s:]*([A-Za-z0-9\s,/-]+)'
    due_matches = re.findall(due_pattern, text, re.IGNORECASE)
    if due_matches:
        details['due_date'] = due_matches[0].strip()
    
    # Look for terms
    terms_pattern = r'(?:Terms|Payment Terms)[\s:]*([A-Za-z0-9\s,/-]+)'
    terms_matches = re.findall(terms_pattern, text, re.IGNORECASE)
    if terms_matches:
        details['terms'] = terms_matches[0].strip()
    
    return details if details else None


def should_use_llm_fallback(extracted_text: str, metadata: Dict[str, Any]) -> bool:
    """
    Determine if LLM fallback should be used based on extraction quality.
    
    Args:
        extracted_text: Text extracted from document
        metadata: Metadata extracted using rule-based methods
        
    Returns:
        True if LLM fallback should be used
    """
    # Use LLM if text extraction was poor
    if not extracted_text or len(extracted_text.strip()) < 50:
        return True
    
    # Use LLM if metadata extraction was minimal (only basic fields like timestamps)
    essential_fields = ['vendor', 'items', 'totals', 'amounts', 'dates']
    has_essential_data = any(metadata.get(field) for field in essential_fields)
    
    if not metadata or not has_essential_data:
        return True
    
    # Use LLM if there were extraction errors
    if metadata.get('extraction_error'):
        return True
    
    # Use LLM for complex document types if missing critical data
    if metadata.get('document_type') in ['proforma', 'invoice']:
        # Check if we got essential fields
        has_vendor = bool(metadata.get('vendor'))
        has_items = bool(metadata.get('items'))
        has_totals = bool(metadata.get('totals'))
        
        if not (has_vendor and (has_items or has_totals)):
            return True
    
    return False


def create_llm_prompt(doc_type: str, text: str) -> str:
    """
    Create appropriate prompt for LLM based on document type.
    
    Args:
        doc_type: Type of document
        text: Extracted text
        
    Returns:
        Formatted prompt string
    """
    base_prompt = f"""
Please extract structured information from this {doc_type.lower()} document.

Document text:
{text[:2000]}  # Limit text to avoid token limits

Please return the information as a JSON object with the following structure:
"""
    
    if doc_type == 'PROFORMA':
        structure = """
{
    "vendor": {
        "name": "Company name",
        "email": "contact email",
        "phone": "phone number",
        "address": "full address"
    },
    "items": [
        {
            "description": "item description",
            "quantity": number,
            "unit_price": number,
            "total": number
        }
    ],
    "totals": {
        "subtotal": number,
        "tax": number,
        "total": number
    },
    "dates": {
        "issue_date": "date",
        "valid_until": "date"
    },
    "references": {
        "proforma_number": "reference number",
        "quote_number": "quote number"
    }
}
"""
    elif doc_type == 'RECEIPT':
        structure = """
{
    "vendor": {
        "name": "Store/company name",
        "location": "store location",
        "phone": "phone number"
    },
    "transaction": {
        "transaction_id": "transaction ID",
        "date": "transaction date",
        "time": "transaction time"
    },
    "items": [
        {
            "description": "item description",
            "quantity": number,
            "unit_price": number,
            "total": number
        }
    ],
    "totals": {
        "subtotal": number,
        "tax": number,
        "total": number
    },
    "payment": {
        "method": "payment method",
        "card_last_four": "last 4 digits if card"
    }
}
"""
    else:
        structure = """
{
    "vendor": {
        "name": "Company name",
        "contact": "contact information"
    },
    "amounts": [list of monetary amounts found],
    "dates": [list of dates found],
    "references": [list of reference numbers found],
    "key_information": "summary of key document information"
}
"""
    
    return base_prompt + structure + "\n\nReturn only the JSON object, no additional text."