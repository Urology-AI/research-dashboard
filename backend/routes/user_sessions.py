"""
User session management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime, timedelta

from core.database import SessionLocal
from models.user_session import UserSession
from models import User
from schemas.user_session import UserSessionResponse
from core.auth import get_db, get_current_active_user, get_current_admin_user
from core.security import get_client_ip, get_user_agent
from core.audit import log_audit_event

router = APIRouter(prefix="/api/sessions", tags=["User Sessions"])


@router.get("", response_model=List[UserSessionResponse])
async def get_user_sessions(
    request: Request,
    current_user: User = Depends(get_current_admin_user),  # Admin only
    db: Session = Depends(get_db)
):
    """
    Get all active user sessions (admin only)
    """
    sessions = db.query(UserSession).filter(
        UserSession.is_active == "true"
    ).order_by(UserSession.last_activity.desc()).all()
    
    result = []
    for session in sessions:
        result.append(UserSessionResponse(
            id=session.id,
            user_id=session.user_id,
            username=session.user.username if session.user else None,
            user_full_name=session.user.full_name if session.user else None,
            ip_address=session.ip_address,
            user_agent=session.user_agent,
            created_at=session.created_at,
            last_activity=session.last_activity,
            expires_at=session.expires_at,
            is_active=session.is_active == "true",
        ))
    
    return result


@router.delete("/{session_id}")
async def revoke_session(
    request: Request,
    session_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Revoke a session (user can revoke their own, admin can revoke any)
    """
    session = db.query(UserSession).filter(UserSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check permissions
    is_admin = current_user.role == "admin"
    if session.user_id != current_user.id and not is_admin:
        raise HTTPException(status_code=403, detail="You can only revoke your own sessions")
    
    session.is_active = "false"
    db.commit()
    
    # Log revocation
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="revoke_session",
        resource_type="user_session",
        resource_id=session_id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        details={"revoked_user_id": session.user_id},
        success=True
    )
    
    return {"message": "Session revoked successfully"}
