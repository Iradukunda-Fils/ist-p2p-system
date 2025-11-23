"""
PDF generation service for purchase orders using ReportLab.

This service creates professionally formatted PDF documents for purchase orders.
"""

import io
import logging
from decimal import Decimal
from typing import Any

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph,
    Spacer, PageBreak
)
from reportlab.lib.enums import TA_RIGHT, TA_CENTER
from django.core.files.base import ContentFile

logger = logging.getLogger(__name__)


class POPDFGenerator:
    """Service for generating purchase order PDF documents."""
    
    def generate_pdf(self, purchase_order) -> ContentFile:
        """
        Generate a professionally formatted PDF for a purchase order.
        
        Args:
            purchase_order: PurchaseOrder model instance
            
        Returns:
            ContentFile containing the generated PDF
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=letter,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=18,
        )
        
        # Build document elements
        story = []
        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#1a1a1a'),
            spaceAfter=30,
            alignment=TA_CENTER,
        )
        
        heading_style = ParagraphStyle(
            'CustomHeading',
            parent=styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#333333'),
            spaceAfter=12,
        )
        
        # Title
        story.append(Paragraph("PURCHASE ORDER", title_style))
        story.append(Spacer(1, 0.2*inch))
        
        # PO Number and Date
        po_info_data = [
            ['PO Number:', purchase_order.po_number],
            ['Date:', purchase_order.created_at.strftime('%B %d, %Y')],
            ['Status:', purchase_order.status.replace('_', ' ').title()],
        ]
        
        po_info_table = Table(po_info_data, colWidths=[2*inch, 3*inch])
        po_info_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(po_info_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Vendor Information
        story.append(Paragraph("Vendor Information", heading_style))
        vendor_data = self._build_vendor_section(purchase_order)
        vendor_table = Table(vendor_data, colWidths=[1.5*inch, 4*inch])
        vendor_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (0, -1), 'RIGHT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(vendor_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Items Table
        story.append(Paragraph("Order Items", heading_style))
        items_table = self._build_items_table(purchase_order)
        story.append(items_table)
        story.append(Spacer(1, 0.2*inch))
        
        # Total
        total_data = [
            ['', '', 'TOTAL:', f'${purchase_order.total:,.2f}']
        ]
        total_table = Table(total_data, colWidths=[1.5*inch, 2.5*inch, 1*inch, 1.5*inch])
        total_table.setStyle(TableStyle([
            ('ALIGN', (2, 0), (2, 0), 'RIGHT'),
            ('ALIGN', (3, 0), (3, 0), 'RIGHT'),
            ('FONTNAME', (2, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (2, 0), (-1, 0), 12),
            ('LINEABOVE', (2, 0), (-1, 0), 2, colors.black),
            ('TOPPADDING', (0, 0), (-1, -1), 12),
        ]))
        story.append(total_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Terms and Conditions
        if purchase_order.data and purchase_order.data.get('terms'):
            story.append(Paragraph("Terms and Conditions", heading_style))
            terms_content = self._build_terms_section(purchase_order)
            story.append(Paragraph(terms_content, styles['Normal']))
            story.append(Spacer(1, 0.2*inch))
        
        # Footer
        footer_text = (
            "<para align=center><font size=8 color=gray>"
            "This is a computer-generated purchase order and does not require a signature.<br/>"
            f"Generated on {purchase_order.created_at.strftime('%Y-%m-%d %H:%M:%S')}"
            "</font></para>"
        )
        story.append(Spacer(1, 0.5*inch))
        story.append(Paragraph(footer_text, styles['Normal']))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        
        # Create ContentFile
        filename = f'{purchase_order.po_number}.pdf'
        return ContentFile(buffer.read(), name=filename)
    
    def _build_vendor_section(self, purchase_order) -> list:
        """Build vendor information section."""
        vendor_data = [
            ['Company:', purchase_order.vendor],
        ]
        
        # Add additional vendor details if available
        if purchase_order.data and purchase_order.data.get('vendor_details'):
            details = purchase_order.data['vendor_details']
            if details.get('email'):
                vendor_data.append(['Email:', details['email']])
            if details.get('phone'):
                vendor_data.append(['Phone:', details['phone']])
            if details.get('address'):
                vendor_data.append(['Address:', details['address']])
        
        return vendor_data
    
    def _build_items_table(self, purchase_order) -> Table:
        """Build items table with product details."""
        items = purchase_order.get_items_from_data()
        
        # Table headers
        items_data = [[
            'Item',
            'Description',
            'Qty',
            'Unit Price',
            'Total'
        ]]
        
        # Add items
        for item in items:
            items_data.append([
                item.get('name', ''),
                item.get('description', '')[:40] + '...' if len(item.get('description', '')) > 40 else item.get('description', ''),
                f"{item.get('quantity', 0)} {item.get('unit_of_measure', 'pcs')}",
                f"${item.get('unit_price', 0):,.2f}",
                f"${item.get('line_total', 0):,.2f}",
            ])
        
        # Create table
        table = Table(items_data, colWidths=[1.5*inch, 2.5*inch, 0.8*inch, 1*inch, 1*inch])
        
        # Style table
        table.setStyle(TableStyle([
            # Header styling
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4a5568')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            
            # Body styling
            ('BACKGROUND', (0, 1), (-1, -1), colors.white),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('ALIGN', (0, 1), (1, -1), 'LEFT'),
            ('ALIGN', (2, 1), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
            
            # Grid
            ('GRID', (0, 0), (-1, -1), 1, colors.grey),
            ('LINEBELOW', (0, 0), (-1, 0), 2, colors.black),
            
            # Alternating row colors
            *[('BACKGROUND', (0, i), (-1, i), colors.HexColor('#f7fafc')) 
              for i in range(2, len(items_data), 2)]
        ]))
        
        return table
    
    def _build_terms_section(self, purchase_order) -> str:
        """Build terms and conditions text."""
        terms = purchase_order.data.get('terms', {})
        terms_text = []
        
        if terms.get('payment_terms'):
            terms_text.append(f"<b>Payment Terms:</b> {terms['payment_terms']}")
        
        if terms.get('delivery_terms'):
            terms_text.append(f"<b>Delivery Terms:</b> {terms['delivery_terms']}")
        
        if terms.get('validity'):
            terms_text.append(f"<b>Validity:</b> {terms['validity']}")
        
        if not terms_text:
            terms_text.append("Standard terms and conditions apply.")
        
        return '<br/>'.join(terms_text)
