"""
Health check and info endpoints
"""
from fastapi import APIRouter, Request
from datetime import datetime
import os

router = APIRouter()


@router.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Research Dashboard API",
        "version": "1.0.0",
        "status": "running"
    }


@router.get("/health")
async def health_check(request: Request):
    """
    Health check endpoint
    Returns API status, connection security, and timestamp
    """
    # Check if connection is secure (HTTPS)
    is_secure = request.url.scheme == "https"
    
    # Check if we're in production and should enforce HTTPS
    environment = os.getenv("ENVIRONMENT", "development")
    force_https = os.getenv("FORCE_HTTPS", "false").lower() == "true"
    
    # In production with FORCE_HTTPS enabled, connection must be secure
    if environment == "production" and force_https and not is_secure:
        return {
            "status": "error",
            "message": "Secure connection required",
            "secure": False,
            "timestamp": datetime.utcnow().isoformat(),
            "service": "Research Dashboard API"
        }
    
    return {
        "status": "online",
        "secure": is_secure,
        "timestamp": datetime.utcnow().isoformat(),
        "service": "Research Dashboard API",
        "environment": environment
    }
