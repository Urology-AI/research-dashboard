"""
Data quality analysis endpoints
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from core.auth import get_db
from services.data_quality import analyze_data_quality

router = APIRouter(prefix="/api/data-quality", tags=["Data Quality"])


@router.get("/analysis")
async def get_data_quality_analysis(db: Session = Depends(get_db)):
    """
    Get comprehensive data quality analysis
    """
    return analyze_data_quality(db)
