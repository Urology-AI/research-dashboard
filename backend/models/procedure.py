"""
Procedure model
"""
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime
from .enums import ProcedureType


class Procedure(Base):
    __tablename__ = "procedures"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    
    procedure_type = Column(Enum(ProcedureType), nullable=False)
    procedure_date = Column(Date, nullable=False)
    provider = Column(String)  # Surgeon/physician name
    facility = Column(String)
    
    # Procedure-specific data
    notes = Column(Text)
    complications = Column(Text)
    outcome = Column(String)
    
    # For biopsies
    cores_positive = Column(Integer)
    cores_total = Column(Integer)
    gleason_score = Column(Integer)
    
    # For MRI
    pirads_score = Column(Integer)  # PI-RADS score (1-5)
    lesion_location = Column(String)
    lesion_size = Column(Float)  # in cm
    
    # For surgeries
    operative_time = Column(Integer)  # in minutes
    blood_loss = Column(Float)  # in ml
    length_of_stay = Column(Integer)  # in days
    
    # Custom fields for procedures
    custom_fields = Column(Text)  # JSON string for additional procedure fields
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    patient = relationship("Patient", back_populates="procedures")
