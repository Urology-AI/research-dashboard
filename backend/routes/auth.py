"""
Authentication endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from core.database import SessionLocal
from models import User
from models.user_session import UserSession
from schemas import UserCreate, UserResponse, UserUpdate, Token, LoginRequest
from core.auth import (
    get_db, get_current_active_user, get_current_admin_user,
    create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
)
from core.security import get_client_ip, get_user_agent, validate_password_strength
from core.audit import log_audit_event

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


def _to_user_response(user: User) -> UserResponse:
    return UserResponse.model_validate(user, from_attributes=True)


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """
    Login endpoint - returns JWT token
    HIPAA compliant: Logs all login attempts for audit trail
    """
    ip_address = get_client_ip(request)
    user_agent = get_user_agent(request)
    
    user = db.query(User).filter(User.username == form_data.username).first()
    
    # Log login attempt (success or failure)
    if not user or not user.verify_password(form_data.password):
        log_audit_event(
            db=db,
            user_id=user.id if user else 0,
            username=form_data.username,
            action="login_failed",
            resource_type="authentication",
            ip_address=ip_address,
            user_agent=user_agent,
            success=False,
            error_message="Invalid credentials"
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        log_audit_event(
            db=db,
            user_id=user.id,
            username=user.username,
            action="login_failed",
            resource_type="authentication",
            ip_address=ip_address,
            user_agent=user_agent,
            success=False,
            error_message="Account inactive"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    
    # Check if 2FA is enabled (only if dependencies are available)
    try:
        from models.user_2fa import User2FA
        two_fa = db.query(User2FA).filter(
            User2FA.user_id == user.id,
            User2FA.is_enabled == "true"
        ).first()
    except Exception:
        # If User2FA model doesn't exist or table not created yet, skip 2FA check
        two_fa = None
    
    # If 2FA enabled, return token indicating 2FA required
    if two_fa:
        # Create a temporary token for 2FA verification
        temp_token = create_access_token(data={"sub": user.username, "2fa_required": True}, expires_delta=timedelta(minutes=5))
        return {
            "access_token": temp_token,
            "token_type": "bearer",
            "requires_2fa": True,
            "user": _to_user_response(user)
        }
    
    # Update last login
    user.last_login = datetime.utcnow()
    
    # Create access token
    access_token = create_access_token(data={"sub": user.username})
    
    # Create user session record
    expires_at = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    session = UserSession(
        user_id=user.id,
        session_token=access_token,
        ip_address=ip_address,
        user_agent=user_agent,
        created_at=datetime.utcnow(),
        last_activity=datetime.utcnow(),
        expires_at=expires_at,
        is_active="true"
    )
    try:
        db.add(session)
        db.commit()
    except Exception:
        # Do not block login if session tracking insert fails.
        db.rollback()
    
    # Log successful login
    log_audit_event(
        db=db,
        user_id=user.id,
        username=user.username,
        action="login",
        resource_type="authentication",
        ip_address=ip_address,
        user_agent=user_agent,
        success=True
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "requires_2fa": False,
        "user": _to_user_response(user)
    }


@router.post("/register", response_model=UserResponse)
async def register(
    request: Request,
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)  # Only admins can register
):
    """
    Register a new user (admin only)
    HIPAA compliant: Validates password strength, logs user creation
    """
    from core.security import get_client_ip, get_user_agent
    
    # Validate password strength
    is_valid, error_msg = validate_password_strength(user_data.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password does not meet security requirements: {error_msg}"
        )
    
    # Check if username or email already exists
    existing_user = db.query(User).filter(
        (User.username == user_data.username) | (User.email == user_data.email)
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username or email already registered"
        )
    
    # Create new user
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=User.hash_password(user_data.password),
        role=user_data.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Log user creation
    log_audit_event(
        db=db,
        user_id=current_user.id,
        username=current_user.username,
        action="create",
        resource_type="user",
        resource_id=new_user.id,
        ip_address=get_client_ip(request),
        user_agent=get_user_agent(request),
        details={"new_username": new_user.username, "role": user_data.role.value if hasattr(user_data.role, 'value') else str(user_data.role)},
        success=True
    )
    
    return _to_user_response(new_user)


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get current user information
    """
    return _to_user_response(current_user)


@router.put("/me", response_model=UserResponse)
async def update_current_user(
    request: Request,
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Update current user information
    Supports password change with current password verification
    """
    from core.security import get_client_ip, get_user_agent, validate_password_strength
    
    update_data = user_update.dict(exclude_unset=True, exclude={"password", "current_password"})
    
    # Handle password update separately with validation
    if user_update.password:
        # Validate password strength
        is_valid, error_msg = validate_password_strength(user_update.password)
        if not is_valid:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Password does not meet security requirements: {error_msg}"
            )
        
        # Verify current password if provided
        if hasattr(user_update, 'current_password') and user_update.current_password:
            if not current_user.verify_password(user_update.current_password):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Current password is incorrect"
                )
        
        update_data["hashed_password"] = User.hash_password(user_update.password)
    
    for key, value in update_data.items():
        setattr(current_user, key, value)
    
    db.commit()
    db.refresh(current_user)
    
    # Log password change if password was updated
    if user_update.password:
        log_audit_event(
            db=db,
            user_id=current_user.id,
            username=current_user.username,
            action="password_change",
            resource_type="user",
            resource_id=current_user.id,
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            success=True
        )
    
    return _to_user_response(current_user)


@router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """
    Logout endpoint - revokes current session
    """
    from fastapi import Header
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else None
    
    if token:
        # Revoke the current session
        session = db.query(UserSession).filter(
            UserSession.session_token == token,
            UserSession.user_id == current_user.id
        ).first()
        
        if session:
            session.is_active = "false"
            db.commit()
            
            # Log logout
            log_audit_event(
                db=db,
                user_id=current_user.id,
                username=current_user.username,
                action="logout",
                resource_type="authentication",
                ip_address=get_client_ip(request),
                user_agent=get_user_agent(request),
                success=True
            )
    
    return {"message": "Logged out successfully"}
