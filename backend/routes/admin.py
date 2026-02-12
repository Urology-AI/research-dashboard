"""
Admin endpoints - user management, data management, custom fields
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import json

from core.database import SessionLocal
from models import User, DataUpload, CustomFieldDefinition
from schemas import (
    UserCreate, UserResponse, UserUpdate,
    DataUploadResponse,
    CustomFieldDefinitionCreate, CustomFieldDefinitionResponse
)
from core.auth import get_db, get_current_admin_user
from core.security import get_client_ip, get_user_agent
from core.audit import log_audit_event

router = APIRouter(prefix="/api/admin", tags=["Admin"])


# User Management Endpoints
@router.get("/users", response_model=List[UserResponse])
async def get_all_users(
    request: Request,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get all users (admin only)
    """
    users = db.query(User).all()
    
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="view",
        resource_type="user_list",
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        details={"user_count": len(users)}
    )
    
    return [UserResponse.from_orm(user) for user in users]


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    request: Request,
    user_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get user by ID (admin only)
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="view",
        resource_type="user",
        resource_id=user_id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        details={"viewed_username": user.username}
    )
    
    return UserResponse.from_orm(user)


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    request: Request,
    user_id: int,
    user_update: UserUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Update user (admin only)
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    old_username = user.username
    update_data = user_update.dict(exclude_unset=True, exclude={"password"})
    
    # Handle password update
    password_changed = False
    if user_update.password:
        update_data["hashed_password"] = User.hash_password(user_update.password)
        password_changed = True
    
    # Check if email/username conflicts
    if user_update.email and user_update.email != user.email:
        existing = db.query(User).filter(User.email == user_update.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already in use")
    
    if user_update.username and user_update.username != user.username:
        existing = db.query(User).filter(User.username == user_update.username).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already in use")
    
    for key, value in update_data.items():
        setattr(user, key, value)
    
    db.commit()
    db.refresh(user)
    
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="update",
        resource_type="user",
        resource_id=user_id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        details={
            "updated_username": old_username,
            "fields_changed": list(update_data.keys()),
            "password_changed": password_changed
        }
    )
    
    return UserResponse.from_orm(user)


@router.delete("/users/{user_id}")
async def delete_user(
    request: Request,
    user_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Delete user (admin only)
    """
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    deleted_username = user.username
    db.delete(user)
    db.commit()
    
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="delete",
        resource_type="user",
        resource_id=user_id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        details={"deleted_username": deleted_username}
    )
    
    return {"message": "User deleted successfully"}


# Data Upload Management Endpoints
@router.get("/data-uploads", response_model=List[DataUploadResponse])
async def get_all_data_uploads(
    request: Request,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get all data upload records (admin only)
    """
    uploads = db.query(DataUpload).order_by(DataUpload.upload_date.desc()).all()
    
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="view",
        resource_type="data_upload_list",
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        details={"upload_count": len(uploads)}
    )
    
    return uploads


@router.get("/data-uploads/{upload_id}", response_model=DataUploadResponse)
async def get_data_upload(
    request: Request,
    upload_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get data upload details (admin only)
    """
    upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="view",
        resource_type="data_upload",
        resource_id=upload_id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        details={"filename": upload.filename}
    )
    
    return upload


@router.get("/data-uploads/{upload_id}/records")
async def get_upload_records(
    request: Request,
    upload_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get records from a specific upload (admin only)
    """
    upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="view",
        resource_type="data_upload_records",
        resource_id=upload_id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        details={"filename": upload.filename, "records_added": upload.records_added}
    )
    
    return {
        "upload_id": upload.id,
        "filename": upload.filename,
        "records_added": upload.records_added,
        "records_updated": upload.records_updated,
        "message": "Record details can be viewed in patient list"
    }


@router.get("/data-uploads/{upload_id}/processing-details")
async def get_upload_processing_details(
    request: Request,
    upload_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed processing information for an upload (admin only)
    """
    upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    processing_details = {}
    if upload.processing_details:
        try:
            processing_details = json.loads(upload.processing_details)
        except:
            processing_details = {"raw": upload.processing_details}
    
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="view",
        resource_type="data_upload_processing",
        resource_id=upload_id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        details={"filename": upload.filename}
    )
    
    return {
        "upload_id": upload.id,
        "filename": upload.filename,
        "total_rows": upload.total_rows,
        "successful_rows": upload.successful_rows,
        "failed_rows": upload.failed_rows,
        "processing_details": processing_details
    }


@router.delete("/data-uploads/{upload_id}")
async def delete_data_upload(
    request: Request,
    upload_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Delete a data upload record (admin only)
    """
    upload = db.query(DataUpload).filter(DataUpload.id == upload_id).first()
    if not upload:
        raise HTTPException(status_code=404, detail="Upload not found")
    
    filename = upload.filename
    db.delete(upload)
    db.commit()
    
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="delete",
        resource_type="data_upload",
        resource_id=upload_id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        details={"deleted_filename": filename}
    )
    
    return {"message": "Upload record deleted successfully"}


# Standard field definitions for each entity type
STANDARD_FIELDS = {
    "patient": [
        {"field_name": "mrn", "field_label": "Medical Record Number", "field_type": "text", "is_required": True, "display_order": 0},
        {"field_name": "first_name", "field_label": "First Name", "field_type": "text", "is_required": False, "display_order": 1},
        {"field_name": "last_name", "field_label": "Last Name", "field_type": "text", "is_required": False, "display_order": 2},
        {"field_name": "date_of_birth", "field_label": "Date of Birth", "field_type": "date", "is_required": False, "display_order": 3},
        {"field_name": "age", "field_label": "Age", "field_type": "number", "is_required": False, "display_order": 4},
        {"field_name": "gender", "field_label": "Gender", "field_type": "text", "is_required": False, "display_order": 5},
        {"field_name": "diagnosis", "field_label": "Diagnosis", "field_type": "text", "is_required": False, "display_order": 6},
        {"field_name": "gleason_score", "field_label": "Gleason Score", "field_type": "number", "is_required": False, "display_order": 7},
        {"field_name": "psa_level", "field_label": "PSA Level", "field_type": "number", "is_required": False, "display_order": 8},
        {"field_name": "clinical_stage", "field_label": "Clinical Stage", "field_type": "text", "is_required": False, "display_order": 9},
        {"field_name": "race", "field_label": "Race", "field_type": "text", "is_required": False, "display_order": 10},
        {"field_name": "ethnicity", "field_label": "Ethnicity", "field_type": "text", "is_required": False, "display_order": 11},
        {"field_name": "insurance", "field_label": "Insurance", "field_type": "text", "is_required": False, "display_order": 12},
        {"field_name": "phone", "field_label": "Phone", "field_type": "text", "is_required": False, "display_order": 13},
        {"field_name": "email", "field_label": "Email", "field_type": "text", "is_required": False, "display_order": 14},
        {"field_name": "address", "field_label": "Address", "field_type": "text", "is_required": False, "display_order": 15},
    ],
    "procedure": [
        {"field_name": "procedure_type", "field_label": "Procedure Type", "field_type": "text", "is_required": True, "display_order": 0},
        {"field_name": "procedure_date", "field_label": "Procedure Date", "field_type": "date", "is_required": True, "display_order": 1},
        {"field_name": "provider", "field_label": "Provider", "field_type": "text", "is_required": False, "display_order": 2},
        {"field_name": "facility", "field_label": "Facility", "field_type": "text", "is_required": False, "display_order": 3},
        {"field_name": "notes", "field_label": "Notes", "field_type": "text", "is_required": False, "display_order": 4},
        {"field_name": "complications", "field_label": "Complications", "field_type": "text", "is_required": False, "display_order": 5},
        {"field_name": "outcome", "field_label": "Outcome", "field_type": "text", "is_required": False, "display_order": 6},
        {"field_name": "cores_positive", "field_label": "Cores Positive", "field_type": "number", "is_required": False, "display_order": 7},
        {"field_name": "cores_total", "field_label": "Cores Total", "field_type": "number", "is_required": False, "display_order": 8},
        {"field_name": "gleason_score", "field_label": "Gleason Score", "field_type": "number", "is_required": False, "display_order": 9},
        {"field_name": "pirads_score", "field_label": "PI-RADS Score", "field_type": "number", "is_required": False, "display_order": 10},
        {"field_name": "lesion_location", "field_label": "Lesion Location", "field_type": "text", "is_required": False, "display_order": 11},
        {"field_name": "lesion_size", "field_label": "Lesion Size (cm)", "field_type": "number", "is_required": False, "display_order": 12},
        {"field_name": "operative_time", "field_label": "Operative Time (min)", "field_type": "number", "is_required": False, "display_order": 13},
        {"field_name": "blood_loss", "field_label": "Blood Loss (ml)", "field_type": "number", "is_required": False, "display_order": 14},
        {"field_name": "length_of_stay", "field_label": "Length of Stay (days)", "field_type": "number", "is_required": False, "display_order": 15},
    ],
    "lab_result": [
        {"field_name": "test_date", "field_label": "Test Date", "field_type": "date", "is_required": True, "display_order": 0},
        {"field_name": "test_type", "field_label": "Test Type", "field_type": "text", "is_required": True, "display_order": 1},
        {"field_name": "test_value", "field_label": "Test Value", "field_type": "number", "is_required": False, "display_order": 2},
        {"field_name": "test_unit", "field_label": "Test Unit", "field_type": "text", "is_required": False, "display_order": 3},
        {"field_name": "reference_range", "field_label": "Reference Range", "field_type": "text", "is_required": False, "display_order": 4},
        {"field_name": "notes", "field_label": "Notes", "field_type": "text", "is_required": False, "display_order": 5},
    ],
    "follow_up": [
        {"field_name": "follow_up_date", "field_label": "Follow-up Date", "field_type": "date", "is_required": True, "display_order": 0},
        {"field_name": "follow_up_type", "field_label": "Follow-up Type", "field_type": "text", "is_required": False, "display_order": 1},
        {"field_name": "provider", "field_label": "Provider", "field_type": "text", "is_required": False, "display_order": 2},
        {"field_name": "notes", "field_label": "Notes", "field_type": "text", "is_required": False, "display_order": 3},
        {"field_name": "next_follow_up_date", "field_label": "Next Follow-up Date", "field_type": "date", "is_required": False, "display_order": 4},
    ],
}


# Custom Field Definition Endpoints
@router.get("/custom-fields")
async def get_custom_field_definitions(
    request: Request,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db),
    entity_type: Optional[str] = None,
    include_inactive: bool = False
):
    """
    Get all field definitions (standard + custom) (admin only)
    Can filter by entity_type (patient, procedure, lab_result, follow_up)
    Returns both standard fields (built-in) and custom fields (user-defined)
    """
    result = []
    
    # Get standard fields
    entity_types = [entity_type] if entity_type else ["patient", "procedure", "lab_result", "follow_up"]
    
    for ent_type in entity_types:
        if ent_type in STANDARD_FIELDS:
            for std_field in STANDARD_FIELDS[ent_type]:
                result.append({
                    "id": None,  # Standard fields don't have IDs
                    "field_name": std_field["field_name"],
                    "field_label": std_field["field_label"],
                    "field_type": std_field["field_type"],
                    "entity_type": ent_type,
                    "is_required": std_field["is_required"],
                    "default_value": None,
                    "options": [],
                    "display_order": std_field["display_order"],
                    "is_active": True,
                    "is_standard": True,  # Flag to identify standard fields
                    "created_at": None,
                    "updated_at": None,
                })
    
    # Get custom fields
    query = db.query(CustomFieldDefinition)
    if not include_inactive:
        query = query.filter(CustomFieldDefinition.is_active == True)
    if entity_type:
        query = query.filter(CustomFieldDefinition.entity_type == entity_type)
    custom_fields = query.order_by(CustomFieldDefinition.display_order).all()
    
    for cf in custom_fields:
        cf_data = CustomFieldDefinitionResponse.from_orm(cf).dict()
        cf_data["is_standard"] = False  # Flag to identify custom fields
        result.append(cf_data)
    
    # Sort by entity_type, then display_order
    result.sort(key=lambda x: (x["entity_type"], x.get("display_order", 999)))
    
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="view",
        resource_type="custom_field_list",
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        details={"entity_type": entity_type, "field_count": len(result)}
    )
    
    return result


@router.post("/custom-fields", response_model=CustomFieldDefinitionResponse)
async def create_custom_field_definition(
    request: Request,
    field_def: CustomFieldDefinitionCreate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Create a new custom field definition (admin only)
    Checks if field_name already exists to prevent duplicates
    """
    # Check if field_name already exists
    existing = db.query(CustomFieldDefinition).filter(
        CustomFieldDefinition.field_name == field_def.field_name
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Field name '{field_def.field_name}' already exists. Use edit to modify existing fields."
        )
    
    field_data = field_def.dict()
    # Convert options and validation_rules to JSON strings
    if field_data.get('options'):
        field_data['options'] = json.dumps(field_data['options'])
    else:
        field_data['options'] = None
    if field_data.get('validation_rules'):
        field_data['validation_rules'] = json.dumps(field_data['validation_rules'])
    else:
        field_data['validation_rules'] = None
    
    db_field = CustomFieldDefinition(**field_data)
    db.add(db_field)
    db.commit()
    db.refresh(db_field)
    
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="create",
        resource_type="custom_field",
        resource_id=db_field.id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        details={
            "field_name": field_def.field_name,
            "entity_type": field_def.entity_type,
            "field_type": field_def.field_type
        }
    )
    
    return CustomFieldDefinitionResponse.from_orm(db_field)


@router.put("/custom-fields/{field_id}", response_model=CustomFieldDefinitionResponse)
async def update_custom_field_definition(
    request: Request,
    field_id: int,
    field_update: CustomFieldDefinitionCreate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Update a custom field definition (admin only)
    Field name cannot be changed - it's the unique identifier
    """
    field = db.query(CustomFieldDefinition).filter(CustomFieldDefinition.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field definition not found")
    
    # Check if trying to change field_name (not allowed)
    if field_update.field_name != field.field_name:
        raise HTTPException(
            status_code=400,
            detail="Field name cannot be changed. Field name is the unique identifier. Create a new field if you need a different name."
        )
    
    update_data = field_update.dict(exclude_unset=True, exclude={'field_name'})  # Exclude field_name from updates
    # Convert options and validation_rules to JSON strings
    if 'options' in update_data:
        if update_data['options']:
            update_data['options'] = json.dumps(update_data['options'])
        else:
            update_data['options'] = None
    if 'validation_rules' in update_data:
        if update_data['validation_rules']:
            update_data['validation_rules'] = json.dumps(update_data['validation_rules'])
        else:
            update_data['validation_rules'] = None
    
    for key, value in update_data.items():
        setattr(field, key, value)
    
    field.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(field)
    
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="update",
        resource_type="custom_field",
        resource_id=field_id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        details={
            "field_name": field.field_name,
            "fields_changed": list(update_data.keys())
        }
    )
    
    return CustomFieldDefinitionResponse.from_orm(field)


@router.delete("/custom-fields/{field_id}")
async def delete_custom_field_definition(
    request: Request,
    field_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Delete (deactivate) a custom field definition (admin only)
    """
    field = db.query(CustomFieldDefinition).filter(CustomFieldDefinition.id == field_id).first()
    if not field:
        raise HTTPException(status_code=404, detail="Field definition not found")
    
    field_name = field.field_name
    # Soft delete - just deactivate
    field.is_active = False
    field.updated_at = datetime.utcnow()
    db.commit()
    
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="delete",
        resource_type="custom_field",
        resource_id=field_id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        details={"field_name": field_name}
    )
    
    return {"message": "Field definition deactivated successfully"}
