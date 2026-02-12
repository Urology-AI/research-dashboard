"""
Machine learning models for predictive analytics
"""
from typing import Dict, List, Any, Optional
import numpy as np
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, r2_score, mean_squared_error, classification_report
import warnings
warnings.filterwarnings('ignore')


def predict_risk_category(
    features: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Predict risk category based on patient features
    Uses a simple rule-based model (can be replaced with ML model)
    """
    predictions = []
    
    for feature_set in features:
        psa = feature_set.get('psa_level', 0) or 0
        gleason = feature_set.get('gleason_score', 0) or 0
        stage = feature_set.get('clinical_stage', '') or ''
        
        # Simple risk prediction logic
        risk_score = 0
        
        # PSA contribution
        if psa > 20:
            risk_score += 3
        elif psa > 10:
            risk_score += 2
        elif psa > 4:
            risk_score += 1
        
        # Gleason contribution
        if gleason >= 8:
            risk_score += 3
        elif gleason == 7:
            risk_score += 2
        elif gleason <= 6:
            risk_score += 0
        
        # Stage contribution
        if stage and (stage.startswith('T3') or stage.startswith('T4')):
            risk_score += 2
        
        # Determine category
        if risk_score >= 6:
            category = 'high'
        elif risk_score >= 3:
            category = 'intermediate'
        else:
            category = 'low'
        
        predictions.append({
            'risk_score': risk_score,
            'predicted_category': category,
            'confidence': min(95, 60 + risk_score * 5)  # Simple confidence calculation
        })
    
    return {
        'predictions': predictions,
        'model_type': 'rule_based',
        'total_predictions': len(predictions)
    }


def predict_psa_trend(
    historical_psa: List[float],
    time_points: List[float]
) -> Dict[str, Any]:
    """
    Predict future PSA trend using linear regression
    """
    if len(historical_psa) < 2:
        return {"error": "Need at least 2 data points for prediction"}
    
    try:
        from scipy import stats
        
        # Fit linear regression
        slope, intercept, r_value, p_value, std_err = stats.linregress(time_points, historical_psa)
        
        # Predict next 3 time points
        future_time_points = [max(time_points) + i for i in [1, 2, 3]]
        future_predictions = [slope * t + intercept for t in future_time_points]
        
        # Ensure predictions are non-negative
        future_predictions = [max(0, p) for p in future_predictions]
        
        return {
            'current_trend': 'increasing' if slope > 0 else 'decreasing' if slope < 0 else 'stable',
            'slope': float(slope),
            'r_squared': float(r_value ** 2),
            'future_predictions': [
                {'time_point': t, 'predicted_psa': float(p)}
                for t, p in zip(future_time_points, future_predictions)
            ],
            'confidence': min(95, max(50, float(r_value ** 2 * 100)))
        }
    except Exception as e:
        return {"error": str(e)}


def detect_anomalies(
    data: List[float],
    method: str = 'iqr'
) -> Dict[str, Any]:
    """
    Detect anomalies in data using IQR method
    """
    if len(data) < 4:
        return {"error": "Need at least 4 data points for anomaly detection"}
    
    try:
        data_array = np.array(data)
        q1 = np.percentile(data_array, 25)
        q3 = np.percentile(data_array, 75)
        iqr = q3 - q1
        
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        
        anomalies = []
        for i, value in enumerate(data):
            if value < lower_bound or value > upper_bound:
                anomalies.append({
                    'index': i,
                    'value': float(value),
                    'reason': 'below_lower_bound' if value < lower_bound else 'above_upper_bound',
                    'bounds': {
                        'lower': float(lower_bound),
                        'upper': float(upper_bound)
                    }
                })
        
        return {
            'method': method,
            'anomalies': anomalies,
            'anomaly_count': len(anomalies),
            'bounds': {
                'lower': float(lower_bound),
                'upper': float(upper_bound),
                'q1': float(q1),
                'q3': float(q3),
                'iqr': float(iqr)
            }
        }
    except Exception as e:
        return {"error": str(e)}


def cluster_patients(
    features: List[Dict[str, Any]],
    n_clusters: int = 3
) -> Dict[str, Any]:
    """
    Cluster patients based on features using K-means (simplified)
    """
    if len(features) < n_clusters:
        return {"error": f"Need at least {n_clusters} patients for clustering"}
    
    try:
        from sklearn.cluster import KMeans
        
        # Extract numeric features
        feature_matrix = []
        for f in features:
            feature_matrix.append([
                f.get('psa_level', 0) or 0,
                f.get('gleason_score', 0) or 0,
                f.get('age', 0) or 0,
            ])
        
        feature_matrix = np.array(feature_matrix)
        
        # Standardize features
        scaler = StandardScaler()
        feature_matrix_scaled = scaler.fit_transform(feature_matrix)
        
        # Perform clustering
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        clusters = kmeans.fit_predict(feature_matrix_scaled)
        
        # Get cluster centers
        cluster_centers = kmeans.cluster_centers_
        
        return {
            'n_clusters': n_clusters,
            'clusters': clusters.tolist(),
            'cluster_centers': cluster_centers.tolist(),
            'inertia': float(kmeans.inertia_),
            'cluster_sizes': [int(np.sum(clusters == i)) for i in range(n_clusters)]
        }
    except Exception as e:
        return {"error": str(e)}
