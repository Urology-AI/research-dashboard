"""
Data upload model
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime


class DataUpload(Base):
    __tablename__ = "data_uploads"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    file_type = Column(String)  # excel, csv, redcap
    upload_date = Column(DateTime, default=datetime.utcnow)
    uploaded_by_id = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="completed")  # completed, failed, processing
    records_added = Column(Integer, default=0)
    records_updated = Column(Integer, default=0)
    error_message = Column(Text)
    file_size = Column(Integer)  # in bytes
    processing_details = Column(Text)  # JSON string with pandas operations, data quality metrics
    total_rows = Column(Integer, default=0)  # Total rows in uploaded file
    successful_rows = Column(Integer, default=0)  # Successfully processed rows
    failed_rows = Column(Integer, default=0)  # Failed rows
    
    # Relationships
    uploaded_by = relationship("User", back_populates="data_uploads")
