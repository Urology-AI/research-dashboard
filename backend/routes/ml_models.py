"""
Machine learning and predictive analytics endpoints
"""
from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from pydantic import BaseModel

from core.auth import get_db
from services.ml_models import (
    predict_risk_category,
    predict_psa_trend,
    detect_anomalies,
    cluster_patients
)

router = APIRouter(prefix="/api/ml", tags=["Machine Learning"])


class RiskPredictionRequest(BaseModel):
    features: List[Dict[str, Any]]


class PSATrendRequest(BaseModel):
    historical_psa: List[float]
    time_points: List[float]


class AnomalyDetectionRequest(BaseModel):
    data: List[float]
    method: str = "iqr"


class ClusteringRequest(BaseModel):
    features: List[Dict[str, Any]]
    n_clusters: int = 3


@router.post("/predict-risk")
async def predict_risk(
    request: RiskPredictionRequest,
    db: Session = Depends(get_db)
):
    """
    Predict risk category for patients
    """
    return predict_risk_category(request.features)


@router.post("/predict-psa-trend")
async def predict_psa(
    request: PSATrendRequest,
    db: Session = Depends(get_db)
):
    """
    Predict future PSA trend based on historical data
    """
    return predict_psa_trend(request.historical_psa, request.time_points)


@router.post("/detect-anomalies")
async def detect_data_anomalies(
    request: AnomalyDetectionRequest,
    db: Session = Depends(get_db)
):
    """
    Detect anomalies in data
    """
    return detect_anomalies(request.data, request.method)


@router.post("/cluster-patients")
async def cluster_patient_data(
    request: ClusteringRequest,
    db: Session = Depends(get_db)
):
    """
    Cluster patients based on features
    """
    return cluster_patients(request.features, request.n_clusters)
