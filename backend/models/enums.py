"""
Enums for database models
"""
import enum


class UserRole(enum.Enum):
    ADMIN = "admin"
    CLINICIAN = "clinician"
    USER = "user"  # Keep for backward compatibility
    VIEWER = "viewer"


class ProcedureType(enum.Enum):
    BIOPSY = "biopsy"
    MRI = "mri"
    RARP = "rarp"  # Robot-Assisted Radical Prostatectomy
    TRUS = "trus"  # Transrectal Ultrasound
    RADIATION = "radiation"
    ACTIVE_SURVEILLANCE = "active_surveillance"
    OTHER = "other"
