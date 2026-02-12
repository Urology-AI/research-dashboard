"""
Analytics schemas
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import date


class DashboardStats(BaseModel):
    total_patients: int
    total_procedures: int
    active_surveillance_count: int
    high_risk_count: int
    recent_procedures_count: int  # Last 30 days
    upcoming_follow_ups_count: int  # Next 30 days
    average_psa: Optional[float] = None
    procedures_by_type: dict


class PSATrendPoint(BaseModel):
    date: date
    value: float


class PSATrendResponse(BaseModel):
    patient_id: int
    trends: List[PSATrendPoint]
    velocity: Optional[float] = None  # PSA velocity (ng/ml/year)
