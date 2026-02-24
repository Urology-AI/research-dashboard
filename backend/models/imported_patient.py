"""
Imported patient model from data-manager preprocessing workflow.

Stores patient rows from CSV/Excel uploads (column-mapped). Used for the viewer pipeline:
Data Manager preprocesses data → viewer (patient dashboard) displays it. No procedure/lab/follow-up.
Can be linked to main Patient by MRN when promoting to the full dashboard.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from core.database import Base


def _uuid_str():
    return str(uuid.uuid4())


class ImportedPatient(Base):
    __tablename__ = "imported_patients"

    id = Column(String(36), primary_key=True, default=_uuid_str)
    dataset_id = Column(String(36), ForeignKey("datasets.id"), nullable=False)

    # Patient identification & demographics
    date_of_service = Column(DateTime, nullable=True)
    location = Column(String, nullable=True)
    mrn = Column(String, nullable=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    reason_for_visit = Column(String, nullable=True)

    # Data fields
    points = Column(Float, nullable=True)
    percent = Column(Float, nullable=True)
    category = Column(String, nullable=True)
    pca_confirmed = Column(Boolean, nullable=True)
    gleason_grade = Column(String, nullable=True)
    age_group = Column(String, nullable=True)
    family_history = Column(String, nullable=True)
    race = Column(String, nullable=True)
    genetic_mutation = Column(String, nullable=True)

    # Metadata
    raw = Column(JSON, nullable=True)
    extra_fields = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    dataset = relationship("Dataset", back_populates="imported_patients")
