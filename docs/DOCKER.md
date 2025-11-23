# Docker Deployment Guide

This guide covers Docker-based deployment of the P2P Procurement System using Docker Compose.

## Overview

The system consists of multiple containerized services orchestrated with Docker Compose:

```
┌─────────────────────────────────────────────────────────────┐
│                    Nginx Gateway (Port 80)                   │
│                   Reverse Proxy & Static Files               │
└─────────────────┬───────────────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
┌───────▼────────┐ ┌────────▼────────┐
│ React Frontend │ │ Django Backend  │
│   (Port 3000)  │ │   (Port 8000)   │
│   Internal     │ │    Internal     │
└────────────────┘ └─────────┬───────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐ ┌─────────▼────────┐ ┌────────▼────────┐
│  PostgreSQL    │ │      Redis       │ │ Celery Workers  │
│   Database     │ │  Cache/Broker    │ │ Background Tasks│
│  (Port 5432)   │ │   (Port 6379)    │ │                 │
└────────────────┘ └──────────────────┘ └─────────────────┘
```

## Services

### Core Services

| Service | Purpose | Port | Volume |
|---------|---------|------|--------|
| **nginx** | Reverse proxy, static files | 80, 443 | nginx config |
| **frontend** | React application | 3000 (internal) | - |
| **backend** | Django REST API | 8000 (internal) | media files |
| **db** | PostgreSQL database | 5432 | postgres_data |
| **redis** | Cache and message broker | 6379 | redis_data |
| **celery_worker** | Background task processor | - | - |
| **celery_beat** | Task scheduler | - | - |

### Management Services

| Service | Purpose | Port | Access |
|---------|---------|------|--------|
| **pgadmin** | Database management | 5050 | Web UI |
| **redis-commander** | Redis management | 8081 | Web UI |
| **flower** | Celery monitoring | 5555 | Web UI |

## Quick Start

### 1. Environment Setup
```bash
# Copy environment template
cp .env.example .env

# Edit configuration (IMPORTANT: Change passwords!)
nano .env
```

### 2. Build and Start
```bash
# Build all images
docker-compose build

# Start all services
docker-compose up -d

# Check status
docker-compose ps
```

### 3. Initialize Database
```bash
# Run migrations
docker-compose exec backend python src/manage.py migrate

# Create superuser
docker-compose exec backend python src/manage.py createsuperuser
```

### 4. Access Applications
- **Main App**: http://localhost
- **Admin**: http://localhost/admin
- **pgAdmin**: http://localhost:5050
- **Redis Commander**: http://localhost:8081
- **Flower**: http://localhost:5555

## Configuration

### Environment Variables

#### Core Settings
```env
# Application
ENVIRONMENT=development
DEBUG=True
SECRET_KEY=<generate-50-char-string>

# Database
DATABASE_NAME=p2p_procurement
DATABASE_USER=postgres
DATABASE_PASSWORD=<strong-password>
DATABASE_HOST=db
DATABASE_PORT=5432

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<strong-password>

# Security
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost,http://127.0.0.1
```

#### Management Tools
```env
# pgAdmin
PGADMIN_EMAIL=admin@example.com
PGADMIN_PASSWORD=<admin-password>

# Redis Commander
REDIS_COMMANDER_USER=admin
REDIS_COMMANDER_PASSWORD=<admin-password>

# Flower (Celery monitoring)
FLOWER_USER=admin
FLOWER_PASSWORD=<admin-password>
```

#### Performance Tuning
```env
# Gunicorn (Backend)
GUNICORN_WORKERS=4
GUNICORN_THREADS=2
GUNICORN_MAX_REQUESTS=1000
GUNICORN_TIMEOUT=300

# Celery
CELERY_WORKER_CONCURRENCY=4

# Database
POSTGRES_MAX_CONNECTIONS=200
POSTGRES_SHARED_BUFFERS=256MB
POSTGRES_EFFECTIVE_CACHE_SIZE=1GB
```

### Generating Secrets
```bash
# Django SECRET_KEY
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"

# Random passwords
openssl rand -base64 32
```

## Service Management

### Basic Commands
```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Restart specific service
docker-compose restart backend

# View logs
docker-compose logs -f
docker-compose logs -f backend

# Check service status
docker-compose ps

# Execute commands in containers
docker-compose exec backend python src/manage.py shell
docker-compose exec db psql -U postgres -d p2p_procurement
```

### Scaling Services
```bash
# Scale Celery workers
docker-compose up -d --scale celery_worker=4

# Scale with production compose
docker-compose -f docker-compose.prod.yml up -d --scale celery_worker=8
```

## Data Management

### Database Operations
```bash
# Create backup
docker-compose exec db pg_dump -U postgres -Fc p2p_procurement > backup_$(date +%Y%m%d).dump

# Restore backup
docker-compose exec -T db pg_restore -U postgres -d p2p_procurement -c < backup.dump

# Access database shell
docker-compose exec db psql -U postgres -d p2p_procurement

# Run migrations
docker-compose exec backend python src/manage.py migrate

# Create migrations
docker-compose exec backend python src/manage.py makemigrations
```

### File Management
```bash
# Backup media files
docker cp p2p_backend:/app/media ./media_backup

# Restore media files
docker cp ./media_backup p2p_backend:/app/media

# Collect static files
docker-compose exec backend python src/manage.py collectstatic --noinput
```

## Monitoring and Logs

### Log Management
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f nginx
docker-compose logs -f celery_worker

# View last N lines
docker-compose logs --tail=100 backend

# Follow logs with timestamps
docker-compose logs -f -t backend
```

### Health Checks
```bash
# Check service status
docker-compose ps

# Test application health
curl http://localhost/health
curl http://localhost/api/health/

# Check database connectivity
docker-compose exec backend python src/manage.py dbshell

# Check Redis connectivity
docker-compose exec redis redis-cli ping
```

### Resource Monitoring
```bash
# Container resource usage
docker stats

# Disk usage
docker system df

# Network information
docker network ls
docker network inspect p2p_network
```

## Production Deployment

### Production Configuration
```bash
# Use production compose file
docker-compose -f docker-compose.prod.yml up -d

# Production environment
cp .env.example .env.production
```

### Production Settings
```env
# Production environment
ENVIRONMENT=production
DEBUG=False
SECRET_KEY=<strong-50-char-secret>

# Security
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True

# Database (use managed service in production)
DATABASE_HOST=your-db-host
DATABASE_PASSWORD=<very-strong-password>

# File storage (use S3 in production)
USE_S3=True
AWS_ACCESS_KEY_ID=<your-key>
AWS_SECRET_ACCESS_KEY=<your-secret>
AWS_STORAGE_BUCKET_NAME=<your-bucket>
```

### SSL/TLS Setup

#### Option 1: Let's Encrypt with Certbot
```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Update nginx configuration for HTTPS
# Certificates will be in: /etc/letsencrypt/live/yourdomain.com/
```

#### Option 2: Manual Certificates
```yaml
# Mount certificates in docker-compose.yml
nginx:
  volumes:
    - ./ssl:/etc/nginx/ssl:ro
```

#### Option 3: Nginx Proxy Manager
```bash
# Uncomment nginx-proxy-manager service in docker-compose.yml
# Access at: http://your-server:81
# Default login: admin@example.com / changeme
```

## Backup and Restore

### Automated Backup Script
```bash
#!/bin/bash
# backup.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"

mkdir -p $BACKUP_DIR

# Database backup
docker-compose exec -T db pg_dump -U postgres -Fc p2p_procurement > $BACKUP_DIR/db_$DATE.dump

# Media files backup
docker cp p2p_backend:/app/media $BACKUP_DIR/media_$DATE

# Environment backup
cp .env $BACKUP_DIR/env_$DATE

echo "Backup completed: $DATE"
```

### Restore Script
```bash
#!/bin/bash
# restore.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: ./restore.sh backup_file.dump"
    exit 1
fi

# Stop services
docker-compose stop backend celery_worker celery_beat

# Restore database
docker-compose exec -T db pg_restore -U postgres -d p2p_procurement -c < $BACKUP_FILE

# Restart services
docker-compose start backend celery_worker celery_beat

echo "Restore completed"
```

### Scheduled Backups
```bash
# Add to crontab (crontab -e)
0 2 * * * cd /path/to/project && ./backup.sh
```

## Troubleshooting

### Common Issues

#### Services Won't Start
```bash
# Check logs for errors
docker-compose logs backend

# Rebuild containers
docker-compose build --no-cache
docker-compose up -d

# Check port conflicts
netstat -ano | findstr :80  # Windows
lsof -i :80                 # Linux/macOS
```

#### Database Connection Issues
```bash
# Check database is ready
docker-compose exec db pg_isready -U postgres

# Test connection from backend
docker-compose exec backend python src/manage.py dbshell

# Check environment variables
docker-compose exec backend env | grep DATABASE
```

#### Permission Issues
```bash
# Fix file permissions (Linux/macOS)
sudo chown -R $USER:$USER .

# Fix media directory permissions
docker-compose exec backend chown -R appuser:appuser /app/media
```

#### Memory/Performance Issues
```bash
# Check resource usage
docker stats

# Increase memory limits in docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 1G
```

### Reset Everything
```bash
# CAUTION: This deletes ALL data
docker-compose down -v
docker system prune -a
docker volume prune
```

## Maintenance

### Regular Maintenance Tasks
```bash
# Update images
docker-compose pull
docker-compose up -d

# Clean up unused resources
docker system prune

# Rotate logs (if not using log rotation)
docker-compose logs --no-log-prefix > logs_$(date +%Y%m%d).txt
```

### Updates and Upgrades
```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose build
docker-compose up -d

# Run any new migrations
docker-compose exec backend python src/manage.py migrate
```

## Performance Optimization

### Production Optimizations
```yaml
# docker-compose.prod.yml optimizations
services:
  backend:
    command: gunicorn --workers 8 --worker-class sync --worker-connections 1000 --max-requests 1000 --timeout 300 --bind 0.0.0.0:8000 config.wsgi:application
    
  celery_worker:
    command: celery -A config worker --concurrency=8 --loglevel=info
    
  redis:
    command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
```

### Nginx Optimizations
```nginx
# In nginx/nginx.conf
worker_processes auto;
worker_connections 1024;

# Enable gzip compression
gzip on;
gzip_types text/plain text/css application/json application/javascript;

# Enable caching
location /static/ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

**Docker deployment provides a consistent, scalable, and maintainable way to run the P2P Procurement System across different environments.** 🐳