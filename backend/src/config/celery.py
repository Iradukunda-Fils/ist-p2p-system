"""
Celery configuration for P2P system.
"""

import os
from celery import Celery

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('p2p')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
# - namespace='CELERY' means all celery-related config keys should be uppercase and prefixed with CELERY_
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
# The lambda ensures we only autodiscover from our LOCAL_APPS, not all INSTALLED_APPS
app.autodiscover_tasks(lambda: __import__('django.conf', fromlist=['settings']).settings.INSTALLED_APPS)


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    """Debug task for testing Celery configuration."""
    print(f'Request: {self.request!r}')
    return f'Debug task executed successfully'


@app.task(bind=True, max_retries=3, ignore_result=False)
def health_check(self):
    """Health check task for monitoring Celery workers."""
    try:
        from django.core.cache import cache
        # Test Redis connection
        cache.set('celery_health_check', 'ok', 60)
        result = cache.get('celery_health_check')
        if result == 'ok':
            return {'status': 'healthy', 'timestamp': str(self.request.id)}
        else:
            raise Exception('Cache test failed')
    except Exception as exc:
        self.retry(countdown=60, exc=exc)