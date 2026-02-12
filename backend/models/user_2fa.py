"""
Two-factor authentication model
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime


class User2FA(Base):
    """
    Two-factor authentication settings for users
    """
    __tablename__ = "user_2fa"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)
    secret_key = Column(String, nullable=False)  # Encrypted TOTP secret
    is_enabled = Column(String, default="false")  # true, false
    backup_codes = Column(String, nullable=True)  # JSON array of backup codes (encrypted)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_used = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", backref="two_factor_auth")
