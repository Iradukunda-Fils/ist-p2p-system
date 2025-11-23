# Django P2P Procurement System

[![Django](https://img.shields.io/badge/Django-4.2+-green.svg)](https://www.djangoproject.com/)
[![Python](https://img.shields.io/badge/Python-3.10+-blue.svg)](https://www.python.org/)
[![DRF](https://img.shields.io/badge/DRF-3.14+-orange.svg)](https://www.django-rest-framework.org/)
[![License](https://img.shields.io/badge/License-MIT-red.svg)](LICENSE)

> Enterprise-grade Procure-to-Pay (P2P) system built with Django and Django REST Framework, featuring intelligent document processing, multi-level approval workflows, and automated purchase order generation.

## 🎯 Overview

The Django P2P Procurement System is a comprehensive solution for managing the complete procurement lifecycle, from purchase request creation through approval workflows to purchase order generation and receipt validation. The system leverages AI-powered OCR for document processing and implements robust role-based access control (RBAC) for secure multi-user operations.

### Key Features

- **📝 Purchase Request Management**: Create, update, and track purchase requests with detailed line items
- **✅ Multi-Level Approval Workflow**: Configurable approval hierarchies based on request amounts
- **📄 Intelligent Document Processing**: OCR and AI-powered extraction of vendor details from proforma invoices
- **🔄 Automated PO Generation**: Automatic purchase order creation upon final approval
- **💰 Receipt Validation**: AI-powered receipt verification against purchase orders
- **🔐 Role-Based Access Control**: Granular permissions for staff, approvers, finance, and admin users
- **⚡ Async Task Processing**: Background processing with Celery for heavy operations
- **📊 Comprehensive API**: RESTful API with complete CRUD operations and filtering

## 🏗️ Architecture

### Technology Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Backend Framework** | Django 4.2+ | Core application framework |
| **API Framework** | Django REST Framework | RESTful API implementation |
| **Database** | PostgreSQL 14+ | Primary data store |
| **Task Queue** | Celery 5.3+ | Asynchronous task processing |
| **Message Broker** | Redis 7+ | Celery broker and caching |
| **Storage** | AWS S3 | Document and file storage |
| **OCR Engine** | Tesseract OCR | Document text extraction |
| **PDF Processing** | pdfplumber | PDF parsing and analysis |
| **AI Integration** | OpenAI API | Intelligent data extraction |
| **PDF Generation** | ReportLab | PO PDF generation |

### System Architecture

```
┌─────────────┐
│   Clients   │ (Web/Mobile/API)
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│      Django Application Layer       │
│  ┌──────────────┬─────────────────┐ │
│  │   REST API   │   Service Layer │ │
│  └──────────────┴─────────────────┘ │
└─────────────────────────────────────┘
       │                    │
       ▼                    ▼
┌──────────────┐    ┌──────────────┐
│  PostgreSQL  │    │    Celery    │
│   Database   │    │  Task Queue  │
└──────────────┘    └──────┬───────┘
                           │
                    ┌──────┴───────┐
                    │    Redis     │
                    │   Message    │
                    │    Broker    │
                    └──────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Python 3.10 or higher
- PostgreSQL 14 or higher
- Redis 7 or higher
- AWS S3 account (for file storage)
- OpenAI API key (for AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/django-p2p-system.git
   cd django-p2p-system/backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Run database migrations**
   ```bash
   cd src
   python manage.py migrate
   ```

6. **Create superuser**
   ```bash
   python manage.py createsuperuser
   ```

7. **Start development server**
   ```bash
   python manage.py runserver
   ```

8. **Start Celery worker** (in separate terminal)
   ```bash
   celery -A config worker -l info
   ```

## 📚 Documentation

- **[Architecture Guide](docs/ARCHITECTURE.md)** - Detailed system architecture and design patterns
- **[API Documentation](docs/API_DOCUMENTATION.md)** - Complete API reference with examples
- **[Deployment Guide](docs/DEPLOYMENT.md)** - Production deployment instructions
- **[Contributing Guidelines](docs/CONTRIBUTING.md)** - Development workflow and standards
- **[Storage Configuration](docs/STORAGE_CONFIGURATION.md)** - File storage configuration

## 🔑 User Roles & Permissions

| Role | Permissions |
|------|------------|
| **Staff** | Create purchase requests, submit receipts |
| **Approver Level 1** | Approve requests ≤ $1,000 |
| **Approver Level 2** | Approve requests > $1,000 |
| **Finance** | Manage purchase orders, view all requests |
| **Admin** | Full system access, user management |

## 📊 API Endpoints

### Purchase Requests
```
GET    /api/purchases/requests/              # List all requests
POST   /api/purchases/requests/              # Create new request
GET    /api/purchases/requests/{id}/         # Get request details
PUT    /api/purchases/requests/{id}/         # Update request
DELETE /api/purchases/requests/{id}/         # Delete request (admin only)
POST   /api/purchases/requests/{id}/approve/ # Approve request
POST   /api/purchases/requests/{id}/reject/  # Reject request
```

### Purchase Orders
```
GET    /api/purchases/purchase-orders/                # List all POs
GET    /api/purchases/purchase-orders/{id}/           # Get PO details
GET    /api/purchases/purchase-orders/{id}/generate-pdf/ # Generate PDF
GET    /api/purchases/purchase-orders/summary/       # Get statistics
```

### Documents
```
POST   /api/documents/upload/                # Upload document
GET    /api/documents/{id}/                  # Get document details
GET    /api/documents/{id}/download/         # Download document
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: Granular permission system
- **Database Row Locking**: Prevent race conditions in approvals
- **File Upload Validation**: Comprehensive file type and size checks
- **HTTPS Only**: Force secure connections in production
- **CORS Configuration**: Controlled cross-origin access
- **Rate Limiting**: API request throttling

## 🧪 Testing

### Run all tests
```bash
python manage.py test
```

### Run specific test suite
```bash
python manage.py test purchases.tests.test_services
```

### Run with coverage
```bash
coverage run --source='.' manage.py test
coverage report
coverage html  # Generate HTML report
```

## 📈 Performance

- **Query Optimization**: Strategic use of `select_related` and `prefetch_related`
- **Database Indexing**: Optimized indexes on frequently queried fields
- **Caching Strategy**: Redis caching for frequently accessed data
- **Async Processing**: Background tasks for heavy operations
- **Connection Pooling**: Database connection optimization

## 🛠️ Development

### Project Structure
```
backend/
├── src/
│   ├── config/              # Django settings
│   │   ├── settings/
│   │   │   ├── base.py      # Base settings
│   │   │   ├── development.py
│   │   │   └── production.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── core/                # Core utilities
│   │   ├── permissions.py
│   │   └── middleware.py
│   ├── users/               # User management
│   │   ├── models.py
│   │   ├── serializers.py
│   │   └── views.py
│   ├── purchases/           # Purchase management
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── services/        # Business logic layer
│   │   │   ├── approval_service.py
│   │   │   ├── purchase_request_service.py
│   │   │   ├── purchase_order_service.py
│   │   │   └── pdf_service.py
│   │   ├── tasks.py         # Celery tasks
│   │   └── tests/
│   └── documents/           # Document management
│       ├── models.py
│       ├── storage.py
│       └── processors/
└── requirements.txt
```

### Code Quality Standards

- **Linting**: Flake8 for code style
- **Formatting**: Black for code formatting
- **Import Sorting**: isort for import organization
- **Type Hints**: Python type annotations
- **Docstrings**: Google-style docstrings for all modules
- **Test Coverage**: Minimum 80% code coverage

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Contributors

- **Development Team** - Initial work and ongoing maintenance

## 🙏 Acknowledgments

- Django Software Foundation for the excellent framework
- Django REST Framework for powerful API tools
- OpenAI for AI-powered document processing
- All contributors and testers

## 📞 Support

For support, please:
- 📧 Email: support@yourcompany.com
- 📖 Documentation: [docs.yourcompany.com](https://docs.yourcompany.com)
- 🐛 Issue Tracker: [GitHub Issues](https://github.com/your-org/django-p2p-system/issues)

---

**Built with ❤️ by Your Company**
