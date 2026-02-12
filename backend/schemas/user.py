"""
User and authentication schemas
"""
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from models.enums import UserRole


class UserBase(BaseModel):
    # Response models should tolerate legacy/special-use emails already in DB.
    email: str
    username: str
    full_name: Optional[str] = None
    role: Optional[UserRole] = UserRole.CLINICIAN


class UserCreate(UserBase):
    # Keep strict validation for newly created users.
    email: EmailStr
    password: str


class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True
        orm_mode = True


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None  # New password
    current_password: Optional[str] = None  # Current password (required for password change)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenData(BaseModel):
    username: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str
