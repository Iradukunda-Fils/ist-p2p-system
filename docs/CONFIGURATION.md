# Configuration Guide

This guide covers all configuration options for the P2P Procurement System.

## Environment Variables

### Core Application Settings

#### Django Backend Configuration
```env
# Environment
ENVIRONMENT=development  # development, staging, production
DEBUG=True              # False for production
SECRET_KEY=your-50-character-secret-key

# Security
ALLOWED_HOSTS=localhost,127.0.0.1,yourdomain.com
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
SECURE_SSL_REDIRECT=False  # True for production with HTTPS
SESSION_COOKIE_SECURE=False  # True for production with HTTPS
CSRF_COOKIE_SECURE=False     # True for production with HTTPS

# Database
DATABASE_NAME=p2p_procurement
DATABASE_USER=postgres
DATABASE_PASSWORD=your-strong-password
DATABASE_HOST=localhost  # 'db' for Docker
DATABASE_PORT=5432
DATABASE_URL=postgresql://user:pass@host:port/dbname  # Alternative format

# Redis
REDIS_HOST=localhost  # 'redis' for Docker
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
REDIS_URL=redis://:password@host:port/0  # Alternative format
```

#### Frontend Configuration
```env
# API Configuration
VITE_API_BASE_URL=http://localhost:8000/api
VITE_APP_NAME=P2P Procurement System
VITE_APP_VERSION=2.0.0

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_NOTIFICATIONS=true
VITE_ENABLE_DARK_MODE=false
```

### Authentication & Security

#### JWT Configuration
```env
# JWT Settings
JWT_ACCESS_TOKEN_LIFETIME=15  # minutes
JWT_REFRESH_TOKEN_LIFETIME=7  # days
JWT_ROTATE_REFRESH_TOKENS=True
JWT_BLACKLIST_AFTER_ROTATION=True

# Cookie Settings
SESSION_COOKIE_AGE=604800  # 7 days in seconds
SESSION_COOKIE_HTTPONLY=True
SESSION_COOKIE_SAMESITE=Lax  # Strict for production
```

#### CORS Configuration
```env
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
CORS_ALLOW_CREDENTIALS=True
CORS_ALLOW_ALL_ORIGINS=False  # Never True in production
```

### File Storage

#### Local Storage (Development)
```env
USE_S3=False
MEDIA_ROOT=/app/media
STATIC_ROOT=/app/static
```

#### AWS S3 Storage (Production)
```env
USE_S3=True
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_STORAGE_BUCKET_NAME=your-bucket-name
AWS_S3_REGION_NAME=us-east-1
AWS_S3_CUSTOM_DOMAIN=your-cloudfront-domain.com  # Optional
AWS_DEFAULT_ACL=private
AWS_S3_FILE_OVERWRITE=False
```

### Email Configuration

#### SMTP Email (Production)
```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=P2P System <noreply@yourdomain.com>
```

#### Console Email (Development)
```env
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
```

### Celery Configuration

#### Celery Settings
```env
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
CELERY_TASK_SERIALIZER=json
CELERY_RESULT_SERIALIZER=json
CELERY_ACCEPT_CONTENT=json
CELERY_TIMEZONE=UTC
CELERY_ENABLE_UTC=True

# Worker Configuration
CELERY_WORKER_CONCURRENCY=4
CELERY_WORKER_MAX_TASKS_PER_CHILD=1000
CELERY_TASK_SOFT_TIME_LIMIT=300  # 5 minutes
CELERY_TASK_TIME_LIMIT=600       # 10 minutes
```

### Performance Settings

#### Gunicorn Configuration
```env
GUNICORN_WORKERS=4
GUNICORN_THREADS=2
GUNICORN_MAX_REQUESTS=1000
GUNICORN_MAX_REQUESTS_JITTER=100
GUNICORN_TIMEOUT=300
GUNICORN_KEEPALIVE=5
```

#### Database Performance
```env
DATABASE_CONN_MAX_AGE=60
DATABASE_MAX_CONNECTIONS=200
POSTGRES_SHARED_BUFFERS=256MB
POSTGRES_EFFECTIVE_CACHE_SIZE=1GB
POSTGRES_WORK_MEM=16MB
```

### Logging Configuration

#### Log Levels
```env
LOG_LEVEL=INFO  # DEBUG, INFO, WARNING, ERROR, CRITICAL
DJANGO_LOG_LEVEL=INFO
CELERY_LOG_LEVEL=INFO
```

#### Log Destinations
```env
# File logging
LOG_FILE=/app/logs/django.log
CELERY_LOG_FILE=/app/logs/celery.log

# Syslog (production)
USE_SYSLOG=False
SYSLOG_ADDRESS=/dev/log  # Unix socket
SYSLOG_FACILITY=local0
```

### Monitoring & Analytics

#### Application Monitoring
```env
# Sentry (Error Tracking)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1

# New Relic (APM)
NEW_RELIC_LICENSE_KEY=your-license-key
NEW_RELIC_APP_NAME=P2P Procurement System
```

#### Health Checks
```env
HEALTH_CHECK_ENABLED=True
HEALTH_CHECK_DATABASE=True
HEALTH_CHECK_REDIS=True
HEALTH_CHECK_CELERY=True
```

### Management Tools

#### pgAdmin Configuration
```env
PGADMIN_EMAIL=admin@yourdomain.com
PGADMIN_PASSWORD=your-admin-password
PGADMIN_DEFAULT_SERVER=PostgreSQL
```

#### Redis Commander
```env
REDIS_COMMANDER_USER=admin
REDIS_COMMANDER_PASSWORD=your-admin-password
REDIS_COMMANDER_PORT=8081
```

#### Flower (Celery Monitoring)
```env
FLOWER_USER=admin
FLOWER_PASSWORD=your-admin-password
FLOWER_PORT=5555
FLOWER_URL_PREFIX=/flower
```

### Docker Configuration

#### Port Configuration
```env
# External ports (what you access from host)
FRONTEND_PORT=80
BACKEND_PORT=8000
POSTGRES_PORT=5432
REDIS_PORT=6379
PGADMIN_PORT=5050
REDIS_COMMANDER_PORT=8081
FLOWER_PORT=5555

# Internal ports (container-to-container)
BACKEND_INTERNAL_PORT=8000
FRONTEND_INTERNAL_PORT=3000
```

#### Volume Configuration
```env
# Data persistence
POSTGRES_DATA_PATH=./data/postgres
REDIS_DATA_PATH=./data/redis
MEDIA_PATH=./data/media
LOGS_PATH=./logs
```

## Configuration Files

### Django Settings Structure

```python
# config/settings/base.py - Base settings
# config/settings/development.py - Development overrides
# config/settings/production.py - Production overrides
# config/settings/testing.py - Test settings

# Environment-specific settings loading
DJANGO_SETTINGS_MODULE=config.settings.development  # or production
```

### Nginx Configuration

#### Development (nginx/nginx.conf)
```nginx
upstream backend {
    server backend:8000;
}

upstream frontend {
    server frontend:3000;
}

server {
    listen 80;
    server_name localhost;

    # API routes
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Admin routes
    location /admin/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Static files
    location /static/ {
        proxy_pass http://backend;
    }

    # Media files
    location /media/ {
        proxy_pass http://backend;
    }

    # Frontend routes
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### Production SSL Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    
    # Rest of configuration...
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

### Database Configuration

#### PostgreSQL Configuration (postgresql.conf)
```ini
# Connection settings
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 16MB
maintenance_work_mem = 256MB

# Write-ahead logging
wal_buffers = 16MB
checkpoint_completion_target = 0.9
wal_writer_delay = 200ms

# Query planner
random_page_cost = 1.1
effective_io_concurrency = 200

# Logging
log_statement = 'mod'
log_min_duration_statement = 1000
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
```

### Redis Configuration

#### Redis Configuration (redis.conf)
```ini
# Memory management
maxmemory 512mb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

# Security
requirepass your-redis-password
rename-command FLUSHDB ""
rename-command FLUSHALL ""

# Network
bind 127.0.0.1
port 6379
timeout 300
```

## Environment-Specific Configurations

### Development Environment
```env
# .env.development
ENVIRONMENT=development
DEBUG=True
SECRET_KEY=dev-secret-key-not-for-production

# Relaxed security for development
ALLOWED_HOSTS=*
CORS_ALLOW_ALL_ORIGINS=True
SECURE_SSL_REDIRECT=False

# Local services
DATABASE_HOST=localhost
REDIS_HOST=localhost

# Console email backend
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend

# Verbose logging
LOG_LEVEL=DEBUG
DJANGO_LOG_LEVEL=DEBUG
```

### Staging Environment
```env
# .env.staging
ENVIRONMENT=staging
DEBUG=False
SECRET_KEY=staging-secret-key

# Staging-specific settings
ALLOWED_HOSTS=staging.yourdomain.com
CORS_ALLOWED_ORIGINS=https://staging.yourdomain.com

# Staging database
DATABASE_HOST=staging-db.yourdomain.com
DATABASE_PASSWORD=staging-db-password

# Email testing
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.mailtrap.io
```

### Production Environment
```env
# .env.production
ENVIRONMENT=production
DEBUG=False
SECRET_KEY=production-secret-key-50-characters-long

# Production security
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True

# Production database
DATABASE_HOST=prod-db.yourdomain.com
DATABASE_PASSWORD=very-strong-production-password

# S3 file storage
USE_S3=True
AWS_STORAGE_BUCKET_NAME=prod-p2p-files

# Production email
EMAIL_HOST=smtp.sendgrid.net
EMAIL_HOST_USER=apikey
EMAIL_HOST_PASSWORD=your-sendgrid-api-key

# Error tracking
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

## Security Configuration

### Security Headers
```python
# Django settings
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_HSTS_SECONDS = 31536000  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
X_FRAME_OPTIONS = 'DENY'
```

### CSRF Protection
```python
CSRF_COOKIE_SECURE = True  # Production only
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Strict'
CSRF_TRUSTED_ORIGINS = ['https://yourdomain.com']
```

### Content Security Policy
```python
CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = ("'self'", "'unsafe-inline'")
CSP_STYLE_SRC = ("'self'", "'unsafe-inline'")
CSP_IMG_SRC = ("'self'", "data:", "https:")
CSP_FONT_SRC = ("'self'", "https:")
```

## Performance Configuration

### Caching Configuration
```python
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://localhost:6379/1',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Cache timeouts
CACHE_TTL = 60 * 15  # 15 minutes
SESSION_CACHE_ALIAS = 'default'
```

### Database Connection Pooling
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'p2p_procurement',
        'USER': 'postgres',
        'PASSWORD': 'password',
        'HOST': 'localhost',
        'PORT': '5432',
        'CONN_MAX_AGE': 60,
        'OPTIONS': {
            'MAX_CONNS': 20,
            'MIN_CONNS': 5,
        }
    }
}
```

## Backup Configuration

### Database Backup
```bash
#!/bin/bash
# backup-db.sh
BACKUP_DIR="/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h $DATABASE_HOST -U $DATABASE_USER -d $DATABASE_NAME -Fc > $BACKUP_DIR/backup_$DATE.dump
```

### File Backup
```bash
#!/bin/bash
# backup-files.sh
BACKUP_DIR="/backups/files"
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf $BACKUP_DIR/media_$DATE.tar.gz /app/media/
```

### Automated Backup (Cron)
```bash
# Add to crontab (crontab -e)
0 2 * * * /path/to/backup-db.sh
0 3 * * * /path/to/backup-files.sh
0 4 * * 0 /path/to/cleanup-old-backups.sh  # Weekly cleanup
```

## Monitoring Configuration

### Health Check Endpoints
```python
# Health check configuration
HEALTH_CHECKS = {
    'database': 'health_check.db',
    'cache': 'health_check.cache',
    'storage': 'health_check.storage',
}
```

### Logging Configuration
```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': '/app/logs/django.log',
            'formatter': 'verbose',
        },
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
}
```

---

**Proper configuration is crucial for security, performance, and maintainability of the P2P Procurement System.** ⚙️