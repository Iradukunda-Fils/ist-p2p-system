[text](frontend/.dockerignore)# Docker Setup and Optimization Guide

## Overview

This document provides comprehensive guidance for the optimized Docker setup of the P2P Procurement System. The configuration has been thoroughly analyzed and optimized for security, performance, and maintainability.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   Nginx Gateway │    │   React Frontend│
│   (Port 80/443) │    │   (Internal)    │
└─────────┬───────┘    └─────────┬───────┘
          │                      │
          └──────────┬───────────┘
                     │
          ┌──────────▼───────────┐
          │   Django Backend     │
          │   (Internal:8000)    │
          └──────────┬───────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
┌───▼────┐    ┌──────▼──────┐    ┌───▼────┐
│PostgreSQL│    │    Redis    │    │ Celery │
│Database  │    │Cache/Broker │    │Workers │
└──────────┘    └─────────────┘    └────────┘
```

## Key Optimizations Implemented

### 1. Security Enhancements
- **Database Isolation**: Database only accessible via internal network in production
- **Redis Authentication**: Password-protected Redis in all environments
- **No Exposed Ports**: Only Nginx gateway exposed externally in production
- **Security Headers**: Comprehensive security headers in Nginx
- **SSL/TLS Ready**: Production configuration ready for HTTPS

### 2. Performance Improvements
- **Multi-stage Builds**: Optimized Docker images with smaller runtime footprint
- **Resource Limits**: CPU and memory limits for production containers
- **Connection Pooling**: Optimized database connection settings
- **Caching Strategy**: Redis caching with appropriate TTL settings
- **Nginx Optimizations**: Gzip compression, static file caching, rate limiting

### 3. Configuration Management
- **Environment Separation**: Distinct configurations for development and production
- **Centralized Variables**: Eliminated duplicate environment variables
- **Secure Defaults**: Production-ready security settings
- **Feature Flags**: Easy enable/disable of development tools

### 4. Monitoring and Debugging
- **Health Checks**: Comprehensive health checks for all services
- **Logging**: Structured logging with log rotation
- **Development Tools**: Optional pgAdmin, Flower, Redis Commander
- **Graceful Shutdowns**: Proper signal handling

## Quick Start

### Development Environment

1. **Copy environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Start all services:**
   ```bash
   docker-compose up -d
   ```

3. **Start with development tools:**
   ```bash
   docker-compose --profile tools up -d
   ```

4. **Access services:**
   - Application: http://localhost
   - pgAdmin: http://localhost:5050
   - Flower (Celery): http://localhost:5555
   - Redis Commander: http://localhost:8081

### Production Environment

1. **Copy and configure production environment:**
   ```bash
   cp .env.production .env
   # Edit .env with your production values
   ```

2. **Start production services:**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

## Environment Variables

### Required Variables (Production)
```bash
# Security
SECRET_KEY=your-generated-secret-key
DATABASE_PASSWORD=secure-database-password
REDIS_PASSWORD=secure-redis-password

# Domain Configuration
ALLOWED_HOSTS=your-domain.com,www.your-domain.com
CORS_ALLOWED_ORIGINS=https://your-domain.com

# Email (if using)
EMAIL_HOST=smtp.your-provider.com
EMAIL_HOST_USER=your-email@domain.com
EMAIL_HOST_PASSWORD=your-email-password
```

### Optional Variables
```bash
# AWS S3 Storage
USE_S3=True
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_STORAGE_BUCKET_NAME=your-bucket

# Monitoring
SENTRY_DSN=your-sentry-dsn
```

## Service Configuration

### Database (PostgreSQL)
- **Development**: Exposed on port 5432 for debugging
- **Production**: Internal access only, optimized settings
- **Backups**: Volume mounted for backup storage
- **Health Checks**: Connection verification

### Cache/Message Broker (Redis)
- **Authentication**: Password-protected in all environments
- **Persistence**: AOF enabled for data durability
- **Memory Management**: LRU eviction policy in production
- **Multiple Databases**: Separate DBs for cache, Celery broker, and results

### Backend (Django)
- **Multi-stage Build**: Optimized image size
- **Non-root User**: Security best practice
- **Health Checks**: API endpoint monitoring
- **Logging**: Structured logs with rotation

### Frontend (React/Vite)
- **Static Serving**: Nginx-based serving
- **Build Optimization**: Source maps removed in production
- **Caching**: Aggressive caching for static assets

### Gateway (Nginx)
- **Rate Limiting**: API and authentication endpoint protection
- **SSL Ready**: HTTPS configuration prepared
- **Compression**: Gzip for all text-based content
- **Security Headers**: HSTS, CSP, and other security headers

## Maintenance Commands

### Cleanup and Optimization
```bash
# Linux/Mac
./scripts/docker-cleanup.sh

# Windows PowerShell
.\scripts\docker-cleanup.ps1
```

### Manual Cleanup
```bash
# Stop all services
docker-compose down --remove-orphans

# Remove unused resources
docker system prune -f
docker volume prune -f
docker image prune -f

# Rebuild images
docker-compose build --no-cache
```

### Logs and Monitoring
```bash
# View logs
docker-compose logs -f [service-name]

# Monitor resource usage
docker stats

# Check health status
docker-compose ps
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   ```bash
   # Check database health
   docker-compose exec db pg_isready -U postgres
   
   # View database logs
   docker-compose logs db
   ```

2. **Redis Connection Failed**
   ```bash
   # Test Redis connection
   docker-compose exec redis redis-cli -a your-password ping
   
   # Check Redis logs
   docker-compose logs redis
   ```

3. **Frontend Build Errors**
   ```bash
   # Rebuild frontend
   docker-compose build --no-cache frontend
   
   # Check build logs
   docker-compose logs frontend
   ```

4. **Nginx Gateway Issues**
   ```bash
   # Test Nginx configuration
   docker-compose exec nginx nginx -t
   
   # Reload Nginx
   docker-compose exec nginx nginx -s reload
   ```

### Performance Tuning

1. **Database Performance**
   - Adjust `shared_buffers` and `effective_cache_size` based on available RAM
   - Monitor slow queries with `log_min_duration_statement`

2. **Redis Performance**
   - Adjust `maxmemory` based on available RAM
   - Monitor memory usage and eviction policies

3. **Application Performance**
   - Adjust Gunicorn workers based on CPU cores
   - Monitor Celery queue lengths and worker performance

## Security Checklist

### Production Deployment
- [ ] Change all default passwords
- [ ] Generate new SECRET_KEY
- [ ] Configure HTTPS/SSL certificates
- [ ] Set up firewall rules
- [ ] Enable log monitoring
- [ ] Configure backup strategy
- [ ] Set up monitoring and alerting
- [ ] Review and test disaster recovery

### Regular Maintenance
- [ ] Update Docker images regularly
- [ ] Monitor security advisories
- [ ] Rotate passwords and keys
- [ ] Review access logs
- [ ] Test backup restoration
- [ ] Update SSL certificates

## Scaling Considerations

### Horizontal Scaling
```yaml
# Add more backend workers
backend:
  deploy:
    replicas: 3

# Add more Celery workers
celery_worker:
  deploy:
    replicas: 2
```

### Load Balancing
- Configure Nginx upstream with multiple backend instances
- Use external load balancer for multi-server deployments
- Consider database read replicas for high-traffic scenarios

## Support and Maintenance

For issues or questions:
1. Check the troubleshooting section above
2. Review Docker and service logs
3. Consult the application documentation
4. Contact the development team

---

**Last Updated**: November 2024  
**Version**: 2.0.0