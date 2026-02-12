"""
Statistical analysis endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from core.auth import get_db
from services.statistics import (
    t_test_independent,
    chi_square_test,
    linear_regression,
    correlation_analysis,
    anova_test,
    descriptive_statistics
)

router = APIRouter(prefix="/api/statistics", tags=["Statistics"])


class TTestRequest(BaseModel):
    group1: List[float]
    group2: List[float]


class ChiSquareRequest(BaseModel):
    observed: List[List[float]]
    expected: Optional[List[List[float]]] = None


class RegressionRequest(BaseModel):
    x_data: List[float]
    y_data: List[float]


class CorrelationRequest(BaseModel):
    x_data: List[float]
    y_data: List[float]
    method: str = "pearson"  # pearson or spearman


class ANOVARequest(BaseModel):
    groups: List[List[float]]


class DescriptiveStatsRequest(BaseModel):
    data: List[float]


@router.post("/t-test")
async def perform_t_test(
    request: TTestRequest,
    db: Session = Depends(get_db)
):
    """
    Perform independent samples t-test
    """
    return t_test_independent(request.group1, request.group2)


@router.post("/chi-square")
async def perform_chi_square(
    request: ChiSquareRequest,
    db: Session = Depends(get_db)
):
    """
    Perform chi-square test of independence
    """
    return chi_square_test(request.observed, request.expected)


@router.post("/regression")
async def perform_regression(
    request: RegressionRequest,
    db: Session = Depends(get_db)
):
    """
    Perform linear regression analysis
    """
    return linear_regression(request.x_data, request.y_data)


@router.post("/correlation")
async def perform_correlation(
    request: CorrelationRequest,
    db: Session = Depends(get_db)
):
    """
    Calculate correlation coefficient (Pearson or Spearman)
    """
    return correlation_analysis(request.x_data, request.y_data, request.method)


@router.post("/anova")
async def perform_anova(
    request: ANOVARequest,
    db: Session = Depends(get_db)
):
    """
    Perform one-way ANOVA test
    """
    return anova_test(request.groups)


@router.post("/descriptive")
async def get_descriptive_stats(
    request: DescriptiveStatsRequest,
    db: Session = Depends(get_db)
):
    """
    Calculate descriptive statistics
    """
    return descriptive_statistics(request.data)
