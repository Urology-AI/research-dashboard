"""
Analytics endpoints - Data-driven analytics for patient insights
"""
from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from schemas import DashboardStats
from core.auth import get_db, get_current_active_user
from core.security import get_client_ip, get_user_agent
from core.audit import log_audit_event
from services.analytics import (
    get_dashboard_stats,
    get_psa_trends,
    get_high_risk_patients,
    get_psa_distribution,
    get_gleason_distribution,
    get_outcomes_by_treatment,
    get_risk_stratification,
    get_trend_analysis
)

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/dashboard-stats", response_model=DashboardStats)
async def get_dashboard_statistics(db: Session = Depends(get_db)):
    """
    Get dashboard statistics and overview
    """
    return get_dashboard_stats(db)


@router.get("/psa-trends/{patient_id}")
async def get_psa_trend_data(
    request: Request,
    patient_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Get PSA trend data for a patient
    """
    trends = get_psa_trends(patient_id, db)
    
    # Log access to patient-specific analytics (HIPAA)
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="view",
        resource_type="analytics_psa_trends",
        resource_id=patient_id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        details={"patient_id": patient_id}
    )
    
    return trends


@router.get("/high-risk-patients")
async def get_high_risk_patients_list(
    request: Request,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_active_user)
):
    """
    Get list of high-risk prostate cancer patients
    """
    patients = get_high_risk_patients(db)
    
    # Log access to patient list (PHI)
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="view",
        resource_type="analytics_high_risk",
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        details={"patient_count": len(patients) if patients else 0}
    )
    
    return patients


@router.get("/psa-distribution")
async def get_psa_distribution_data(db: Session = Depends(get_db)):
    """
    Get PSA level distribution across all patients
    """
    return get_psa_distribution(db)


@router.get("/gleason-distribution")
async def get_gleason_distribution_data(db: Session = Depends(get_db)):
    """
    Get Gleason score distribution
    """
    return get_gleason_distribution(db)


@router.get("/outcomes-by-treatment")
async def get_treatment_outcomes(db: Session = Depends(get_db)):
    """
    Get outcomes analysis by treatment type
    """
    return get_outcomes_by_treatment(db)


@router.get("/risk-stratification")
async def get_risk_stratification_data(db: Session = Depends(get_db)):
    """
    Get comprehensive risk stratification analysis
    """
    return get_risk_stratification(db)


@router.get("/trends")
async def get_trend_analysis_data(
    metric: str = Query("psa", description="Metric to analyze (psa, etc.)"),
    days: int = Query(365, ge=30, le=1095, description="Number of days to analyze"),
    db: Session = Depends(get_db)
):
    """
    Get trend analysis for a specific metric over time
    """
    return get_trend_analysis(db, metric=metric, days=days)
