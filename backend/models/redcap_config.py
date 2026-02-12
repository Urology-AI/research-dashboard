"""
REDCap configuration model for secure token storage
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime


class RedcapConfig(Base):
    """
    Secure storage for REDCap API configurations
    API tokens are encrypted at rest
    """
    __tablename__ = "redcap_configs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # Configuration name (e.g., "Main REDCap Project")
    redcap_url = Column(String, nullable=False)  # REDCap API URL
    encrypted_api_token = Column(Text, nullable=False)  # Encrypted API token
    created_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    is_active = Column(Boolean, default=True)
    last_used = Column(DateTime, nullable=True)
    usage_count = Column(Integer, default=0)  # Track how many times used
    description = Column(Text, nullable=True)  # Optional description
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    created_by = relationship("User", backref="redcap_configs")
