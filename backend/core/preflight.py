"""
Database preflight checks for startup and deployment.

These checks validate:
- Connectivity
- Required schema tables
- CRUD capability (insert/update/delete) via a temporary table
- Presence of at least one admin user (warning only)
"""
from __future__ import annotations

from typing import Any, Dict, List
from sqlalchemy import inspect, text

from .database import Base, engine, SessionLocal
from services.storage import run_storage_preflight_check


REQUIRED_TABLES: List[str] = [
    "users",
    "patients",
    "procedures",
    "lab_results",
    "follow_ups",
    "data_uploads",
    "redcap_configs",
    "user_sessions",
    "user_2fa",
    "audit_logs",
]


def run_database_preflight_checks() -> Dict[str, Any]:
    """Run database readiness checks and return a structured report."""
    report: Dict[str, Any] = {
        "backend": engine.url.get_backend_name(),
        "connectivity_ok": False,
        "schema_ok": False,
        "crud_ok": False,
        "storage_ok": False,
        "ready": False,
        "tables": {
            "required": REQUIRED_TABLES,
            "missing": [],
        },
        "data_checks": {
            "admin_users": 0,
            "patients": 0,
            "has_admin_user": False,
        },
        "crud_checks": {
            "insert": False,
            "update": False,
            "delete": False,
        },
        "warnings": [],
        "errors": [],
        "storage": {},
    }

    db = SessionLocal()
    try:
        # Ensure SQLAlchemy metadata includes all models, then create missing tables.
        # Import side effects register models with Base.metadata.
        import models  # noqa: F401
        from core.audit import AuditLog  # noqa: F401
        Base.metadata.create_all(bind=engine)

        # Connectivity check
        db.execute(text("SELECT 1"))
        report["connectivity_ok"] = True

        # Schema/table check
        inspector = inspect(engine)
        existing_tables = set(inspector.get_table_names())
        missing_tables = [t for t in REQUIRED_TABLES if t not in existing_tables]
        report["tables"]["missing"] = missing_tables
        report["schema_ok"] = len(missing_tables) == 0

        if not report["schema_ok"]:
            report["errors"].append(
                f"Missing required tables after create_all: {', '.join(missing_tables)}"
            )
            report["ready"] = False
            return report

        # Relevant data checks (non-fatal warning if missing admin)
        admin_count = db.execute(
            text("SELECT COUNT(*) FROM users WHERE role = :role"),
            {"role": "admin"},
        ).scalar()
        patient_count = db.execute(text("SELECT COUNT(*) FROM patients")).scalar()
        admin_count = int(admin_count or 0)
        patient_count = int(patient_count or 0)

        report["data_checks"]["admin_users"] = admin_count
        report["data_checks"]["patients"] = patient_count
        report["data_checks"]["has_admin_user"] = admin_count > 0

        if admin_count == 0:
            report["warnings"].append(
                "No admin user found. Create one with: python scripts/create_admin_user.py"
            )

        # CRUD probe using a temporary table so production data is untouched.
        db.execute(
            text(
                "CREATE TEMP TABLE IF NOT EXISTS __db_preflight_probe (id INTEGER, value TEXT)"
            )
        )
        db.execute(
            text("INSERT INTO __db_preflight_probe (id, value) VALUES (:id, :value)"),
            {"id": 1, "value": "insert_ok"},
        )
        report["crud_checks"]["insert"] = True

        db.execute(
            text("UPDATE __db_preflight_probe SET value = :value WHERE id = :id"),
            {"id": 1, "value": "update_ok"},
        )
        updated_value = db.execute(
            text("SELECT value FROM __db_preflight_probe WHERE id = :id"),
            {"id": 1},
        ).scalar()
        report["crud_checks"]["update"] = updated_value == "update_ok"

        db.execute(
            text("DELETE FROM __db_preflight_probe WHERE id = :id"),
            {"id": 1},
        )
        remaining = db.execute(
            text("SELECT COUNT(*) FROM __db_preflight_probe WHERE id = :id"),
            {"id": 1},
        ).scalar()
        report["crud_checks"]["delete"] = int(remaining or 0) == 0

        db.execute(text("DROP TABLE IF EXISTS __db_preflight_probe"))
        db.commit()

        report["crud_ok"] = all(report["crud_checks"].values())
        storage_report = run_storage_preflight_check()
        report["storage"] = storage_report
        report["storage_ok"] = bool(storage_report.get("ok", False))

        if not report["storage_ok"] and storage_report.get("required", False):
            report["errors"].append(
                f"Storage preflight failed (required): {storage_report.get('details', 'unknown error')}"
            )
        elif not report["storage_ok"]:
            report["warnings"].append(
                f"Storage preflight warning: {storage_report.get('details', 'storage unavailable')}"
            )

        report["ready"] = (
            report["connectivity_ok"]
            and report["schema_ok"]
            and report["crud_ok"]
            and (report["storage_ok"] or not report["storage"].get("required", False))
        )
    except Exception as exc:  # broad to ensure diagnostics are returned
        db.rollback()
        report["errors"].append(str(exc))
    finally:
        db.close()

    return report


def run_startup_preflight(strict: bool = False) -> Dict[str, Any]:
    """
    Run preflight checks and optionally fail hard if checks fail.

    Args:
        strict: If True, raise RuntimeError when preflight is not ready.
    """
    report = run_database_preflight_checks()
    if strict and not report["ready"]:
        raise RuntimeError(f"Database preflight failed: {report}")
    return report
