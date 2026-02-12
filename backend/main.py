"""
FastAPI backend for Research Dashboard
Main entry point - imports and registers all route modules
Data-driven analytics platform for patient data analysis and visualization
"""
import os
import warnings
from urllib.parse import urlsplit
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Suppress non-critical warnings
warnings.filterwarnings('ignore', message='.*bcrypt version.*', category=UserWarning)

from core.database import Base, engine
from core.db_migration import migrate_database
from core.preflight import run_startup_preflight
import models  # noqa: F401
from core.audit import AuditLog  # noqa: F401
from middleware.security import (
    RateLimitMiddleware,
    SecurityHeadersMiddleware,
    HTTPSRedirectMiddleware
)
from routes import (
    health_router,
    auth_router,
    patients_router,
    procedures_router,
    lab_results_router,
    analytics_router,
    upload_router,
    admin_router,
)
from routes.audit import router as audit_router
from routes.export import router as export_router
from routes.search import router as search_router
from routes.redcap_config import router as redcap_config_router
from routes.user_sessions import router as user_sessions_router
from routes.backup import router as backup_router
from routes.two_factor import router as two_factor_router
from routes.auth_2fa_verify import router as auth_2fa_verify_router
from routes.statistics import router as statistics_router
from routes.data_quality import router as data_quality_router
from routes.ml_models import router as ml_models_router
from routes.clinical_reports import router as clinical_reports_router


# Load environment variables
load_dotenv()


def _normalize_origin(origin: str) -> str:
    cleaned = origin.strip().strip('"').strip("'").rstrip("/")
    if not cleaned:
        return ""
    if cleaned == "*":
        return cleaned

    parsed = urlsplit(cleaned)
    if parsed.scheme and parsed.netloc:
        # CORS expects scheme://host[:port] only (no path/query).
        return f"{parsed.scheme}://{parsed.netloc}"
    return cleaned


def _get_allowed_origins() -> list[str]:
    configured = os.getenv("ALLOWED_ORIGINS", "")

    default_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]
    environment = os.getenv("ENVIRONMENT", "development").lower()
    if environment == "production":
        # Safe default for this deployment target to prevent CORS lockout.
        default_origins.append("https://urology-ai.github.io")

    raw_items = [item for item in configured.replace("\n", ",").split(",") if item.strip()]
    if not raw_items:
        raw_items = default_origins
    else:
        # Keep local origins available unless user explicitly wants strict external-only.
        include_local = os.getenv("ALLOWED_ORIGINS_INCLUDE_LOCAL", "true").lower() == "true"
        if include_local:
            raw_items.extend(default_origins[:2])

    normalized: list[str] = []
    for item in raw_items:
        origin = _normalize_origin(item)
        if origin and origin not in normalized:
            normalized.append(origin)
    return normalized


def _env_bool(name: str, default: bool) -> bool:
    return os.getenv(name, str(default)).strip().lower() in {"1", "true", "yes", "on"}


# Create database tables
Base.metadata.create_all(bind=engine)

# Run migration on startup (runs automatically when server starts)
migrate_database()

# Verify DB readiness on startup.
environment = os.getenv("ENVIRONMENT", "development").lower()
strict_preflight = os.getenv(
    "STARTUP_PREFLIGHT_STRICT",
    "true" if environment == "production" else "false",
).lower() == "true"
run_startup_preflight(strict=strict_preflight)

# Create FastAPI app
app = FastAPI(
    title="Research Dashboard API",
    description="API for oncology analytics — comparative analysis, error analysis, cohort exploration",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Security middleware (order matters - first added is last executed)
# HTTPS redirect (if enabled)
app.add_middleware(HTTPSRedirectMiddleware)

# Security headers
app.add_middleware(SecurityHeadersMiddleware)

# Rate limiting
rate_limit_enabled = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
if rate_limit_enabled:
    rate_limit_requests = int(os.getenv("RATE_LIMIT_REQUESTS_PER_MINUTE", "180"))
    app.add_middleware(RateLimitMiddleware, requests_per_minute=rate_limit_requests)

# CORS middleware (configure for production)
cors_allow_all = _env_bool("CORS_ALLOW_ALL", False)
if cors_allow_all:
    print("CORS mode: ALLOW ALL origins (temporary/insecure).")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Total-Count"],
    )
else:
    allowed_origins = _get_allowed_origins()
    allow_credentials = _env_bool("CORS_ALLOW_CREDENTIALS", True)
    print(
        f"CORS mode: restricted. origins={allowed_origins}, "
        f"allow_credentials={allow_credentials}"
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=allow_credentials,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
        expose_headers=["X-Total-Count"],
    )

# Register routers - only data viewing, analytics, and system management
app.include_router(health_router)
app.include_router(auth_router)

# Core data viewing endpoints (data comes from REDCap/Excel uploads)
app.include_router(patients_router)  # View patients
app.include_router(procedures_router)  # View procedures
app.include_router(lab_results_router)  # View lab results

# Analytics and data exploration
app.include_router(analytics_router)  # Analytics and data analysis
app.include_router(statistics_router)  # Advanced statistical tests
app.include_router(data_quality_router)  # Data quality analysis
app.include_router(ml_models_router)  # Machine learning and predictive analytics
app.include_router(export_router)  # Data export endpoints
app.include_router(search_router)  # Global search endpoints
app.include_router(clinical_reports_router)  # Clinical intelligence reports (PDF generation)

# Data ingestion
app.include_router(upload_router)  # Excel/CSV upload, REDCap integration

# System administration
app.include_router(admin_router)  # Admin dashboard
app.include_router(audit_router)  # Audit logs for HIPAA compliance
app.include_router(redcap_config_router)  # REDCap configuration management
app.include_router(user_sessions_router)  # User session management
app.include_router(backup_router)  # Backup and recovery
app.include_router(two_factor_router)  # Two-factor authentication
app.include_router(auth_2fa_verify_router)  # 2FA login verification

