"""
Follow-up schemas
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import date, datetime
import json


class FollowUpBase(BaseModel):
    patient_id: int
    follow_up_date: date
    follow_up_type: Optional[str] = None
    provider: Optional[str] = None
    notes: Optional[str] = None
    next_follow_up_date: Optional[date] = None
    custom_fields: Optional[Dict[str, Any]] = None


class FollowUpCreate(FollowUpBase):
    pass


class FollowUpResponse(FollowUpBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
    
    @classmethod
    def from_orm(cls, obj):
        """Custom from_orm to handle custom_fields JSON"""
        data = {
            'id': obj.id,
            'patient_id': obj.patient_id,
            'follow_up_date': obj.follow_up_date,
            'follow_up_type': obj.follow_up_type,
            'provider': obj.provider,
            'notes': obj.notes,
            'next_follow_up_date': obj.next_follow_up_date,
            'created_at': obj.created_at,
        }
        if obj.custom_fields:
            try:
                data['custom_fields'] = json.loads(obj.custom_fields)
            except:
                data['custom_fields'] = {}
        else:
            data['custom_fields'] = {}
        return cls(**data)
