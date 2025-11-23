# Deployment Guide

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Configuration](#database-configuration)
4. [Application Deployment](#application-deployment)
5. [Production Checklist](#production-checklist)
6. [Monitoring](#monitoring)
7. [Backup & Recovery](#backup--recovery)

## Prerequisites

### System Requirements

- **OS**: Ubuntu 20.04 LTS or higher (recommended)
- **Python**: 3.10 or higher
- **PostgreSQL**: 14 or higher
- **Redis**: 7 or higher
- **Memory**: Minimum 2GB RAM (4GB+ recommended)
- **Storage**: Minimum 20GB available space

### External Services

- **AWS S3**: For document storage
- **OpenAI API**: For document processing (optional but recommended)
- **Email Server**: SMTP for notifications

## Environment Setup

### 1. Create Application User

```bash
# Create dedicated user for the application
sudo adduser --system --group --home /opt/p2p p2p

# Switch to the user
sudo su - p2p
```

### 2. Install System Dependencies

```bash
# Update system packages
sudo apt-get update
sudo apt-get upgrade -y

# Install required packages
sudo apt-get install -y python3.10 python3.10-venv python3-pip \
    postgresql postgresql-contrib redis-server \
    tesseract-ocr nginx supervisor \
    git build-essential libpq-dev
```

### 3. Clone Repository

```bash
cd /opt/p2p
git clone https://github.com/your-org/django-p2p-system.git app
cd app/backend
```

### 4. Create Virtual Environment

```bash
python3.10 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

## Database Configuration

### 1. Create PostgreSQL Database

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL prompt
CREATE DATABASE p2p_db;
CREATE USER p2p_user WITH PASSWORD 'your_secure_password';
ALTER ROLE p2p_user SET client_encoding TO 'utf8';
ALTER ROLE p2p_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE p2p_user SET timezone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE p2p_db TO p2p_user;
\q
```

### 2. Configure Database Connection

Edit `.env` file:

```env
# Database
DATABASE_URL=postgresql://p2p_user:your_secure_password@localhost:5432/p2p_db
```

### 3. Run Migrations

```bash
cd src
python manage.py migrate
```

## Application Deployment

### 1. Environment Variables

Create `.env` file in backend root:

```env
# Environment
ENVIRONMENT=production
DEBUG=False
SECRET_KEY=your_very_long_random_secret_key_here

# Database
DATABASE_URL=postgresql://p2p_user:password@localhost:5432/p2p_db

# Redis
REDIS_URL=redis://localhost:6379/0

# AWS S3
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_STORAGE_BUCKET_NAME=p2p-documents
AWS_S3_REGION_NAME=us-east-1

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Security
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com
CORS_ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=noreply@yourdomain.com
EMAIL_HOST_PASSWORD=your_email_password
DEFAULT_FROM_EMAIL=noreply@yourdomain.com

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

### 2. Collect Static Files

```bash
python manage.py collectstatic --no-input
```

### 3. Create Superuser

```bash
python manage.py createsuperuser
```

### 4. Configure Gunicorn

Create `/opt/p2p/app/backend/gunicorn_config.py`:

```python
import multiprocessing

bind = "127.0.0.1:8000"
workers = multiprocessing.cpu_count() * 2 + 1
worker_class = "sync"
max_requests = 1000
max_requests_jitter = 50
timeout = 30
keepalive = 2
accesslog = "/var/log/p2p/gunicorn-access.log"
errorlog = "/var/log/p2p/gunicorn-error.log"
loglevel = "info"
capture_output = True
```

### 5. Configure Supervisor

Create `/etc/supervisor/conf.d/p2p.conf`:

```ini
[program:p2p_web]
command=/opt/p2p/app/backend/.venv/bin/gunicorn config.wsgi:application -c /opt/p2p/app/backend/gunicorn_config.py
directory=/opt/p2p/app/backend/src
user=p2p
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/p2p/gunicorn.log

[program:p2p_celery_worker]
command=/opt/p2p/app/backend/.venv/bin/celery -A config worker -l info
directory=/opt/p2p/app/backend/src
user=p2p
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/p2p/celery-worker.log

[program:p2p_celery_beat]
command=/opt/p2p/app/backend/.venv/bin/celery -A config beat -l info
directory=/opt/p2p/app/backend/src
user=p2p
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/p2p/celery-beat.log
```

Create log directory:

```bash
sudo mkdir -p /var/log/p2p
sudo chown p2p:p2p /var/log/p2p
```

Update and start supervisor:

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl status
```

### 6. Configure Nginx

Create `/etc/nginx/sites-available/p2p`:

```nginx
upstream p2p_app {
    server 127.0.0.1:8000 fail_timeout=0;
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    client_max_body_size 10M;

    location /static/ {
        alias /opt/p2p/app/backend/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /media/ {
        alias /opt/p2p/app/backend/media/;
        expires 7d;
    }

    location / {
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Host $http_host;
        proxy_redirect off;
        proxy_buffering off;
        proxy_pass http://p2p_app;
    }
}
```

Enable site and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/p2p /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. SSL Certificate (Let's Encrypt)

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## Production Checklist

### Security

- [ ] `DEBUG=False` in `.env`
- [ ] Strong `SECRET_KEY` set
- [ ] `ALLOWED_HOSTS` configured correctly
- [ ] HTTPS enabled with valid SSL certificate
- [ ] Security headers configured in Nginx
- [ ] Database password is strong and unique
- [ ] AWS credentials are rotated regularly
- [ ] CORS settings are restrictive
- [ ] Rate limiting enabled
- [ ] File upload validation in place

### Performance

- [ ] Database indexes created
- [ ] Static files collected and served via Nginx
- [ ] Redis caching configured
- [ ] Gunicorn worker count optimized
- [ ] Database connection pooling enabled
- [ ] CDN configured for static files (optional)

### Monitoring

- [ ] Application logging configured
- [ ] Error tracking service integrated (Sentry)
- [ ] Server monitoring enabled
- [ ] Database monitoring enabled
- [ ] Celery task monitoring (Flower)
- [ ] Uptime monitoring configured

### Backup

- [ ] Database backup scheduled
- [ ] S3 bucket versioning enabled
- [ ] Backup restoration tested
- [ ] Disaster recovery plan documented

## Monitoring

### 1. Application Logs

```bash
# View application logs
sudo tail -f /var/log/p2p/gunicorn.log

# View error logs
sudo tail -f /var/log/p2p/gunicorn-error.log

# View Celery logs
sudo tail -f /var/log/p2p/celery-worker.log
```

### 2. Flower (Celery Monitoring)

Install and run Flower:

```bash
pip install flower
celery -A config flower --port=5555
```

Access at: `http://localhost:5555`

### 3. Database Monitoring

```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check slow queries
SELECT query, calls, total_time, mean_time 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;
```

### 4. Redis Monitoring

```bash
redis-cli INFO
redis-cli MONITOR  # Real-time monitoring
```

## Backup & Recovery

### Database Backup

**Automated Backup Script** (`/opt/p2p/backup_db.sh`):

```bash
#!/bin/bash
BACKUP_DIR="/opt/p2p/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="p2p_db"
DB_USER="p2p_user"

mkdir -p $BACKUP_DIR

# Create backup
pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/p2p_db_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "p2p_db_*.sql.gz" -mtime +30 -delete

echo "Backup completed: p2p_db_$DATE.sql.gz"
```

**Schedule with cron**:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /opt/p2p/backup_db.sh
```

### Database Restore

```bash
# Restore from backup
gunzip -c /opt/p2p/backups/p2p_db_20251121_020000.sql.gz | \
    psql -U p2p_user p2p_db
```

### S3 Backup

S3 already provides versioning and backup:

```bash
# Enable versioning
aws s3api put-bucket-versioning \
    --bucket p2p-documents \
    --versioning-configuration Status=Enabled

# Configure lifecycle rules for old versions
aws s3api put-bucket-lifecycle-configuration \
    --bucket p2p-documents \
    --lifecycle-configuration file://lifecycle.json
```

## Scaling

### Horizontal Scaling

1. **Add more Gunicorn workers**
   - Update `gunicorn_config.py`
   - Restart via supervisor

2. **Add Celery workers**
   - Run on separate servers
   - Point to same Redis/DB

3. **Database Read Replicas**
   - Configure PostgreSQL replication
   - Use Django DB router for read/write splitting

### Load Balancing

Configure Nginx as load balancer:

```nginx
upstream p2p_app {
    least_conn;
    server 192.168.1.10:8000 weight=1;
    server 192.168.1.11:8000 weight=1;
    server 192.168.1.12:8000 weight=1;
}
```

## Troubleshooting

### Application won't start

```bash
# Check logs
sudo tail -f /var/log/p2p/gunicorn-error.log

# Verify environment
source .venv/bin/activate
python -c "import django; print(django.get_version())"

# Test database connection
python manage.py dbshell
```

### Celery tasks not processing

```bash
# Check Celery logs
sudo tail -f /var/log/p2p/celery-worker.log

# Verify Redis connection
redis-cli ping

# Check Celery status
celery -A config inspect active
```

### High memory usage

```bash
# Check process memory
ps aux | grep python

# Monitor in real-time
top -u p2p

# Reduce Gunicorn workers if needed
```

---

**Last Updated**: 2025-11-21  
**Deployment Version**: 1.0
