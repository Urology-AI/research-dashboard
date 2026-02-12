"""
Lab result endpoints
"""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from typing import List

from core.database import SessionLocal
from models import LabResult
from schemas import LabResultCreate, LabResultResponse
from core.auth import get_db, get_current_active_user
from core.security import get_client_ip, get_user_agent
from core.audit import log_audit_event

router = APIRouter(tags=["Lab Results"])


@router.get("/api/patients/{patient_id}/lab-results", response_model=List[LabResultResponse])
async def get_patient_lab_results(
    request: Request,
    patient_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Get all lab results for a patient
    """
    lab_results = db.query(LabResult).filter(LabResult.patient_id == patient_id).all()
    
    # Log access to lab result data (HIPAA audit requirement)
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="view",
        resource_type="lab_result",
        resource_id=patient_id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        details={"patient_id": patient_id, "lab_result_count": len(lab_results)}
    )
    
    return lab_results


# POST endpoint removed - this is a data analytics platform
# Lab result data should be managed in your primary EMR system and uploaded via Excel/CSV or REDCap
# Only GET endpoints are available for viewing data for analytics purposes
