"""
Follow-up model
"""
from sqlalchemy import Column, Integer, String, Date, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime


class FollowUp(Base):
    __tablename__ = "follow_ups"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    
    follow_up_date = Column(Date, nullable=False)
    follow_up_type = Column(String)  # office_visit, phone_call, etc.
    provider = Column(String)
    notes = Column(Text)
    next_follow_up_date = Column(Date)
    
    # Custom fields for follow-ups
    custom_fields = Column(Text)  # JSON string for additional follow-up fields
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    patient = relationship("Patient", back_populates="follow_ups")
