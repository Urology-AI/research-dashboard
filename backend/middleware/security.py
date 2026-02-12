"""
Security middleware for HIPAA compliance
"""
import time
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from typing import Callable
from collections import defaultdict
from datetime import datetime, timedelta


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware to prevent abuse
    Tracks requests per IP address
    """
    
    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.requests = defaultdict(list)  # IP -> list of request timestamps
        self.cleanup_interval = 60  # Clean up old entries every 60 seconds
        self.last_cleanup = time.time()
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip rate limiting for health checks and OPTIONS requests (CORS preflight)
        if request.url.path == "/health" or request.method == "OPTIONS":
            return await call_next(request)
        
        # Get client IP
        client_ip = request.client.host if request.client else "unknown"
        
        # Clean up old entries periodically
        current_time = time.time()
        if current_time - self.last_cleanup > self.cleanup_interval:
            self._cleanup_old_entries()
            self.last_cleanup = current_time
        
        # Check rate limit
        now = time.time()
        minute_ago = now - 60
        
        # Remove requests older than 1 minute
        self.requests[client_ip] = [
            timestamp for timestamp in self.requests[client_ip]
            if timestamp > minute_ago
        ]
        
        # Check if limit exceeded
        if len(self.requests[client_ip]) >= self.requests_per_minute:
            return Response(
                content="Rate limit exceeded. Please try again later.",
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                headers={"Retry-After": "60"}
            )
        
        # Record this request
        self.requests[client_ip].append(now)
        
        # Process request
        response = await call_next(request)
        return response
    
    def _cleanup_old_entries(self):
        """Remove old entries to prevent memory buildup"""
        now = time.time()
        minute_ago = now - 60
        
        for ip in list(self.requests.keys()):
            self.requests[ip] = [
                timestamp for timestamp in self.requests[ip]
                if timestamp > minute_ago
            ]
            if not self.requests[ip]:
                del self.requests[ip]


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Add security headers to all responses
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Remove server information
        if "server" in response.headers:
            del response.headers["server"]
        
        return response


class HTTPSRedirectMiddleware(BaseHTTPMiddleware):
    """
    Redirect HTTP to HTTPS in production
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        import os
        force_https = os.getenv("FORCE_HTTPS", "false").lower() == "true"
        
        if force_https and request.url.scheme == "http":
            https_url = request.url.replace(scheme="https")
            return Response(
                status_code=status.HTTP_301_MOVED_PERMANENTLY,
                headers={"Location": str(https_url)}
            )
        
        return await call_next(request)
