"""
Patient tags model for categorization
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime

# Association table for many-to-many relationship
patient_tags = Table(
    'patient_tags',
    Base.metadata,
    Column('patient_id', Integer, ForeignKey('patients.id'), primary_key=True),
    Column('tag_id', Integer, ForeignKey('tags.id'), primary_key=True),
)


class Tag(Base):
    """
    Tags for categorizing patients
    """
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)
    color = Column(String, default="#1976d2")  # Hex color for UI
    description = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Many-to-many relationship with patients
    patients = relationship("Patient", secondary=patient_tags, back_populates="tags")
