"""
Dataset model for data-manager–style uploads and column mapping.

Data Manager is used for preprocessing (upload, map columns, re-process); the patient
dashboard uses this for viewing that data. No procedure/lab/follow-up in this pipeline —
this is for managing data before it is shown in the viewer.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from core.database import Base


def _uuid_str():
    return str(uuid.uuid4())


class Dataset(Base):
    __tablename__ = "datasets"

    id = Column(String(36), primary_key=True, default=_uuid_str)
    name = Column(String, nullable=False)
    source_filename = Column(String, nullable=False)
    stored_path = Column(String, nullable=False)
    data_type = Column(String, nullable=True, default="generic")
    column_map = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    imported_patients = relationship(
        "ImportedPatient",
        back_populates="dataset",
        cascade="all, delete-orphan",
    )
