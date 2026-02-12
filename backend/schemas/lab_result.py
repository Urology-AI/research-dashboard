"""
Lab result schemas
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import date, datetime


class LabResultBase(BaseModel):
    patient_id: int
    test_date: date
    test_type: str
    test_value: Optional[float] = None
    test_unit: Optional[str] = None
    reference_range: Optional[str] = None
    notes: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None


class LabResultCreate(LabResultBase):
    pass


class LabResultResponse(LabResultBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
