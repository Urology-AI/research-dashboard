"""
Lab result model
"""
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime


class LabResult(Base):
    __tablename__ = "lab_results"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    
    test_date = Column(Date, nullable=False)
    test_type = Column(String, nullable=False)  # PSA, CBC, etc.
    test_value = Column(Float)
    test_unit = Column(String)
    reference_range = Column(String)
    notes = Column(Text)
    
    # Custom fields for lab results
    custom_fields = Column(Text)  # JSON string for additional lab fields
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    patient = relationship("Patient", back_populates="lab_results")
