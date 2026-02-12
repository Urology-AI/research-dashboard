"""
REDCap configuration schemas
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class RedcapConfigBase(BaseModel):
    name: str
    redcap_url: str
    description: Optional[str] = None
    is_active: bool = True


class RedcapConfigCreate(RedcapConfigBase):
    api_token: str  # Plain text token (will be encrypted on save)


class RedcapConfigUpdate(BaseModel):
    name: Optional[str] = None
    redcap_url: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    api_token: Optional[str] = None  # If provided, will update encrypted token


class RedcapConfigResponse(RedcapConfigBase):
    id: int
    created_by_id: int
    created_by_username: Optional[str] = None
    last_used: Optional[datetime] = None
    usage_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
