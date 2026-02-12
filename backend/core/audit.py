"""
Audit logging for HIPAA compliance
Logs all access to PHI (Protected Health Information)
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base
from typing import Optional
import json


class AuditLog(Base):
    """
    Audit log table for HIPAA compliance
    Records all access to PHI for compliance and security monitoring
    """
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    username = Column(String, nullable=False, index=True)  # Denormalized for performance
    action = Column(String, nullable=False, index=True)  # view, create, update, delete, export, login, logout
    resource_type = Column(String, nullable=False, index=True)  # patient, procedure, lab_result, follow_up, user, data_upload
    resource_id = Column(Integer, nullable=True, index=True)  # ID of the resource accessed
    ip_address = Column(String, nullable=True)  # Client IP address
    user_agent = Column(String, nullable=True)  # Browser/client information
    details = Column(Text, nullable=True)  # JSON string with additional details
    success = Column(String, default="true")  # true, false, error
    error_message = Column(Text, nullable=True)  # Error details if action failed
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    user = relationship("User", backref="audit_logs")


def log_audit_event(
    db,
    user_id: int,
    username: str,
    action: str,
    resource_type: str,
    resource_id: Optional[int] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    details: Optional[dict] = None,
    success: bool = True,
    error_message: Optional[str] = None
):
    """
    Log an audit event for HIPAA compliance
    
    Args:
        db: Database session
        user_id: ID of user performing action
        username: Username (denormalized for performance)
        action: Action type (view, create, update, delete, export, login, logout)
        resource_type: Type of resource (patient, procedure, etc.)
        resource_id: ID of resource accessed (if applicable)
        ip_address: Client IP address
        user_agent: Browser/client information
        details: Additional details as dictionary (will be JSON encoded)
        success: Whether action was successful
        error_message: Error message if action failed
    """
    try:
        audit_log = AuditLog(
            user_id=user_id,
            username=username,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details=json.dumps(details) if details else None,
            success="true" if success else "false",
            error_message=error_message,
            timestamp=datetime.utcnow()
        )
        db.add(audit_log)
        db.commit()
    except Exception as e:
        # Don't fail the main operation if audit logging fails
        # But log the error for investigation
        print(f"Error logging audit event: {e}")
        db.rollback()


def get_audit_logs(
    db,
    user_id: Optional[int] = None,
    resource_type: Optional[str] = None,
    action: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 100,
    offset: int = 0
):
    """
    Retrieve audit logs with filtering
    
    Args:
        db: Database session
        user_id: Filter by user ID
        resource_type: Filter by resource type
        action: Filter by action type
        start_date: Filter by start date
        end_date: Filter by end date
        limit: Maximum number of records
        offset: Offset for pagination
    """
    query = db.query(AuditLog)
    
    if user_id:
        query = query.filter(AuditLog.user_id == user_id)
    if resource_type:
        query = query.filter(AuditLog.resource_type == resource_type)
    if action:
        query = query.filter(AuditLog.action == action)
    if start_date:
        query = query.filter(AuditLog.timestamp >= start_date)
    if end_date:
        query = query.filter(AuditLog.timestamp <= end_date)
    
    return query.order_by(AuditLog.timestamp.desc()).limit(limit).offset(offset).all()
