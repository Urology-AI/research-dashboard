"""
Data quality analysis services
"""
from sqlalchemy import func, and_, or_
from sqlalchemy.orm import Session
from typing import Dict, List, Any
from models import Patient, Procedure, LabResult
import json


def analyze_data_quality(db: Session) -> Dict[str, Any]:
    """
    Comprehensive data quality analysis
    """
    total_patients = db.query(Patient).count()
    
    # Missing data analysis
    missing_data = {
        "first_name": db.query(Patient).filter(Patient.first_name.is_(None)).count(),
        "last_name": db.query(Patient).filter(Patient.last_name.is_(None)).count(),
        "date_of_birth": db.query(Patient).filter(Patient.date_of_birth.is_(None)).count(),
        "age": db.query(Patient).filter(Patient.age.is_(None)).count(),
        "gender": db.query(Patient).filter(Patient.gender.is_(None)).count(),
        "diagnosis": db.query(Patient).filter(Patient.diagnosis.is_(None)).count(),
        "gleason_score": db.query(Patient).filter(Patient.gleason_score.is_(None)).count(),
        "psa_level": db.query(Patient).filter(Patient.psa_level.is_(None)).count(),
        "clinical_stage": db.query(Patient).filter(Patient.clinical_stage.is_(None)).count(),
    }
    
    # Calculate completeness percentages
    completeness = {
        field: round((1 - (count / total_patients)) * 100, 2) if total_patients > 0 else 0
        for field, count in missing_data.items()
    }
    
    # Duplicate detection (by MRN)
    duplicate_mrns = db.query(
        Patient.mrn,
        func.count(Patient.id).label('count')
    ).group_by(Patient.mrn).having(func.count(Patient.id) > 1).all()
    
    duplicates = [
        {"mrn": mrn, "count": count}
        for mrn, count in duplicate_mrns
    ]
    
    # Outlier detection (PSA levels)
    psa_values = db.query(Patient.psa_level).filter(Patient.psa_level.isnot(None)).all()
    psa_list = [p[0] for p in psa_values if p[0] is not None]
    
    outliers = []
    if len(psa_list) > 0:
        import numpy as np
        q1 = np.percentile(psa_list, 25)
        q3 = np.percentile(psa_list, 75)
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        
        outlier_patients = db.query(Patient).filter(
            and_(
                Patient.psa_level.isnot(None),
                or_(
                    Patient.psa_level < lower_bound,
                    Patient.psa_level > upper_bound
                )
            )
        ).limit(50).all()
        
        outliers = [
            {
                "patient_id": p.id,
                "mrn": p.mrn,
                "name": f"{p.first_name or ''} {p.last_name or ''}".strip(),
                "psa_level": p.psa_level,
                "reason": "Below Q1-1.5*IQR" if p.psa_level < lower_bound else "Above Q3+1.5*IQR"
            }
            for p in outlier_patients
        ]
    
    # Data consistency checks
    consistency_issues = []
    
    # Check for invalid age values
    invalid_ages = db.query(Patient).filter(
        or_(
            Patient.age < 0,
            Patient.age > 150
        )
    ).count()
    if invalid_ages > 0:
        consistency_issues.append({
            "type": "invalid_age",
            "count": invalid_ages,
            "description": "Patients with age < 0 or > 150"
        })
    
    # Check for invalid PSA values
    invalid_psa = db.query(Patient).filter(
        and_(
            Patient.psa_level.isnot(None),
            Patient.psa_level < 0
        )
    ).count()
    if invalid_psa > 0:
        consistency_issues.append({
            "type": "invalid_psa",
            "count": invalid_psa,
            "description": "Patients with negative PSA levels"
        })
    
    # Check for invalid Gleason scores
    invalid_gleason = db.query(Patient).filter(
        and_(
            Patient.gleason_score.isnot(None),
            or_(
                Patient.gleason_score < 1,
                Patient.gleason_score > 10
            )
        )
    ).count()
    if invalid_gleason > 0:
        consistency_issues.append({
            "type": "invalid_gleason",
            "count": invalid_gleason,
            "description": "Patients with Gleason score < 1 or > 10"
        })
    
    # Overall quality score
    overall_score = sum(completeness.values()) / len(completeness) if completeness else 0
    overall_score = max(0, overall_score - (len(duplicates) * 5) - (len(consistency_issues) * 3))
    
    return {
        "total_patients": total_patients,
        "overall_quality_score": round(overall_score, 2),
        "missing_data": missing_data,
        "completeness": completeness,
        "duplicates": {
            "count": len(duplicates),
            "details": duplicates
        },
        "outliers": {
            "count": len(outliers),
            "details": outliers[:20]  # Limit to first 20
        },
        "consistency_issues": consistency_issues,
        "summary": {
            "total_issues": len(duplicates) + len(consistency_issues),
            "data_completeness": round(sum(completeness.values()) / len(completeness), 2) if completeness else 0
        }
    }
