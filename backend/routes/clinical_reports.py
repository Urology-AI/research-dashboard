"""
Clinical Reports API - Surgical Intelligence Report Generation

Generates high-end clinical summary PDFs that look like actuarial risk reports,
designed for surgeons who need portable, offline-accessible patient summaries.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload
from typing import Optional
from datetime import datetime

from core.auth import get_db, get_current_active_user
from core.security import get_client_ip, get_user_agent
from core.audit import log_audit_event
from models import Patient, LabResult, Procedure, User
from services.clinical_report import generate_surgical_intelligence_pdf

router = APIRouter(prefix="/api/reports/clinical", tags=["Clinical Reports"])


@router.get("/patient/{patient_id}/surgical-intelligence")
async def get_surgical_intelligence_report(
    request: Request,
    patient_id: int,
    include_predictions: bool = Query(True, description="Include predictive analytics"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Generate a Surgical Intelligence Report PDF for a patient
    
    This report includes:
    - Patient Digital Twin (pre-operative profile)
    - Predictive Analytics (PSA velocity, doubling time, CAPRA score)
    - Surgical Difficulty Index
    - Intra-operative metrics placeholders (Phase II integration)
    - Recovery forecast with confidence intervals
    
    Returns a downloadable PDF file.
    """
    # Fetch patient with all relationships
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    # Fetch lab results
    lab_results = db.query(LabResult).filter(
        LabResult.patient_id == patient_id
    ).order_by(LabResult.test_date).all()
    
    # Fetch most recent procedure (if any)
    procedure = db.query(Procedure).filter(
        Procedure.patient_id == patient_id
    ).order_by(Procedure.procedure_date.desc()).first()
    
    # Convert to dict format for PDF generator
    patient_data = {
        "id": patient.id,
        "mrn": patient.mrn,
        "age": patient.age,
        "gender": patient.gender,
        "psa_level": patient.psa_level,
        "gleason_score": patient.gleason_score,
        "clinical_stage": patient.clinical_stage,
        "diagnosis": patient.diagnosis,
        "custom_fields": patient.custom_fields or {}
    }
    
    lab_history = [
        {
            "id": lab.id,
            "test_type": lab.test_type,
            "test_value": lab.test_value,
            "test_date": lab.test_date.isoformat() if lab.test_date else None,
            "unit": lab.test_unit,
            "reference_range": lab.reference_range
        }
        for lab in lab_results
    ]
    
    procedure_data = None
    if procedure:
        procedure_data = {
            "procedure_type": procedure.procedure_type.value if procedure.procedure_type else None,
            "procedure_date": procedure.procedure_date.isoformat() if procedure.procedure_date else None,
            "provider": procedure.provider,
            "operative_time": procedure.operative_time,
            "blood_loss": procedure.blood_loss,
            "notes": procedure.notes
        }
    
    # Log report generation (HIPAA audit)
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="export",
        resource_type="clinical_report",
        resource_id=patient_id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        details={
            "report_type": "surgical_intelligence",
            "include_predictions": include_predictions,
            "patient_mrn": patient.mrn
        },
        success=True
    )
    
    # Generate PDF
    try:
        pdf_buffer = generate_surgical_intelligence_pdf(
            patient_data=patient_data,
            lab_history=lab_history,
            procedure_data=procedure_data,
            include_predictions=include_predictions
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to generate report: {str(e)}"
        )
    
    # Generate filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M")
    filename = f"Surgical_Intelligence_Report_{patient.mrn}_{timestamp}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={filename}",
            "X-Report-Generated": datetime.now().isoformat()
        }
    )


@router.get("/patient/{patient_id}/psa-analysis")
async def get_psa_analysis(
    request: Request,
    patient_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed PSA kinetics analysis for a patient
    
    Returns JSON with:
    - PSA velocity (ng/mL/year)
    - PSA doubling time (months)
    - Model confidence metrics
    - Clinical interpretations
    """
    from services.clinical_report import calculate_psa_velocity, calculate_psa_doubling_time
    
    # Fetch lab results
    lab_results = db.query(LabResult).filter(
        LabResult.patient_id == patient_id
    ).order_by(LabResult.test_date).all()
    
    # Extract PSA values
    psa_values = []
    psa_dates = []
    for lab in lab_results:
        if lab.test_type and lab.test_type.upper() == 'PSA' and lab.test_value:
            try:
                psa_values.append(float(lab.test_value))
                psa_dates.append(lab.test_date.isoformat() if lab.test_date else None)
            except (ValueError, TypeError):
                pass
    
    if len(psa_values) < 2:
        return {
            "status": "insufficient_data",
            "message": "At least 2 PSA values required for kinetics analysis",
            "psa_count": len(psa_values)
        }
    
    time_points = list(range(len(psa_values)))
    velocity_result = calculate_psa_velocity(psa_values, time_points)
    doubling_result = calculate_psa_doubling_time(psa_values, time_points)
    
    return {
        "status": "success",
        "patient_id": patient_id,
        "psa_count": len(psa_values),
        "psa_values": psa_values,
        "psa_dates": psa_dates,
        "velocity": velocity_result,
        "doubling_time": doubling_result
    }


@router.get("/patient/{patient_id}/risk-assessment")
async def get_comprehensive_risk_assessment(
    request: Request,
    patient_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive risk assessment including CAPRA score and Surgical Difficulty Index
    """
    from services.clinical_report import calculate_capra_score, calculate_surgical_difficulty_index
    
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    custom_fields = patient.custom_fields or {}
    if isinstance(custom_fields, str):
        import json
        try:
            custom_fields = json.loads(custom_fields)
        except:
            custom_fields = {}
    
    # Prepare data
    age = patient.age or 0
    psa = patient.psa_level or 0
    gleason = patient.gleason_score or 6
    stage = patient.clinical_stage or ''
    
    # Parse Gleason
    gleason_primary = custom_fields.get('gleason_primary', 3)
    gleason_secondary = custom_fields.get('gleason_secondary', 3)
    if isinstance(gleason, int) and gleason > 0:
        if gleason <= 6:
            gleason_primary, gleason_secondary = 3, 3
        elif gleason == 7:
            gleason_primary, gleason_secondary = 3, 4
        else:
            gleason_primary, gleason_secondary = 4, 4
    
    cores_positive = custom_fields.get('cores_positive', 0) or 0
    cores_total = custom_fields.get('cores_total', 12) or 12
    percent_positive = (cores_positive / cores_total * 100) if cores_total > 0 else 0
    
    # Calculate scores
    capra = None
    if age and psa:
        capra = calculate_capra_score(
            age=age,
            psa=psa,
            gleason_primary=gleason_primary,
            gleason_secondary=gleason_secondary,
            clinical_stage=stage,
            percent_positive_cores=percent_positive
        )
    
    sdi = calculate_surgical_difficulty_index(
        age=age,
        bmi=custom_fields.get('bmi'),
        prostate_volume=custom_fields.get('prostate_volume'),
        prior_surgery=custom_fields.get('prior_pelvic_surgery', False),
        gleason=gleason,
        clinical_stage=stage
    )
    
    return {
        "patient_id": patient_id,
        "patient_mrn": patient.mrn,
        "capra_score": capra,
        "surgical_difficulty_index": sdi,
        "input_data": {
            "age": age,
            "psa": psa,
            "gleason": gleason,
            "stage": stage,
            "bmi": custom_fields.get('bmi'),
            "prostate_volume": custom_fields.get('prostate_volume')
        }
    }


@router.get("/patient/{patient_id}/recovery-prediction")
async def get_recovery_prediction(
    request: Request,
    patient_id: int,
    nerve_sparing: bool = Query(True, description="Whether nerve-sparing approach planned"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get predicted recovery timeline with confidence intervals
    """
    from services.clinical_report import predict_recovery_timeline
    
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    custom_fields = patient.custom_fields or {}
    if isinstance(custom_fields, str):
        import json
        try:
            custom_fields = json.loads(custom_fields)
        except:
            custom_fields = {}
    
    recovery = predict_recovery_timeline(
        age=patient.age or 60,
        gleason=patient.gleason_score or 6,
        psa=patient.psa_level or 0,
        nerve_sparing=nerve_sparing,
        bmi=custom_fields.get('bmi')
    )
    
    return {
        "patient_id": patient_id,
        "patient_mrn": patient.mrn,
        "nerve_sparing_planned": nerve_sparing,
        "predictions": recovery
    }
