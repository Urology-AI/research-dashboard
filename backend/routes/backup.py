"""
Backup and recovery endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
import os
import shutil
import sqlite3
import json

from core.database import SessionLocal, get_db
from models import User
from core.auth import get_current_admin_user
from core.security import get_client_ip, get_user_agent
from core.audit import log_audit_event

router = APIRouter(prefix="/api/admin/backup", tags=["Backup & Recovery"])

BACKUP_DIR = os.getenv("BACKUP_DIR", "backups")
os.makedirs(BACKUP_DIR, exist_ok=True)


@router.post("/create")
async def create_backup(
    request: Request,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Create a manual backup of the database (admin only)
    """
    from core.database import engine
    
    try:
        # Get database URL
        db_url = str(engine.url)
        if not db_url.startswith('sqlite'):
            raise HTTPException(status_code=400, detail="Backup only supported for SQLite databases")
        
        # Extract database path
        db_path = db_url.replace('sqlite:///', '')
        if not os.path.exists(db_path):
            raise HTTPException(status_code=404, detail="Database file not found")
        
        # Create backup filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_filename = f"backup_{timestamp}.db"
        backup_path = os.path.join(BACKUP_DIR, backup_filename)
        
        # Copy database file
        shutil.copy2(db_path, backup_path)
        
        # Create metadata file
        metadata = {
            "backup_filename": backup_filename,
            "created_at": datetime.now().isoformat(),
            "created_by": current_user.username,
            "database_path": db_path,
            "file_size": os.path.getsize(backup_path),
        }
        
        metadata_path = os.path.join(BACKUP_DIR, f"backup_{timestamp}.json")
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        # Log backup creation
        log_audit_event(
            db=db,
            user_id=current_user.id,
            username=current_user.username,
            action="create_backup",
            resource_type="backup",
            resource_id=None,
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            details={"backup_filename": backup_filename},
            success=True
        )
        
        return {
            "message": "Backup created successfully",
            "backup_filename": backup_filename,
            "created_at": metadata["created_at"],
            "file_size": metadata["file_size"],
        }
    except Exception as e:
        log_audit_event(
            db=db,
            user_id=current_user.id,
            username=current_user.username,
            action="create_backup",
            resource_type="backup",
            resource_id=None,
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            details={"error": str(e)},
            success=False
        )
        raise HTTPException(status_code=500, detail=f"Backup failed: {str(e)}")


@router.get("/list")
async def list_backups(
    request: Request,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    List all available backups (admin only)
    """
    backups = []
    
    try:
        for filename in os.listdir(BACKUP_DIR):
            if filename.startswith('backup_') and filename.endswith('.db'):
                backup_path = os.path.join(BACKUP_DIR, filename)
                metadata_path = os.path.join(BACKUP_DIR, filename.replace('.db', '.json'))
                
                backup_info = {
                    "filename": filename,
                    "created_at": datetime.fromtimestamp(os.path.getmtime(backup_path)).isoformat(),
                    "file_size": os.path.getsize(backup_path),
                }
                
                # Load metadata if available
                if os.path.exists(metadata_path):
                    try:
                        with open(metadata_path, 'r') as f:
                            metadata = json.load(f)
                            backup_info.update(metadata)
                    except:
                        pass
                
                backups.append(backup_info)
        
        # Sort by creation date (newest first)
        backups.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        return {"backups": backups}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list backups: {str(e)}")


@router.get("/download/{filename}")
async def download_backup(
    request: Request,
    filename: str,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Download a backup file (admin only)
    """
    backup_path = os.path.join(BACKUP_DIR, filename)
    
    if not os.path.exists(backup_path):
        raise HTTPException(status_code=404, detail="Backup file not found")
    
    # Log download
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="download_backup",
        resource_type="backup",
        resource_id=None,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        details={"backup_filename": filename},
        success=True
    )
    
    return FileResponse(
        backup_path,
        media_type="application/octet-stream",
        filename=filename
    )


@router.post("/restore/{filename}")
async def restore_backup(
    request: Request,
    filename: str,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Restore database from a backup (admin only)
    WARNING: This will replace the current database
    """
    from core.database import engine
    
    backup_path = os.path.join(BACKUP_DIR, filename)
    
    if not os.path.exists(backup_path):
        raise HTTPException(status_code=404, detail="Backup file not found")
    
    try:
        # Get current database path
        db_url = str(engine.url)
        if not db_url.startswith('sqlite'):
            raise HTTPException(status_code=400, detail="Restore only supported for SQLite databases")
        
        db_path = db_url.replace('sqlite:///', '')
        
        # Create a backup of current database before restore
        current_backup = f"{db_path}.pre_restore_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        if os.path.exists(db_path):
            shutil.copy2(db_path, current_backup)
        
        # Restore from backup
        shutil.copy2(backup_path, db_path)
        
        # Log restore
        log_audit_event(
            db=db,
            user_id=current_user.id,
            username=current_user.username,
            action="restore_backup",
            resource_type="backup",
            resource_id=None,
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            details={"backup_filename": filename, "pre_restore_backup": current_backup},
            success=True
        )
        
        return {
            "message": "Database restored successfully. Please restart the application.",
            "restored_from": filename,
            "pre_restore_backup": current_backup,
        }
    except Exception as e:
        log_audit_event(
            db=db,
            user_id=current_user.id,
            username=current_user.username,
            action="restore_backup",
            resource_type="backup",
            resource_id=None,
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            details={"error": str(e)},
            success=False
        )
        raise HTTPException(status_code=500, detail=f"Restore failed: {str(e)}")


@router.delete("/{filename}")
async def delete_backup(
    request: Request,
    filename: str,
    current_user: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Delete a backup file (admin only)
    """
    backup_path = os.path.join(BACKUP_DIR, filename)
    metadata_path = os.path.join(BACKUP_DIR, filename.replace('.db', '.json'))
    
    if not os.path.exists(backup_path):
        raise HTTPException(status_code=404, detail="Backup file not found")
    
    try:
        os.remove(backup_path)
        if os.path.exists(metadata_path):
            os.remove(metadata_path)
        
        # Log deletion
        log_audit_event(
            db=db,
            user_id=current_user.id,
            username=current_user.username,
            action="delete_backup",
            resource_type="backup",
            resource_id=None,
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            details={"backup_filename": filename},
            success=True
        )
        
        return {"message": "Backup deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete backup: {str(e)}")
