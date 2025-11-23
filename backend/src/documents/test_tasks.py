"""
Tests for document processing tasks.
"""

import os
import json
from unittest.mock import patch, MagicMock
from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model

from documents.models import Document
from documents.tasks import (
    extract_document_metadata,
    process_document_ocr,
    extract_with_llm,
    extract_text_from_pdf,
    extract_text_from_image,
    extract_proforma_metadata,
    extract_receipt_metadata,
    should_use_llm_fallback,
    create_llm_prompt
)

User = get_user_model()


class DocumentTasksTestCase(TestCase):
    """Test case for document processing tasks."""
    
    def setUp(self):
        """Set up test data."""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            role='staff'
        )
        
        # Create a simple PDF content for testing
        self.pdf_content = b'%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n'
        
        # Create a simple image content for testing
        self.image_content = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x02\x00\x00\x00\x90wS\xde'
    
    def create_test_document(self, doc_type='PROFORMA', file_content=None, filename='test.pdf'):
        """Helper method to create test documents."""
        if file_content is None:
            file_content = self.pdf_content
        
        uploaded_file = SimpleUploadedFile(
            filename,
            file_content,
            content_type='application/pdf' if filename.endswith('.pdf') else 'image/png'
        )
        
        document = Document.objects.create(
            file=uploaded_file,
            doc_type=doc_type,
            uploaded_by=self.user,
            processing_status='PENDING'
        )
        
        return document
    
    @patch('documents.tasks.PDF_PROCESSING_AVAILABLE', True)
    @patch('documents.tasks.pdfplumber')
    def test_extract_text_from_pdf_success(self, mock_pdfplumber):
        """Test successful PDF text extraction."""
        # Mock pdfplumber
        mock_pdf = MagicMock()
        mock_page = MagicMock()
        mock_page.extract_text.return_value = "Test PDF content"
        mock_pdf.pages = [mock_page]
        mock_pdfplumber.open.return_value.__enter__.return_value = mock_pdf
        
        document = self.create_test_document()
        
        result = extract_text_from_pdf(document)
        
        self.assertEqual(result, "Test PDF content")
        mock_pdfplumber.open.assert_called_once()
    
    @patch('documents.tasks.TESSERACT_AVAILABLE', True)
    @patch('documents.tasks.pytesseract')
    @patch('documents.tasks.Image')
    def test_extract_text_from_image_success(self, mock_image, mock_pytesseract):
        """Test successful image OCR."""
        # Mock PIL Image and pytesseract
        mock_img = MagicMock()
        mock_image.open.return_value = mock_img
        mock_pytesseract.image_to_string.return_value = "Test OCR content"
        
        document = self.create_test_document(filename='test.png')
        
        result = extract_text_from_image(document)
        
        self.assertEqual(result, "Test OCR content")
        mock_pytesseract.image_to_string.assert_called_once()
    
    def test_extract_proforma_metadata(self):
        """Test proforma metadata extraction."""
        text = """
        ABC Company Ltd
        123 Business St
        Email: contact@abc.com
        Phone: (555) 123-4567
        
        Proforma Invoice #PRO-001
        
        Item 1    2    $50.00
        Item 2    1    $25.00
        
        Subtotal: $125.00
        Tax: $12.50
        Total: $137.50
        """
        
        document = self.create_test_document(doc_type='PROFORMA')
        
        metadata = extract_proforma_metadata(text, document)
        
        self.assertEqual(metadata['document_type'], 'proforma')
        self.assertEqual(metadata['extraction_method'], 'rule_based')
        self.assertIn('vendor', metadata)
        self.assertIn('totals', metadata)
        
        # Check vendor extraction
        vendor = metadata['vendor']
        self.assertEqual(vendor['name'], 'ABC Company Ltd')
        self.assertEqual(vendor['email'], 'contact@abc.com')
        
        # Check totals extraction
        totals = metadata['totals']
        self.assertEqual(totals['subtotal'], 125.00)
        self.assertEqual(totals['tax'], 12.50)
        self.assertEqual(totals['total'], 137.50)
    
    def test_extract_receipt_metadata(self):
        """Test receipt metadata extraction."""
        text = """
        Store ABC
        Location: Downtown
        
        Transaction ID: TXN123456
        Date: 01/15/2024
        
        Item A    1    $10.00
        Item B    2    $5.00
        
        Subtotal: $20.00
        Tax: $2.00
        Total: $22.00
        
        Payment: CREDIT ending in 1234
        """
        
        document = self.create_test_document(doc_type='RECEIPT')
        
        metadata = extract_receipt_metadata(text, document)
        
        self.assertEqual(metadata['document_type'], 'receipt')
        self.assertIn('vendor', metadata)
        self.assertIn('transaction', metadata)
        self.assertIn('totals', metadata)
        self.assertIn('payment', metadata)
        
        # Check transaction details
        transaction = metadata['transaction']
        self.assertEqual(transaction['transaction_id'], 'TXN123456')
        
        # Check payment info
        payment = metadata['payment']
        self.assertEqual(payment['method'], 'CREDIT')
        self.assertEqual(payment['card_last_four'], '1234')
    
    def test_should_use_llm_fallback_conditions(self):
        """Test LLM fallback decision logic."""
        # Test with poor text extraction
        self.assertTrue(should_use_llm_fallback("", {}))
        self.assertTrue(should_use_llm_fallback("short", {}))
        
        # Test with minimal metadata
        minimal_metadata = {
            'document_type': 'proforma',
            'extraction_method': 'rule_based'
        }
        self.assertTrue(should_use_llm_fallback("Good text content here", minimal_metadata))
        
        # Test with extraction error
        error_metadata = {
            'document_type': 'proforma',
            'extraction_error': 'Failed to parse'
        }
        self.assertTrue(should_use_llm_fallback("Good text content", error_metadata))
        
        # Test with good extraction
        good_metadata = {
            'document_type': 'proforma',
            'vendor': {'name': 'ABC Corp'},
            'items': [{'name': 'Item 1'}],
            'totals': {'total': 100.0}
        }
        self.assertFalse(should_use_llm_fallback("Good text content", good_metadata))
    
    def test_create_llm_prompt_proforma(self):
        """Test LLM prompt creation for proforma documents."""
        text = "Sample proforma text"
        prompt = create_llm_prompt('PROFORMA', text)
        
        self.assertIn('proforma', prompt.lower())
        self.assertIn('JSON', prompt)
        self.assertIn('vendor', prompt)
        self.assertIn('items', prompt)
        self.assertIn('totals', prompt)
        self.assertIn(text, prompt)
    
    def test_create_llm_prompt_receipt(self):
        """Test LLM prompt creation for receipt documents."""
        text = "Sample receipt text"
        prompt = create_llm_prompt('RECEIPT', text)
        
        self.assertIn('receipt', prompt.lower())
        self.assertIn('transaction', prompt)
        self.assertIn('payment', prompt)
        self.assertIn(text, prompt)
    
    @patch('documents.tasks.OPENAI_AVAILABLE', True)
    @patch('documents.tasks.openai')
    @override_settings(DOCUMENT_PROCESSING={'OPENAI_API_KEY': 'test-key'})
    def test_extract_with_llm_success(self, mock_openai):
        """Test successful LLM extraction."""
        # Mock OpenAI response
        mock_response = MagicMock()
        mock_response.choices[0].message.content = json.dumps({
            'vendor': {'name': 'Test Company'},
            'total': 100.0
        })
        mock_response.model = 'gpt-3.5-turbo'
        mock_response.usage.total_tokens = 150
        mock_openai.ChatCompletion.create.return_value = mock_response
        
        document = self.create_test_document()
        
        # Call the task directly (not as Celery task)
        result = extract_with_llm(None, str(document.id), "Sample text", "PROFORMA")
        
        self.assertIn('metadata', result)
        self.assertEqual(result['metadata']['vendor']['name'], 'Test Company')
        self.assertEqual(result['tokens_used'], 150)
    
    @patch('documents.tasks.extract_text_from_pdf')
    @patch('documents.tasks.extract_proforma_metadata')
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    def test_extract_document_metadata_success(self, mock_extract_metadata, mock_extract_text):
        """Test successful document metadata extraction."""
        # Mock text extraction
        mock_extract_text.return_value = "Sample extracted text"
        
        # Mock metadata extraction
        mock_metadata = {
            'document_type': 'proforma',
            'vendor': {'name': 'Test Company'},
            'totals': {'total': 100.0}
        }
        mock_extract_metadata.return_value = mock_metadata
        
        document = self.create_test_document()
        
        # Call the task function directly
        from documents.tasks import extract_document_metadata
        task_instance = extract_document_metadata
        task_instance.request = type('obj', (object,), {'retries': 0})()
        result = task_instance(str(document.id))
        
        # Refresh document from database
        document.refresh_from_db()
        
        self.assertEqual(result['status'], 'completed')
        self.assertEqual(document.processing_status, 'COMPLETED')
        self.assertEqual(document.extracted_text, "Sample extracted text")
        self.assertEqual(document.metadata, mock_metadata)
    
    @patch('documents.tasks.extract_text_from_pdf')
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    def test_extract_document_metadata_failure(self, mock_extract_text):
        """Test document metadata extraction failure handling."""
        # Mock text extraction to raise an exception
        mock_extract_text.side_effect = Exception("Processing failed")
        
        document = self.create_test_document()
        
        # Call the task function directly
        from documents.tasks import extract_document_metadata
        task_instance = extract_document_metadata
        task_instance.request = type('obj', (object,), {'retries': 0, 'max_retries': 3})()
        result = task_instance(str(document.id))
        
        # Refresh document from database
        document.refresh_from_db()
        
        self.assertIn('error', result)
        self.assertEqual(document.processing_status, 'FAILED')
        self.assertIn("Processing failed", document.processing_error)
    
    def test_extract_document_metadata_nonexistent_document(self):
        """Test handling of nonexistent document."""
        fake_id = "00000000-0000-0000-0000-000000000000"
        
        # Call the task function directly
        from documents.tasks import extract_document_metadata
        task_instance = extract_document_metadata
        task_instance.request = type('obj', (object,), {'retries': 0})()
        result = task_instance(fake_id)
        
        self.assertEqual(result['error'], 'Document not found')
    
    @patch('documents.tasks.TESSERACT_AVAILABLE', False)
    def test_process_document_ocr_unavailable(self):
        """Test OCR task when tesseract is not available."""
        document = self.create_test_document(filename='test.png')
        
        # Call the task directly (not as Celery task)
        result = process_document_ocr(None, str(document.id))
        
        self.assertEqual(result['error'], 'OCR functionality not available')
    
    @patch('documents.tasks.OPENAI_AVAILABLE', False)
    def test_extract_with_llm_unavailable(self):
        """Test LLM task when OpenAI is not available."""
        document = self.create_test_document()
        
        # Call the task directly (not as Celery task)
        result = extract_with_llm(None, str(document.id), "Sample text", "PROFORMA")
        
        self.assertEqual(result['error'], 'OpenAI integration not available')


class MetadataExtractionTestCase(TestCase):
    """Test case for metadata extraction helper functions."""
    
    def test_extract_vendor_info(self):
        """Test vendor information extraction."""
        from documents.tasks import extract_vendor_info
        
        text = """
        ABC Company Ltd
        123 Business Street
        contact@abc.com
        Phone: (555) 123-4567
        """
        
        vendor = extract_vendor_info(text)
        
        self.assertIsNotNone(vendor)
        self.assertEqual(vendor['name'], 'ABC Company Ltd')
        self.assertEqual(vendor['email'], 'contact@abc.com')
        self.assertEqual(vendor['phone'], '(555) 123-4567')
    
    def test_extract_line_items(self):
        """Test line items extraction."""
        from documents.tasks import extract_line_items
        
        text = """
        Widget A 2 $25.00
        Widget B 1 $50.00
        Service C 3 $15.50
        """
        
        items = extract_line_items(text)
        
        self.assertIsNotNone(items)
        self.assertEqual(len(items), 3)
        
        self.assertEqual(items[0]['description'], 'Widget A')
        self.assertEqual(items[0]['quantity'], 2)
        self.assertEqual(items[0]['unit_price'], 25.00)
    
    def test_extract_totals(self):
        """Test totals extraction."""
        from documents.tasks import extract_totals
        
        text = """
        Subtotal: $125.00
        Tax: $12.50
        Total: $137.50
        """
        
        totals = extract_totals(text)
        
        self.assertIsNotNone(totals)
        self.assertEqual(totals['subtotal'], 125.00)
        self.assertEqual(totals['tax'], 12.50)
        self.assertEqual(totals['total'], 137.50)
    
    def test_extract_dates(self):
        """Test date extraction."""
        from documents.tasks import extract_dates
        
        text = """
        Invoice Date: 01/15/2024
        Due Date: February 15, 2024
        Valid until: 2024-03-15
        """
        
        dates = extract_dates(text)
        
        self.assertIsNotNone(dates)
        self.assertIn('found_dates', dates)
        self.assertGreater(len(dates['found_dates']), 0)
    
    def test_extract_amounts(self):
        """Test monetary amounts extraction."""
        from documents.tasks import extract_amounts
        
        text = """
        Price: $25.00
        Total: $1,250.50
        Deposit: $100
        """
        
        amounts = extract_amounts(text)
        
        self.assertIsNotNone(amounts)
        self.assertIn(25.00, amounts)
        self.assertIn(1250.50, amounts)
        self.assertIn(100.0, amounts)
    
    def test_extract_reference_numbers(self):
        """Test reference numbers extraction."""
        from documents.tasks import extract_reference_numbers
        
        text = """
        Invoice #INV-2024-001
        PO Number: PO-12345
        Reference: REF-ABC-123
        """
        
        references = extract_reference_numbers(text)
        
        self.assertIsNotNone(references)
        self.assertEqual(references['invoice_number'], 'INV-2024-001')
        self.assertEqual(references['po_number'], 'PO-12345')