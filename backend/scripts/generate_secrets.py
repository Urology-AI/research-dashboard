#!/usr/bin/env python3
"""
Generate secure secret keys for production deployment
Run this script to generate SECRET_KEY and ENCRYPTION_KEY for .env file
"""
import secrets
from cryptography.fernet import Fernet

def generate_secret_key():
    """Generate a secure random secret key for JWT tokens"""
    return secrets.token_urlsafe(32)

def generate_encryption_key():
    """Generate a Fernet encryption key for sensitive data"""
    return Fernet.generate_key().decode()

if __name__ == "__main__":
    print("=" * 60)
    print("HIPAA-Compliant Secret Key Generator")
    print("=" * 60)
    print()
    print("Add these to your .env file:")
    print()
    print(f"SECRET_KEY={generate_secret_key()}")
    print(f"ENCRYPTION_KEY={generate_encryption_key()}")
    print()
    print("=" * 60)
    print("IMPORTANT SECURITY NOTES:")
    print("=" * 60)
    print("1. Never commit .env file to version control")
    print("2. Store these keys securely (password manager, secret management service)")
    print("3. Use different keys for development and production")
    print("4. Rotate keys periodically (at least annually)")
    print("5. If keys are compromised, regenerate immediately")
    print("=" * 60)
