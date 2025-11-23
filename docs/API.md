# API Documentation

This document provides comprehensive documentation for the P2P Procurement System REST API.

## Base URL

- **Development**: `http://localhost:8000/api/`
- **Production**: `https://yourdomain.com/api/`

## Authentication

The API uses JWT (JSON Web Token) authentication with secure HTTP-only cookies.

### Authentication Flow

```http
POST /api/auth/token/
Content-Type: application/json

{
  "username": "your_username",
  "password": "your_password"
}
```

**Response:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "username": "your_username",
    "email": "user@example.com",
    "role": "staff",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

### Token Refresh

```http
POST /api/auth/token/refresh/
Content-Type: application/json

{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

### Logout

```http
POST /api/auth/logout/
Authorization: Bearer <access_token>
```

## User Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| `staff` | Regular employees | Create requests, view own requests |
| `approver_lvl1` | Level 1 approvers | Approve requests ≤ $1,000 |
| `approver_lvl2` | Level 2 approvers | Approve requests > $1,000 |
| `finance` | Finance team | Manage purchase orders, view all requests |
| `admin` | System administrators | Full system access |

## API Endpoints

### Authentication Endpoints

#### Login
```http
POST /api/auth/token/
```

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:** `200 OK`
```json
{
  "access": "string",
  "refresh": "string",
  "user": {
    "id": "integer",
    "username": "string",
    "email": "string",
    "role": "string",
    "first_name": "string",
    "last_name": "string"
  }
}
```

#### Token Refresh
```http
POST /api/auth/token/refresh/
```

**Request Body:**
```json
{
  "refresh": "string"
}
```

**Response:** `200 OK`
```json
{
  "access": "string"
}
```

#### Logout
```http
POST /api/auth/logout/
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "message": "Successfully logged out"
}
```

### User Management

#### Get Current User
```http
GET /api/users/me/
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "username": "john_doe",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "role": "staff",
  "is_active": true,
  "date_joined": "2024-01-15T10:30:00Z"
}
```

#### Update User Profile
```http
PUT /api/users/me/
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Doe",
  "email": "john.doe@example.com"
}
```

### Purchase Requests

#### List Purchase Requests
```http
GET /api/purchases/requests/
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `status` - Filter by status (`pending`, `approved`, `rejected`)
- `user` - Filter by user ID
- `search` - Search in title and description
- `ordering` - Order by field (`created_at`, `-created_at`, `total_amount`)
- `page` - Page number for pagination
- `page_size` - Number of items per page (default: 20)

**Response:** `200 OK`
```json
{
  "count": 25,
  "next": "http://localhost:8000/api/purchases/requests/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "title": "Office Supplies",
      "description": "Monthly office supplies order",
      "status": "pending",
      "total_amount": "150.00",
      "user": {
        "id": 1,
        "username": "john_doe",
        "first_name": "John",
        "last_name": "Doe"
      },
      "approver": null,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "items": [
        {
          "id": 1,
          "description": "Printer Paper",
          "quantity": 10,
          "unit_price": "5.00",
          "total_price": "50.00"
        }
      ]
    }
  ]
}
```

#### Create Purchase Request
```http
POST /api/purchases/requests/
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Office Supplies",
  "description": "Monthly office supplies order",
  "items": [
    {
      "description": "Printer Paper",
      "quantity": 10,
      "unit_price": "5.00"
    },
    {
      "description": "Pens",
      "quantity": 20,
      "unit_price": "1.50"
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "id": 1,
  "title": "Office Supplies",
  "description": "Monthly office supplies order",
  "status": "pending",
  "total_amount": "80.00",
  "user": {
    "id": 1,
    "username": "john_doe",
    "first_name": "John",
    "last_name": "Doe"
  },
  "approver": null,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "items": [
    {
      "id": 1,
      "description": "Printer Paper",
      "quantity": 10,
      "unit_price": "5.00",
      "total_price": "50.00"
    },
    {
      "id": 2,
      "description": "Pens",
      "quantity": 20,
      "unit_price": "1.50",
      "total_price": "30.00"
    }
  ]
}
```

#### Get Purchase Request Details
```http
GET /api/purchases/requests/{id}/
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "title": "Office Supplies",
  "description": "Monthly office supplies order",
  "status": "pending",
  "total_amount": "80.00",
  "user": {
    "id": 1,
    "username": "john_doe",
    "first_name": "John",
    "last_name": "Doe"
  },
  "approver": null,
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z",
  "approval_history": [
    {
      "id": 1,
      "action": "created",
      "user": "john_doe",
      "timestamp": "2024-01-15T10:30:00Z",
      "comment": "Initial request creation"
    }
  ],
  "items": [
    {
      "id": 1,
      "description": "Printer Paper",
      "quantity": 10,
      "unit_price": "5.00",
      "total_price": "50.00"
    }
  ]
}
```

#### Update Purchase Request
```http
PUT /api/purchases/requests/{id}/
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Updated Office Supplies",
  "description": "Updated monthly office supplies order",
  "items": [
    {
      "id": 1,
      "description": "Printer Paper",
      "quantity": 15,
      "unit_price": "5.00"
    }
  ]
}
```

#### Approve Purchase Request
```http
POST /api/purchases/requests/{id}/approve/
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "comment": "Approved for office use"
}
```

**Response:** `200 OK`
```json
{
  "message": "Request approved successfully",
  "status": "approved"
}
```

#### Reject Purchase Request
```http
POST /api/purchases/requests/{id}/reject/
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "comment": "Budget constraints - please reduce quantity"
}
```

**Response:** `200 OK`
```json
{
  "message": "Request rejected",
  "status": "rejected"
}
```

### Purchase Orders

#### List Purchase Orders
```http
GET /api/purchases/purchase-orders/
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `status` - Filter by status
- `search` - Search in PO number and description
- `ordering` - Order by field
- `page` - Page number
- `page_size` - Items per page

**Response:** `200 OK`
```json
{
  "count": 10,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "po_number": "PO-2024-001",
      "purchase_request": {
        "id": 1,
        "title": "Office Supplies"
      },
      "vendor": "Office Depot",
      "total_amount": "80.00",
      "status": "pending",
      "created_at": "2024-01-15T11:00:00Z",
      "items": [
        {
          "id": 1,
          "description": "Printer Paper",
          "quantity": 10,
          "unit_price": "5.00",
          "total_price": "50.00"
        }
      ]
    }
  ]
}
```

#### Get Purchase Order Details
```http
GET /api/purchases/purchase-orders/{id}/
Authorization: Bearer <access_token>
```

#### Generate Purchase Order PDF
```http
GET /api/purchases/purchase-orders/{id}/generate-pdf/
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="PO-2024-001.pdf"`

#### Purchase Order Summary
```http
GET /api/purchases/purchase-orders/summary/
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "total_orders": 25,
  "total_value": "15750.00",
  "pending_orders": 5,
  "completed_orders": 20,
  "monthly_stats": {
    "current_month": {
      "orders": 8,
      "value": "3200.00"
    },
    "previous_month": {
      "orders": 12,
      "value": "4800.00"
    }
  }
}
```

### Documents

#### Upload Document
```http
POST /api/documents/upload/
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Form Data:**
- `file` - Document file (PDF, JPG, PNG)
- `document_type` - Type of document (`proforma`, `receipt`, `invoice`)
- `purchase_request` - Related purchase request ID (optional)

**Response:** `201 Created`
```json
{
  "id": 1,
  "filename": "proforma_invoice.pdf",
  "document_type": "proforma",
  "file_size": 245760,
  "upload_date": "2024-01-15T12:00:00Z",
  "processing_status": "pending",
  "extracted_data": null,
  "purchase_request": 1
}
```

#### Get Document Details
```http
GET /api/documents/{id}/
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "id": 1,
  "filename": "proforma_invoice.pdf",
  "document_type": "proforma",
  "file_size": 245760,
  "upload_date": "2024-01-15T12:00:00Z",
  "processing_status": "completed",
  "extracted_data": {
    "vendor_name": "Office Depot",
    "total_amount": "80.00",
    "items": [
      {
        "description": "Printer Paper",
        "quantity": 10,
        "unit_price": "5.00"
      }
    ]
  },
  "purchase_request": 1
}
```

#### Download Document
```http
GET /api/documents/{id}/download/
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
- Content-Type: Based on file type
- Content-Disposition: `attachment; filename="document.pdf"`

### Dashboard

#### Dashboard Statistics
```http
GET /api/dashboard/stats/
Authorization: Bearer <access_token>
```

**Response:** `200 OK`
```json
{
  "total_requests": 45,
  "pending_requests": 8,
  "approved_requests": 32,
  "rejected_requests": 5,
  "total_orders": 25,
  "total_value": "15750.00",
  "user_specific": {
    "my_requests": 12,
    "pending_approvals": 3
  }
}
```

#### Latest Requests
```http
GET /api/dashboard/latest-requests/
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `limit` - Number of requests to return (default: 5)

**Response:** `200 OK`
```json
{
  "results": [
    {
      "id": 1,
      "title": "Office Supplies",
      "status": "pending",
      "total_amount": "80.00",
      "user": {
        "first_name": "John",
        "last_name": "Doe"
      },
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

## Error Handling

### Error Response Format

All API errors follow a consistent format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field_name": ["This field is required."]
    }
  }
}
```

### HTTP Status Codes

| Code | Description |
|------|-------------|
| `200` | OK - Request successful |
| `201` | Created - Resource created successfully |
| `400` | Bad Request - Invalid input data |
| `401` | Unauthorized - Authentication required |
| `403` | Forbidden - Insufficient permissions |
| `404` | Not Found - Resource not found |
| `429` | Too Many Requests - Rate limit exceeded |
| `500` | Internal Server Error - Server error |

### Common Error Codes

| Code | Description |
|------|-------------|
| `AUTHENTICATION_REQUIRED` | Valid authentication token required |
| `INVALID_CREDENTIALS` | Username or password incorrect |
| `TOKEN_EXPIRED` | Access token has expired |
| `PERMISSION_DENIED` | Insufficient permissions for this action |
| `VALIDATION_ERROR` | Input data validation failed |
| `RESOURCE_NOT_FOUND` | Requested resource does not exist |
| `DUPLICATE_RESOURCE` | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | Too many requests in time window |

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Authenticated users**: 1000 requests per hour
- **Unauthenticated users**: 100 requests per hour
- **Login attempts**: 5 attempts per 15 minutes per IP

Rate limit headers are included in responses:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642248000
```

## Pagination

List endpoints use cursor-based pagination:

```json
{
  "count": 100,
  "next": "http://localhost:8000/api/purchases/requests/?page=2",
  "previous": null,
  "results": [...]
}
```

**Query Parameters:**
- `page` - Page number (1-based)
- `page_size` - Items per page (max 100, default 20)

## Filtering and Searching

### Filtering
Most list endpoints support filtering via query parameters:

```http
GET /api/purchases/requests/?status=pending&user=1
```

### Searching
Search across multiple fields using the `search` parameter:

```http
GET /api/purchases/requests/?search=office supplies
```

### Ordering
Order results using the `ordering` parameter:

```http
GET /api/purchases/requests/?ordering=-created_at
```

Use `-` prefix for descending order.

## Webhooks (Future Feature)

The API will support webhooks for real-time notifications:

```json
{
  "event": "purchase_request.approved",
  "data": {
    "id": 1,
    "title": "Office Supplies",
    "status": "approved"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## SDK and Client Libraries

### JavaScript/TypeScript
```typescript
import { P2PClient } from '@p2p/client';

const client = new P2PClient({
  baseURL: 'http://localhost:8000/api/',
  token: 'your-access-token'
});

const requests = await client.purchases.getRequests();
```

### Python
```python
from p2p_client import P2PClient

client = P2PClient(
    base_url='http://localhost:8000/api/',
    token='your-access-token'
)

requests = client.purchases.get_requests()
```

---

**This API documentation is automatically generated and kept up-to-date with the latest API changes.** 📚