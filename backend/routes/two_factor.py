"""
Two-factor authentication endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime
import io
import base64
import json

try:
    import pyotp
    import qrcode
    HAS_2FA_DEPS = True
except ImportError:
    HAS_2FA_DEPS = False

from core.database import SessionLocal
from models.user_2fa import User2FA
from models import User
from schemas.user_2fa import (
    TwoFactorSetupResponse,
    TwoFactorVerifyRequest,
    TwoFactorVerifyResponse,
    TwoFactorStatusResponse,
)
from core.auth import get_db, get_current_active_user
from core.security import get_client_ip, get_user_agent, encrypt_sensitive_data, decrypt_sensitive_data
from core.audit import log_audit_event

router = APIRouter(prefix="/api/auth/2fa", tags=["Two-Factor Authentication"])


@router.post("/setup", response_model=TwoFactorSetupResponse)
async def setup_2fa(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Setup 2FA for current user
    Generates secret key and backup codes
    """
    if not HAS_2FA_DEPS:
        raise HTTPException(status_code=503, detail="2FA dependencies not installed. Please install pyotp and qrcode[pil]")
    # Check if 2FA already enabled
    existing = db.query(User2FA).filter(User2FA.user_id == current_user.id).first()
    if existing and existing.is_enabled == "true":
        raise HTTPException(status_code=400, detail="2FA is already enabled")
    
    # Generate secret key
    secret = pyotp.random_base32()
    
    # Generate backup codes (8 codes)
    backup_codes = [pyotp.random_base32()[:8].upper() for _ in range(8)]
    
    # Create QR code
    totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=current_user.username,
        issuer_name="Research Dashboard"
    )
    
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(totp_uri)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    qr_code_url = f"data:image/png;base64,{base64.b64encode(buffer.getvalue()).decode()}"
    
    # Encrypt secret and backup codes
    encrypted_secret = encrypt_sensitive_data(secret)
    encrypted_backup_codes = encrypt_sensitive_data(json.dumps(backup_codes))
    
    # Save or update 2FA record
    if existing:
        existing.secret_key = encrypted_secret
        existing.backup_codes = encrypted_backup_codes
        existing.is_enabled = "false"  # Not enabled until verified
    else:
        existing = User2FA(
            user_id=current_user.id,
            secret_key=encrypted_secret,
            backup_codes=encrypted_backup_codes,
            is_enabled="false",
        )
        db.add(existing)
    
    db.commit()
    
    # Log setup
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="setup_2fa",
        resource_type="user_2fa",
        resource_id=existing.id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        success=True
    )
    
    return TwoFactorSetupResponse(
        secret_key=secret,  # Return plain text for QR code generation
        backup_codes=backup_codes,
        qr_code_url=qr_code_url,
    )


@router.post("/verify", response_model=TwoFactorVerifyResponse)
async def verify_2fa(
    request: Request,
    verify_data: TwoFactorVerifyRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Verify 2FA code and enable 2FA
    """
    if not HAS_2FA_DEPS:
        raise HTTPException(status_code=503, detail="2FA dependencies not installed. Please install pyotp and qrcode[pil]")
    two_fa = db.query(User2FA).filter(User2FA.user_id == current_user.id).first()
    if not two_fa:
        raise HTTPException(status_code=404, detail="2FA not set up")
    
    if two_fa.is_enabled == "true":
        raise HTTPException(status_code=400, detail="2FA is already enabled")
    
    # Decrypt secret
    secret = decrypt_sensitive_data(two_fa.secret_key)
    totp = pyotp.TOTP(secret)
    
    # Verify code
    code_valid = totp.verify(verify_data.code, valid_window=1)
    backup_code_used = False
    
    # If TOTP code invalid, check backup codes
    if not code_valid:
        backup_codes_json = decrypt_sensitive_data(two_fa.backup_codes)
        backup_codes = json.loads(backup_codes_json)
        
        if verify_data.code.upper() in backup_codes:
            # Remove used backup code
            backup_codes.remove(verify_data.code.upper())
            encrypted_backup_codes = encrypt_sensitive_data(json.dumps(backup_codes))
            two_fa.backup_codes = encrypted_backup_codes
            code_valid = True
            backup_code_used = True
        else:
            log_audit_event(
                db=db,
                user_id=current_user.id,
                username=current_user.username,
                action="verify_2fa",
                resource_type="user_2fa",
                resource_id=two_fa.id,
                ip_address=get_client_ip(request),
                user_agent=get_user_agent(request),
                success=False,
                error_message="Invalid 2FA code"
            )
            raise HTTPException(status_code=400, detail="Invalid verification code")
    
    # Enable 2FA
    two_fa.is_enabled = "true"
    two_fa.last_used = datetime.utcnow()
    db.commit()
    
    # Log successful verification
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="enable_2fa",
        resource_type="user_2fa",
        resource_id=two_fa.id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        success=True
    )
    
    return TwoFactorVerifyResponse(
        success=True,
        backup_code_used=backup_code_used,
    )


@router.get("/status", response_model=TwoFactorStatusResponse)
async def get_2fa_status(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Get 2FA status for current user
    """
    two_fa = db.query(User2FA).filter(User2FA.user_id == current_user.id).first()
    
    if not two_fa:
        return TwoFactorStatusResponse(is_enabled=False)
    
    return TwoFactorStatusResponse(
        is_enabled=two_fa.is_enabled == "true",
        created_at=two_fa.created_at,
    )


@router.post("/disable")
async def disable_2fa(
    request: Request,
    verify_data: TwoFactorVerifyRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Disable 2FA for current user (requires verification code)
    """
    if not HAS_2FA_DEPS:
        raise HTTPException(status_code=503, detail="2FA dependencies not installed. Please install pyotp and qrcode[pil]")
    two_fa = db.query(User2FA).filter(User2FA.user_id == current_user.id).first()
    if not two_fa or two_fa.is_enabled != "true":
        raise HTTPException(status_code=400, detail="2FA is not enabled")
    
    # Verify code before disabling
    secret = decrypt_sensitive_data(two_fa.secret_key)
    totp = pyotp.TOTP(secret)
    
    code_valid = totp.verify(verify_data.code, valid_window=1)
    
    # Check backup codes if TOTP invalid
    if not code_valid:
        backup_codes_json = decrypt_sensitive_data(two_fa.backup_codes)
        backup_codes = json.loads(backup_codes_json)
        code_valid = verify_data.code.upper() in backup_codes
    
    if not code_valid:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    # Disable 2FA
    two_fa.is_enabled = "false"
    db.commit()
    
    # Log disable
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="disable_2fa",
        resource_type="user_2fa",
        resource_id=two_fa.id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        success=True
    )
    
    return {"message": "2FA disabled successfully"}
