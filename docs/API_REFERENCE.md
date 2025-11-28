# API Reference

> **P2P Procurement System** - REST API Documentation
> _Base URL_: `/api/` (Relative to domain)

This API is built using **Django REST Framework**. It follows standard RESTful conventions, uses JSON for data exchange, and implements JWT-based authentication via secure cookies.

---

## 1. Authentication

The system uses a **Dual-Token JWT Strategy** (Access + Refresh) stored in **HttpOnly Cookies** for maximum security.

### 1.1 Login

**POST** `/api/auth/token/`

Authenticates a user and sets the `access_token` and `refresh_token` cookies.

**Request Body:**

```json
{
  "username": "jdoe",
  "password": "secure_password_123"
}
```

**Response (200 OK):**

```json
{
  "access": "eyJhbGciOiJIUzI1Ni...",
  "refresh": "eyJhbGciOiJIUzI1Ni...",
  "user": {
    "id": 1,
    "username": "jdoe",
    "email": "jdoe@company.com",
    "role": "staff",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

### 1.2 Logout

**POST** `/api/auth/logout/`

Invalidates the session and clears the auth cookies.

---

## 2. Dashboard & Real-Time Data

These endpoints are designed for high-frequency polling (every 10-15s) to provide a real-time experience.

### 2.1 Dashboard Statistics

**GET** `/api/dashboard/stats/`

Returns aggregated metrics for the dashboard widgets.

**Response (200 OK):**

```json
{
  "total_requests": 142,
  "pending_requests": 12,
  "approved_requests": 125,
  "rejected_requests": 5,
  "total_orders": 89,
  "total_value": "45250.00",
  "user_specific": {
    "my_requests": 15,
    "pending_approvals": 3
  }
}
```

### 2.2 Processing Status

**GET** `/api/documents/processing-status/`

Returns the current status of the document processing queue.

**Response (200 OK):**

```json
{
  "total_documents": 150,
  "currently_processing": 2,
  "completed_processing": 145,
  "failed_processing": 3
}
```

---

## 3. Purchase Requests

### 3.1 List Requests

**GET** `/api/purchases/requests/`

**Query Parameters:**

- `status`: Filter by status (`pending`, `approved`, `rejected`)
- `search`: Search title/description
- `page`: Page number

### 3.2 Create Request

**POST** `/api/purchases/requests/`

**Request Body:**

```json
{
  "title": "Q4 Office Supplies",
  "description": "Stationery and printer ink",
  "items": [
    {
      "description": "A4 Paper Ream",
      "quantity": 10,
      "unit_price": "5.50"
    }
  ]
}
```

---

## 4. Documents & Processing

### 4.1 Upload Document

**POST** `/api/documents/upload/`

Uploads a file for asynchronous processing.

**Form Data:**

- `file`: (Binary) PDF or Image
- `doc_type`: `INVOICE` | `RECEIPT` | `PO`

**Response (202 Accepted):**

```json
{
  "id": "uuid-string",
  "task_id": "celery-task-uuid",
  "status": "processing",
  "message": "Document uploaded and processing started"
}
```

### 4.2 Check Task Status

**GET** `/api/tasks/{task_id}/`

Poll this endpoint to track background processing (OCR/AI).

**Response (200 OK):**

```json
{
  "task_id": "celery-task-uuid",
  "status": "SUCCESS",
  "result": {
    "document_id": "uuid-string",
    "extracted_data": { ... }
  }
}
```

---

## 5. Error Handling

Errors are returned in a standardized format.

**Example Error (400 Bad Request):**

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "amount": ["Ensure this value is greater than 0."]
    }
  }
}
```

| Status Code | Meaning                              |
| ----------- | ------------------------------------ |
| `200`       | Success                              |
| `202`       | Accepted (Processing in background)  |
| `401`       | Unauthorized (Invalid/Missing Token) |
| `403`       | Forbidden (Insufficient Permissions) |
| `429`       | Rate Limit Exceeded                  |
