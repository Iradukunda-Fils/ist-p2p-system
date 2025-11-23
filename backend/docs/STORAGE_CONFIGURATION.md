# Storage Configuration Guide

This document explains how to configure file storage for the Django P2P system.

## Overview

The system supports two storage backends:
- **Local Storage**: Files stored on the local filesystem (development)
- **S3 Storage**: Files stored on AWS S3 or S3-compatible services (production)

## Configuration

### Environment Variables

The storage configuration is controlled by environment variables in your `.env` file:

```bash
# Storage Backend Selection
USE_S3=False  # Set to True for S3, False for local storage

# S3 Configuration (required when USE_S3=True)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_STORAGE_BUCKET_NAME=your_bucket_name
AWS_S3_REGION_NAME=us-east-1
AWS_S3_CUSTOM_DOMAIN=  # Optional: custom domain for S3

# Document Processing Settings
DOCUMENT_MAX_FILE_SIZE=52428800  # 50MB in bytes
DOCUMENT_ALLOWED_EXTENSIONS=.pdf,.png,.jpg,.jpeg,.tiff
```

### Local Storage (Development)

For development, the system uses secure local file storage:

```bash
USE_S3=False
```

Features:
- Files stored in `src/media/` directory
- Secure file permissions (644 for files, 755 for directories)
- Filename sanitization to prevent path traversal attacks
- Automatic directory creation with proper permissions

### S3 Storage (Production)

For production, configure S3 storage:

```bash
USE_S3=True
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_STORAGE_BUCKET_NAME=my-p2p-documents
AWS_S3_REGION_NAME=us-west-2
```

Features:
- Private file access by default
- Server-side encryption (AES256)
- Signed URLs for secure file access
- Content-Disposition: attachment for security
- Automatic fallback to local storage if S3 fails

## Security Features

### File Upload Security

- **File size limits**: Configurable maximum file size
- **Extension validation**: Only allowed file types accepted
- **Content type validation**: MIME type must match file extension
- **Filename sanitization**: Removes dangerous characters and path traversal attempts
- **Unique filenames**: UUIDs prevent filename conflicts and enhance security

### S3 Security

- **Private ACL**: Files are private by default
- **Signed URLs**: Temporary access URLs with expiration
- **Server-side encryption**: Files encrypted at rest
- **Security headers**: Proper cache control and content disposition

## Testing Storage Configuration

Use the management command to test your storage configuration:

```bash
# Show current configuration
python manage.py test_storage --info

# Validate configuration
python manage.py test_storage --validate

# Test S3 connectivity (if enabled)
python manage.py test_storage --s3-test
```

## File Organization

Files are organized in the following structure:

```
documents/
├── proforma/
│   └── 2024/01/15/
│       └── abc123def456.pdf
├── receipt/
│   └── 2024/01/15/
│       └── def789ghi012.jpg
└── general/
    └── 2024/01/15/
        └── ghi345jkl678.pdf
```

## Troubleshooting

### Common Issues

1. **S3 Connection Failed**
   - Check AWS credentials
   - Verify bucket exists and is accessible
   - Check region configuration

2. **File Upload Rejected**
   - Check file size limits
   - Verify file extension is allowed
   - Ensure MIME type matches extension

3. **Permission Denied**
   - Check local directory permissions
   - Verify S3 bucket policies
   - Check AWS IAM permissions

### Logs

Storage operations are logged with the `p2p` logger. Check logs for detailed error information:

```python
import logging
logger = logging.getLogger('p2p')
```

## API Usage

### Document Upload

```python
from core.storage import validate_file_upload, get_document_upload_path

# Validate uploaded file
validate_file_upload(uploaded_file)

# Generate secure upload path
upload_path = get_document_upload_path(document_instance, filename)
```

### Storage Factory

```python
from core.storage import DocumentStorage

# Get configured storage backend
storage = DocumentStorage.get_storage()

# Save file
saved_name = storage.save('filename.pdf', file_content)

# Get file URL
file_url = storage.url(saved_name)
```

## Environment-Specific Settings

### Development
- Uses local storage by default
- Relaxed security for easier development
- Dummy cache backend

### Production
- S3 storage recommended
- Enhanced security headers
- Redis cache backend
- SSL/TLS enforcement

## Migration from Local to S3

To migrate from local storage to S3:

1. Set up S3 bucket and credentials
2. Update environment variables
3. Test configuration with `python manage.py test_storage`
4. Migrate existing files to S3 (manual process)
5. Update `USE_S3=True` in production

## Best Practices

1. **Use separate buckets** for static files and media files
2. **Enable versioning** on S3 buckets for backup
3. **Set up lifecycle policies** to manage storage costs
4. **Monitor storage usage** and costs
5. **Regular backup** of critical documents
6. **Test disaster recovery** procedures

## Support

For storage-related issues:
1. Check the logs for detailed error messages
2. Run the storage test command
3. Verify environment configuration
4. Check AWS/S3 service status if using cloud storage