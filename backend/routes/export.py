"""
Data export endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import io
import csv
import json

from core.database import SessionLocal
from models import Patient, Procedure, LabResult, FollowUp, User
from schemas import PatientResponse
from core.auth import get_db, get_current_active_user
from core.security import get_client_ip, get_user_agent
from core.audit import log_audit_event

router = APIRouter(prefix="/api/export", tags=["Export"])


@router.get("/patients/csv")
async def export_patients_csv(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    filters: Optional[str] = None
):
    """
    Export patients to CSV
    HIPAA compliant: All exports are logged
    """
    # Parse filters if provided
    filter_dict = {}
    if filters:
        try:
            filter_dict = json.loads(filters)
        except:
            pass
    
    query = db.query(Patient)
    
    # Apply filters
    if filter_dict.get('age_min'):
        query = query.filter(Patient.age >= filter_dict['age_min'])
    if filter_dict.get('age_max'):
        query = query.filter(Patient.age <= filter_dict['age_max'])
    if filter_dict.get('diagnosis'):
        query = query.filter(Patient.diagnosis.ilike(f"%{filter_dict['diagnosis']}%"))
    
    patients = query.all()
    
    # Create CSV in memory
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        'MRN', 'First Name', 'Last Name', 'Date of Birth', 'Age', 'Gender',
        'Diagnosis', 'Gleason Score', 'PSA Level', 'Clinical Stage',
        'Race', 'Ethnicity', 'Insurance', 'Phone', 'Email', 'Address'
    ])
    
    # Write data
    for patient in patients:
        writer.writerow([
            patient.mrn,
            patient.first_name or '',
            patient.last_name or '',
            patient.date_of_birth.strftime('%Y-%m-%d') if patient.date_of_birth else '',
            patient.age or '',
            patient.gender or '',
            patient.diagnosis or '',
            patient.gleason_score or '',
            patient.psa_level or '',
            patient.clinical_stage or '',
            patient.race or '',
            patient.ethnicity or '',
            patient.insurance or '',
            patient.phone or '',
            patient.email or '',
            patient.address or '',
        ])
    
    # Log export
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="export",
        resource_type="patient",
        resource_id=None,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        details={"format": "CSV", "count": len(patients), "filters": filter_dict},
        success=True
    )
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=patients_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
    )


@router.get("/patients/excel")
async def export_patients_excel(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db),
    filters: Optional[str] = None
):
    """
    Export patients to Excel
    HIPAA compliant: All exports are logged
    """
    try:
        import pandas as pd
        from openpyxl import Workbook
        from openpyxl.styles import Font, Alignment
    except ImportError:
        raise HTTPException(status_code=500, detail="Excel export requires pandas and openpyxl")
    
    # Parse filters if provided
    filter_dict = {}
    if filters:
        try:
            filter_dict = json.loads(filters)
        except:
            pass
    
    query = db.query(Patient)
    
    # Apply filters
    if filter_dict.get('age_min'):
        query = query.filter(Patient.age >= filter_dict['age_min'])
    if filter_dict.get('age_max'):
        query = query.filter(Patient.age <= filter_dict['age_max'])
    if filter_dict.get('diagnosis'):
        query = query.filter(Patient.diagnosis.ilike(f"%{filter_dict['diagnosis']}%"))
    
    patients = query.all()
    
    # Prepare data
    data = []
    for patient in patients:
        data.append({
            'MRN': patient.mrn,
            'First Name': patient.first_name or '',
            'Last Name': patient.last_name or '',
            'Date of Birth': patient.date_of_birth.strftime('%Y-%m-%d') if patient.date_of_birth else '',
            'Age': patient.age or '',
            'Gender': patient.gender or '',
            'Diagnosis': patient.diagnosis or '',
            'Gleason Score': patient.gleason_score or '',
            'PSA Level': patient.psa_level or '',
            'Clinical Stage': patient.clinical_stage or '',
            'Race': patient.race or '',
            'Ethnicity': patient.ethnicity or '',
            'Insurance': patient.insurance or '',
            'Phone': patient.phone or '',
            'Email': patient.email or '',
            'Address': patient.address or '',
        })
    
    # Create DataFrame and Excel file
    df = pd.DataFrame(data)
    output = io.BytesIO()
    
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Patients')
    
    # Log export
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="export",
        resource_type="patient",
        resource_id=None,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        details={"format": "Excel", "count": len(patients), "filters": filter_dict},
        success=True
    )
    
    output.seek(0)
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=patients_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"}
    )


@router.get("/patient/{patient_id}/summary")
async def export_patient_summary(
    request: Request,
    patient_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Export patient summary (all data) to JSON
    HIPAA compliant: All exports are logged
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Get related data
    procedures = db.query(Procedure).filter(Procedure.patient_id == patient_id).all()
    lab_results = db.query(LabResult).filter(LabResult.patient_id == patient_id).all()
    follow_ups = db.query(FollowUp).filter(FollowUp.patient_id == patient_id).all()
    
    # Build summary
    summary = {
        "patient": {
            "mrn": patient.mrn,
            "first_name": patient.first_name,
            "last_name": patient.last_name,
            "date_of_birth": patient.date_of_birth.isoformat() if patient.date_of_birth else None,
            "age": patient.age,
            "gender": patient.gender,
            "diagnosis": patient.diagnosis,
            "gleason_score": patient.gleason_score,
            "psa_level": patient.psa_level,
            "clinical_stage": patient.clinical_stage,
            "race": patient.race,
            "ethnicity": patient.ethnicity,
            "insurance": patient.insurance,
            "phone": patient.phone,
            "email": patient.email,
            "address": patient.address,
            "custom_fields": json.loads(patient.custom_fields) if patient.custom_fields else {},
        },
        "procedures": [
            {
                "id": p.id,
                "procedure_type": p.procedure_type.value if p.procedure_type else None,
                "procedure_date": p.procedure_date.isoformat() if p.procedure_date else None,
                "provider": p.provider,
                "facility": p.facility,
                "gleason_score": p.gleason_score,
                "notes": p.notes,
            }
            for p in procedures
        ],
        "lab_results": [
            {
                "id": l.id,
                "test_type": l.test_type,
                "test_date": l.test_date.isoformat() if l.test_date else None,
                "test_value": l.test_value,
                "test_unit": l.test_unit,
                "reference_range": l.reference_range,
            }
            for l in lab_results
        ],
        "follow_ups": [
            {
                "id": f.id,
                "follow_up_date": f.follow_up_date.isoformat() if f.follow_up_date else None,
                "follow_up_type": f.follow_up_type,
                "provider": f.provider,
                "next_follow_up_date": f.next_follow_up_date.isoformat() if f.next_follow_up_date else None,
                "notes": f.notes,
            }
            for f in follow_ups
        ],
        "export_date": datetime.utcnow().isoformat(),
        "exported_by": current_user.username,
    }
    
    # Log export
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="export",
        resource_type="patient",
        resource_id=patient_id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        details={"format": "JSON", "summary": True},
        success=True
    )
    
    return StreamingResponse(
        iter([json.dumps(summary, indent=2)]),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=patient_{patient.mrn}_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"}
    )
