"""
Data upload schemas
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from .user import UserResponse


class DataUploadResponse(BaseModel):
    id: int
    filename: str
    file_type: Optional[str] = None
    upload_date: datetime
    uploaded_by_id: Optional[int] = None
    status: str
    records_added: int
    records_updated: int
    error_message: Optional[str] = None
    file_size: Optional[int] = None
    total_rows: Optional[int] = None
    successful_rows: Optional[int] = None
    failed_rows: Optional[int] = None
    processing_details: Optional[str] = None
    uploaded_by: Optional[UserResponse] = None

    class Config:
        from_attributes = True
