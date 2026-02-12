"""
Patient model
"""
from sqlalchemy import Column, Integer, String, Float, Date, DateTime, Text
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    mrn = Column(String, unique=True, index=True, nullable=False)  # Medical Record Number - REQUIRED
    
    # Core fields (optional but commonly used)
    first_name = Column(String)
    last_name = Column(String)
    date_of_birth = Column(Date)
    age = Column(Integer)
    gender = Column(String, default="M")
    
    # Clinical Data (all optional)
    diagnosis = Column(String)
    gleason_score = Column(Integer)  # Prostate cancer Gleason score
    psa_level = Column(Float)  # Most recent PSA
    clinical_stage = Column(String)  # T1, T2, T3, etc.
    
    # Demographics (all optional)
    race = Column(String)
    ethnicity = Column(String)
    insurance = Column(String)
    
    # Contact (all optional)
    phone = Column(String)
    email = Column(String)
    address = Column(Text)
    
    # Custom fields - JSON field for flexible schema
    custom_fields = Column(Text)  # JSON string for any additional fields
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    procedures = relationship("Procedure", back_populates="patient", cascade="all, delete-orphan")
    lab_results = relationship("LabResult", back_populates="patient", cascade="all, delete-orphan")
    follow_ups = relationship("FollowUp", back_populates="patient", cascade="all, delete-orphan")
    tags = relationship("Tag", secondary="patient_tags", back_populates="patients")
