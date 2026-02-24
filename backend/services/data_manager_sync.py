"""
Sync from data-manager preprocessing (ImportedPatient) to dashboard Patient.

Data Manager holds Dataset + ImportedPatient. When promoting to the viewer side:
- Map known fields to Patient fixed columns.
- Put everything else (extra_fields + unmapped) into Patient.custom_fields.

This does not add new columns to the Patient table and does not change
CustomFieldDefinition. The dashboard's existing support for new columns
(custom_fields JSON + CustomFieldDefinition) stays unchanged.
"""
import json
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from models import Patient, ImportedPatient


# Map ImportedPatient attribute names to Patient attribute names.
# Only include fields that exist on both; everything else goes to custom_fields.
IMPORTED_TO_PATIENT_COLUMNS = {
    "mrn": "mrn",
    "first_name": "first_name",
    "last_name": "last_name",
    "race": "race",
    "reason_for_visit": "diagnosis",  # optional mapping
    "gleason_grade": "gleason_score",  # caller may need to parse to int
    "points": None,  # no direct column; goes to custom_fields
    "percent": None,
    "category": None,
    "pca_confirmed": None,
    "age_group": None,
    "family_history": None,
    "genetic_mutation": None,
    "location": None,
    "date_of_service": None,
    "raw": None,
    "extra_fields": None,
}

PATIENT_FIXED_COLUMNS = {
    "mrn", "first_name", "last_name", "date_of_birth", "age", "gender",
    "diagnosis", "gleason_score", "psa_level", "clinical_stage",
    "race", "ethnicity", "insurance", "phone", "email", "address",
    "custom_fields", "created_at", "updated_at",
}


def _gleason_to_score(gleason_grade: Optional[str]) -> Optional[int]:
    """Try to parse gleason_grade string to integer for gleason_score."""
    if gleason_grade is None or not str(gleason_grade).strip():
        return None
    s = str(gleason_grade).strip()
    try:
        return int(s)
    except ValueError:
        pass
    # e.g. "3+4" -> take first part or sum
    if "+" in s:
        parts = s.split("+")
        try:
            return int(parts[0].strip()) + int(parts[1].strip())
        except (ValueError, IndexError):
            pass
    return None


def _build_custom_fields(imported: ImportedPatient) -> dict:
    """Build dict for Patient.custom_fields from ImportedPatient."""
    out = {}

    # extra_fields from data-manager (new columns land here)
    if getattr(imported, "extra_fields", None) and isinstance(imported.extra_fields, dict):
        out.update(imported.extra_fields)

    # Any canonical field not mapped to a fixed Patient column goes into custom_fields
    for key in (
        "date_of_service", "location", "reason_for_visit",
        "points", "percent", "category", "pca_confirmed", "gleason_grade",
        "age_group", "family_history", "genetic_mutation",
    ):
        val = getattr(imported, key, None)
        if val is not None and (str(val).strip() if isinstance(val, str) else True):
            out[key] = val

    return out


def promote_imported_patient_to_patient(
    db: Session,
    imported: ImportedPatient,
    merge_custom_fields: bool = True,
) -> Patient:
    """
    Create or update a dashboard Patient from an ImportedPatient.

    - Maps known fields to Patient fixed columns.
    - Puts extra_fields and other unmapped data into Patient.custom_fields.
    - Does not add new DB columns; does not touch CustomFieldDefinition.
    """
    patient = db.query(Patient).filter(Patient.mrn == imported.mrn).first()

    new_custom = _build_custom_fields(imported)

    if not patient:
        # Create new Patient
        patient_data = {
            "mrn": imported.mrn or "",
            "first_name": imported.first_name,
            "last_name": imported.last_name,
            "race": imported.race,
            "diagnosis": imported.reason_for_visit,
            "gleason_score": _gleason_to_score(imported.gleason_grade),
        }
        patient_data = {k: v for k, v in patient_data.items() if v is not None and v != ""}
        if new_custom:
            patient_data["custom_fields"] = json.dumps(new_custom)
        patient = Patient(**patient_data)
        db.add(patient)
    else:
        # Update existing: only set fixed columns we have data for
        if imported.first_name is not None:
            patient.first_name = imported.first_name
        if imported.last_name is not None:
            patient.last_name = imported.last_name
        if imported.race is not None:
            patient.race = imported.race
        if imported.reason_for_visit is not None:
            patient.diagnosis = imported.reason_for_visit
        gs = _gleason_to_score(imported.gleason_grade)
        if gs is not None:
            patient.gleason_score = gs

        if merge_custom_fields:
            existing = {}
            if patient.custom_fields:
                try:
                    existing = json.loads(patient.custom_fields)
                except Exception:
                    pass
            existing.update(new_custom)
            if existing:
                patient.custom_fields = json.dumps(existing)
        elif new_custom:
            patient.custom_fields = json.dumps(new_custom)

        patient.updated_at = datetime.utcnow()

    return patient
