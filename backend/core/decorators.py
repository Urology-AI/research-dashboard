"""
Decorators for HIPAA-compliant audit logging
"""
from functools import wraps
from fastapi import Request
from typing import Callable
from core.security import get_client_ip, get_user_agent
from core.audit import log_audit_event


def audit_log(action: str, resource_type: str):
    """
    Decorator to automatically log PHI access for HIPAA compliance
    
    Args:
        action: Action type (view, create, update, delete, export)
        resource_type: Type of resource (patient, procedure, lab_result, etc.)
    """
    def decorator(func: Callable):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract request and current_user from kwargs
            request = None
            current_user = None
            db = None
            resource_id = None
            
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                elif hasattr(arg, 'id') and hasattr(arg, 'username'):  # User object
                    current_user = arg
                elif hasattr(arg, 'query'):  # Database session
                    db = arg
            
            for key, value in kwargs.items():
                if key == 'request' and isinstance(value, Request):
                    request = value
                elif key == 'current_user' and hasattr(value, 'id'):
                    current_user = value
                elif key == 'db' and hasattr(value, 'query'):
                    db = value
                elif key in ['patient_id', 'id', 'procedure_id', 'lab_result_id']:
                    resource_id = value
            
            # Call the original function
            try:
                result = await func(*args, **kwargs)
                
                # Log successful access
                if current_user and db and request:
                    log_audit_event(
                        db=db,
                        user_id=current_user.id,
                        username=current_user.username,
                        action=action,
                        resource_type=resource_type,
                        resource_id=resource_id,
                        ip_address=get_client_ip(request),
                        user_agent=get_user_agent(request),
                        success=True
                    )
                
                return result
            except Exception as e:
                # Log failed access
                if current_user and db and request:
                    log_audit_event(
                        db=db,
                        user_id=current_user.id if current_user else 0,
                        username=current_user.username if current_user else "unknown",
                        action=action,
                        resource_type=resource_type,
                        resource_id=resource_id,
                        ip_address=get_client_ip(request),
                        user_agent=get_user_agent(request),
                        success=False,
                        error_message=str(e)[:500]  # Limit error message length
                    )
                raise
        
        return wrapper
    return decorator
