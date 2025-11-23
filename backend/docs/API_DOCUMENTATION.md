# API Documentation

## Base URL

```
Development: http://localhost:8000/api
Production:  https://api.yourcompany.com/api
```

## Authentication

All API endpoints require authentication except for the login endpoint.

### Login

**Endpoint**: `POST /auth/login/`

**Request Body**:
```json
{
  "username": "john.doe",
  "password": "securepassword123"
}
```

**Response** (200 OK):
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "uuid",
    "username": "john.doe",
    "email": "john@company.com",
    "role": "staff"
  }
}
```

### Using JWT Tokens

Include the access token in all subsequent requests:

```http
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

## Purchase Requests

### List Purchase Requests

**Endpoint**: `GET /purchases/requests/`

**Query Parameters**:
- `status` - Filter by status (PENDING, APPROVED, REJECTED)
- `created_by` - Filter by creator user ID
- `amount` - Filter by amount
- `search` - Search in title and description
- `ordering` - Sort by field (created_at, amount, title)
- `page` - Page number for pagination

**Example Request**:
```http
GET /purchases/requests/?status=PENDING&ordering=-created_at
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "count": 25,
  "next": "http://localhost:8000/api/purchases/requests/?page=2",
  "previous": null,
  "results": [
    {
      "id": "uuid-1",
      "title": "Office Supplies Q4",
      "amount": "750.00",
      "status": "PENDING",
      "created_by": {
        "id": "uuid-user",
        "username": "john.doe",
        "email": "john@company.com"
      },
      "items_count": 5,
      "created_at": "2025-11-21T10:30:00Z",
      "updated_at": "2025-11-21T10:30:00Z"
    }
  ]
}
```

### Create Purchase Request

**Endpoint**: `POST /purchases/requests/`

**Request Body**:
```json
{
  "title": "Office Supplies Q4",
  "description": "Quarterly office supplies procurement",
  "items": [
    {
      "name": "Printer Paper A4",
      "quantity": 10,
      "unit_price": "25.00",
      "description": "White 80gsm paper",
      "unit_of_measure": "reams"
    },
    {
      "name": "Ballpoint Pens",
      "quantity": 50,
      "unit_price": "1.50",
      "unit_of_measure": "pieces"
    }
  ],
  "proforma_id": "uuid-document"  // Optional
}
```

**Response** (201 Created):
```json
{
  "message": "Purchase request created successfully",
  "request": {
    "id": "uuid-new",
    "title": "Office Supplies Q4",
    "description": "Quarterly office supplies procurement",
    "amount": "325.00",  // Auto-calculated
    "status": "PENDING",
    "created_by": {
      "id": "uuid-user",
      "username": "john.doe"
    },
    "items": [
      {
        "id": "uuid-item-1",
        "name": "Printer Paper A4",
        "quantity": 10,
        "unit_price": "25.00",
        "line_total": "250.00"
      },
      {
        "id": "uuid-item-2",
        "name": "Ballpoint Pens",
        "quantity": 50,
        "unit_price": "1.50",
        "line_total": "75.00"
      }
    ],
    "created_at": "2025-11-21T11:00:00Z"
  }
}
```

### Get Purchase Request Details

**Endpoint**: `GET /purchases/requests/{id}/`

**Response** (200 OK):
```json
{
  "id": "uuid",
  "title": "Office Supplies Q4",
  "description": "Quarterly office supplies procurement",
  "amount": "325.00",
  "status": "PENDING",
  "version": 0,
  "created_by": {
    "id": "uuid-user",
    "username": "john.doe",
    "email": "john@company.com",
    "role": "staff"
  },
  "items": [...],
  "approvals": [],
  "pending_approval_levels": [1],
  "required_approval_levels": [1],
  "is_fully_approved": false,
  "proforma": null,
  "created_at": "2025-11-21T11:00:00Z",
  "updated_at": "2025-11-21T11:00:00Z",
  "approved_at": null
}
```

### Update Purchase Request

**Endpoint**: `PUT /purchases/requests/{id}/` or `PATCH /purchases/requests/{id}/`

**Permissions**: Owner (when PENDING) or Admin

**Request Body**:
```json
{
  "title": "Updated Title",
  "description": "Updated description"
}
```

**Response** (200 OK):
```json
{
  "message": "Purchase request updated successfully",
  "request": {
    "id": "uuid",
    "title": "Updated Title",
    ...
  }
}
```

### Approve Purchase Request

**Endpoint**: `POST /purchases/requests/{id}/approve/`

**Permissions**: Approver Level 1/2 based on amount

**Request Body**:
```json
{
  "level": 1,
  "comment": "Approved for procurement"
}
```

**Response** (200 OK):
```json
{
  "message": "Request approved at level 1",
  "approval": {
    "id": "uuid-approval",
    "level": 1,
    "decision": "APPROVED",
    "comment": "Approved for procurement",
    "approver": {
      "id": "uuid-approver",
      "username": "manager.smith"
    },
    "created_at": "2025-11-21T12:00:00Z"
  },
  "request_status": "APPROVED",
  "pending_levels": [],
  "is_fully_approved": true
}
```

**Business Rules**:
- Requests ≤ $1,000: Require Level 1 approval only
- Requests > $1,000: Require both Level 1 and Level 2 approval
- Level 2 approval can only proceed after Level 1
- Cannot approve rejected requests
- Generates PO automatically when fully approved

### Reject Purchase Request

**Endpoint**: `POST /purchases/requests/{id}/reject/`

**Permissions**: Approver Level 1/2

**Request Body**:
```json
{
  "level": 1,
  "comment": "Budget constraints for Q4"  // Required
}
```

**Response** (200 OK):
```json
{
  "message": "Request rejected at level 1",
  "approval": {
    "id": "uuid-approval",
    "level": 1,
    "decision": "REJECTED",
    "comment": "Budget constraints for Q4",
    "approver": {
      "id": "uuid-approver",
      "username": "manager.smith"
    }
  },
  "request_status": "REJECTED"
}
```

### Delete Purchase Request

**Endpoint**: `DELETE /purchases/requests/{id}/`

**Permissions**: Admin only

**Response** (204 No Content):
```json
{
  "message": "Purchase request deleted successfully"
}
```

## Purchase Orders

### List Purchase Orders

**Endpoint**: `GET /purchases/purchase-orders/`

**Permissions**: Finance or Admin

**Query Parameters**:
- `status` - Filter by PO status
- `vendor` - Filter by vendor name
- `po_number` - Filter by PO number
- `search` - Search po_number, vendor, request title
- `ordering` - Sort by field

**Example Request**:
```http
GET /purchases/purchase-orders/?status=DRAFT&ordering=-created_at
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "count": 15,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": "uuid-po",
      "po_number": "PO-2025000001234",
      "vendor": "Acme Office Supplies Ltd.",
      "total": "325.00",
      "status": "DRAFT",
      "request_title": "Office Supplies Q4",
      "created_by": "john.doe",
      "created_at": "2025-11-21T12:05:00Z"
    }
  ]
}
```

### Get Purchase Order Details

**Endpoint**: `GET /purchases/purchase-orders/{id}/`

**Permissions**: Finance or Admin

**Response** (200 OK):
```json
{
  "id": "uuid-po",
  "po_number": "PO-2025000001234",
  "vendor": "Acme Office Supplies Ltd.",
  "vendor_contact": "contact@acme.com",
  "total": "325.00",
  "status": "DRAFT",
  "metadata": {
    "items": [
      {
        "name": "Printer Paper A4",
        "quantity": 10,
        "unit_price": 25.00,
        "line_total": 250.00,
        "unit_of_measure": "reams"
      }
    ],
    "request_title": "Office Supplies Q4",
    "terms": {
      "payment_terms": "Net 30",
      "delivery_terms": "FOB Destination"
    }
  },
  "request": {
    "id": "uuid-request",
    "title": "Office Supplies Q4",
    "created_by": {
      "username": "john.doe"
    }
  },
  "items": [...],
  "created_at": "2025-11-21T12:05:00Z"
}
```

### Generate PO PDF

**Endpoint**: `GET /purchases/purchase-orders/{id}/generate-pdf/`

**Permissions**: Finance or Admin

**Response** (200 OK):
```json
{
  "message": "PDF generated successfully",
  "po_number": "PO-2025000001234"
}
```

### Get PO Summary Statistics

**Endpoint**: `GET /purchases/purchase-orders/summary/`

**Permissions**: Finance or Admin

**Response** (200 OK):
```json
{
  "total_pos": 45,
  "draft_pos": 12,
  "sent_pos": 18,
  "acknowledged_pos": 10,
  "fulfilled_pos": 5,
  "total_value": 125750.50
}
```

## Documents

### Upload Document

**Endpoint**: `POST /documents/upload/`

**Content-Type**: `multipart/form-data`

**Form Data**:
- `file` - Document file (PDF, PNG, JPG)
- `document_type` - Type (proforma, receipt, po, other)
- `description` - Optional description

**Example Request**:
```http
POST /documents/upload/
Authorization: Bearer {token}
Content-Type: multipart/form-data

------boundary
Content-Disposition: form-data; name="file"; filename="proforma.pdf"
Content-Type: application/pdf

[binary file content]
------boundary
Content-Disposition: form-data; name="document_type"

proforma
------boundary--
```

**Response** (201 Created):
```json
{
  "id": "uuid-doc",
  "original_filename": "proforma.pdf",
  "document_type": "proforma",
  "file_size": 245612,
  "content_type": "application/pdf",
  "processing_status": "PENDING",
  "uploaded_by": {
    "username": "john.doe"
  },
  "uploaded_at": "2025-11-21T13:00:00Z",
  "file_url": "https://s3.amazonaws.com/bucket/documents/uuid-doc.pdf"
}
```

**File Validation**:
- **Allowed types**: PDF, PNG, JPG, JPEG
- **Max size**: 10MB
- **Virus scanning**: Automatic scan on upload

## Error Responses

### 400 Bad Request
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "amount": ["Ensure this value is greater than or equal to 0.01."],
      "items": ["This field is required."]
    }
  }
}
```

### 401 Unauthorized
```json
{
  "error": {
    "code": "AUTHENTICATION_FAILED",
    "message": "Authentication credentials were not provided."
  }
}
```

### 403 Forbidden
```json
{
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "You do not have permission to perform this action."
  }
}
```

### 404 Not Found
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Purchase request not found."
  }
}
```

### 409 Conflict
```json
{
  "error": {
    "code": "APPROVAL_ALREADY_EXISTS",
    "message": "Level 1 already approved by manager.smith"
  }
}
```

### 500 Internal Server Error
```json
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred. Please try again later."
  }
}
```

## Rate Limiting

API requests are rate-limited to prevent abuse:

- **Anonymous**: 100 requests/hour
- **Authenticated**: 1000 requests/hour
- **Premium**: 5000 requests/hour

**Rate Limit Headers**:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1637510400
```

## Pagination

List endpoints use cursor-based pagination:

```json
{
  "count": 100,
  "next": "http://localhost:8000/api/purchases/requests/?cursor=cD0yMDI1",
  "previous": null,
  "results": [...]
}
```

**Query Parameters**:
- `page_size` - Items per page (default: 20, max: 100)
- `cursor` - Pagination cursor from next/previous

## Filtering & Search

### Filtering
```http
GET /purchases/requests/?status=PENDING&amount__gte=1000
```

**Filter Operators**:
- `exact` - Exact match (default)
- `contains` - Case-sensitive containment
- `icontains` - Case-insensitive containment
- `gt/gte` - Greater than / greater than or equal
- `lt/lte` - Less than / less than or equal

### Searching
```http
GET /purchases/requests/?search=office+supplies
```

Searches across configured fields (title, description, etc.)

### Ordering
```http
GET /purchases/requests/?ordering=-created_at,amount
```

- Prefix with `-` for descending order
- Multiple fields supported

## Webhooks

*Future feature - notify external systems of events*

## Versioning

Current API version: **v1** (implicit)

Future versions will use URL-based versioning: `/api/v2/...`

---

**API Version**: 1.0  
**Last Updated**: 2025-11-21
