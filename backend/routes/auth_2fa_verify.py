"""
2FA verification endpoint for login
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import json

try:
    import pyotp
    HAS_2FA_DEPS = True
except ImportError:
    HAS_2FA_DEPS = False

from core.database import SessionLocal
from models import User
from models.user_2fa import User2FA
from models.user_session import UserSession
from schemas import Token, UserResponse
from core.auth import (
    get_db, get_current_active_user,
    create_access_token, verify_token, ACCESS_TOKEN_EXPIRE_MINUTES
)
from core.security import get_client_ip, get_user_agent, decrypt_sensitive_data
from core.audit import log_audit_event

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/verify-2fa", response_model=Token)
async def verify_2fa_login(
    request: Request,
    code: str = Query(..., description="2FA verification code"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Verify 2FA code during login
    Requires a temporary token from initial login
    """
    if not HAS_2FA_DEPS:
        raise HTTPException(status_code=503, detail="2FA dependencies not installed. Please install pyotp")
    
    # Check if user has 2FA enabled
    two_fa = db.query(User2FA).filter(
        User2FA.user_id == current_user.id,
        User2FA.is_enabled == "true"
    ).first()
    
    if not two_fa:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA is not enabled for this account"
        )
    
    # Decrypt secret
    secret = decrypt_sensitive_data(two_fa.secret_key)
    totp = pyotp.TOTP(secret)
    
    # Verify code
    code_valid = totp.verify(code, valid_window=1)
    backup_code_used = False
    
    # If TOTP code invalid, check backup codes
    if not code_valid:
        backup_codes_json = decrypt_sensitive_data(two_fa.backup_codes)
        backup_codes = json.loads(backup_codes_json)
        
        if code.upper() in backup_codes:
            # Remove used backup code
            backup_codes.remove(code.upper())
            from core.security import encrypt_sensitive_data
            encrypted_backup_codes = encrypt_sensitive_data(json.dumps(backup_codes))
            two_fa.backup_codes = encrypted_backup_codes
            code_valid = True
            backup_code_used = True
        else:
            log_audit_event(
                db=db,
                user_id=current_user.id,
                username=current_user.username,
                action="verify_2fa_login",
                resource_type="authentication",
                resource_id=None,
                ip_address=get_client_ip(request),
                user_agent=get_user_agent(request),
                success=False,
                error_message="Invalid 2FA code"
            )
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid verification code"
            )
    
    # Update last used
    two_fa.last_used = datetime.utcnow()
    db.commit()
    
    # Update last login
    current_user.last_login = datetime.utcnow()
    
    # Create final access token
    access_token = create_access_token(data={"sub": current_user.username})
    
    # Create user session record
    ip_address = get_client_ip(request)
    user_agent = get_user_agent(request)
    expires_at = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    session = UserSession(
        user_id=current_user.id,
        session_token=access_token,
        ip_address=ip_address,
        user_agent=user_agent,
        created_at=datetime.utcnow(),
        last_activity=datetime.utcnow(),
        expires_at=expires_at,
        is_active="true"
    )
    db.add(session)
    db.commit()
    
    # Log successful 2FA verification
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="verify_2fa_login",
        resource_type="authentication",
        resource_id=None,
        ip_address=ip_address,
        user_agent=user_agent,
        details={"backup_code_used": backup_code_used},
        success=True
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserResponse.from_orm(current_user)
    }
