"""
Procedure schemas
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import date, datetime
from models.enums import ProcedureType


class ProcedureBase(BaseModel):
    patient_id: int
    procedure_type: ProcedureType
    procedure_date: date
    provider: Optional[str] = None
    facility: Optional[str] = None
    notes: Optional[str] = None
    complications: Optional[str] = None
    outcome: Optional[str] = None
    cores_positive: Optional[int] = None
    cores_total: Optional[int] = None
    gleason_score: Optional[int] = None
    pirads_score: Optional[int] = None
    lesion_location: Optional[str] = None
    lesion_size: Optional[float] = None
    operative_time: Optional[int] = None
    blood_loss: Optional[float] = None
    length_of_stay: Optional[int] = None
    custom_fields: Optional[Dict[str, Any]] = None


class ProcedureCreate(ProcedureBase):
    pass


class ProcedureResponse(ProcedureBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
