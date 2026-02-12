"""
Procedure endpoints
"""
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from typing import List

from core.database import SessionLocal
from models import Procedure
from schemas import ProcedureCreate, ProcedureResponse
from core.auth import get_db, get_current_active_user
from core.security import get_client_ip, get_user_agent
from core.audit import log_audit_event

router = APIRouter(tags=["Procedures"])


@router.get("/api/patients/{patient_id}/procedures", response_model=List[ProcedureResponse])
async def get_patient_procedures(
    request: Request,
    patient_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Get all procedures for a patient
    """
    procedures = db.query(Procedure).filter(Procedure.patient_id == patient_id).all()
    
    # Log access to procedure data (HIPAA audit requirement)
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="view",
        resource_type="procedure",
        resource_id=patient_id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        details={"patient_id": patient_id, "procedure_count": len(procedures)}
    )
    
    return procedures


# POST endpoint removed - this is a data analytics platform
# Procedure data should be managed in your primary EMR system and uploaded via Excel/CSV or REDCap
# Only GET endpoints are available for viewing data for analytics purposes
