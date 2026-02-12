"""
Authentication and authorization utilities
"""
import os
from datetime import datetime, timedelta
from typing import Optional
from uuid import uuid4
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .database import SessionLocal
from .security import get_secret_key, get_client_ip, get_user_agent, sanitize_error_message
from .audit import log_audit_event
from models import User, UserRole
from models.user_session import UserSession

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# JWT Configuration - Use environment variable for security
SECRET_KEY = get_secret_key()
ALGORITHM = "HS256"
# Reduced from 30 days to 30 minutes for HIPAA compliance
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_db():
    """Database dependency for FastAPI"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    now = datetime.utcnow()
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    # Add nonce-like claims so repeated logins don't collide on identical JWT strings.
    to_encode.update({"exp": expire, "iat": int(now.timestamp()), "jti": uuid4().hex})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str, credentials_exception):
    """
    Verify JWT token
    Raises credentials_exception if token is invalid or expired
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        return username
    except JWTError as e:
        # Don't expose JWT error details to client (security best practice)
        raise credentials_exception


async def get_current_user(
    request: Request,
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        username = verify_token(token, credentials_exception)
        user = db.query(User).filter(User.username == username).first()
        if user is None:
            # Log failed authentication attempt
            log_audit_event(
                db=db,
                user_id=0,  # Unknown user
                username=username or "unknown",
                action="login_failed",
                resource_type="authentication",
                ip_address=get_client_ip(request),
                user_agent=get_user_agent(request),
                success=False,
                error_message="User not found"
            )
            raise credentials_exception
        if not user.is_active:
            # Log inactive account access attempt
            log_audit_event(
                db=db,
                user_id=user.id,
                username=user.username,
                action="login_failed",
                resource_type="authentication",
                ip_address=get_client_ip(request),
                user_agent=get_user_agent(request),
                success=False,
                error_message="Account inactive"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive"
            )
        
        # Check and update session (if it exists)
        # Note: Sessions may not exist for tokens created before session tracking was implemented
        session = db.query(UserSession).filter(
            UserSession.session_token == token,
            UserSession.user_id == user.id
        ).first()
        
        if session:
            # Check if session is active
            if session.is_active != "true" or datetime.utcnow() > session.expires_at:
                # Mark as inactive if expired
                if datetime.utcnow() > session.expires_at:
                    session.is_active = "false"
                    db.commit()
                raise credentials_exception
            
            # Update last activity
            session.last_activity = datetime.utcnow()
            db.commit()
        else:
            # Session doesn't exist - create one for backward compatibility
            # This handles tokens created before session tracking was implemented
            expires_at = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
            new_session = UserSession(
                user_id=user.id,
                session_token=token,
                ip_address=get_client_ip(request),
                user_agent=get_user_agent(request),
                created_at=datetime.utcnow(),
                last_activity=datetime.utcnow(),
                expires_at=expires_at,
                is_active="true"
            )
            db.add(new_session)
            db.commit()
        
        return user
    except HTTPException:
        raise
    except Exception as e:
        # Log unexpected errors (but don't expose details to client)
        error_msg = sanitize_error_message(e, include_details=True)
        log_audit_event(
            db=db,
            user_id=0,
            username="unknown",
            action="authentication_error",
            resource_type="authentication",
            ip_address=get_client_ip(request),
            user_agent=get_user_agent(request),
            success=False,
            error_message=error_msg
        )
        raise credentials_exception


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )
    return current_user


async def get_current_admin_user(
    current_user: User = Depends(get_current_active_user)
) -> User:
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user
