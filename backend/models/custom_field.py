"""
Custom field definition model
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean
from core.database import Base
from datetime import datetime


class CustomFieldDefinition(Base):
    __tablename__ = "custom_field_definitions"

    id = Column(Integer, primary_key=True, index=True)
    field_name = Column(String, unique=True, nullable=False, index=True)  # e.g., "tumor_size", "biomarker_1"
    field_label = Column(String, nullable=False)  # Display name: "Tumor Size (cm)"
    field_type = Column(String, nullable=False)  # text, number, date, select, boolean
    entity_type = Column(String, nullable=False)  # patient, procedure, lab_result, follow_up
    is_required = Column(Boolean, default=False)
    default_value = Column(String)
    options = Column(Text)  # JSON array for select fields: ["Option1", "Option2"]
    validation_rules = Column(Text)  # JSON with min, max, pattern, etc.
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
