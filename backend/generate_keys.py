"""
Generate RSA key pair for JWT signing.

This script generates:
- jwt_private.pem: Private key for backend JWT signing (RS256)
- jwt_public.pem: Public key for frontend JWT verification

Run once during initial setup: python generate_keys.py
"""

from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.backends import default_backend
from pathlib import Path

def generate_rsa_keypair():
    """Generate RSA 2048-bit key pair for JWT signing."""
    
    print("Generating RSA 2048-bit key pair...")
    
    # Generate private key
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend()
    )
    
    # Get public key from private key
    public_key = private_key.public_key()
    
    # Serialize private key to PEM format
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    
    # Serialize public key to PEM format
    public_pem = public_key.public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )
    
    # Save private key
    script_dir = Path(__file__).parent
    keys_dir = script_dir / 'keys'
    keys_dir.mkdir(exist_ok=True)
    
    private_key_path = keys_dir / 'jwt_private.pem'
    public_key_path = keys_dir / 'jwt_public.pem'
    
    with open(private_key_path, 'wb') as f:
        f.write(private_pem)
    print(f"[OK] Private key saved to: {private_key_path}")
    print("     WARNING: NEVER commit this file to version control!")
    
    # Save public key
    with open(public_key_path, 'wb') as f:
        f.write(public_pem)
    print(f"[OK] Public key saved to: {public_key_path}")
    print("     INFO: This file can be shared with frontend")
    
    return private_key_path, public_key_path

if __name__ == "__main__":
    try:
        generate_rsa_keypair()
        print("\n[SUCCESS] Key pair generated successfully!")
        print("\nNext steps:")
        print("1. Ensure jwt_private.pem is in .gitignore")
        print("2. Copy jwt_public.pem to frontend/src/config/")
        print("3. Update backend settings to use RS256")
    except Exception as e:
        print(f"[ERROR] Error generating keys: {e}")
        raise
