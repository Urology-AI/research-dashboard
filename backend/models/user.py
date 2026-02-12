"""
User model and password utilities
"""
from sqlalchemy import Column, Integer, String, DateTime, Enum, Boolean
from sqlalchemy.orm import relationship
from core.database import Base
from datetime import datetime
import bcrypt
from .enums import UserRole

# Fallback to direct bcrypt if passlib has issues
def hash_password_direct(password: str) -> str:
    """Hash password using bcrypt directly"""
    password_bytes = password.encode('utf-8')
    # Truncate if longer than 72 bytes (bcrypt limit)
    if len(password_bytes) > 72:
        password_bytes = password_bytes[:72]
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def verify_password_direct(password: str, hashed: str) -> bool:
    """Verify password using bcrypt directly"""
    try:
        password_bytes = password.encode('utf-8')
        if len(password_bytes) > 72:
            password_bytes = password_bytes[:72]
        hashed_bytes = hashed.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        # Treat invalid/malformed stored hashes as non-matching credentials.
        return False


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    role = Column(Enum(UserRole), default=UserRole.CLINICIAN, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime)
    
    # Relationships
    data_uploads = relationship("DataUpload", back_populates="uploaded_by")

    def verify_password(self, password: str) -> bool:
        # Use direct bcrypt only; avoids passlib+bcrypt compatibility issues on Python 3.14.
        return verify_password_direct(password, self.hashed_password)

    @staticmethod
    def hash_password(password: str) -> str:
        # Use direct bcrypt only; avoids passlib+bcrypt compatibility issues on Python 3.14.
        return hash_password_direct(password)
