# System Architecture

## Table of Contents

1. [Overview](#overview)
2. [System Components](#system-components)
3. [Architecture Patterns](#architecture-patterns)
4. [Data Models](#data-models)
5. [API Design](#api-design)
6. [Security Architecture](#security-architecture)
7. [Workflow Diagrams](#workflow-diagrams)
8. [Performance Optimization](#performance-optimization)

## Overview

The Django P2P Procurement System follows a service-oriented layered architecture with clear separation of concerns. The system is designed for scalability, maintainability, and security.

### Architectural Principles

1. **Separation of Concerns**: Business logic isolated in service layer
2. **Single Responsibility**: Each module has one clear purpose
3. **DRY (Don't Repeat Yourself)**: Reusable components and utilities
4. **SOLID Principles**: Object-oriented design best practices
5. **API-First Design**: RESTful API as primary interface
6. **Async-Ready**: Background processing for heavy operations

## System Components

### 1. Presentation Layer

**Technology**: Django REST Framework

Responsibilities:
- HTTP request/response handling
- Input validation via serializers
- Authentication and permission checks
- API endpoint routing

**Key Files**:
- `purchases/views.py` - ViewSets for purchase requests
- `purchases/views_po.py` - ViewSets for purchase orders
- `purchases/serializers.py` - Data validation and serialization
- `purchases/urls.py` - URL routing configuration

### 2. Service Layer

**Purpose**: Encapsulate business logic and orchestrate operations

**Services**:

#### ApprovalService
- Handles purchase request approval/rejection workflows
- Implements concurrency control with database locking
- Validates approval permissions and business rules
- Triggers PO generation on final approval

**File**: `purchases/services/approval_service.py`

#### PurchaseRequestService  
- Manages PR CRUD operations
- Handles PR lifecycle and status transitions
- Validates modification permissions
- Calculates total amounts from line items

**File**: `purchases/services/purchase_request_service.py`

#### PurchaseOrderService
- Generates POs from approved requests
- Compiles data from PRs and proforma metadata
- Creates unique PO numbers
- Manages PO lifecycle

**File**: `purchases/services/purchase_order_service.py`

#### POPDFGenerator
- Generates professional PDF documents for POs
- Creates formatted tables and sections
- Includes vendor info, items, and terms
- Uses ReportLab for PDF generation

**File**: `purchases/services/pdf_service.py`

### 3. Data Layer

**Technology**: Django ORM with PostgreSQL

**Models**:

```python
# Core Models
- PurchaseRequest: Main PR entity
- RequestItem: Line items for PRs
- Approval: Approval decisions
- PurchaseOrder: Generated purchase orders  
- Document: File storage metadata
- User: Custom user with RBAC
```

**Design Patterns**:
- **Select for Update**: Row-level locking for approvals
- **Optimistic Locking**: Version field for conflict detection
- **Soft Delete**: Audit trail preservation
- **Timestamping**: Created/updated tracking

### 4. Background Processing

**Technology**: Celery + Redis

**Tasks**:
- `process_proforma_document`: Extract vendor data from uploads
- `generate_purchase_order`: Create PO from approved PR
- `validate_receipt`: Compare receipt against PO

**Configuration**:
- **Broker**: Redis for message queuing
- **Backend**: Redis for result storage
- **Serializer**: JSON for task data
- **Concurrency**: Worker pool for parallel processing

### 5. Storage Layer

**Document Storage**: AWS S3
- Proforma invoices
- Purchase order PDFs
- Receipt images

**Database**: PostgreSQL
- Transactional data
- User information
- System metadata

**Cache**: Redis
- Session storage
- Query result caching
- Rate limiting data

## Architecture Patterns

### Service Layer Pattern

```
┌──────────────┐
│     View     │  ← Handles HTTP, delegates to service
└──────┬───────┘
       │
       ▼
┌──────────────┐
│   Service    │  ← Business logic, orchestration
└──────┬───────┘
       │
       ▼
┌──────────────┐
│     Model    │  ← Data access, persistence
└──────────────┘
```

**Benefits**:
- Testable business logic
- Reusable across different interfaces
- Clear responsibility boundaries
- Easier to maintain and modify

### Repository/Selector Pattern

```python
# Optimized query patterns
class PurchaseRequestSelector:
    @staticmethod
    def get_with_related(request_id):
        return PurchaseRequest.objects.select_related(
            'created_by',
            'purchase_order'
        ).prefetch_related(
            'items',
            'approvals__approver'
        ).get(pk=request_id)
```

### Factory Pattern

```python
# PO number generation
class PurchaseOrder:
    @classmethod
    def _generate_po_number(cls):
        # Format: PO-YYYYNNNNNNXXX
        # Ensures uniqueness with retry logic
```

## Data Models

### Entity Relationship Diagram

```
┌─────────────────┐
│      User       │
│  - username     │
│  - email        │
│  - role         │
└────────┬────────┘
         │ 1
         │
         │ N
┌────────┴────────────┐
│  PurchaseRequest    │
│  - title            │
│  - amount           │
│  - status           │
│  - version          │
└─────────┬───────────┘
          │ 1
          │
          ├──N─────┐
          │        │
┌─────────▼──┐  ┌──▼──────────┐
│ RequestItem│  │  Approval   │
│ - name     │  │  - level    │
│ - quantity │  │  - decision │
│ - price    │  │  - comment  │
└────────────┘  └─────────────┘
          │ 1
          │
          │ 1
┌─────────▼───────────┐
│   PurchaseOrder     │
│  - po_number        │
│  - vendor           │
│  - total            │
│  - metadata (JSON)  │
└─────────────────────┘
```

### Model Responsibilities

#### PurchaseRequest
- **Status Management**: PENDING → APPROVED/REJECTED
- **Amount Calculation**: Aggregate from RequestItems
- **Approval Logic**: Determine required approval levels
- **Version Control**: Optimistic locking for concurrent updates

#### Approval
- **Unique Constraint**: One decision per level per request
- **Workflow Enforcement**: Cannot approve after rejection
- **Permission Validation**: Check approver role
- **Status Updates**: Update parent PR status

#### PurchaseOrder
- **Auto-generation**: Created from approved PRs
- **Unique PO Numbers**: Format PO-YYYYNNNNNNXXX
- **Metadata Storage**: Flexible JSON field for vendor/item data
- **PDF Generation**: On-demand PDF creation

## API Design

### RESTful Principles

- **Resource-Based URLs**: `/api/purchases/requests/`
- **HTTP Verbs**: GET, POST, PUT, DELETE
- **Status Codes**: 200, 201, 400, 403, 404, 500
- **JSON Format**: Request and response bodies
- **Filtering**: Query parameters for list endpoints
- **Pagination**: Cursor-based pagination for large datasets

### API Versioning

**URL-based versioning** (future): `/api/v1/purchases/`

**Current**: Single version, backward-compatible changes only

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "amount": ["Ensure this value is greater than or equal to 0.01."]
    }
  }
}
```

### Success Response Format

```json
{
  "message": "Purchase request created successfully",
  "request": {
    "id": "uuid",
    "title": "Office Supplies",
    "amount": "500.00",
    "status": "PENDING"
  }
}
```

## Security Architecture

### Authentication

**Method**: JWT (JSON Web Tokens)

**Flow**:
1. User logs in with credentials
2. Server validates and issues JWT
3. Client includes JWT in Authorization header
4. Server validates JWT on each request

### Authorization

**Role-Based Access Control (RBAC)**:

```python
class User(AbstractUser):
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
        default='staff'
    )
```

**Permission Matrix**:

| Action | Staff | Approver L1 | Approver L2 | Finance | Admin |
|--------|-------|-------------|-------------|---------|-------|
| Create PR | ✓ | ✓ | ✓ | ✓ | ✓ |
| Approve L1 | ✗ | ✓ | ✓ | ✗ | ✓ |
| Approve L2 | ✗ | ✗ | ✓ | ✗ | ✓ |
| View PO | ✗ | ✗ | ✗ | ✓ | ✓ |
| Delete PR | ✗ | ✗ | ✗ | ✗ | ✓ |

### Data Protection

- **Encryption at Rest**: Database encryption
- **Encryption in Transit**: HTTPS/TLS
- **File Upload Validation**: Type, size, content checks
- **SQL Injection Prevention**: ORM parameterized queries
- **XSS Protection**: Django template escaping
- **CSRF Protection**: CSRF tokens for state-changing requests

## Workflow Diagrams

### Approval Workflow

```
┌─────────────────┐
│ Create Request  │
│   (Staff)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Status:        │
│  PENDING        │
└────────┬────────┘
         │
         ├──────────────────┐
         │                  │
         ▼                  ▼
┌─────────────────┐  ┌─────────────────┐
│ Level 1 Approve │  │ Level 1 Reject  │
└────────┬────────┘  └────────┬────────┘
         │                    │
   If amount > $1000          │
         │                    │
         ▼                    ▼
┌─────────────────┐  ┌─────────────────┐
│ Level 2 Approve │  │  Status:        │
└────────┬────────┘  │  REJECTED       │
         │           └─────────────────┘
         ▼
┌─────────────────┐
│  Status:        │
│  APPROVED       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generate PO     │
│   (Automatic)   │
└─────────────────┘
```

### Document Processing Flow

```
┌──────────────┐
│ Upload       │
│ Proforma     │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ Store in S3      │
│ Create Document  │
│ Record          │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Trigger Celery   │
│ Task             │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Extract Text     │
│ (Tesseract OCR)  │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Parse Metadata   │
│ (OpenAI API)     │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Update Document  │
│ Metadata         │
└──────────────────┘
```

## Performance Optimization

### Database Optimization

**Query Optimization**:
```python
# Bad: N+1 queries
for pr in PurchaseRequest.objects.all():
    print(pr.created_by.username)  # Separate query each time

# Good: select_related
for pr in PurchaseRequest.objects.select_related('created_by'):
    print(pr.created_by.username)  # Single JOIN query
```

**Indexes**:
```python
class Meta:
    indexes = [
        models.Index(fields=['status'], name='idx_pr_status'),
        models.Index(fields=['created_by'], name='idx_pr_created_by'),
        models.Index(fields=['status', 'created_at'], name='idx_pr_status_created'),
    ]
```

### Caching Strategy

- **Query Result Caching**: Frequently accessed data
- **Session Caching**: User sessions in Redis
- **Template Fragment Caching**: Rendered HTML sections

### Async Processing

**Celery Task Types**:
- **Immediate**: Quick tasks (<5s)
- **Scheduled**: Time-based execution
- **Periodic**: Regular intervals (beat scheduler)

**Task Optimization**:
- Chunking large datasets
- Retry logic with exponential backoff
- Task result expiration
- Monitoring with Flower

---

**Last Updated**: 2025-11-21  
**Architecture Version**: 2.0
