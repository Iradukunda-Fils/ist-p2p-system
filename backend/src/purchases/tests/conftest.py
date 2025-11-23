# Test configuration to disable Celery
import os
os.environ['CELERY_TASK_ALWAYS_EAGER'] = 'True'
