"""
Security utilities for HIPAA compliance
"""
import os
import secrets
from cryptography.fernet import Fernet
from typing import Optional
import base64


def get_secret_key() -> str:
    """
    Get SECRET_KEY from environment variable
    Raises error if not set (required for production)
    """
    secret_key = os.getenv("SECRET_KEY")
    if not secret_key:
        # In development, generate a warning but allow
        # In production, this should raise an error
        if os.getenv("ENVIRONMENT") == "production":
            raise ValueError(
                "SECRET_KEY environment variable must be set in production. "
                "Generate a secure key with: python -c 'import secrets; print(secrets.token_urlsafe(32))'"
            )
        else:
            print("WARNING: SECRET_KEY not set. Using default (INSECURE - change for production!)")
            return "your-secret-key-change-in-production-use-env-variable"
    return secret_key


def generate_secret_key() -> str:
    """
    Generate a secure random secret key for JWT tokens
    """
    return secrets.token_urlsafe(32)


def get_encryption_key() -> bytes:
    """
    Get encryption key for encrypting sensitive data (e.g., REDCap tokens)
    Key should be stored in environment variable ENCRYPTION_KEY
    """
    encryption_key = os.getenv("ENCRYPTION_KEY")
    if not encryption_key:
        if os.getenv("ENVIRONMENT") == "production":
            raise ValueError(
                "ENCRYPTION_KEY environment variable must be set in production. "
                "Generate with: python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'"
            )
        else:
            # Generate a temporary key for development (not secure!)
            print("WARNING: ENCRYPTION_KEY not set. Using temporary key (INSECURE - change for production!)")
            return Fernet.generate_key()
    
    # Convert string to bytes if needed
    if isinstance(encryption_key, str):
        return encryption_key.encode()
    return encryption_key


def encrypt_sensitive_data(data: str) -> str:
    """
    Encrypt sensitive data (e.g., REDCap API tokens) using Fernet symmetric encryption
    
    Args:
        data: String data to encrypt
        
    Returns:
        Encrypted string (base64 encoded)
    """
    key = get_encryption_key()
    f = Fernet(key)
    encrypted = f.encrypt(data.encode())
    return encrypted.decode()


def decrypt_sensitive_data(encrypted_data: str) -> str:
    """
    Decrypt sensitive data
    
    Args:
        encrypted_data: Encrypted string (base64 encoded)
        
    Returns:
        Decrypted string
    """
    key = get_encryption_key()
    f = Fernet(key)
    decrypted = f.decrypt(encrypted_data.encode())
    return decrypted.decode()


def validate_password_strength(password: str) -> tuple[bool, str]:
    """
    Validate password meets HIPAA security requirements
    
    Returns:
        (is_valid, error_message)
    """
    if len(password) < 12:
        return False, "Password must be at least 12 characters long"
    
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"
    
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter"
    
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one number"
    
    if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
        return False, "Password must contain at least one special character"
    
    # Check for common weak passwords
    common_passwords = ["password", "password123", "admin", "12345678"]
    if password.lower() in common_passwords:
        return False, "Password is too common. Please choose a stronger password."
    
    return True, ""


def sanitize_error_message(error: Exception, include_details: bool = False) -> str:
    """
    Sanitize error messages to prevent information disclosure
    In production, never expose PHI, stack traces, or system details
    
    Args:
        error: Exception that occurred
        include_details: Whether to include detailed error (only for internal logging)
        
    Returns:
        Sanitized error message safe to return to client
    """
    if include_details:
        # For internal logging only
        return str(error)
    
    # Generic error message for clients (no PHI, no system details)
    error_type = type(error).__name__
    
    # Map specific errors to generic messages
    if "sqlite3" in error_type.lower() or "database" in error_type.lower():
        return "A database error occurred. Please contact support."
    
    if "validation" in error_type.lower():
        return "Invalid data provided. Please check your input."
    
    if "authentication" in error_type.lower() or "unauthorized" in error_type.lower():
        return "Authentication failed. Please check your credentials."
    
    # Generic fallback
    return "An error occurred processing your request. Please try again or contact support."


def get_client_ip(request) -> Optional[str]:
    """
    Extract client IP address from request
    Handles proxies and load balancers
    """
    # Check for forwarded IP (from proxy/load balancer)
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Take the first IP in the chain
        return forwarded_for.split(",")[0].strip()
    
    # Check for real IP header
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    
    # Fallback to direct client IP
    if hasattr(request, "client") and request.client:
        return request.client.host
    
    return None


def get_user_agent(request) -> Optional[str]:
    """
    Extract user agent from request
    """
    return request.headers.get("User-Agent")
