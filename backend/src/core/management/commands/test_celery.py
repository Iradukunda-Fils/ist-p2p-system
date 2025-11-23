"""
Management command to test Celery configuration and connectivity.
"""

from django.core.management.base import BaseCommand
from django.conf import settings
from celery import current_app
import redis
import json


class Command(BaseCommand):
    help = 'Test Celery configuration and Redis connectivity'

    def add_arguments(self, parser):
        parser.add_argument(
            '--queue',
            type=str,
            default='default',
            help='Queue to test (default: default)'
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Testing Celery Configuration...'))
        
        # Test Redis connectivity
        self.test_redis_connection()
        
        # Test Celery app configuration
        self.test_celery_config()
        
        # Test task routing
        self.test_task_routing()
        
        # Test debug task
        self.test_debug_task(options['queue'])
        
        self.stdout.write(self.style.SUCCESS('Celery configuration test completed!'))

    def test_redis_connection(self):
        """Test Redis broker and result backend connectivity."""
        self.stdout.write('Testing Redis connectivity...')
        
        try:
            # Test broker connection
            broker_url = settings.CELERY_BROKER_URL
            r_broker = redis.from_url(broker_url)
            r_broker.ping()
            self.stdout.write(
                self.style.SUCCESS(f'✓ Broker connection successful: {broker_url}')
            )
            
            # Test result backend connection
            result_backend = settings.CELERY_RESULT_BACKEND
            r_result = redis.from_url(result_backend)
            r_result.ping()
            self.stdout.write(
                self.style.SUCCESS(f'✓ Result backend connection successful: {result_backend}')
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Redis connection failed: {e}')
            )

    def test_celery_config(self):
        """Test Celery app configuration."""
        self.stdout.write('Testing Celery app configuration...')
        
        app = current_app
        
        # Check basic configuration
        config_items = [
            ('broker_url', app.conf.broker_url),
            ('result_backend', app.conf.result_backend),
            ('task_serializer', app.conf.task_serializer),
            ('result_serializer', app.conf.result_serializer),
            ('timezone', app.conf.timezone),
            ('task_track_started', app.conf.task_track_started),
        ]
        
        for key, value in config_items:
            self.stdout.write(f'  {key}: {value}')
        
        self.stdout.write(self.style.SUCCESS('✓ Celery configuration loaded'))

    def test_task_routing(self):
        """Test task routing configuration."""
        self.stdout.write('Testing task routing...')
        
        app = current_app
        routes = app.conf.task_routes or {}
        
        if routes:
            self.stdout.write('  Configured routes:')
            for pattern, route_config in routes.items():
                self.stdout.write(f'    {pattern} -> {route_config}')
        else:
            self.stdout.write('  No custom routes configured')
        
        self.stdout.write(self.style.SUCCESS('✓ Task routing configuration checked'))

    def test_debug_task(self, queue):
        """Test debug task execution."""
        self.stdout.write(f'Testing debug task on queue: {queue}...')
        
        try:
            from config.celery import debug_task
            
            # Send task to queue
            result = debug_task.apply_async(queue=queue)
            self.stdout.write(f'  Task ID: {result.id}')
            self.stdout.write(f'  Task State: {result.state}')
            
            # Note: In development, tasks might run eagerly
            if hasattr(settings, 'CELERY_TASK_ALWAYS_EAGER') and settings.CELERY_TASK_ALWAYS_EAGER:
                self.stdout.write(
                    self.style.WARNING('  Note: CELERY_TASK_ALWAYS_EAGER is enabled - tasks run synchronously')
                )
            
            self.stdout.write(self.style.SUCCESS('✓ Debug task queued successfully'))
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'✗ Debug task failed: {e}')
            )