# This will make sure the app is always imported when
# Django starts so that shared_task will use this app.

# Ensure Django is set up before importing celery app
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Django setup is handled by manage.py or celery.py
# No need to call it here as it causes reentrancy issues

from .celery import app as celery_app

__all__ = ('celery_app',)