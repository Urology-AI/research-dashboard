"""
Pydantic schemas for request/response validation
All schemas exported from here for backward compatibility
"""
from .patient import PatientBase, PatientCreate, PatientResponse, PatientFilter
from .procedure import ProcedureBase, ProcedureCreate, ProcedureResponse
from .lab_result import LabResultBase, LabResultCreate, LabResultResponse
from .follow_up import FollowUpBase, FollowUpCreate, FollowUpResponse
from .user import UserBase, UserCreate, UserResponse, UserUpdate, Token, TokenData, LoginRequest
from .analytics import DashboardStats, PSATrendPoint, PSATrendResponse
from .custom_field import CustomFieldDefinitionBase, CustomFieldDefinitionCreate, CustomFieldDefinitionResponse
from .data_upload import DataUploadResponse

__all__ = [
    # Patient
    "PatientBase",
    "PatientCreate",
    "PatientResponse",
    "PatientFilter",
    # Procedure
    "ProcedureBase",
    "ProcedureCreate",
    "ProcedureResponse",
    # Lab Result
    "LabResultBase",
    "LabResultCreate",
    "LabResultResponse",
    # Follow-up
    "FollowUpBase",
    "FollowUpCreate",
    "FollowUpResponse",
    # User/Auth
    "UserBase",
    "UserCreate",
    "UserResponse",
    "UserUpdate",
    "Token",
    "TokenData",
    "LoginRequest",
    # Analytics
    "DashboardStats",
    "PSATrendPoint",
    "PSATrendResponse",
    # Custom Field
    "CustomFieldDefinitionBase",
    "CustomFieldDefinitionCreate",
    "CustomFieldDefinitionResponse",
    # Data Upload
    "DataUploadResponse",
]
