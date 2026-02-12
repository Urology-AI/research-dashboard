"""
Two-factor authentication schemas
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class TwoFactorSetupResponse(BaseModel):
    secret_key: str  # QR code data
    backup_codes: List[str]
    qr_code_url: str

    class Config:
        from_attributes = True


class TwoFactorVerifyRequest(BaseModel):
    code: str


class TwoFactorVerifyResponse(BaseModel):
    success: bool
    backup_code_used: bool = False


class TwoFactorStatusResponse(BaseModel):
    is_enabled: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
