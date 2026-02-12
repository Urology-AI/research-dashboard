"""
Data upload and ingestion endpoints
"""
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Request
from sqlalchemy.orm import Session
import os

from core.database import SessionLocal
from models import User, DataUpload
from core.auth import get_db, get_current_admin_user
from services.data_ingestion import process_excel_upload, process_redcap_data

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
    try:
        # Save uploaded file temporarily
        file_path = f"/tmp/{file.filename}"
        file_size = 0
        with open(file_path, "wb") as buffer:
            content = await file.read()
            file_size = len(content)
            buffer.write(content)
        
        # Process the file
        result = await process_excel_upload(file_path, db)
        data_quality = result.get("data_quality", {})
        
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
            processing_details=result.get("processing_details")
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
            "data_quality": data_quality
        }
    except Exception as e:
        # Clean up temp file on error
        if os.path.exists(file_path):
            os.remove(file_path)
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
