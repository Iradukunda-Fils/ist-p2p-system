"""
Management command to test storage configuration and connectivity.
"""

from django.core.management.base import BaseCommand
from django.conf import settings
from core.utils.storage_utils import (
    test_s3_connection,
    get_storage_info,
    validate_storage_configuration
)


class Command(BaseCommand):
    help = 'Test storage configuration and connectivity'

    def add_arguments(self, parser):
        parser.add_argument(
            '--s3-test',
            action='store_true',
            help='Run S3 connectivity test',
        )
        parser.add_argument(
            '--info',
            action='store_true',
            help='Show storage configuration info',
        )
        parser.add_argument(
            '--validate',
            action='store_true',
            help='Validate storage configuration',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('=== Storage Configuration Test ===\n')
        )

        # Show storage info by default or if requested
        if options['info'] or not any([options['s3_test'], options['validate']]):
            self.show_storage_info()

        # Validate configuration
        if options['validate'] or not any([options['s3_test'], options['info']]):
            self.validate_configuration()

        # Test S3 connection if requested or if S3 is enabled
        if options['s3_test'] or (getattr(settings, 'USE_S3', False) and not options['info']):
            self.test_s3_connectivity()

    def show_storage_info(self):
        """Display current storage configuration."""
        self.stdout.write(self.style.HTTP_INFO('Storage Configuration:'))
        
        info = get_storage_info()
        
        for key, value in info.items():
            if key == 'use_s3':
                status = self.style.SUCCESS('✓ Enabled') if value else self.style.WARNING('✗ Disabled')
                self.stdout.write(f"  S3 Storage: {status}")
            elif key == 'backend':
                self.stdout.write(f"  Backend: {self.style.HTTP_INFO(value)}")
            elif key == 'location' and value:
                self.stdout.write(f"  Local Path: {self.style.HTTP_INFO(value)}")
            elif key == 'bucket_name' and value:
                self.stdout.write(f"  S3 Bucket: {self.style.HTTP_INFO(value)}")
            elif key == 'region_name' and value:
                self.stdout.write(f"  S3 Region: {self.style.HTTP_INFO(value)}")
            elif key == 'custom_domain' and value:
                self.stdout.write(f"  Custom Domain: {self.style.HTTP_INFO(value)}")
            elif key == 'max_file_size':
                if isinstance(value, int):
                    size_mb = value / (1024 * 1024)
                    self.stdout.write(f"  Max File Size: {self.style.HTTP_INFO(f'{size_mb:.1f} MB')}")
                else:
                    self.stdout.write(f"  Max File Size: {self.style.WARNING(str(value))}")
            elif key == 'allowed_extensions':
                if isinstance(value, list):
                    self.stdout.write(f"  Allowed Extensions: {self.style.HTTP_INFO(', '.join(value))}")
                else:
                    self.stdout.write(f"  Allowed Extensions: {self.style.WARNING(str(value))}")
        
        self.stdout.write('')

    def validate_configuration(self):
        """Validate storage configuration."""
        self.stdout.write(self.style.HTTP_INFO('Configuration Validation:'))
        
        issues = validate_storage_configuration()
        
        if not issues:
            self.stdout.write(f"  {self.style.SUCCESS('✓ All configuration checks passed')}")
        else:
            self.stdout.write(f"  {self.style.ERROR('✗ Configuration issues found:')}")
            for issue in issues:
                self.stdout.write(f"    - {self.style.WARNING(issue)}")
        
        self.stdout.write('')

    def test_s3_connectivity(self):
        """Test S3 connectivity."""
        self.stdout.write(self.style.HTTP_INFO('S3 Connectivity Test:'))
        
        result = test_s3_connection()
        
        if result['status'] == 'success':
            self.stdout.write(f"  {self.style.SUCCESS('✓ S3 connection successful')}")
            if 'bucket' in result:
                self.stdout.write(f"    Bucket: {self.style.HTTP_INFO(result['bucket'])}")
            if 'region' in result:
                self.stdout.write(f"    Region: {self.style.HTTP_INFO(result['region'])}")
        elif result['status'] == 'skipped':
            self.stdout.write(f"  {self.style.WARNING('⚠ ' + result['message'])}")
        else:
            self.stdout.write(f"  {self.style.ERROR('✗ S3 connection failed')}")
            self.stdout.write(f"    Error: {self.style.ERROR(result['message'])}")
        
        self.stdout.write('')