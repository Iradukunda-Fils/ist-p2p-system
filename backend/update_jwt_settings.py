"""
Script to update Django settings to use RS256 JWT with RSA keys.

This script modifies src/config/settings/base.py to:
1. Load RSA keys from jwt_private.pem and jwt_public.pem
2. Configure SIMPLE_JWT to use RS256 algorithm
3. Keep all other settings intact
"""

import re
from pathlib import Path

def update_jwt_settings():
    """Update JWT settings in base.py to use RS256 with RSA keys."""
    
    settings_file = Path(__file__).parent / 'src' / 'config' / 'settings' / 'base.py'
    
    with open(settings_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find the SIMPLE_JWT section
    jwt_pattern = r"# JWT Settings\nfrom datetime import timedelta\n\nSIMPLE_JWT = \{[^}]+\}"
    
    # New JWT configuration with RS256
    new_jwt_config = '''# JWT Settings
from datetime import timedelta

# Load RSA keys for JWT signing (RS256)
JWT_PRIVATE_KEY_PATH = BASE_DIR.parent / 'keys' / 'jwt_private.pem'
JWT_PUBLIC_KEY_PATH = BASE_DIR.parent / 'keys' / 'jwt_public.pem'

# Read private key for signing
with open(JWT_PRIVATE_KEY_PATH, 'r') as f:
    JWT_SIGNING_KEY = f.read()

# Read public key for verification  
with open(JWT_PUBLIC_KEY_PATH, 'r') as f:
    JWT_VERIFYING_KEY = f.read()

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': False,
    
    # Asymmetric RS256 Algorithm
    'ALGORITHM': 'RS256',
    'SIGNING_KEY': JWT_SIGNING_KEY,  # Private key for signing
    'VERIFYING_KEY': JWT_VERIFYING_KEY,  # Public key for verification
    
    'AUDIENCE': None,
    'ISSUER': None,
    'JWK_URL': None,
    'LEEWAY': 0,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'USER_AUTHENTICATION_RULE': 'rest_framework_simplejwt.authentication.default_user_authentication_rule',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    'TOKEN_USER_CLASS': 'rest_framework_simplejwt.models.TokenUser',
    'JTI_CLAIM': 'jti',
    'SLIDING_TOKEN_REFRESH_EXP_CLAIM': 'refresh_exp',
    'SLIDING_TOKEN_LIFETIME': timedelta(minutes=5),
    'SLIDING_TOKEN_REFRESH_LIFETIME': timedelta(days=1),
}'''
    
    # Replace the JWT section
    updated_content = re.sub(jwt_pattern, new_jwt_config, content, flags=re.DOTALL)
    
    # Write back
    with open(settings_file, 'w', encoding='utf-8') as f:
        f.write(updated_content)
    
    print(f"[OK] Updated {settings_file}")
    print("     Changed: ALGORITHM from HS256 to RS256")
    print("     Added: RSA key loading logic")

if __name__ == '__main__':
    try:
        update_jwt_settings()
        print("\n[SUCCESS] JWT settings updated to use RS256!")
    except Exception as e:
        print(f"[ERROR] Failed to update settings: {e}")
        raise
