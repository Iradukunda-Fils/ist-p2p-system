"""
Celery configuration for P2P system.
"""

import os
from celery import Celery
from django.conf import settings

# Set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('p2p')

# Using a string here means the worker doesn't have to serialize
# the configuration object to child processes.
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load task modules from all registered Django apps.
app.autodiscover_tasks()

# Enhanced Celery configuration
app.conf.update(
    # Task serialization
    task_track_started=True,
    task_serializer='json',
    result_serializer='json',
    accept_content=['json'],
    
    # Result backend
    result_backend='redis://localhost:6379/0',
    result_expires=3600,  # Results expire after 1 hour
    
    # Timezone settings
    timezone='UTC',
    enable_utc=True,
    
    # Task routing - route different task types to different queues
    task_routes={
        'documents.tasks.extract_document_metadata': {
            'queue': 'documents',
            'routing_key': 'documents.medium'
        },
        'documents.tasks.process_document_ocr': {'queue': 'documents'},
        'documents.tasks.extract_with_llm': {'queue': 'documents'},
        'purchases.tasks.generate_purchase_order': {
            'queue': 'purchases',
            'routing_key': 'purchases.high'
        },
        'purchases.tasks.generate_po_pdf': {
            'queue': 'purchases',
            'routing_key': 'purchases.low'
        },
        'purchases.tasks.validate_receipt_against_po': {'queue': 'validation'},
        'purchases.tasks.notify_finance_team': {'queue': 'notifications'},
    },
    
    # Worker settings
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    worker_disable_rate_limits=False,
    
    # Task execution settings
    task_time_limit=30 * 60,
    task_soft_time_limit=25 * 60,
    task_reject_on_worker_lost=True,
    
    # Retry settings
    task_default_retry_delay=60,
    task_max_retries=3,
    
    # Queue settings
    task_default_queue='default',
    task_create_missing_queues=True,
    
    # Monitoring
    worker_send_task_events=True,
    task_send_sent_event=True,
    
    # Security
    worker_hijack_root_logger=False,
    worker_log_color=False,
)

@app.task(bind=True)
def debug_task(self):
    """Debug task for testing Celery configuration."""
    # print(f'Request: {self.request!r}')  # Uncomment for debugging
    return f'Debug task executed successfully'

@app.task(bind=True, max_retries=3)
def health_check(self):
    """Health check task for monitoring Celery workers."""
    try:
        from django.core.cache import cache
        # Test Redis connection
        cache.set('celery_health_check', 'ok', 60)
        result = cache.get('celery_health_check')
        if result == 'ok':
            return {'status': 'healthy', 'timestamp': self.request.id}
        else:
            raise Exception('Cache test failed')
    except Exception as exc:
        self.retry(countdown=60, exc=exc)