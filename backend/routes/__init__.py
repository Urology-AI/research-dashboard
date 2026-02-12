"""
API Routes
"""
from .health import router as health_router
from .auth import router as auth_router
from .patients import router as patients_router
from .procedures import router as procedures_router
from .lab_results import router as lab_results_router
from .analytics import router as analytics_router
from .upload import router as upload_router
from .admin import router as admin_router

# Audit router is imported separately in main.py to avoid circular imports
# from routes.audit import router as audit_router

__all__ = [
    "health_router",
    "auth_router",
    "patients_router",
    "procedures_router",
    "lab_results_router",
    "analytics_router",
    "upload_router",
    "admin_router",
]
