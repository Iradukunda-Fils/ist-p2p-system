# Design Document

## Overview

The Django Procure-to-Pay system is designed as a modern, scalable backend API that handles the complete procurement workflow from purchase request creation to receipt validation. The system uses Django REST Framework for API endpoints, Celery for background processing, PostgreSQL for data persistence, and Redis for caching and task queuing.

The architecture follows Django best practices with a clear separation of concerns, using apps to organize functionality and implementing proper security, concurrency controls, and observability.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Load Balancer │    │   Monitoring    │
│   (External)    │◄──►│   (nginx/ALB)   │◄──►│   (Logs/Metrics)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Django Application                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │    Users    │  │  Purchases  │  │  Documents  │            │
│  │     App     │  │     App     │  │     App     │            │
│  └─────────────┘  └─────────────┘  └─────────────┘            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Core Services                        │   │
│  │  • Authentication & Authorization                       │   │
│  │  • Permissions & RBAC                                   │   │
│  │  • Common Utilities                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                ▼               ▼               ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   PostgreSQL    │  │     Redis       │  │   File Storage  │
│   (Primary DB)  │  │  (Cache/Queue)  │  │   (S3/Local)    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                                │
                                ▼
                ┌─────────────────────────────────┐
                │        Celery Workers           │
                │  • Document Processing          │
                │  • PO Generation               │
                │  • Receipt Validation          │
                └─────────────────────────────────┘
```

### Technology Stack

- **Backend Framework**: Django 4.2+ with Django REST Framework
- **Authentication**: JWT using djangorestframework-simplejwt
- **Database**: PostgreSQL with psycopg2
- **Task Queue**: Celery with Redis broker
- **File Storage**: S3-compatible storage with django-storages
- **Document Processing**: pytesseract, pdfplumber, PyPDF2, OpenAI API
- **API Documentation**: drf-spectacular for OpenAPI/Swagger
- **Testing**: pytest with pytest-django
- **Containerization**: Docker with docker-compose
- **CI/CD**: GitHub Actions

## Components and Interfaces

### 1. Authentication & Authorization System

**JWT Authentication Flow:**
```python
# Token acquisition
POST /api/auth/token/
{
    "username": "user@example.com",
    "password": "password"
}
# Response: {"access": "jwt_token", "refresh": "refresh_token"}

# Token refresh
POST /api/auth/token/refresh/
{"refresh": "refresh_token"}
```

**Role-Based Permissions:**
- Custom DRF permission classes for each role
- Middleware to inject user roles into request context
- Decorator-based permission checking for sensitive operations

### 2. Purchase Request Management

**Core Models:**
```python
class PurchaseRequest(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='PENDING')
    created_by = models.ForeignKey(User, on_delete=models.PROTECT)
    version = models.PositiveIntegerField(default=0)  # Optimistic locking
    # Timestamps, relationships, indexes

class RequestItem(models.Model):
    request = models.ForeignKey(PurchaseRequest, related_name='items')
    name = models.CharField(max_length=255)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
```

**API Endpoints:**
- `GET /api/requests/` - List requests with filtering and pagination
- `POST /api/requests/` - Create new request with items and optional proforma
- `GET /api/requests/{id}/` - Retrieve request details
- `PUT /api/requests/{id}/` - Update request (only when PENDING)

### 3. Approval Workflow System

**Concurrency-Safe Approval Logic:**
```python
@transaction.atomic
def approve_request(request_id, approver, level, comment):
    # Use SELECT FOR UPDATE to prevent race conditions
    pr = PurchaseRequest.objects.select_for_update().get(pk=request_id)
    
    if pr.status != 'PENDING':
        raise ValidationError("Request is not in pending status")
    
    # Check authorization and create approval record
    approval, created = Approval.objects.get_or_create(
        request=pr, level=level,
        defaults={'approver': approver, 'decision': 'APPROVED', 'comment': comment}
    )
    
    # Check if all required approvals are complete
    if is_final_approval(pr, level):
        pr.status = 'APPROVED'
        pr.last_approved_by = approver
        pr.version += 1
        pr.save()
        
        # Trigger PO generation
        generate_purchase_order.delay(pr.id)
```

**API Endpoints:**
- `PATCH /api/requests/{id}/approve/` - Approve request at specific level
- `PATCH /api/requests/{id}/reject/` - Reject request with comment

### 4. Document Processing Pipeline

**Document Upload and Processing:**
```python
class Document(models.Model):
    DOC_TYPE_CHOICES = [('PROFORMA', 'PROFORMA'), ('RECEIPT', 'RECEIPT'), ('PO', 'PO')]
    uploaded_by = models.ForeignKey(User, on_delete=models.PROTECT)
    file = models.FileField(upload_to='documents/%Y/%m/%d/')
    doc_type = models.CharField(max_length=16, choices=DOC_TYPE_CHOICES)
    metadata = models.JSONField(null=True, blank=True)
    extracted_text = models.TextField(null=True, blank=True)
    processing_status = models.CharField(max_length=20, default='PENDING')
```

**Processing Pipeline:**
1. File upload → S3 storage → Document record creation
2. Celery task: `extract_document_metadata.delay(document_id)`
3. OCR/parsing with pytesseract, pdfplumber
4. Fallback to OpenAI API for complex documents
5. Structured metadata extraction and storage

### 5. Purchase Order Generation

**Automatic PO Creation:**
```python
@app.task(bind=True, max_retries=3)
def generate_purchase_order(self, request_id):
    try:
        pr = PurchaseRequest.objects.get(pk=request_id)
        
        # Generate unique PO number
        po_number = f"PO-{datetime.now().year}{pr.id:06d}{random.randint(100, 999)}"
        
        # Combine request data with proforma metadata
        po_data = {
            'vendor': extract_vendor_from_proforma(pr.proforma),
            'items': combine_request_and_proforma_items(pr),
            'total': pr.amount,
            'terms': extract_terms_from_proforma(pr.proforma)
        }
        
        # Create PO record
        po = PurchaseOrder.objects.create(
            request=pr,
            po_number=po_number,
            vendor=po_data['vendor'],
            total=pr.amount,
            data=po_data
        )
        
        # Generate PDF document (optional)
        generate_po_pdf.delay(po.id)
        
    except Exception as exc:
        self.retry(countdown=60 * (2 ** self.request.retries))
```

### 6. Receipt Validation System

**Validation Logic:**
```python
@app.task
def validate_receipt_against_po(receipt_doc_id, po_id):
    receipt = Document.objects.get(pk=receipt_doc_id)
    po = PurchaseOrder.objects.get(pk=po_id)
    
    # Extract receipt data
    receipt_data = extract_receipt_metadata(receipt)
    
    # Compare with PO
    validation_result = {
        'vendor_match': compare_vendors(receipt_data['vendor'], po.vendor),
        'total_match': compare_totals(receipt_data['total'], po.total),
        'items_match': compare_items(receipt_data['items'], po.data['items']),
        'match_score': calculate_overall_score(),
        'discrepancies': identify_discrepancies()
    }
    
    # Store validation result
    receipt.metadata['validation'] = validation_result
    receipt.save()
    
    # Flag for manual review if needed
    if validation_result['match_score'] < VALIDATION_THRESHOLD:
        notify_finance_team.delay(po_id, validation_result)
```

## Data Models

### Database Schema Design

**Indexes and Constraints:**
```sql
-- Purchase Request indexes
CREATE INDEX idx_purchase_request_status ON purchases_purchaserequest(status);
CREATE INDEX idx_purchase_request_created_by ON purchases_purchaserequest(created_by_id);
CREATE INDEX idx_purchase_request_amount ON purchases_purchaserequest(amount);
CREATE INDEX idx_purchase_request_created_at ON purchases_purchaserequest(created_at);

-- Approval indexes
CREATE UNIQUE INDEX idx_approval_unique ON purchases_approval(request_id, level);
CREATE INDEX idx_approval_approver ON purchases_approval(approver_id);

-- Document indexes
CREATE INDEX idx_document_type ON documents_document(doc_type);
CREATE INDEX idx_document_uploaded_by ON documents_document(uploaded_by_id);
```

**Relationships and Constraints:**
- Foreign key constraints with appropriate ON DELETE behaviors
- Unique constraints for PO numbers and approval levels
- Check constraints for positive amounts and quantities
- JSON field validation for metadata structures

## Error Handling

### Exception Hierarchy
```python
class P2PException(Exception):
    """Base exception for P2P system"""
    pass

class ApprovalException(P2PException):
    """Approval workflow related exceptions"""
    pass

class DocumentProcessingException(P2PException):
    """Document processing related exceptions"""
    pass

class ValidationException(P2PException):
    """Data validation exceptions"""
    pass
```

### Error Response Format
```json
{
    "error": {
        "code": "INVALID_APPROVAL_LEVEL",
        "message": "User does not have permission to approve at level 2",
        "details": {
            "user_level": 1,
            "required_level": 2
        }
    }
}
```

### Retry and Fallback Strategies
- Celery task retries with exponential backoff
- Circuit breaker pattern for external API calls
- Graceful degradation for document processing failures
- Database connection pooling and retry logic

## Testing Strategy

### Test Categories

**1. Unit Tests:**
- Model validation and business logic
- Serializer validation
- Permission classes
- Utility functions

**2. Integration Tests:**
- API endpoint functionality
- Database transactions
- Celery task execution
- File upload and processing

**3. Concurrency Tests:**
```python
def test_concurrent_approvals():
    """Test that concurrent approval attempts are handled safely"""
    pr = PurchaseRequestFactory()
    
    def approve_request():
        # Simulate concurrent approval attempts
        response = client.patch(f'/api/requests/{pr.id}/approve/', {
            'level': 1, 'comment': 'Approved'
        })
        return response.status_code
    
    # Run multiple threads attempting to approve
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(approve_request) for _ in range(5)]
        results = [f.result() for f in futures]
    
    # Only one should succeed (200), others should get 409 or 400
    assert results.count(200) == 1
```

**4. Security Tests:**
- Authentication and authorization
- Input validation and sanitization
- File upload security
- Rate limiting

### Test Data Management
- Factory classes for model creation
- Fixtures for complex test scenarios
- Mock external services (OpenAI, S3)
- Database isolation between tests

## Deployment Architecture

### Container Strategy
```dockerfile
# Multi-stage Dockerfile
FROM python:3.11-slim as base
# Install system dependencies
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

FROM base as dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM dependencies as application
COPY src/ /app/src/
WORKDIR /app
EXPOSE 8000
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "config.wsgi:application"]
```

### Docker Compose Services
```yaml
services:
  web:
    build: .
    ports: ["8000:8000"]
    depends_on: [db, redis]
    
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: p2p_db
      
  redis:
    image: redis:7-alpine
    
  celery:
    build: .
    command: celery -A config worker -l info
    depends_on: [db, redis]
    
  celery-beat:
    build: .
    command: celery -A config beat -l info
```

### Production Considerations
- Health checks for all services
- Resource limits and scaling policies
- Secrets management with environment variables
- Log aggregation and monitoring
- Database backup and recovery procedures
- SSL/TLS termination at load balancer
- CDN for static file serving

This design provides a robust, scalable foundation for the Django P2P system with proper separation of concerns, security controls, and operational considerations.