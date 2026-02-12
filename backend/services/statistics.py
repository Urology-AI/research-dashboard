"""
Advanced statistical analysis services for data analytics
"""
from typing import Dict, List, Any, Optional
import numpy as np
from scipy import stats
from sqlalchemy.orm import Session
from models import Patient, LabResult


def t_test_independent(
    group1_data: List[float],
    group2_data: List[float]
) -> Dict[str, Any]:
    """
    Perform independent samples t-test
    """
    if len(group1_data) < 2 or len(group2_data) < 2:
        return {"error": "Insufficient data for t-test (need at least 2 samples per group)"}
    
    try:
        t_stat, p_value = stats.ttest_ind(group1_data, group2_data)
        
        # Calculate means and standard deviations
        mean1 = np.mean(group1_data)
        mean2 = np.mean(group2_data)
        std1 = np.std(group1_data, ddof=1)
        std2 = np.std(group2_data, ddof=1)
        
        return {
            "test_type": "independent_samples_t_test",
            "t_statistic": float(t_stat),
            "p_value": float(p_value),
            "significant": p_value < 0.05,
            "group1": {
                "mean": float(mean1),
                "std": float(std1),
                "n": len(group1_data)
            },
            "group2": {
                "mean": float(mean2),
                "std": float(std2),
                "n": len(group2_data)
            },
            "interpretation": _interpret_p_value(p_value)
        }
    except Exception as e:
        return {"error": str(e)}


def chi_square_test(
    observed: List[List[float]],
    expected: Optional[List[List[float]]] = None
) -> Dict[str, Any]:
    """
    Perform chi-square test of independence
    """
    try:
        observed_array = np.array(observed)
        
        if expected is None:
            # Calculate expected frequencies
            chi2, p_value, dof, expected_array = stats.chi2_contingency(observed_array)
        else:
            expected_array = np.array(expected)
            chi2, p_value, dof, expected_array = stats.chi2_contingency(observed_array, expected_array)
        
        return {
            "test_type": "chi_square_test",
            "chi2_statistic": float(chi2),
            "p_value": float(p_value),
            "degrees_of_freedom": int(dof),
            "significant": p_value < 0.05,
            "observed": observed,
            "expected": expected_array.tolist(),
            "interpretation": _interpret_p_value(p_value)
        }
    except Exception as e:
        return {"error": str(e)}


def linear_regression(
    x_data: List[float],
    y_data: List[float]
) -> Dict[str, Any]:
    """
    Perform linear regression analysis
    """
    if len(x_data) != len(y_data) or len(x_data) < 2:
        return {"error": "Insufficient data for regression (need at least 2 data points)"}
    
    try:
        slope, intercept, r_value, p_value, std_err = stats.linregress(x_data, y_data)
        
        # Calculate R-squared
        r_squared = r_value ** 2
        
        # Calculate predicted values
        y_pred = [slope * x + intercept for x in x_data]
        
        # Calculate residuals
        residuals = [y_data[i] - y_pred[i] for i in range(len(y_data))]
        
        return {
            "test_type": "linear_regression",
            "slope": float(slope),
            "intercept": float(intercept),
            "r_value": float(r_value),
            "r_squared": float(r_squared),
            "p_value": float(p_value),
            "std_error": float(std_err),
            "significant": p_value < 0.05,
            "equation": f"y = {slope:.4f}x + {intercept:.4f}",
            "interpretation": _interpret_correlation(r_value, p_value)
        }
    except Exception as e:
        return {"error": str(e)}


def correlation_analysis(
    x_data: List[float],
    y_data: List[float],
    method: str = "pearson"
) -> Dict[str, Any]:
    """
    Calculate correlation coefficient
    """
    if len(x_data) != len(y_data) or len(x_data) < 2:
        return {"error": "Insufficient data for correlation analysis"}
    
    try:
        if method == "pearson":
            corr, p_value = stats.pearsonr(x_data, y_data)
        elif method == "spearman":
            corr, p_value = stats.spearmanr(x_data, y_data)
        else:
            return {"error": f"Unknown correlation method: {method}"}
        
        return {
            "test_type": f"{method}_correlation",
            "correlation_coefficient": float(corr),
            "p_value": float(p_value),
            "significant": p_value < 0.05,
            "interpretation": _interpret_correlation(corr, p_value)
        }
    except Exception as e:
        return {"error": str(e)}


def anova_test(groups: List[List[float]]) -> Dict[str, Any]:
    """
    Perform one-way ANOVA test
    """
    if len(groups) < 2:
        return {"error": "Need at least 2 groups for ANOVA"}
    
    try:
        f_stat, p_value = stats.f_oneway(*groups)
        
        # Calculate group statistics
        group_stats = []
        for i, group in enumerate(groups):
            group_stats.append({
                "group": i + 1,
                "mean": float(np.mean(group)),
                "std": float(np.std(group, ddof=1)),
                "n": len(group)
            })
        
        return {
            "test_type": "one_way_anova",
            "f_statistic": float(f_stat),
            "p_value": float(p_value),
            "significant": p_value < 0.05,
            "groups": group_stats,
            "interpretation": _interpret_p_value(p_value)
        }
    except Exception as e:
        return {"error": str(e)}


def descriptive_statistics(data: List[float]) -> Dict[str, Any]:
    """
    Calculate descriptive statistics
    """
    if not data or len(data) == 0:
        return {"error": "No data provided"}
    
    try:
        data_array = np.array(data)
        
        return {
            "count": len(data),
            "mean": float(np.mean(data_array)),
            "median": float(np.median(data_array)),
            "std": float(np.std(data_array, ddof=1)),
            "variance": float(np.var(data_array, ddof=1)),
            "min": float(np.min(data_array)),
            "max": float(np.max(data_array)),
            "q1": float(np.percentile(data_array, 25)),
            "q3": float(np.percentile(data_array, 75)),
            "iqr": float(np.percentile(data_array, 75) - np.percentile(data_array, 25)),
            "skewness": float(stats.skew(data_array)),
            "kurtosis": float(stats.kurtosis(data_array))
        }
    except Exception as e:
        return {"error": str(e)}


def _interpret_p_value(p_value: float) -> str:
    """Interpret p-value"""
    if p_value < 0.001:
        return "Highly significant (p < 0.001)"
    elif p_value < 0.01:
        return "Very significant (p < 0.01)"
    elif p_value < 0.05:
        return "Significant (p < 0.05)"
    else:
        return "Not significant (p >= 0.05)"


def _interpret_correlation(corr: float, p_value: float) -> str:
    """Interpret correlation coefficient"""
    if abs(corr) < 0.1:
        strength = "negligible"
    elif abs(corr) < 0.3:
        strength = "weak"
    elif abs(corr) < 0.5:
        strength = "moderate"
    elif abs(corr) < 0.7:
        strength = "strong"
    else:
        strength = "very strong"
    
    direction = "positive" if corr > 0 else "negative"
    significance = "significant" if p_value < 0.05 else "not significant"
    
    return f"{strength.capitalize()} {direction} correlation ({significance})"
