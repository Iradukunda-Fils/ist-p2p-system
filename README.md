# P2P Procurement System

[![Django](https://img.shields.io/badge/Django-4.2+-green.svg)](https://www.djangoproject.com/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)

> Enterprise-grade Procure-to-Pay (P2P) system with intelligent document processing, multi-level approval workflows, and automated purchase order generation.

## 🚀 Quick Start

### Option 1: Docker (Recommended)
```bash
# Clone and setup
git clone <repository-url>
cd p2p-procurement

# Copy environment file and configure
cp .env.example .env
# Edit .env with your settings (change passwords!)

# Build and start all services
docker-compose up -d

# Create admin user
docker-compose exec backend python src/manage.py createsuperuser
```

**Access Points:**
- **Application**: http://localhost
- **Admin Panel**: http://localhost/admin
- **API Docs**: http://localhost/api/schema/swagger-ui/

### Option 2: Local Development
```bash
# Backend
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cd src && python manage.py migrate
python manage.py runserver

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

## 📋 System Overview

### Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React SPA     │    │  Django REST    │    │   PostgreSQL    │
│   (Frontend)    │◄──►│     API         │◄──►│   Database      │
│   Port 3000     │    │   Port 8000     │    │   Port 5432     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │     Redis       │              │
         └──────────────►│  Cache/Broker   │◄─────────────┘
                        │   Port 6379     │
                        └─────────────────┘
```

### Key Features
- **📝 Purchase Request Management** - Create and track procurement requests
- **✅ Multi-Level Approval Workflow** - Configurable approval hierarchies
- **📄 Intelligent Document Processing** - AI-powered OCR and data extraction
- **🔄 Automated PO Generation** - Automatic purchase order creation
- **💰 Receipt Validation** - AI-powered receipt verification
- **🔐 Role-Based Access Control** - Granular permissions system
- **⚡ Real-time Updates** - Cross-tab synchronization and notifications

### User Roles
| Role | Permissions |
|------|------------|
| **Staff** | Create purchase requests, submit receipts |
| **Approver Level 1** | Approve requests ≤ $1,000 |
| **Approver Level 2** | Approve requests > $1,000 |
| **Finance** | Manage purchase orders, view all requests |
| **Admin** | Full system access, user management |

## 📚 Documentation

### Getting Started
- **[Installation Guide](docs/INSTALLATION.md)** - Detailed setup instructions
- **[Configuration Guide](docs/CONFIGURATION.md)** - Environment and settings
- **[User Guide](docs/USER_GUIDE.md)** - How to use the system

### Development
- **[Development Setup](docs/DEVELOPMENT.md)** - Local development environment
- **[API Documentation](docs/API.md)** - REST API reference
- **[Frontend Guide](docs/FRONTEND.md)** - React/TypeScript frontend
- **[Backend Guide](docs/BACKEND.md)** - Django backend architecture

### Deployment & Operations
- **[Docker Deployment](docs/DOCKER.md)** - Container-based deployment
- **[Production Deployment](docs/PRODUCTION.md)** - Production setup guide
- **[Monitoring & Maintenance](docs/OPERATIONS.md)** - System monitoring and maintenance

### Architecture & Design
- **[System Architecture](docs/ARCHITECTURE.md)** - Technical architecture overview
- **[Security Guide](docs/SECURITY.md)** - Security considerations and best practices
- **[Performance Guide](docs/PERFORMANCE.md)** - Optimization and scaling

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **Tailwind CSS** for styling
- **React Query** for server state
- **Zustand** for client state
- **React Router** for navigation

### Backend
- **Django 4.2+** with Django REST Framework
- **PostgreSQL 14+** for database
- **Redis 7+** for caching and task queue
- **Celery** for background tasks
- **JWT** for authentication

### Infrastructure
- **Docker & Docker Compose** for containerization
- **Nginx** as reverse proxy and static file server
- **AWS S3** for file storage (configurable)
- **Gunicorn** as WSGI server

## 🔧 Development Commands

### Docker Commands
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Run Django commands
docker-compose exec backend python src/manage.py <command>

# Access database
docker-compose exec db psql -U postgres -d p2p_procurement

# Stop all services
docker-compose down
```

### Local Development
```bash
# Backend
cd backend/src
python manage.py runserver
python manage.py migrate
python manage.py test

# Frontend
cd frontend
npm run dev
npm run build
npm run test

# Celery (background tasks)
cd backend
celery -A config worker -l info
```

## 📊 Project Status

### Current Version: 2.0
- ✅ Core procurement workflow
- ✅ Multi-level approval system
- ✅ Document processing with OCR
- ✅ Role-based access control
- ✅ Docker deployment
- ✅ Enhanced authentication system
- ✅ Cross-tab synchronization
- 🔄 Advanced dashboard features (in progress)

### Recent Updates
- Enhanced API client with automatic retry and token refresh
- Secure cookie-based authentication
- Cross-tab authentication synchronization
- Improved error handling and user feedback
- Code quality improvements and TypeScript enhancements

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [CONTRIBUTING.md](docs/CONTRIBUTING.md) for detailed guidelines.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the [docs/](docs/) directory
- **Issues**: Use GitHub Issues for bug reports and feature requests
- **Discussions**: Use GitHub Discussions for questions and community support

## 🙏 Acknowledgments

- Django Software Foundation for the excellent framework
- React team for the powerful frontend library
- All contributors and maintainers

---

**Built with ❤️ for efficient procurement management**