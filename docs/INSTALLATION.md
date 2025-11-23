# Installation Guide

This guide provides step-by-step instructions for installing and setting up the P2P Procurement System.

## Prerequisites

### System Requirements
- **CPU**: 2+ cores
- **RAM**: 4GB minimum, 8GB recommended
- **Disk**: 20GB free space
- **OS**: Windows 10+, macOS 10.15+, or Linux

### Required Software

#### Option 1: Docker (Recommended)
- **Docker**: Version 20.10+ ([Install Docker](https://docs.docker.com/get-docker/))
- **Docker Compose**: Version 2.0+ ([Install Compose](https://docs.docker.com/compose/install/))

#### Option 2: Local Development
- **Python**: 3.10 or higher
- **Node.js**: 18 or higher
- **PostgreSQL**: 14 or higher
- **Redis**: 7 or higher

### Verify Prerequisites

```bash
# Docker installation
docker --version
docker-compose --version

# Local development
python --version
node --version
npm --version
psql --version
redis-cli --version
```

## Installation Methods

### Method 1: Docker Installation (Recommended)

#### 1. Clone Repository
```bash
git clone <repository-url>
cd p2p-procurement
```

#### 2. Environment Configuration
```bash
# Copy environment template
cp .env.example .env

# Edit environment file
# Windows: notepad .env
# macOS/Linux: nano .env
```

**Important Environment Variables:**
```env
# Database
DATABASE_PASSWORD=<strong-password>

# Redis
REDIS_PASSWORD=<strong-password>

# Django
SECRET_KEY=<50-character-random-string>
DEBUG=True  # False for production
ALLOWED_HOSTS=localhost,127.0.0.1

# Management Tools
PGADMIN_EMAIL=admin@example.com
PGADMIN_PASSWORD=<admin-password>
```

#### 3. Generate Secret Key
```python
# Run this Python command to generate SECRET_KEY
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

#### 4. Build and Start Services
```bash
# Build all images
docker-compose build

# Start all services
docker-compose up -d

# Check service status
docker-compose ps
```

#### 5. Initialize Database
```bash
# Run database migrations
docker-compose exec backend python src/manage.py migrate

# Create superuser account
docker-compose exec backend python src/manage.py createsuperuser
```

#### 6. Verify Installation
- **Frontend**: http://localhost
- **Backend API**: http://localhost/api/
- **Admin Panel**: http://localhost/admin/
- **pgAdmin**: http://localhost:5050
- **Redis Commander**: http://localhost:8081
- **Flower (Celery)**: http://localhost:5555

### Method 2: Local Development Installation

#### 1. Clone Repository
```bash
git clone <repository-url>
cd p2p-procurement
```

#### 2. Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
# Edit .env with your database and Redis settings
```

#### 3. Database Setup
```bash
# Create PostgreSQL database
createdb p2p_procurement

# Run migrations
cd src
python manage.py migrate

# Create superuser
python manage.py createsuperuser
```

#### 4. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env
# Edit .env if needed (default settings should work)
```

#### 5. Start Services

**Terminal 1 - Backend:**
```bash
cd backend/src
python manage.py runserver
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Terminal 3 - Celery Worker:**
```bash
cd backend
celery -A config worker -l info
```

**Terminal 4 - Redis (if not running as service):**
```bash
redis-server
```

#### 6. Verify Installation
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000/api/
- **Admin Panel**: http://localhost:8000/admin/

## Post-Installation Setup

### 1. Configure Email Settings (Optional)
```env
# Add to .env for email functionality
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
```

### 2. Configure File Storage (Optional)
```env
# For AWS S3 storage (production recommended)
USE_S3=True
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_STORAGE_BUCKET_NAME=your-bucket-name
AWS_S3_REGION_NAME=us-east-1
```

### 3. Create Initial Data
```bash
# Create sample users and data (optional)
docker-compose exec backend python src/manage.py loaddata fixtures/sample_data.json
```

## Troubleshooting

### Common Issues

#### Docker Issues

**Port conflicts:**
```bash
# Check what's using the port
netstat -ano | findstr :80  # Windows
lsof -i :80                 # macOS/Linux

# Change ports in .env if needed
FRONTEND_PORT=8080
BACKEND_PORT=8001
```

**Permission issues:**
```bash
# Fix file permissions (Linux/macOS)
sudo chown -R $USER:$USER .

# Reset Docker if needed
docker system prune -a
```

**Services won't start:**
```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend

# Rebuild containers
docker-compose build --no-cache
docker-compose up -d
```

#### Local Development Issues

**Python/pip issues:**
```bash
# Upgrade pip
python -m pip install --upgrade pip

# Clear pip cache
pip cache purge

# Reinstall requirements
pip install -r requirements.txt --force-reinstall
```

**Node.js/npm issues:**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Database connection issues:**
```bash
# Check PostgreSQL is running
pg_isready

# Check connection settings in .env
# Ensure DATABASE_HOST, DATABASE_PORT, etc. are correct
```

### Getting Help

1. **Check logs**: Always check application logs first
2. **Verify environment**: Ensure all environment variables are set
3. **Check dependencies**: Verify all required software is installed
4. **Review configuration**: Double-check database and Redis settings
5. **Restart services**: Sometimes a simple restart fixes issues

## Next Steps

After successful installation:

1. **Read the [User Guide](USER_GUIDE.md)** to learn how to use the system
2. **Review [Configuration Guide](CONFIGURATION.md)** for advanced settings
3. **Check [Development Setup](DEVELOPMENT.md)** if you plan to contribute
4. **See [Production Deployment](PRODUCTION.md)** for production setup

## Security Checklist

Before using in production:

- [ ] Change all default passwords in `.env`
- [ ] Generate a strong `SECRET_KEY`
- [ ] Set `DEBUG=False`
- [ ] Configure proper `ALLOWED_HOSTS`
- [ ] Set up SSL/TLS certificates
- [ ] Configure secure cookie settings
- [ ] Review and update security settings
- [ ] Set up regular backups
- [ ] Configure monitoring and logging

---

**Installation complete!** 🎉 You can now access the P2P Procurement System and start managing your procurement workflows.