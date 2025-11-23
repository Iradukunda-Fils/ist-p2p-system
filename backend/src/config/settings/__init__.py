"""
Django settings loader for P2P system.

This file determines which settings module to load based on the DJANGO_SETTINGS_MODULE
environment variable or defaults to development settings.
"""

import os
from decouple import config

# Determine which settings to use
ENVIRONMENT = config('ENVIRONMENT', default='development')

if ENVIRONMENT == 'production':
    from .production import *
elif ENVIRONMENT == 'testing':
    from .development import *
    # Override for testing
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': ':memory:'
        }
    }
else:
    from .development import *
