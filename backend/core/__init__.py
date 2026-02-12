"""
Core backend modules
Database, authentication, migration, startup, security, and audit utilities
"""
from .database import Base, engine, SessionLocal, get_db
from .auth import (
    get_db as auth_get_db,
    get_current_user,
    get_current_active_user,
    get_current_admin_user,
    create_access_token,
    verify_token,
)
from .db_migration import migrate_database
from .preflight import run_database_preflight_checks, run_startup_preflight
from .audit import AuditLog, log_audit_event, get_audit_logs
from .security import (
    get_secret_key,
    generate_secret_key,
    encrypt_sensitive_data,
    decrypt_sensitive_data,
    validate_password_strength,
    sanitize_error_message,
    get_client_ip,
    get_user_agent,
)

__all__ = [
    # Database
    "Base",
    "engine",
    "SessionLocal",
    "get_db",
    # Auth
    "auth_get_db",
    "get_current_user",
    "get_current_active_user",
    "get_current_admin_user",
    "create_access_token",
    "verify_token",
    # Migration
    "migrate_database",
    # Preflight checks
    "run_database_preflight_checks",
    "run_startup_preflight",
    # Audit (HIPAA compliance)
    "AuditLog",
    "log_audit_event",
    "get_audit_logs",
    # Security
    "get_secret_key",
    "generate_secret_key",
    "encrypt_sensitive_data",
    "decrypt_sensitive_data",
    "validate_password_strength",
    "sanitize_error_message",
    "get_client_ip",
    "get_user_agent",
]
