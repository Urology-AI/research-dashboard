"""
User session schemas
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class UserSessionResponse(BaseModel):
    id: int
    user_id: int
    username: Optional[str] = None
    user_full_name: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    created_at: datetime
    last_activity: datetime
    expires_at: datetime
    is_active: bool

    class Config:
        from_attributes = True
