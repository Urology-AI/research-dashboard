"""
Global search endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from typing import List, Optional
from datetime import datetime

from core.database import SessionLocal
from models import Patient, Procedure, LabResult, FollowUp, User
from schemas import PatientResponse
from core.auth import get_db, get_current_active_user
from core.security import get_client_ip, get_user_agent
from core.audit import log_audit_event

router = APIRouter(prefix="/api/search", tags=["Search"])


@router.get("/patients")
async def search_patients(
    request: Request,
    q: str = Query(..., min_length=1, description="Search query"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=200)
):
    """
    Global search across patients
    Searches MRN, name, diagnosis, and other fields
    HIPAA compliant: All searches are logged
    """
    if not q or len(q.strip()) < 1:
        return []
    
    search_term = f"%{q.strip()}%"
    
    # Build search query across multiple fields
    conditions = or_(
        Patient.mrn.ilike(search_term),
        Patient.first_name.ilike(search_term),
        Patient.last_name.ilike(search_term),
        Patient.diagnosis.ilike(search_term),
        Patient.clinical_stage.ilike(search_term),
        Patient.phone.ilike(search_term),
        Patient.email.ilike(search_term),
    )
    
    # Also search in custom fields (JSON)
    # Note: This is a simple text search in JSON - for production, consider full-text search
    try:
        import json
        # For SQLite, we can use LIKE on the JSON string
        # This is not ideal but works for basic search
        conditions = or_(
            conditions,
            Patient.custom_fields.ilike(search_term)
        )
    except:
        pass
    
    patients = db.query(Patient).filter(conditions).limit(limit).all()
    
    # Log search
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="search",
        resource_type="patient",
        resource_id=None,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        details={"query": q, "results_count": len(patients)},
        success=True
    )
    
    return [PatientResponse.from_orm(p) for p in patients]


@router.get("/global")
async def global_search(
    request: Request,
    q: str = Query(..., min_length=1, description="Search query"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=200)
):
    """
    Global search across all entities (patients, procedures, lab results, follow-ups)
    Returns aggregated results
    """
    if not q or len(q.strip()) < 1:
        return {
            "patients": [],
            "procedures": [],
            "lab_results": [],
            "follow_ups": []
        }
    
    search_term = f"%{q.strip()}%"
    
    # Search patients
    patient_conditions = or_(
        Patient.mrn.ilike(search_term),
        Patient.first_name.ilike(search_term),
        Patient.last_name.ilike(search_term),
        Patient.diagnosis.ilike(search_term),
    )
    patients = db.query(Patient).filter(patient_conditions).limit(limit).all()
    
    # Search procedures
    procedures = db.query(Procedure).join(Patient).filter(
        or_(
            Procedure.procedure_type.ilike(search_term),
            Procedure.provider.ilike(search_term),
            Procedure.notes.ilike(search_term),
            Patient.mrn.ilike(search_term),
            Patient.first_name.ilike(search_term),
            Patient.last_name.ilike(search_term),
        )
    ).limit(limit).all()
    
    # Search lab results
    lab_results = db.query(LabResult).join(Patient).filter(
        or_(
            LabResult.test_type.ilike(search_term),
            Patient.mrn.ilike(search_term),
            Patient.first_name.ilike(search_term),
            Patient.last_name.ilike(search_term),
        )
    ).limit(limit).all()
    
    # Search follow-ups
    follow_ups = db.query(FollowUp).join(Patient).filter(
        or_(
            FollowUp.follow_up_type.ilike(search_term),
            FollowUp.provider.ilike(search_term),
            FollowUp.notes.ilike(search_term),
            Patient.mrn.ilike(search_term),
            Patient.first_name.ilike(search_term),
            Patient.last_name.ilike(search_term),
        )
    ).limit(limit).all()
    
    # Log search
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="global_search",
        resource_type="all",
        resource_id=None,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        details={
            "query": q,
            "patients_count": len(patients),
            "procedures_count": len(procedures),
            "lab_results_count": len(lab_results),
            "follow_ups_count": len(follow_ups)
        },
        success=True
    )
    
    return {
        "patients": [PatientResponse.from_orm(p) for p in patients],
        "procedures": [
            {
                "id": p.id,
                "patient_id": p.patient_id,
                "procedure_type": p.procedure_type.value if p.procedure_type else None,
                "procedure_date": p.procedure_date.isoformat() if p.procedure_date else None,
                "provider": p.provider,
                "patient_mrn": p.patient.mrn,
                "patient_name": f"{p.patient.first_name or ''} {p.patient.last_name or ''}".strip(),
            }
            for p in procedures
        ],
        "lab_results": [
            {
                "id": l.id,
                "patient_id": l.patient_id,
                "test_type": l.test_type,
                "test_date": l.test_date.isoformat() if l.test_date else None,
                "test_value": l.test_value,
                "patient_mrn": l.patient.mrn,
                "patient_name": f"{l.patient.first_name or ''} {l.patient.last_name or ''}".strip(),
            }
            for l in lab_results
        ],
        "follow_ups": [
            {
                "id": f.id,
                "patient_id": f.patient_id,
                "follow_up_date": f.follow_up_date.isoformat() if f.follow_up_date else None,
                "follow_up_type": f.follow_up_type,
                "patient_mrn": f.patient.mrn,
                "patient_name": f"{f.patient.first_name or ''} {f.patient.last_name or ''}".strip(),
            }
            for f in follow_ups
        ]
    }
