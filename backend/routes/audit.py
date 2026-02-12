"""
Audit log endpoints for HIPAA compliance
Admin-only access to view audit logs
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

from core.database import SessionLocal
from models import User
from core.auth import get_db, get_current_admin_user
from core.audit import AuditLog, get_audit_logs


router = APIRouter(prefix="/api/admin/audit", tags=["Audit"])


class AuditLogResponse(BaseModel):
    id: int
    user_id: int
    username: str
    action: str
    resource_type: str
    resource_id: Optional[int]
    ip_address: Optional[str]
    user_agent: Optional[str]
    details: Optional[str]
    success: str
    error_message: Optional[str]
    timestamp: datetime
    
    class Config:
        from_attributes = True


@router.get("", response_model=List[AuditLogResponse])
async def get_audit_logs_endpoint(
    user_id: Optional[int] = Query(None, description="Filter by user ID"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    action: Optional[str] = Query(None, description="Filter by action"),
    start_date: Optional[datetime] = Query(None, description="Start date filter"),
    end_date: Optional[datetime] = Query(None, description="End date filter"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    current_user: User = Depends(get_current_admin_user),  # Admin only
    db: Session = Depends(get_db)
):
    """
    Get audit logs for HIPAA compliance monitoring
    Admin only - provides audit trail of all PHI access
    """
    logs = get_audit_logs(
        db=db,
        user_id=user_id,
        resource_type=resource_type,
        action=action,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset
    )
    
    return [AuditLogResponse.from_orm(log) for log in logs]


@router.get("/summary")
async def get_audit_summary(
    days: int = Query(30, ge=1, le=365, description="Number of days to summarize"),
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get audit log summary statistics
    Useful for compliance reporting and security monitoring
    """
    from sqlalchemy import func, and_
    from datetime import timedelta
    
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get summary statistics
    total_actions = db.query(func.count(AuditLog.id)).filter(
        AuditLog.timestamp >= start_date
    ).scalar()
    
    failed_logins = db.query(func.count(AuditLog.id)).filter(
        and_(
            AuditLog.action == "login_failed",
            AuditLog.timestamp >= start_date
        )
    ).scalar()
    
    successful_logins = db.query(func.count(AuditLog.id)).filter(
        and_(
            AuditLog.action == "login",
            AuditLog.timestamp >= start_date
        )
    ).scalar()
    
    patient_access = db.query(func.count(AuditLog.id)).filter(
        and_(
            AuditLog.resource_type == "patient",
            AuditLog.timestamp >= start_date
        )
    ).scalar()
    
    # Actions by type
    actions_by_type = db.query(
        AuditLog.action,
        func.count(AuditLog.id).label('count')
    ).filter(
        AuditLog.timestamp >= start_date
    ).group_by(AuditLog.action).all()
    
    # Resources accessed
    resources_by_type = db.query(
        AuditLog.resource_type,
        func.count(AuditLog.id).label('count')
    ).filter(
        AuditLog.timestamp >= start_date
    ).group_by(AuditLog.resource_type).all()
    
    # Top users by activity
    top_users = db.query(
        AuditLog.username,
        func.count(AuditLog.id).label('count')
    ).filter(
        AuditLog.timestamp >= start_date
    ).group_by(AuditLog.username).order_by(
        func.count(AuditLog.id).desc()
    ).limit(10).all()
    
    return {
        "period_days": days,
        "start_date": start_date.isoformat(),
        "end_date": datetime.utcnow().isoformat(),
        "summary": {
            "total_actions": total_actions,
            "successful_logins": successful_logins,
            "failed_logins": failed_logins,
            "patient_access_count": patient_access,
        },
        "actions_by_type": {action: count for action, count in actions_by_type},
        "resources_by_type": {resource: count for resource, count in resources_by_type},
        "top_users": [{"username": username, "action_count": count} for username, count in top_users]
    }
