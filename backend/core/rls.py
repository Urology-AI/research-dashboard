"""
Row Level Security (RLS) integration for Supabase
"""
import os
from typing import Optional
from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session
from fastapi import Request


def is_supabase_database() -> bool:
    """Check if we're using Supabase database"""
    database_url = os.getenv("DATABASE_URL", "")
    return "supabase" in database_url.lower()


def set_rls_context(db: Session, request: Optional[Request] = None):
    """
    Set RLS context for the current database session
    This must be called after authentication to enable Row Level Security
    """
    if not is_supabase_database():
        return  # RLS only applies to Supabase
    
    if not request:
        return
    
    # Get RLS claims from request state (set by auth.py)
    role = getattr(request.state, "rls_role", "clinician")
    user_id = getattr(request.state, "rls_user_id", "0")
    
    # Set JWT claims for RLS policies
    try:
        # This sets the auth.jwt() context for RLS policies
        db.execute(f"""
            SET request.jwt.claims to '{{"role": "{role}", "user_id": "{user_id}"}}'
        """)
        db.commit()
    except Exception as e:
        # Log error but don't fail the request
        print(f"Warning: Could not set RLS context: {e}")


def create_rls_engine():
    """
    Create database engine with RLS support for Supabase
    """
    from .database import DATABASE_URL
    
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
    )
    
    if is_supabase_database():
        # Add event listener to set RLS context for new connections
        @event.listens_for(engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            # This will be called for each new connection
            pass
        
        @event.listens_for(engine, "before_execute")
        def receive_before_execute(conn, clauseelement, multiparams, params, execution_options):
            # This could be used to automatically set RLS context, but we'll do it manually
            pass
    
    return engine


def get_rls_db_session(request: Optional[Request] = None):
    """
    Get database session with RLS context set
    Use this instead of the regular get_db() when RLS is needed
    """
    from .database import SessionLocal
    
    db = SessionLocal()
    try:
        set_rls_context(db, request)
        yield db
    finally:
        db.close()


class RLSMixin:
    """
    Mixin for routes that need RLS support
    Provides helper methods to work with RLS
    """
    
    @staticmethod
    def get_db_with_rls(
        request: Request,
        db: Session
    ) -> Session:
        """
        Get database session with RLS context
        Call this in your route endpoints after authentication
        """
        set_rls_context(db, request)
        return db
    
    @staticmethod
    def check_rls_permissions(request: Request, required_role: str = "clinician"):
        """
        Check if current user has required RLS role
        """
        user_role = getattr(request.state, "rls_role", "clinician")
        
        role_hierarchy = {
            "researcher": 1,
            "clinician": 2, 
            "admin": 3
        }
        
        if role_hierarchy.get(user_role, 0) < role_hierarchy.get(required_role, 0):
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{required_role}' required for this operation"
            )
    
    @staticmethod
    def can_access_resource(request: Request, resource_user_id: Optional[int] = None):
        """
        Check if user can access a specific resource
        Admin can access everything, others can only access their own resources
        """
        user_role = getattr(request.state, "rls_role", "clinician")
        current_user_id = getattr(request.state, "rls_user_id", "0")
        
        # Admin can access everything
        if user_role == "admin":
            return True
        
        # If no resource owner specified, allow based on role
        if resource_user_id is None:
            return True
        
        # Users can only access their own resources
        return str(resource_user_id) == current_user_id
