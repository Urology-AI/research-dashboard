"""
Custom field definition schemas
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import json


class CustomFieldDefinitionBase(BaseModel):
    field_name: str
    field_label: str
    field_type: str  # text, number, date, select, boolean
    entity_type: str  # patient, procedure, lab_result, follow_up
    is_required: bool = False
    default_value: Optional[str] = None
    options: Optional[List[str]] = None  # For select fields
    validation_rules: Optional[Dict[str, Any]] = None
    display_order: int = 0
    is_active: bool = True


class CustomFieldDefinitionCreate(CustomFieldDefinitionBase):
    pass


class CustomFieldDefinitionResponse(CustomFieldDefinitionBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
    
    @classmethod
    def from_orm(cls, obj):
        """Custom from_orm to handle JSON fields"""
        data = {
            'id': obj.id,
            'field_name': obj.field_name,
            'field_label': obj.field_label,
            'field_type': obj.field_type,
            'entity_type': obj.entity_type,
            'is_required': obj.is_required,
            'default_value': obj.default_value,
            'display_order': obj.display_order,
            'is_active': obj.is_active,
            'created_at': obj.created_at,
            'updated_at': obj.updated_at,
        }
        if obj.options:
            try:
                data['options'] = json.loads(obj.options)
            except:
                data['options'] = []
        else:
            data['options'] = []
        
        if obj.validation_rules:
            try:
                data['validation_rules'] = json.loads(obj.validation_rules)
            except:
                data['validation_rules'] = {}
        else:
            data['validation_rules'] = {}
        
        return cls(**data)
