"""
Data upload and ingestion endpoints
"""
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Request
from sqlalchemy.orm import Session
import os
import json
from uuid import uuid4

from core.database import SessionLocal
from models import User, DataUpload
from core.auth import get_db, get_current_admin_user
from services.data_ingestion import process_excel_upload, process_redcap_data
from services.storage import (
    get_storage_config,
    upload_bytes_to_supabase_storage,
    delete_from_supabase_storage,
)

router = APIRouter(prefix="/api", tags=["Data Upload"])


@router.post("/upload/excel")
async def upload_excel(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_admin_user),  # Admin only
    db: Session = Depends(get_db)
):
    """
    Upload and process Excel/CSV file
    """
    file_path = None
    storage_info = None
    try:
        # Save uploaded file temporarily
        safe_filename = os.path.basename(file.filename or "upload.bin")
        file_path = f"/tmp/{uuid4().hex}_{safe_filename}"
        file_size = 0
        content = await file.read()
        file_size = len(content)
        with open(file_path, "wb") as buffer:
            buffer.write(content)

        # Persist original file in Supabase Storage when configured.
        storage_config = get_storage_config()
        if storage_config["configured"]:
            storage_info = upload_bytes_to_supabase_storage(
                content,
                safe_filename,
                folder="excel-uploads",
                content_type=file.content_type,
            )
        elif storage_config["required"]:
            raise HTTPException(
                status_code=500,
                detail="Supabase Storage is required but not configured",
            )
        
        # Process the file
        result = await process_excel_upload(file_path, db)
        data_quality = result.get("data_quality", {})

        processing_details_json = result.get("processing_details")
        try:
            processing_details_obj = (
                json.loads(processing_details_json) if processing_details_json else {}
            )
        except json.JSONDecodeError:
            processing_details_obj = {"raw_processing_details": processing_details_json}

        processing_details_obj["file_storage"] = {
            "provider": "supabase" if storage_info else "local-temp-only",
            "bucket": storage_info["bucket"] if storage_info else None,
            "path": storage_info["path"] if storage_info else None,
            "required": storage_config["required"],
            "configured": storage_config["configured"],
        }
        processing_details = json.dumps(processing_details_obj)
        
        # Create upload record
        upload_record = DataUpload(
            filename=file.filename,
            file_type="excel" if file.filename.endswith(('.xlsx', '.xls')) else "csv",
            uploaded_by_id=current_user.id,
            status="completed",
            records_added=result.get("patients_added", 0),
            records_updated=result.get("patients_added", 0),  # For now, same as added
            file_size=file_size,
            total_rows=data_quality.get("total_rows", 0),
            successful_rows=data_quality.get("successful_rows", 0),
            failed_rows=data_quality.get("failed_rows", 0),
            processing_details=processing_details
        )
        db.add(upload_record)
        db.commit()
        db.refresh(upload_record)
        
        # Clean up temp file
        if os.path.exists(file_path):
            os.remove(file_path)
        
        return {
            "message": "File uploaded and processed successfully",
            "upload_id": upload_record.id,
            "patients_added": result.get("patients_added", 0),
            "procedures_added": result.get("procedures_added", 0),
            "lab_results_added": result.get("lab_results_added", 0),
            "data_quality": data_quality,
            "file_storage": {
                "provider": "supabase" if storage_info else "local-temp-only",
                "bucket": storage_info["bucket"] if storage_info else None,
                "path": storage_info["path"] if storage_info else None,
            },
        }
    except HTTPException:
        # Clean up temporary/local and remote artifacts on handled API errors.
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
        if storage_info and storage_info.get("path"):
            delete_from_supabase_storage(storage_info["path"])
        # Re-raise FastAPI HTTP errors without wrapping.
        raise
    except Exception as e:
        # Clean up temp file on error
        if file_path and os.path.exists(file_path):
            os.remove(file_path)
        if storage_info and storage_info.get("path"):
            delete_from_supabase_storage(storage_info["path"])
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@router.post("/ingest/redcap")
async def ingest_redcap(
    request: Request,
    redcap_url: str,
    api_token: str,
    current_user: User = Depends(get_current_admin_user),  # Admin only
    db: Session = Depends(get_db)
):
    """
    Ingest data from REDCap API
    HIPAA compliant: Logs all REDCap access, never logs API tokens
    """
    from core.security import sanitize_error_message
    from core.audit import log_audit_event
    from core.security import get_client_ip, get_user_agent
    
    ip_address = get_client_ip(request)
    user_agent = get_user_agent(request)
    
    try:
        # Validate REDCap URL format (prevent SSRF attacks)
        if not redcap_url.startswith(('https://', 'http://')):
            raise HTTPException(
                status_code=400,
                detail="Invalid REDCap URL format"
            )
        
        # Log REDCap access attempt
        log_audit_event(
            db=db,
            user_id=current_user.id,
            username=current_user.username,
            action="redcap_import",
            resource_type="data_upload",
            ip_address=ip_address,
            user_agent=user_agent,
            details={"redcap_url": redcap_url},  # Never log API token!
            success=True
        )
        
        result = await process_redcap_data(redcap_url, api_token, db)
        
        # Log successful import
        log_audit_event(
            db=db,
            user_id=current_user.id,
            username=current_user.username,
            action="redcap_import_success",
            resource_type="data_upload",
            ip_address=ip_address,
            user_agent=user_agent,
            details={"patients_added": result.get("patients_added", 0)},
            success=True
        )
        
        return {
            "message": "REDCap data ingested successfully",
            "patients_added": result.get("patients_added", 0)
        }
    except ImportError:
        error_msg = "REDCap support not available. Install PyCap: pip install PyCap"
        log_audit_event(
            db=db,
            user_id=current_user.id,
            username=current_user.username,
            action="redcap_import_failed",
            resource_type="data_upload",
            ip_address=ip_address,
            user_agent=user_agent,
            success=False,
            error_message=error_msg
        )
        raise HTTPException(status_code=501, detail=error_msg)
    except HTTPException:
        raise
    except Exception as e:
        # Sanitize error message (never expose PHI or system details)
        error_msg = sanitize_error_message(e, include_details=False)
        log_audit_event(
            db=db,
            user_id=current_user.id,
            username=current_user.username,
            action="redcap_import_failed",
            resource_type="data_upload",
            ip_address=ip_address,
            user_agent=user_agent,
            success=False,
            error_message=error_msg
        )
        raise HTTPException(status_code=500, detail=error_msg)
