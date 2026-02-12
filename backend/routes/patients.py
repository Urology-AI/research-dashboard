"""
Patient endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import json

from core.database import SessionLocal
from models import Patient, User
from schemas import PatientCreate, PatientResponse, PatientFilter
from core.auth import get_db, get_current_active_user
from core.security import get_client_ip, get_user_agent
from core.audit import log_audit_event

router = APIRouter(prefix="/api/patients", tags=["Patients"])


@router.get("", response_model=List[PatientResponse])
async def get_patients(
    request: Request,
    skip: int = 0,
    limit: int = 100,
    filters: Optional[PatientFilter] = None,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get list of patients with optional filters
    HIPAA compliant: All access is logged for audit trail
    """
    from sqlalchemy import and_
    
    query = db.query(Patient)
    
    if filters:
        conditions = []
        if filters.age_min:
            conditions.append(Patient.age >= filters.age_min)
        if filters.age_max:
            conditions.append(Patient.age <= filters.age_max)
        if filters.diagnosis:
            conditions.append(Patient.diagnosis.ilike(f"%{filters.diagnosis}%"))
        if filters.gleason_score_min:
            conditions.append(Patient.gleason_score >= filters.gleason_score_min)
        if filters.gleason_score_max:
            conditions.append(Patient.gleason_score <= filters.gleason_score_max)
        if filters.psa_level_min:
            conditions.append(Patient.psa_level >= filters.psa_level_min)
        if filters.psa_level_max:
            conditions.append(Patient.psa_level <= filters.psa_level_max)
        if filters.gender and len(filters.gender) > 0:
            conditions.append(Patient.gender.in_(filters.gender))
        if filters.race and len(filters.race) > 0:
            conditions.append(Patient.race.in_(filters.race))
        if filters.clinical_stage and len(filters.clinical_stage) > 0:
            conditions.append(Patient.clinical_stage.in_(filters.clinical_stage))
        if filters.procedure_type:
            # Filter by procedure type through relationship
            from models import Procedure, ProcedureType
            query = query.join(Procedure).filter(
                Procedure.procedure_type == ProcedureType[filters.procedure_type.upper()]
            )
        
        if conditions:
            query = query.filter(and_(*conditions))
    
    # Get total count before pagination
    total_count = query.count()
    
    patients = query.offset(skip).limit(limit).all()
    
    # Log access to patient data (HIPAA audit requirement)
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="view",
        resource_type="patient",
        resource_id=None,  # Bulk view
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        details={"count": len(patients), "total": total_count, "filters": filters.dict() if filters else None},
        success=True
    )
    
    # Return with total count in response headers
    from fastapi import Response
    response = Response()
    response.headers["X-Total-Count"] = str(total_count)
    
    return [PatientResponse.from_orm(p) for p in patients]


@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(
    request: Request,
    patient_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed patient information
    HIPAA compliant: All access is logged for audit trail
    """
    from sqlalchemy.orm import joinedload
    # Load patient with tags relationship
    patient = db.query(Patient).options(joinedload(Patient.tags)).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Log access to individual patient record
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="view",
        resource_type="patient",
        resource_id=patient_id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        success=True
    )
    
    return PatientResponse.from_orm(patient)


# POST and PUT endpoints removed - this is a data analytics platform
# Patient data should be managed in your primary EMR system and uploaded via Excel/CSV or REDCap
# Only GET endpoints are available for viewing data for analytics purposes
