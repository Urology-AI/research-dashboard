"""
Analytics and insights services
"""
from sqlalchemy import func, and_, or_
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from typing import List, Dict, Any
from models import Patient, Procedure, LabResult, FollowUp, ProcedureType
from schemas import DashboardStats, PSATrendPoint, PSATrendResponse
from services.caching import cache_decorator


def get_dashboard_stats(db: Session) -> DashboardStats:
    """
    Get overall dashboard statistics
    """
    total_patients = db.query(Patient).count()
    total_procedures = db.query(Procedure).count()
    
    # Active surveillance count (patients with low-risk features)
    active_surveillance = db.query(Patient).filter(
        and_(
            Patient.gleason_score <= 6,
            Patient.psa_level < 10,
            Patient.clinical_stage.in_(['T1', 'T1a', 'T1b', 'T1c'])
        )
    ).count()
    
    # High-risk count (Gleason >= 8 or PSA > 20 or T3+)
    high_risk = db.query(Patient).filter(
        or_(
            Patient.gleason_score >= 8,
            Patient.psa_level > 20,
            Patient.clinical_stage.like('T3%'),
            Patient.clinical_stage.like('T4%')
        )
    ).count()
    
    # Recent procedures (last 30 days)
    thirty_days_ago = date.today() - timedelta(days=30)
    recent_procedures = db.query(Procedure).filter(
        Procedure.procedure_date >= thirty_days_ago
    ).count()
    
    # Upcoming follow-ups removed - follow-up scheduling is an EMR feature
    upcoming_follow_ups = 0
    
    # Average PSA
    avg_psa = db.query(func.avg(Patient.psa_level)).filter(
        Patient.psa_level.isnot(None)
    ).scalar()
    
    # Procedures by type
    procedures_by_type = {}
    for proc_type in ProcedureType:
        count = db.query(Procedure).filter(
            Procedure.procedure_type == proc_type
        ).count()
        procedures_by_type[proc_type.value] = count
    
    return DashboardStats(
        total_patients=total_patients,
        total_procedures=total_procedures,
        active_surveillance_count=active_surveillance,
        high_risk_count=high_risk,
        recent_procedures_count=recent_procedures,
        upcoming_follow_ups_count=upcoming_follow_ups,
        average_psa=float(avg_psa) if avg_psa else None,
        procedures_by_type=procedures_by_type
    )


def get_psa_trends(patient_id: int, db: Session) -> Dict[str, Any]:
    """
    Get PSA trend data for a patient
    """
    lab_results = db.query(LabResult).filter(
        and_(
            LabResult.patient_id == patient_id,
            LabResult.test_type == 'PSA'
        )
    ).order_by(LabResult.test_date).all()
    
    trends = [
        PSATrendPoint(date=result.test_date, value=result.test_value)
        for result in lab_results
    ]
    
    # Calculate PSA velocity if we have at least 2 data points
    velocity = None
    if len(trends) >= 2:
        # PSA velocity = (PSA2 - PSA1) / time in years
        first = trends[0]
        last = trends[-1]
        time_diff = (last.date - first.date).days / 365.25
        if time_diff > 0:
            velocity = (last.value - first.value) / time_diff
    
    return {
        "patient_id": patient_id,
        "trends": [t.dict() for t in trends],
        "velocity": velocity
    }


def get_high_risk_patients(db: Session) -> List[Dict[str, Any]]:
    """
    Get list of high-risk prostate cancer patients
    """
    patients = db.query(Patient).filter(
        or_(
            Patient.gleason_score >= 8,
            Patient.psa_level > 20,
            Patient.clinical_stage.like('T3%'),
            Patient.clinical_stage.like('T4%')
        )
    ).all()
    
    return [
        {
            "id": p.id,
            "mrn": p.mrn,
            "name": f"{p.first_name} {p.last_name}",
            "age": p.age,
            "gleason_score": p.gleason_score,
            "psa_level": p.psa_level,
            "clinical_stage": p.clinical_stage,
            "risk_factors": get_risk_factors(p)
        }
        for p in patients
    ]


def get_risk_factors(patient: Patient) -> List[str]:
    """Get list of risk factors for a patient"""
    factors = []
    if patient.gleason_score and patient.gleason_score >= 8:
        factors.append("High Gleason Score (≥8)")
    if patient.psa_level and patient.psa_level > 20:
        factors.append("High PSA (>20 ng/mL)")
    if patient.clinical_stage and (patient.clinical_stage.startswith('T3') or patient.clinical_stage.startswith('T4')):
        factors.append("Advanced Stage (T3/T4)")
    return factors


@cache_decorator(ttl=600)  # Cache for 10 minutes
def get_psa_distribution(db: Session) -> List[Dict[str, Any]]:
    """
    Get PSA level distribution across all patients
    """
    patients = db.query(Patient).filter(Patient.psa_level.isnot(None)).all()
    
    ranges = {
        '0-4': 0,
        '4-10': 0,
        '10-20': 0,
        '20-50': 0,
        '50+': 0
    }
    
    for patient in patients:
        psa = patient.psa_level
        if psa < 4:
            ranges['0-4'] += 1
        elif psa < 10:
            ranges['4-10'] += 1
        elif psa < 20:
            ranges['10-20'] += 1
        elif psa < 50:
            ranges['20-50'] += 1
        else:
            ranges['50+'] += 1
    
    return [{'range': k, 'count': v} for k, v in ranges.items()]


def get_gleason_distribution(db: Session) -> List[Dict[str, Any]]:
    """
    Get Gleason score distribution
    """
    patients = db.query(Patient).filter(Patient.gleason_score.isnot(None)).all()
    
    distribution = {}
    for patient in patients:
        score = patient.gleason_score
        if score <= 6:
            key = '≤6'
        elif score == 7:
            key = '7'
        else:
            key = '≥8'
        
        distribution[key] = distribution.get(key, 0) + 1
    
    return [{'score': k, 'count': v} for k, v in distribution.items()]


def get_outcomes_by_treatment(db: Session) -> Dict[str, Any]:
    """
    Get outcomes analysis by treatment type
    """
    procedures = db.query(Procedure).all()
    
    treatment_outcomes = {}
    for proc in procedures:
        proc_type = proc.procedure_type.value if proc.procedure_type else 'Unknown'
        if proc_type not in treatment_outcomes:
            treatment_outcomes[proc_type] = {
                'total': 0,
                'with_followup': 0,
                'avg_psa_reduction': 0,
                'psa_reductions': []
            }
        
        treatment_outcomes[proc_type]['total'] += 1
        
        # Check for follow-up data
        follow_ups = db.query(FollowUp).filter(
            FollowUp.patient_id == proc.patient_id,
            FollowUp.follow_up_date >= proc.procedure_date
        ).all()
        
        if follow_ups:
            treatment_outcomes[proc_type]['with_followup'] += 1
            
            # Get PSA before and after
            pre_psa = db.query(LabResult).filter(
                LabResult.patient_id == proc.patient_id,
                LabResult.test_type == 'PSA',
                LabResult.test_date <= proc.procedure_date
            ).order_by(LabResult.test_date.desc()).first()
            
            post_psa = db.query(LabResult).filter(
                LabResult.patient_id == proc.patient_id,
                LabResult.test_type == 'PSA',
                LabResult.test_date > proc.procedure_date
            ).order_by(LabResult.test_date.asc()).first()
            
            if pre_psa and post_psa and pre_psa.test_value > 0:
                reduction = ((pre_psa.test_value - post_psa.test_value) / pre_psa.test_value) * 100
                treatment_outcomes[proc_type]['psa_reductions'].append(reduction)
    
    # Calculate averages
    for proc_type, data in treatment_outcomes.items():
        if data['psa_reductions']:
            data['avg_psa_reduction'] = sum(data['psa_reductions']) / len(data['psa_reductions'])
        del data['psa_reductions']  # Remove raw data
    
    return treatment_outcomes


def get_risk_stratification(db: Session) -> Dict[str, Any]:
    """
    Get comprehensive risk stratification analysis
    """
    patients = db.query(Patient).all()
    
    risk_categories = {
        'very_low': {'count': 0, 'criteria': []},
        'low': {'count': 0, 'criteria': []},
        'intermediate': {'count': 0, 'criteria': []},
        'high': {'count': 0, 'criteria': []},
        'very_high': {'count': 0, 'criteria': []}
    }
    
    for patient in patients:
        gleason = patient.gleason_score or 0
        psa = patient.psa_level or 0
        stage = patient.clinical_stage or ''
        
        # Risk stratification based on NCCN guidelines
        if gleason <= 6 and psa < 10 and stage in ['T1', 'T1a', 'T1b', 'T1c', 'T2a']:
            category = 'very_low'
        elif gleason <= 6 and psa < 10:
            category = 'low'
        elif gleason == 7 or (psa >= 10 and psa < 20):
            category = 'intermediate'
        elif gleason >= 8 or psa >= 20 or stage.startswith('T3'):
            if gleason >= 9 or psa >= 50 or stage.startswith('T4'):
                category = 'very_high'
            else:
                category = 'high'
        else:
            category = 'intermediate'
        
        risk_categories[category]['count'] += 1
    
    return {
        'categories': risk_categories,
        'total': len(patients)
    }


def get_trend_analysis(db: Session, metric: str = 'psa', days: int = 365) -> List[Dict[str, Any]]:
    """
    Get trend analysis for a specific metric over time
    """
    from datetime import datetime
    
    cutoff_date = date.today() - timedelta(days=days)
    
    if metric == 'psa':
        lab_results = db.query(LabResult).filter(
            and_(
                LabResult.test_type == 'PSA',
                LabResult.test_date >= cutoff_date
            )
        ).order_by(LabResult.test_date).all()
        
        # Group by month
        monthly_data = {}
        for result in lab_results:
            month_key = result.test_date.strftime('%Y-%m')
            if month_key not in monthly_data:
                monthly_data[month_key] = {'values': [], 'count': 0}
            monthly_data[month_key]['values'].append(result.test_value)
            monthly_data[month_key]['count'] += 1
        
        # Calculate averages
        result = []
        for month, data in sorted(monthly_data.items()):
            result.append({
                'month': month,
                'average': sum(data['values']) / len(data['values']),
                'count': data['count'],
                'min': min(data['values']),
                'max': max(data['values'])
            })
        
        return result
    
    return []
