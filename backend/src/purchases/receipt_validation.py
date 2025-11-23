"""
Receipt validation utilities for the purchases app.

This module provides functionality to validate receipts against purchase orders
and calculate match scores for discrepancy detection.
"""

import logging
from decimal import Decimal
from typing import Dict, List, Any, Optional
from django.utils import timezone

logger = logging.getLogger(__name__)


class ReceiptValidator:
    """
    Utility class for validating receipts against purchase orders.
    
    Provides methods to extract receipt data, compare with PO data,
    and calculate match scores for validation.
    """
    
    # Validation thresholds
    VENDOR_MATCH_THRESHOLD = 0.8
    TOTAL_MATCH_THRESHOLD = 0.95
    ITEM_MATCH_THRESHOLD = 0.7
    OVERALL_MATCH_THRESHOLD = 0.8
    
    def __init__(self, receipt_document, purchase_order):
        """
        Initialize validator with receipt document and purchase order.
        
        Args:
            receipt_document: Document instance of the receipt
            purchase_order: PurchaseOrder instance to validate against
        """
        self.receipt_document = receipt_document
        self.purchase_order = purchase_order
    
    def validate_receipt(self) -> Dict[str, Any]:
        """
        Perform complete receipt validation against purchase order.
        
        Returns:
            Dict containing validation results with match scores and discrepancies
        """
        try:
            # Extract receipt data (placeholder implementation)
            receipt_data = self._extract_receipt_data()
            
            # Get PO data for comparison
            po_data = self._get_po_data()
            
            # Perform validation comparisons
            vendor_match = self._compare_vendors(receipt_data.get('vendor'), po_data.get('vendor'))
            total_match = self._compare_totals(receipt_data.get('total'), po_data.get('total'))
            items_match = self._compare_items(receipt_data.get('items', []), po_data.get('items', []))
            
            # Calculate overall match score
            overall_score = self._calculate_overall_score(vendor_match, total_match, items_match)
            
            # Identify discrepancies
            discrepancies = self._identify_discrepancies(vendor_match, total_match, items_match)
            
            # Determine if manual review is needed
            needs_review = overall_score < self.OVERALL_MATCH_THRESHOLD
            
            validation_result = {
                'vendor_match': vendor_match,
                'total_match': total_match,
                'items_match': items_match,
                'match_score': overall_score,
                'discrepancies': discrepancies,
                'needs_manual_review': needs_review,
                'validation_timestamp': timezone.now().isoformat(),
                'receipt_data': receipt_data,
                'po_data': po_data,
            }
            
            # Store validation results in document metadata
            self._store_validation_results(validation_result)
            
            logger.info(f"Receipt validation completed for document {self.receipt_document.id}. "
                       f"Match score: {overall_score:.2f}, Needs review: {needs_review}")
            
            return validation_result
            
        except Exception as e:
            logger.error(f"Receipt validation failed for document {self.receipt_document.id}: {str(e)}")
            
            # Store error in validation results
            error_result = {
                'validation_error': str(e),
                'validation_timestamp': timezone.now().isoformat(),
                'match_score': 0.0,
                'needs_manual_review': True,
                'discrepancies': ['Validation processing failed'],
            }
            
            self._store_validation_results(error_result)
            return error_result
    
    def _extract_receipt_data(self) -> Dict[str, Any]:
        """
        Extract structured data from receipt document.
        
        This is a placeholder implementation. In a real system, this would
        use OCR and parsing libraries to extract data from the receipt.
        
        Returns:
            Dict containing extracted receipt data
        """
        # For now, return mock data based on the filename or use existing metadata
        if self.receipt_document.metadata and 'extracted_data' in self.receipt_document.metadata:
            return self.receipt_document.metadata['extracted_data']
        
        # Mock extraction based on PO data (for testing purposes)
        po_data = self._get_po_data()
        
        # Simulate some variations that might occur in real receipts
        mock_receipt_data = {
            'vendor': po_data.get('vendor', 'Unknown Vendor'),
            'total': float(po_data.get('total', 0)) * 1.02,  # Slight variation
            'items': po_data.get('items', []),
            'date': timezone.now().date().isoformat(),
            'receipt_number': f"RCP-{self.receipt_document.id.hex[:8].upper()}",
        }
        
        return mock_receipt_data
    
    def _get_po_data(self) -> Dict[str, Any]:
        """
        Get structured data from purchase order for comparison.
        
        Returns:
            Dict containing PO data
        """
        return {
            'vendor': self.purchase_order.vendor,
            'total': float(self.purchase_order.total),
            'items': self.purchase_order.get_items_from_data(),
            'po_number': self.purchase_order.po_number,
        }
    
    def _compare_vendors(self, receipt_vendor: Optional[str], po_vendor: Optional[str]) -> Dict[str, Any]:
        """
        Compare vendor information between receipt and PO.
        
        Args:
            receipt_vendor: Vendor name from receipt
            po_vendor: Vendor name from PO
            
        Returns:
            Dict containing vendor comparison results
        """
        if not receipt_vendor or not po_vendor:
            return {
                'score': 0.0,
                'match': False,
                'receipt_value': receipt_vendor,
                'po_value': po_vendor,
                'issue': 'Missing vendor information'
            }
        
        # Simple string similarity check (in real implementation, use fuzzy matching)
        receipt_vendor_clean = receipt_vendor.lower().strip()
        po_vendor_clean = po_vendor.lower().strip()
        
        if receipt_vendor_clean == po_vendor_clean:
            score = 1.0
        elif receipt_vendor_clean in po_vendor_clean or po_vendor_clean in receipt_vendor_clean:
            score = 0.8
        else:
            score = 0.0
        
        return {
            'score': score,
            'match': score >= self.VENDOR_MATCH_THRESHOLD,
            'receipt_value': receipt_vendor,
            'po_value': po_vendor,
            'issue': None if score >= self.VENDOR_MATCH_THRESHOLD else 'Vendor name mismatch'
        }
    
    def _compare_totals(self, receipt_total: Optional[float], po_total: Optional[float]) -> Dict[str, Any]:
        """
        Compare total amounts between receipt and PO.
        
        Args:
            receipt_total: Total amount from receipt
            po_total: Total amount from PO
            
        Returns:
            Dict containing total comparison results
        """
        if receipt_total is None or po_total is None:
            return {
                'score': 0.0,
                'match': False,
                'receipt_value': receipt_total,
                'po_value': po_total,
                'difference': None,
                'issue': 'Missing total amount'
            }
        
        # Convert to Decimal for precise comparison
        receipt_decimal = Decimal(str(receipt_total))
        po_decimal = Decimal(str(po_total))
        
        difference = abs(receipt_decimal - po_decimal)
        percentage_diff = float(difference / po_decimal) if po_decimal != 0 else 1.0
        
        # Calculate score based on percentage difference
        if percentage_diff <= 0.01:  # Within 1%
            score = 1.0
        elif percentage_diff <= 0.05:  # Within 5%
            score = 0.9
        elif percentage_diff <= 0.10:  # Within 10%
            score = 0.7
        else:
            score = 0.0
        
        return {
            'score': score,
            'match': score >= self.TOTAL_MATCH_THRESHOLD,
            'receipt_value': receipt_total,
            'po_value': po_total,
            'difference': float(difference),
            'percentage_difference': percentage_diff,
            'issue': None if score >= self.TOTAL_MATCH_THRESHOLD else f'Total amount differs by {percentage_diff:.1%}'
        }
    
    def _compare_items(self, receipt_items: List[Dict], po_items: List[Dict]) -> Dict[str, Any]:
        """
        Compare line items between receipt and PO.
        
        Args:
            receipt_items: List of items from receipt
            po_items: List of items from PO
            
        Returns:
            Dict containing items comparison results
        """
        if not receipt_items or not po_items:
            return {
                'score': 0.0,
                'match': False,
                'receipt_count': len(receipt_items) if receipt_items else 0,
                'po_count': len(po_items) if po_items else 0,
                'matched_items': 0,
                'issue': 'Missing item information'
            }
        
        matched_items = 0
        total_items = len(po_items)
        
        # Simple item matching based on name similarity
        for po_item in po_items:
            po_name = po_item.get('name', '').lower().strip()
            
            for receipt_item in receipt_items:
                receipt_name = receipt_item.get('name', '').lower().strip()
                
                # Simple name matching (in real implementation, use fuzzy matching)
                if po_name == receipt_name or po_name in receipt_name or receipt_name in po_name:
                    matched_items += 1
                    break
        
        score = matched_items / total_items if total_items > 0 else 0.0
        
        return {
            'score': score,
            'match': score >= self.ITEM_MATCH_THRESHOLD,
            'receipt_count': len(receipt_items),
            'po_count': len(po_items),
            'matched_items': matched_items,
            'issue': None if score >= self.ITEM_MATCH_THRESHOLD else f'Only {matched_items}/{total_items} items matched'
        }
    
    def _calculate_overall_score(self, vendor_match: Dict, total_match: Dict, items_match: Dict) -> float:
        """
        Calculate overall validation score from individual match scores.
        
        Args:
            vendor_match: Vendor comparison results
            total_match: Total comparison results
            items_match: Items comparison results
            
        Returns:
            Overall match score (0.0 to 1.0)
        """
        # Weighted average of match scores
        vendor_weight = 0.2
        total_weight = 0.5
        items_weight = 0.3
        
        overall_score = (
            vendor_match['score'] * vendor_weight +
            total_match['score'] * total_weight +
            items_match['score'] * items_weight
        )
        
        return round(overall_score, 3)
    
    def _identify_discrepancies(self, vendor_match: Dict, total_match: Dict, items_match: Dict) -> List[str]:
        """
        Identify specific discrepancies from validation results.
        
        Args:
            vendor_match: Vendor comparison results
            total_match: Total comparison results
            items_match: Items comparison results
            
        Returns:
            List of discrepancy descriptions
        """
        discrepancies = []
        
        if vendor_match.get('issue'):
            discrepancies.append(f"Vendor: {vendor_match['issue']}")
        
        if total_match.get('issue'):
            discrepancies.append(f"Total: {total_match['issue']}")
        
        if items_match.get('issue'):
            discrepancies.append(f"Items: {items_match['issue']}")
        
        return discrepancies
    
    def _store_validation_results(self, validation_result: Dict[str, Any]) -> None:
        """
        Store validation results in document metadata.
        
        Args:
            validation_result: Validation results to store
        """
        if not self.receipt_document.metadata:
            self.receipt_document.metadata = {}
        
        self.receipt_document.metadata['validation'] = validation_result
        self.receipt_document.processing_status = 'COMPLETED'
        self.receipt_document.processed_at = timezone.now()
        
        self.receipt_document.save(update_fields=[
            'metadata', 'processing_status', 'processed_at', 'updated_at'
        ])


def validate_receipt_against_po(receipt_document_id: str, purchase_order_id: str) -> Dict[str, Any]:
    """
    Validate a receipt document against a purchase order.
    
    This function can be called synchronously or as a Celery task.
    
    Args:
        receipt_document_id: ID of the receipt document
        purchase_order_id: ID of the purchase order
        
    Returns:
        Dict containing validation results
    """
    from documents.models import Document
    from .models import PurchaseOrder
    
    try:
        receipt_document = Document.objects.get(id=receipt_document_id)
        purchase_order = PurchaseOrder.objects.get(id=purchase_order_id)
        
        validator = ReceiptValidator(receipt_document, purchase_order)
        return validator.validate_receipt()
        
    except Document.DoesNotExist:
        logger.error(f"Receipt document not found: {receipt_document_id}")
        raise ValueError(f"Receipt document not found: {receipt_document_id}")
    
    except PurchaseOrder.DoesNotExist:
        logger.error(f"Purchase order not found: {purchase_order_id}")
        raise ValueError(f"Purchase order not found: {purchase_order_id}")
    
    except Exception as e:
        logger.error(f"Receipt validation failed: {str(e)}")
        raise