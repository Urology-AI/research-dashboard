"""
Database preflight checks for startup and deployment.

These checks validate:
- Connectivity
- Required schema tables
- CRUD capability (insert/update/delete) via a temporary table
- Presence of at least one admin user (warning only)
- Bootstrap defaults (create admin + baseline records when empty)
"""
from __future__ import annotations

import json
import os
from datetime import date
from typing import Any, Dict, List, Optional
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


def _env_bool(name: str, default: bool) -> bool:
    value = os.getenv(name, str(default)).strip().lower()
    return value in {"1", "true", "yes", "on"}


def _ensure_default_admin(db, report: Dict[str, Any]) -> Optional[int]:
    """
    Ensure at least one admin exists. Creates or promotes a user if needed.
    """
    from models import User, UserRole

    if not _env_bool("BOOTSTRAP_DEFAULT_ADMIN_ENABLED", True):
        report["bootstrap"]["warnings"].append(
            "Default admin bootstrap is disabled (BOOTSTRAP_DEFAULT_ADMIN_ENABLED=false)."
        )
        return None

    existing_admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
    if existing_admin:
        report["bootstrap"]["admin_status"] = "existing"
        report["bootstrap"]["admin_username"] = existing_admin.username
        return existing_admin.id

    username = os.getenv("DEFAULT_ADMIN_USERNAME", "admin").strip() or "admin"
    email = (
        os.getenv("DEFAULT_ADMIN_EMAIL", "admin@research-dashboard.app").strip()
        or "admin@research-dashboard.app"
    )
    password = (
        os.getenv("DEFAULT_ADMIN_PASSWORD", "ChangeMeNow123!").strip()
        or "ChangeMeNow123!"
    )
    full_name = (
        os.getenv("DEFAULT_ADMIN_FULL_NAME", "Default Admin").strip()
        or "Default Admin"
    )

    # Try promoting an existing user before creating a new one.
    user_by_username = db.query(User).filter(User.username == username).first()
    user_by_email = db.query(User).filter(User.email == email).first()
    target_user = user_by_username or user_by_email
    if target_user:
        target_user.role = UserRole.ADMIN
        target_user.is_active = True
        target_user.hashed_password = User.hash_password(password)
        db.flush()
        report["bootstrap"]["admin_status"] = "promoted_existing_user"
        report["bootstrap"]["admin_username"] = target_user.username
    else:
        new_admin = User(
            username=username,
            email=email,
            hashed_password=User.hash_password(password),
            full_name=full_name,
            role=UserRole.ADMIN,
            is_active=True,
        )
        db.add(new_admin)
        db.flush()
        report["bootstrap"]["admin_status"] = "created"
        report["bootstrap"]["admin_username"] = new_admin.username
        target_user = new_admin

    report["bootstrap"]["warnings"].append(
        "Default admin bootstrap used. Change DEFAULT_ADMIN_PASSWORD immediately."
    )
    return target_user.id


def _ensure_baseline_records(
    db,
    report: Dict[str, Any],
    admin_user_id: Optional[int],
) -> None:
    """
    Insert one baseline non-PHI record per core data table, only when empty.
    """
    from models import DataUpload, FollowUp, LabResult, Patient, Procedure, ProcedureType

    if not _env_bool("BOOTSTRAP_BASELINE_DATA_ENABLED", True):
        report["bootstrap"]["warnings"].append(
            "Baseline data bootstrap disabled (BOOTSTRAP_BASELINE_DATA_ENABLED=false)."
        )
        return

    today = date.today()
    seeded_records: List[str] = report["bootstrap"]["seeded_records"]

    patient = db.query(Patient).order_by(Patient.id.asc()).first()
    if db.query(Patient).count() == 0:
        patient = Patient(
            mrn=os.getenv("BOOTSTRAP_DEFAULT_MRN", "BETA-TEST-0001"),
            first_name="BETA",
            last_name="TEST PATIENT",
            gender="U",
            diagnosis="BETA TESTING DATA - NOT FOR CLINICAL USE",
        )
        db.add(patient)
        db.flush()
        seeded_records.append("patients")

    if db.query(Procedure).count() == 0 and patient is not None:
        db.add(
            Procedure(
                patient_id=patient.id,
                procedure_type=ProcedureType.OTHER,
                procedure_date=today,
                provider="System Bootstrap",
                facility="Research Dashboard",
                notes="Auto-generated baseline record for deployment validation.",
            )
        )
        seeded_records.append("procedures")

    if db.query(LabResult).count() == 0 and patient is not None:
        db.add(
            LabResult(
                patient_id=patient.id,
                test_date=today,
                test_type="Baseline",
                test_value=0.0,
                test_unit="unit",
                reference_range="N/A",
                notes="Auto-generated baseline record for deployment validation.",
            )
        )
        seeded_records.append("lab_results")

    if db.query(FollowUp).count() == 0 and patient is not None:
        db.add(
            FollowUp(
                patient_id=patient.id,
                follow_up_date=today,
                follow_up_type="system_bootstrap",
                provider="System Bootstrap",
                notes="Auto-generated baseline record for deployment validation.",
            )
        )
        seeded_records.append("follow_ups")

    if db.query(DataUpload).count() == 0:
        db.add(
            DataUpload(
                filename="bootstrap_seed.csv",
                file_type="system_seed",
                uploaded_by_id=admin_user_id,
                status="completed",
                records_added=1,
                records_updated=0,
                total_rows=1,
                successful_rows=1,
                failed_rows=0,
                processing_details=json.dumps(
                    {
                        "source": "startup_preflight",
                        "note": "Auto-generated baseline data. Do not use for clinical care.",
                    }
                ),
            )
        )
        seeded_records.append("data_uploads")


def run_database_preflight_checks(
    *,
    bootstrap_defaults: bool = True,
    run_crud_probe: bool = True,
    run_storage_probe: bool = True,
) -> Dict[str, Any]:
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
        "bootstrap": {
            "admin_status": "unknown",
            "admin_username": None,
            "seeded_records": [],
            "warnings": [],
        },
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

        # Bootstrap defaults on fresh databases (idempotent).
        admin_user_id = None
        if bootstrap_defaults:
            admin_user_id = _ensure_default_admin(db, report)
            _ensure_baseline_records(db, report, admin_user_id)
            db.commit()
        else:
            report["bootstrap"]["admin_status"] = "skipped"

        # Relevant data checks (non-fatal warning if missing admin)
        from models import Patient, User, UserRole

        admin_count = int(
            db.query(User).filter(User.role == UserRole.ADMIN).count() or 0
        )
        patient_count = int(db.query(Patient).count() or 0)

        report["data_checks"]["admin_users"] = admin_count
        report["data_checks"]["patients"] = patient_count
        report["data_checks"]["has_admin_user"] = admin_count > 0

        if admin_count == 0:
            report["warnings"].append(
                "No admin user found. Create one with: python scripts/create_admin_user.py"
            )

        if run_crud_probe:
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
        else:
            report["crud_ok"] = True
            report["warnings"].append("CRUD probe skipped by configuration.")

        if run_storage_probe:
            storage_report = run_storage_preflight_check()
            report["storage"] = storage_report
            report["storage_ok"] = bool(storage_report.get("ok", False))
        else:
            report["storage"] = {
                "configured": True,
                "required": False,
                "ok": True,
                "details": "Storage preflight skipped by configuration.",
            }
            report["storage_ok"] = True
            report["warnings"].append("Storage preflight skipped by configuration.")

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


def run_startup_preflight(
    strict: bool = False,
    *,
    bootstrap_defaults: bool = True,
    run_crud_probe: bool = True,
    run_storage_probe: bool = True,
) -> Dict[str, Any]:
    """
    Run preflight checks and optionally fail hard if checks fail.

    Args:
        strict: If True, raise RuntimeError when preflight is not ready.
    """
    report = run_database_preflight_checks(
        bootstrap_defaults=bootstrap_defaults,
        run_crud_probe=run_crud_probe,
        run_storage_probe=run_storage_probe,
    )
    if strict and not report["ready"]:
        raise RuntimeError(f"Database preflight failed: {report}")
    return report
