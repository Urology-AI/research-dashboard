"""
Patient schemas
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import date, datetime
import json


class PatientBase(BaseModel):
    mrn: str  # REQUIRED - only field that must be present
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    date_of_birth: Optional[date] = None
    age: Optional[int] = None
    gender: Optional[str] = "M"
    diagnosis: Optional[str] = None
    gleason_score: Optional[int] = None
    psa_level: Optional[float] = None
    clinical_stage: Optional[str] = None
    race: Optional[str] = None
    ethnicity: Optional[str] = None
    insurance: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    custom_fields: Optional[Dict[str, Any]] = None  # Flexible custom fields


class PatientCreate(PatientBase):
    pass


class TagResponse(BaseModel):
    id: int
    name: str
    color: Optional[str] = None
    
    class Config:
        from_attributes = True


class PatientResponse(PatientBase):
    id: int
    created_at: datetime
    updated_at: datetime
    tags: Optional[List[TagResponse]] = []

    class Config:
        from_attributes = True
    
    @classmethod
    def from_orm(cls, obj):
        """Custom from_orm to handle custom_fields JSON and tags"""
        data = {
            'id': obj.id,
            'mrn': obj.mrn,
            'first_name': obj.first_name,
            'last_name': obj.last_name,
            'date_of_birth': obj.date_of_birth,
            'age': obj.age,
            'gender': obj.gender,
            'diagnosis': obj.diagnosis,
            'gleason_score': obj.gleason_score,
            'psa_level': obj.psa_level,
            'clinical_stage': obj.clinical_stage,
            'race': obj.race,
            'ethnicity': obj.ethnicity,
            'insurance': obj.insurance,
            'phone': obj.phone,
            'email': obj.email,
            'address': obj.address,
            'created_at': obj.created_at,
            'updated_at': obj.updated_at,
        }
        if obj.custom_fields:
            try:
                data['custom_fields'] = json.loads(obj.custom_fields)
            except:
                data['custom_fields'] = {}
        else:
            data['custom_fields'] = {}
        
        # Include tags if they exist
        if hasattr(obj, 'tags') and obj.tags:
            data['tags'] = [TagResponse.from_orm(tag) for tag in obj.tags]
        else:
            data['tags'] = []
        
        return cls(**data)


class PatientFilter(BaseModel):
    age_min: Optional[int] = None
    age_max: Optional[int] = None
    diagnosis: Optional[str] = None
    gleason_score_min: Optional[int] = None
    gleason_score_max: Optional[int] = None
    psa_level_min: Optional[float] = None
    psa_level_max: Optional[float] = None
    procedure_type: Optional[str] = None
    gender: Optional[List[str]] = None
    race: Optional[List[str]] = None
    clinical_stage: Optional[List[str]] = None
    date_from: Optional[str] = None
    date_to: Optional[str] = None
