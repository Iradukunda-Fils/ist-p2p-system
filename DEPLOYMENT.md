# AWS EC2 Deployment Guide - P2P Procurement System

## Prerequisites

### 1. EC2 Instance Setup

- **Instance Type**: Minimum `t3.medium` (2 vCPU, 4 GB RAM)
- **OS**: Ubuntu 22.04 LTS
- **Storage**: Minimum 30 GB SSD
- **Security Groups**:
  ```
  Inbound Rules:
  - HTTP (80): 0.0.0.0/0
  - HTTPS (443): 0.0.0.0/0
  - SSH (22): Your IP only
  ```

### 2. Domain Setup (Optional but Recommended)

- Point your domain A record to EC2 Elastic IP
- Example: `app.yourdomain.com` → `54.123.45.67`

---

## Deployment Steps

### Step 1: Connect to EC2

```bash
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

### Step 2: Install Docker and Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version

# Log out and back in for group changes to take effect
exit
```

### Step 3: Create Deployment Directory

```bash
# SSH back in
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>

# Create project directory
mkdir -p ~/p2p-deployment
cd ~/p2p-deployment
```

### Step 4: Create Required Files

#### A. docker-compose.prod.yml

```bash
# Upload the docker-compose.prod.yml file to EC2
# Option 1: Use SCP from your local machine
scp -i your-key.pem docker-compose.prod.yml ubuntu@<EC2_PUBLIC_IP>:~/p2p-deployment/

# Option 2: Create directly on EC2
nano docker-compose.prod.yml
# Paste the contents from docker-compose.prod.yml
```

#### B. Environment Variables

```bash
# Create .env file
nano .env

# Paste and modify:
SECRET_KEY=<GENERATE_NEW_SECRET_KEY>
ALLOWED_HOSTS=<YOUR_EC2_IP_OR_DOMAIN>
POSTGRES_PASSWORD=<STRONG_PASSWORD>
REDIS_PASSWORD=<STRONG_PASSWORD>
CORS_ALLOWED_ORIGINS=http://<YOUR_EC2_IP>
CSRF_TRUSTED_ORIGINS=http://<YOUR_EC2_IP>
```

**Generate Django Secret Key**:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(50))"
```

#### C. JWT Keys

```bash
# Create backend/keys directory
mkdir -p backend/keys
cd backend/keys

# Generate JWT key pair
# Option 1: Generate on local machine and upload
# Option 2: Generate on EC2 (requires OpenSSL)
openssl genrsa -out jwt_private.pem 2048
openssl rsa -in jwt_private.pem -pubout -out jwt_public.pem

# Set correct permissions
chmod 600 jwt_private.pem
chmod 644 jwt_public.pem

cd ~/p2p-deployment
```

### Step 5: Pull Docker Images

```bash
# Login to Docker Hub (if using private images)
docker login

# Pull all images
docker pull iradukunda84/p2p_backend:1.0.0
docker pull iradukunda84/p2p_celery_worker:1.0.0
docker pull iradukunda84/p2p_celery_beat:1.0.0
docker pull iradukunda84/p2p_frontend:1.0.0
docker pull iradukunda84/p2p_nginx_gateway:1.0.0
```

### Step 6: Start Services

```bash
# Start all services
docker-compose -f docker-compose.prod.yml up -d

# Verify services are running
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Step 7: Verify Deployment

```bash
# Check service health
docker ps

# Test endpoints
curl http://localhost/health                    # Nginx health
curl http://localhost/api/health/               # Backend health

# Access from browser
# http://<EC2_PUBLIC_IP>
```

---

## Post-Deployment

### Create Django Superuser

```bash
docker exec -it p2p_backend python manage.py createsuperuser
```

### Collect Static Files (if needed)

```bash
docker exec -it p2p_backend python manage.py collectstatic --noinput
```

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f nginx
```

---

## SSL/HTTPS Setup (Recommended)

### Using Let's Encrypt (Certbot)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Stop nginx temporarily
docker-compose -f docker-compose.prod.yml stop nginx

# Generate certificate
sudo certbot certonly --standalone -d yourdomain.com -d www.yourdomain.com

# Certificates will be at: /etc/letsencrypt/live/yourdomain.com/

# Update docker-compose.prod.yml to mount certificates
# Add to nginx service volumes:
#   - /etc/letsencrypt:/etc/letsencrypt:ro

# Update .env
# SECURE_SSL_REDIRECT=True
# SESSION_COOKIE_SECURE=True
# CSRF_COOKIE_SECURE=True

# Restart services
docker-compose -f docker-compose.prod.yml up -d
```

---

## Maintenance

### Update Images

```bash
# Pull latest images
docker pull iradukunda84/p2p_backend:1.0.1

# Recreate services
docker-compose -f docker-compose.prod.yml up -d --force-recreate backend

# Or update all
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d
```

### Backup Database

```bash
# Create backup
docker exec p2p_postgres pg_dump -U postgres p2p_procurement > backup_$(date +%Y%m%d).sql

# Restore backup
cat backup_20250127.sql | docker exec -i p2p_postgres psql -U postgres -d p2p_procurement
```

### Monitor Resources

```bash
# Check resource usage
docker stats

# Check disk space
df -h

# Clean up unused images
docker system prune -a
```

---

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs backend

# Check environment variables
docker-compose -f docker-compose.prod.yml config

# Recreate services
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker exec p2p_postgres pg_isready -U postgres

# Check database logs
docker logs p2p_postgres

# Enter PostgreSQL container
docker exec -it p2p_postgres psql -U postgres -d p2p_procurement
```

### Static Files Not Loading

```bash
# Collect static files again
docker exec -it p2p_backend python manage.py collectstatic --noinput --clear

# Check nginx logs
docker logs p2p_nginx_gateway

# Verify volume mounts
docker inspect p2p_nginx_gateway | grep -A 10 Mounts
```

---

## Security Checklist

- [ ] Changed all default passwords in `.env`
- [ ] Generated unique Django `SECRET_KEY`
- [ ] Set `DEBUG=False` in production
- [ ] Configured `ALLOWED_HOSTS` to specific domain/IP
- [ ] Set up SSL/HTTPS certificates
- [ ] Limited SSH access to specific IPs
- [ ] Enabled automatic security updates
- [ ] Set up regular database backups
- [ ] Configured CloudWatch/monitoring (optional)
- [ ] Set up log rotation

---

## Useful Commands

```bash
# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend

# Stop all services
docker-compose -f docker-compose.prod.yml down

# Start in foreground (see logs immediately)
docker-compose -f docker-compose.prod.yml up

# Execute command in container
docker exec -it p2p_backend bash

# View environment variables
docker exec p2p_backend env

# Check network connectivity
docker exec p2p_backend ping db
docker exec p2p_backend ping redis
```
