"""
Database models for patient dashboard
All models exported from here for backward compatibility
"""
from .enums import UserRole, ProcedureType
from .patient import Patient
from .procedure import Procedure
from .lab_result import LabResult
from .follow_up import FollowUp
from .user import User
from .data_upload import DataUpload
from .custom_field import CustomFieldDefinition
from .redcap_config import RedcapConfig
from .patient_tag import Tag
from .user_session import UserSession
from .user_2fa import User2FA

# Password hashing utilities (for backward compatibility)
from .user import hash_password_direct, verify_password_direct

__all__ = [
    "UserRole",
    "ProcedureType",
    "Patient",
    "Procedure",
    "LabResult",
    "FollowUp",
    "User",
    "DataUpload",
    "CustomFieldDefinition",
    "RedcapConfig",
    "Tag",
    "UserSession",
    "User2FA",
    "hash_password_direct",
    "verify_password_direct",
]
