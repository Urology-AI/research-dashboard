"""
Data ingestion services for Excel and REDCap
"""
import pandas as pd
from datetime import datetime
from sqlalchemy.orm import Session
from models import Patient, Procedure, LabResult, ProcedureType
from typing import Dict, Any
import os


async def process_excel_upload(file_path: str, db: Session) -> Dict[str, Any]:
    """
    Process uploaded Excel/CSV file and import data into database
    Returns processing details including pandas operations
    """
    processing_log = []
    data_quality = {
        "total_rows": 0,
        "valid_rows": 0,
        "invalid_rows": 0,
        "missing_required_fields": 0,
        "duplicate_mrns": 0,
    }
    
    try:
        # Read the file
        processing_log.append("Reading file...")
        if file_path.endswith('.csv'):
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path, engine='openpyxl')
        
        data_quality["total_rows"] = len(df)
        processing_log.append(f"File read successfully: {len(df)} rows, {len(df.columns)} columns")
        
        patients_added = 0
        procedures_added = 0
        lab_results_added = 0
        
        # Normalize column names (handle various formats)
        original_columns = df.columns.tolist()
        df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_')
        processing_log.append(f"Normalized column names: {original_columns} -> {list(df.columns)}")
        
        # Data quality checks
        required_fields = ['mrn', 'medical_record_number', 'first_name', 'firstname', 'last_name', 'lastname']
        has_required = df.columns.isin(required_fields).any()
        if not has_required:
            processing_log.append("WARNING: No required fields (MRN, First Name, Last Name) found")
        
        # Check for duplicate MRNs
        mrn_col = None
        for col in ['mrn', 'medical_record_number']:
            if col in df.columns:
                mrn_col = col
                break
        
        if mrn_col:
            duplicates = df[mrn_col].duplicated().sum()
            data_quality["duplicate_mrns"] = int(duplicates)
            if duplicates > 0:
                processing_log.append(f"WARNING: {duplicates} duplicate MRNs found")
        
        # Process each row
        failed_rows = []
        for idx, row in df.iterrows():
            try:
                # Create or update patient
                patient = create_or_update_patient_from_row(row, db)
                if patient:
                    patients_added += 1
                    data_quality["valid_rows"] += 1
                    
                    # Create procedures if data exists
                    if has_procedure_data(row):
                        procedure = create_procedure_from_row(row, patient.id, db)
                        if procedure:
                            procedures_added += 1
                    
                    # Create lab results if data exists
                    if has_lab_data(row):
                        lab_result = create_lab_result_from_row(row, patient.id, db)
                        if lab_result:
                            lab_results_added += 1
                else:
                    data_quality["invalid_rows"] += 1
                    failed_rows.append({"row": int(idx) + 1, "reason": "Missing MRN"})
            except Exception as e:
                data_quality["invalid_rows"] += 1
                failed_rows.append({"row": int(idx) + 1, "reason": str(e)})
        
        data_quality["missing_required_fields"] = data_quality["total_rows"] - data_quality["valid_rows"]
        data_quality["successful_rows"] = data_quality["valid_rows"]
        data_quality["failed_rows"] = len(failed_rows)
        
        processing_log.append(f"Processing complete: {patients_added} patients, {procedures_added} procedures, {lab_results_added} lab results")
        
        db.commit()
        
        import json
        processing_details = {
            "log": processing_log,
            "data_quality": data_quality,
            "failed_rows": failed_rows[:10],  # Limit to first 10 failed rows
            "pandas_operations": [
                "read_csv/read_excel: Loaded data from file",
                "str.strip().str.lower().str.replace(): Normalized column names",
                "iterrows(): Processed each row",
                "DataFrame operations: Column detection and mapping"
            ]
        }
        
        return {
            "patients_added": patients_added,
            "procedures_added": procedures_added,
            "lab_results_added": lab_results_added,
            "processing_details": json.dumps(processing_details),
            "data_quality": data_quality
        }
    except Exception as e:
        db.rollback()
        raise Exception(f"Error processing file: {str(e)}")


def create_or_update_patient_from_row(row: pd.Series, db: Session) -> Patient:
    """
    Create or update patient from Excel row
    MRN is required, all other fields are optional and flexible
    """
    import json
    
    try:
        # Try to find existing patient by MRN
        mrn = str(row.get('mrn', row.get('medical_record_number', '')))
        if not mrn or mrn == 'nan' or mrn.strip() == '':
            return None
        
        patient = db.query(Patient).filter(Patient.mrn == mrn).first()
        
        # Standard field mappings
        standard_fields = {
            'first_name': ['first_name', 'firstname'],
            'last_name': ['last_name', 'lastname'],
            'age': ['age'],
            'gender': ['gender'],
            'diagnosis': ['diagnosis'],
            'gleason_score': ['gleason_score', 'gleason'],
            'psa_level': ['psa', 'psa_level'],
            'clinical_stage': ['clinical_stage', 'stage'],
            'race': ['race'],
            'ethnicity': ['ethnicity'],
            'insurance': ['insurance'],
            'phone': ['phone'],
            'email': ['email'],
            'address': ['address'],
        }
        
        # Collect custom fields (anything not in standard fields)
        custom_fields = {}
        standard_field_names = set()
        for field, aliases in standard_fields.items():
            standard_field_names.add(field)
            standard_field_names.update(aliases)
        
        patient_data = {'mrn': mrn}
        
        # Process standard fields
        for field_name, aliases in standard_fields.items():
            value = None
            for alias in aliases:
                if alias in row.index and pd.notna(row[alias]):
                    if field_name in ['age', 'gleason_score']:
                        value = safe_int(row[alias])
                    elif field_name == 'psa_level':
                        value = safe_float(row[alias])
                    else:
                        value = safe_str(row[alias])
                    if value is not None:
                        break
            
            if value is not None:
                patient_data[field_name] = value
        
        # Handle date of birth separately
        dob = row.get('date_of_birth', row.get('dob'))
        if pd.notna(dob):
            try:
                if isinstance(dob, str):
                    patient_data['date_of_birth'] = pd.to_datetime(dob).date()
                else:
                    patient_data['date_of_birth'] = dob
            except:
                pass
        
        # Collect custom fields (columns not in standard fields)
        for col in row.index:
            col_lower = str(col).lower().strip().replace(' ', '_')
            if col_lower not in standard_field_names and pd.notna(row[col]):
                value = row[col]
                # Convert to appropriate type
                if isinstance(value, (int, float)):
                    custom_fields[col] = value
                elif isinstance(value, str) and value.strip():
                    custom_fields[col] = value.strip()
                elif pd.notna(value):
                    custom_fields[col] = str(value)
        
        if not patient:
            # Create new patient
            patient_data = {k: v for k, v in patient_data.items() if v is not None}
            if custom_fields:
                patient_data['custom_fields'] = json.dumps(custom_fields)
            patient = Patient(**patient_data)
            db.add(patient)
        else:
            # Update existing patient - update any provided fields
            for key, value in patient_data.items():
                if key != 'mrn' and value is not None:
                    setattr(patient, key, value)
            
            # Merge custom fields
            existing_custom = {}
            if patient.custom_fields:
                try:
                    existing_custom = json.loads(patient.custom_fields)
                except:
                    existing_custom = {}
            
            # Update with new custom fields
            existing_custom.update(custom_fields)
            if existing_custom:
                patient.custom_fields = json.dumps(existing_custom)
            
            patient.updated_at = datetime.utcnow()
        
        return patient
    except Exception as e:
        print(f"Error creating patient: {e}")
        import traceback
        traceback.print_exc()
        return None


def has_procedure_data(row: pd.Series) -> bool:
    """Check if row has procedure data"""
    procedure_fields = ['procedure_type', 'procedure_date', 'biopsy', 'mri', 'surgery']
    return any(pd.notna(row.get(field)) for field in procedure_fields if field in row.index)


def create_procedure_from_row(row: pd.Series, patient_id: int, db: Session) -> Procedure:
    """Create procedure from Excel row"""
    try:
        procedure_type_str = safe_str(row.get('procedure_type', '')).lower()
        procedure_type = None
        
        # Map procedure types
        if 'biopsy' in procedure_type_str:
            procedure_type = ProcedureType.BIOPSY
        elif 'mri' in procedure_type_str:
            procedure_type = ProcedureType.MRI
        elif 'rarp' in procedure_type_str or 'prostatectomy' in procedure_type_str:
            procedure_type = ProcedureType.RARP
        elif 'trus' in procedure_type_str:
            procedure_type = ProcedureType.TRUS
        elif 'radiation' in procedure_type_str:
            procedure_type = ProcedureType.RADIATION
        else:
            return None
        
        procedure_date = None
        date_field = row.get('procedure_date', row.get('date'))
        if pd.notna(date_field):
            try:
                if isinstance(date_field, str):
                    procedure_date = pd.to_datetime(date_field).date()
                else:
                    procedure_date = date_field
            except:
                pass
        
        if not procedure_date:
            return None
        
        procedure_data = {
            'patient_id': patient_id,
            'procedure_type': procedure_type,
            'procedure_date': procedure_date,
            'provider': safe_str(row.get('provider', row.get('surgeon'))),
            'facility': safe_str(row.get('facility')),
            'notes': safe_str(row.get('notes', row.get('procedure_notes'))),
            'gleason_score': safe_int(row.get('gleason_score', row.get('gleason'))),
            'cores_positive': safe_int(row.get('cores_positive')),
            'cores_total': safe_int(row.get('cores_total')),
            'pirads_score': safe_int(row.get('pirads', row.get('pirads_score'))),
        }
        
        procedure = Procedure(**{k: v for k, v in procedure_data.items() if v is not None})
        db.add(procedure)
        return procedure
    except Exception as e:
        print(f"Error creating procedure: {e}")
        return None


def has_lab_data(row: pd.Series) -> bool:
    """Check if row has lab data"""
    return pd.notna(row.get('psa', row.get('psa_level')))


def create_lab_result_from_row(row: pd.Series, patient_id: int, db: Session) -> LabResult:
    """Create lab result from Excel row"""
    try:
        psa_value = safe_float(row.get('psa', row.get('psa_level')))
        if not psa_value:
            return None
        
        test_date = None
        date_field = row.get('test_date', row.get('psa_date', row.get('date')))
        if pd.notna(date_field):
            try:
                if isinstance(date_field, str):
                    test_date = pd.to_datetime(date_field).date()
                else:
                    test_date = date_field
            except:
                test_date = datetime.now().date()
        else:
            test_date = datetime.now().date()
        
        lab_result = LabResult(
            patient_id=patient_id,
            test_date=test_date,
            test_type='PSA',
            test_value=psa_value,
            test_unit='ng/mL',
            notes=safe_str(row.get('lab_notes'))
        )
        db.add(lab_result)
        return lab_result
    except Exception as e:
        print(f"Error creating lab result: {e}")
        return None


async def process_redcap_data(redcap_url: str, api_token: str, db: Session) -> Dict[str, int]:
    """
    Process data from REDCap API
    Requires PyCap package: pip install PyCap
    """
    try:
        try:
            from redcap import Project
        except ImportError:
            raise ImportError(
                "PyCap package is required for REDCap integration. "
                "Install it with: pip install PyCap"
            )
        
        project = Project(redcap_url, api_token)
        records = project.export_records()
        
        patients_added = 0
        records_processed = 0
        
        for record in records:
            try:
                # Map REDCap fields to our schema
                mrn = record.get('mrn', record.get('record_id'))
                if not mrn:
                    continue
                
                # Create or update patient
                patient = db.query(Patient).filter(Patient.mrn == str(mrn)).first()
                
                if not patient:
                    patient_data = {
                        'mrn': str(mrn),
                        'first_name': record.get('first_name', ''),
                        'last_name': record.get('last_name', ''),
                        'age': safe_int(record.get('age')),
                        'diagnosis': record.get('diagnosis'),
                        'gleason_score': safe_int(record.get('gleason_score')),
                        'psa_level': safe_float(record.get('psa_level')),
                    }
                    patient = Patient(**{k: v for k, v in patient_data.items() if v is not None})
                    db.add(patient)
                    patients_added += 1
                
                records_processed += 1
            except Exception as e:
                print(f"Error processing REDCap record: {e}")
                continue
        
        db.commit()
        
        return {
            "patients_added": patients_added,
            "records_processed": records_processed
        }
    except Exception as e:
        db.rollback()
        raise Exception(f"Error processing REDCap data: {str(e)}")


# Helper functions
def safe_int(value) -> int:
    """Safely convert value to int"""
    if pd.isna(value) or value == '' or value is None:
        return None
    try:
        return int(float(value))
    except:
        return None


def safe_float(value) -> float:
    """Safely convert value to float"""
    if pd.isna(value) or value == '' or value is None:
        return None
    try:
        return float(value)
    except:
        return None


def safe_str(value) -> str:
    """Safely convert value to string"""
    if pd.isna(value) or value == '' or value is None:
        return None
    return str(value).strip()
