"""
Development settings for P2P system.
"""

from .base import *
import dj_database_url
import sys

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = True

INSTALLED_APPS.append("corsheaders")
MIDDLEWARE.insert(1, "corsheaders.middleware.CorsMiddleware")

# CORS Configuration - Use environment variables for Docker compatibility
CORS_ALLOWED_ORIGINS = config('CORS_ALLOWED_ORIGINS', default='http://localhost,http://localhost:3000,http://127.0.0.1,http://127.0.0.1:3000').split(',')

# CSRF Configuration
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS

ALLOWED_HOSTS = ["*"]

# Database - Use URL-based configuration for Docker compatibility
# Falls back to SQLite if DATABASE_URL not provided
DATABASE_URL = config('DATABASE_URL', default='sqlite:///' + str(BASE_DIR / 'db.sqlite3'))
DATABASES = {
    'default': dj_database_url.parse(DATABASE_URL, conn_max_age=0)  # No connection pooling in dev
}

# Test database configuration
if 'test' in sys.argv or 'pytest' in sys.modules:
    DATABASES['default'] = {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:'
    }

# Email Backend for Development
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Development-specific apps
INSTALLED_APPS.append('django_extensions')

# File Storage for Development (Local with security enhancements)
USE_S3 = False
DEFAULT_FILE_STORAGE = 'core.storage.SecureFileSystemStorage'
STATICFILES_STORAGE = 'django.contrib.staticfiles.storage.StaticFilesStorage'

# Ensure media directory exists with proper permissions
import os
media_dir = BASE_DIR / 'media'
if not media_dir.exists():
    media_dir.mkdir(parents=True, exist_ok=True)
    os.chmod(media_dir, 0o755)

# Create logs directory if it doesn't exist
logs_dir = BASE_DIR / 'logs'
if not logs_dir.exists():
    logs_dir.mkdir(parents=True, exist_ok=True)

# Development logging - more verbose
LOGGING['handlers']['console']['level'] = 'DEBUG'
LOGGING['loggers']['django']['level'] = 'DEBUG'
LOGGING['loggers']['p2p']['level'] = 'DEBUG'

# Disable migrations during testing
import sys
if 'test' in sys.argv or 'pytest' in sys.modules:
    DATABASES['default'] = {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:'
    }
    
    # Disable migrations for faster tests
    class DisableMigrations:
        def __contains__(self, item):
            return True
        
        def __getitem__(self, item):
            return None
    
    MIGRATION_MODULES = DisableMigrations()

# Development-specific Celery settings
CELERY_TASK_ALWAYS_EAGER = config('CELERY_ALWAYS_EAGER', default=False, cast=bool)
CELERY_TASK_EAGER_PROPAGATES = True

# Cache settings for development - Use Redis when available, fallback to dummy cache
try:
    CACHE_URL = config('CACHE_URL', default='')
    if CACHE_URL:
        CACHES = {
            'default': {
                'BACKEND': 'django_redis.cache.RedisCache',
                'LOCATION': CACHE_URL,
                'OPTIONS': {
                    'CLIENT_CLASS': 'django_redis.client.DefaultClient',
                }
            }
        }
    else:
        raise ValueError("No CACHE_URL provided")
except (ValueError, Exception):
    # Fallback to dummy cache if Redis not available
    CACHES = {
        'default': {
            'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
        }
    }

# Security settings relaxed for development
SECURE_SSL_REDIRECT = False
SECURE_HSTS_SECONDS = 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_HSTS_PRELOAD = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False