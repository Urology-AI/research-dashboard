"""
REDCap configuration management endpoints (Admin only)
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from core.database import SessionLocal
from models.redcap_config import RedcapConfig
from models import User
from schemas.redcap_config import RedcapConfigCreate, RedcapConfigUpdate, RedcapConfigResponse
from core.auth import get_db, get_current_admin_user
from core.security import get_client_ip, get_user_agent, encrypt_sensitive_data, decrypt_sensitive_data
from core.audit import log_audit_event

router = APIRouter(prefix="/api/admin/redcap-configs", tags=["REDCap Configuration"])


@router.get("", response_model=List[RedcapConfigResponse])
async def get_redcap_configs(
    request: Request,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get all REDCap configurations (admin only)
    """
    configs = db.query(RedcapConfig).order_by(RedcapConfig.created_at.desc()).all()
    
    # Log access
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="view",
        resource_type="redcap_config",
        resource_id=None,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        details={"count": len(configs)},
        success=True
    )
    
    result = []
    for config in configs:
        config_dict = {
            "id": config.id,
            "name": config.name,
            "redcap_url": config.redcap_url,
            "description": config.description,
            "is_active": config.is_active,
            "created_by_id": config.created_by_id,
            "created_by_username": config.created_by.username if config.created_by else None,
            "last_used": config.last_used,
            "usage_count": config.usage_count,
            "created_at": config.created_at,
            "updated_at": config.updated_at,
        }
        result.append(RedcapConfigResponse(**config_dict))
    
    return result


@router.post("", response_model=RedcapConfigResponse)
async def create_redcap_config(
    request: Request,
    config: RedcapConfigCreate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Create a new REDCap configuration (admin only)
    API token is encrypted before storage
    """
    # Validate URL format
    if not config.redcap_url.startswith(('https://', 'http://')):
        raise HTTPException(status_code=400, detail="Invalid REDCap URL format")
    
    # Encrypt API token
    encrypted_token = encrypt_sensitive_data(config.api_token)
    
    # Create config
    db_config = RedcapConfig(
        name=config.name,
        redcap_url=config.redcap_url,
        encrypted_api_token=encrypted_token,
        description=config.description,
        is_active=config.is_active,
        created_by_id=current_user.id,
    )
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    
    # Log creation
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="create",
        resource_type="redcap_config",
        resource_id=db_config.id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        details={"name": config.name, "redcap_url": config.redcap_url},
        success=True
    )
    
    return RedcapConfigResponse(
        id=db_config.id,
        name=db_config.name,
        redcap_url=db_config.redcap_url,
        description=db_config.description,
        is_active=db_config.is_active,
        created_by_id=db_config.created_by_id,
        created_by_username=current_user.username,
        last_used=db_config.last_used,
        usage_count=db_config.usage_count,
        created_at=db_config.created_at,
        updated_at=db_config.updated_at,
    )


@router.put("/{config_id}", response_model=RedcapConfigResponse)
async def update_redcap_config(
    request: Request,
    config_id: int,
    config_update: RedcapConfigUpdate,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Update a REDCap configuration (admin only)
    """
    config = db.query(RedcapConfig).filter(RedcapConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="REDCap configuration not found")
    
    # Update fields
    if config_update.name is not None:
        config.name = config_update.name
    if config_update.redcap_url is not None:
        if not config_update.redcap_url.startswith(('https://', 'http://')):
            raise HTTPException(status_code=400, detail="Invalid REDCap URL format")
        config.redcap_url = config_update.redcap_url
    if config_update.description is not None:
        config.description = config_update.description
    if config_update.is_active is not None:
        config.is_active = config_update.is_active
    if config_update.api_token is not None:
        # Encrypt new token
        config.encrypted_api_token = encrypt_sensitive_data(config_update.api_token)
    
    config.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(config)
    
    # Log update
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="update",
        resource_type="redcap_config",
        resource_id=config_id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        details={"name": config.name},
        success=True
    )
    
    return RedcapConfigResponse(
        id=config.id,
        name=config.name,
        redcap_url=config.redcap_url,
        description=config.description,
        is_active=config.is_active,
        created_by_id=config.created_by_id,
        created_by_username=config.created_by.username if config.created_by else None,
        last_used=config.last_used,
        usage_count=config.usage_count,
        created_at=config.created_at,
        updated_at=config.updated_at,
    )


@router.delete("/{config_id}")
async def delete_redcap_config(
    request: Request,
    config_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Delete a REDCap configuration (admin only)
    """
    config = db.query(RedcapConfig).filter(RedcapConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="REDCap configuration not found")
    
    name = config.name
    db.delete(config)
    db.commit()
    
    # Log deletion
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="delete",
        resource_type="redcap_config",
        resource_id=config_id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        details={"name": name},
        success=True
    )
    
    return {"message": "REDCap configuration deleted successfully"}


@router.post("/{config_id}/test")
async def test_redcap_config(
    request: Request,
    config_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Test a REDCap configuration connection (admin only)
    """
    config = db.query(RedcapConfig).filter(RedcapConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="REDCap configuration not found")
    
    try:
        # Decrypt token
        api_token = decrypt_sensitive_data(config.encrypted_api_token)
        
        # Try to connect to REDCap
        try:
            from redcap import Project
            project = Project(config.redcap_url, api_token)
            # Try to get metadata (lightweight operation)
            metadata = project.export_metadata()
            
            # Update last_used and usage_count
            config.last_used = datetime.utcnow()
            config.usage_count += 1
            db.commit()
            
            # Log test
            log_audit_event(
                db=db,
                user_id=current_user.id,
                username=current_user.username,
                action="test",
                resource_type="redcap_config",
                resource_id=config_id,
                ip_address=get_client_ip(request),
                user_agent=get_user_agent(request),
                details={"name": config.name, "success": True},
                success=True
            )
            
            return {
                "success": True,
                "message": "Connection successful",
                "fields_count": len(metadata) if metadata else 0
            }
        except ImportError:
            raise HTTPException(
                status_code=501,
                detail="PyCap library not installed. Install with: pip install PyCap"
            )
        except Exception as e:
            # Log failed test
            log_audit_event(
                db=db,
                user_id=current_user.id,
                username=current_user.username,
                action="test",
                resource_type="redcap_config",
                resource_id=config_id,
                ip_address=get_client_ip(request),
                user_agent=get_user_agent(request),
                details={"name": config.name, "success": False},
                success=False,
                error_message=str(e)
            )
            raise HTTPException(status_code=400, detail=f"Connection failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error testing configuration: {str(e)}")


@router.post("/{config_id}/ingest")
async def ingest_from_redcap_config(
    request: Request,
    config_id: int,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Ingest data from a saved REDCap configuration (admin only)
    """
    config = db.query(RedcapConfig).filter(RedcapConfig.id == config_id).first()
    if not config:
        raise HTTPException(status_code=404, detail="REDCap configuration not found")
    
    if not config.is_active:
        raise HTTPException(status_code=400, detail="REDCap configuration is not active")
    
    try:
        # Decrypt token
        api_token = decrypt_sensitive_data(config.encrypted_api_token)
        
        # Import the ingestion function
        from services.data_ingestion import process_redcap_data
        from core.audit import log_audit_event
        from core.security import get_client_ip, get_user_agent
        
        ip_address = get_client_ip(request)
        user_agent = get_user_agent(request)
        
        # Log ingestion start
        log_audit_event(
            db=db,
            user_id=current_user.id,
            username=current_user.username,
            action="redcap_import",
            resource_type="redcap_config",
            resource_id=config_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details={"name": config.name, "redcap_url": config.redcap_url},
            success=True
        )
        
        # Process REDCap data
        result = await process_redcap_data(config.redcap_url, api_token, db)
        
        # Update usage stats
        config.last_used = datetime.utcnow()
        config.usage_count += 1
        db.commit()
        
        # Log successful ingestion
        log_audit_event(
            db=db,
            user_id=current_user.id,
            username=current_user.username,
            action="redcap_import_success",
            resource_type="redcap_config",
            resource_id=config_id,
            ip_address=ip_address,
            user_agent=user_agent,
            details={"name": config.name, "patients_added": result.get("patients_added", 0)},
            success=True
        )
        
        return {
            "message": "REDCap data ingested successfully",
            "patients_added": result.get("patients_added", 0),
            "config_name": config.name
        }
    except Exception as e:
        # Log failed ingestion
        log_audit_event(
            db=db,
            user_id=current_user.id,
            username=current_user.username,
            action="redcap_import_failed",
            resource_type="redcap_config",
            resource_id=config_id,
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            details={"name": config.name},
            success=False,
            error_message=str(e)
        )
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")
