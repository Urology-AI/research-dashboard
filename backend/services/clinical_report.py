"""
Surgical Intelligence Report Generator

High-end clinical summary PDF for surgeons - designed to look like 
an actuarial risk report, not a database printout.

Author: Data Science Team
Purpose: Bridge between analytics code and clinical decision-making
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, 
    HRFlowable
)
from io import BytesIO
from typing import Dict, List, Any, Optional
from datetime import datetime
import numpy as np
from scipy import stats


def calculate_psa_velocity(psa_values: List[float], time_points: List[float]) -> Dict[str, Any]:
    """
    Calculate PSA velocity using linear regression
    Returns velocity in ng/mL per year
    """
    if len(psa_values) < 2:
        return {"velocity": None, "r_squared": None, "p_value": None, "interpretation": "Insufficient data"}
    
    try:
        slope, intercept, r_value, p_value, std_err = stats.linregress(time_points, psa_values)
        
        # Convert to ng/mL per year (assuming time_points are in months)
        velocity_per_year = slope * 12
        
        # Clinical interpretation
        if velocity_per_year > 2.0:
            interpretation = "ELEVATED - Consider aggressive monitoring"
        elif velocity_per_year > 0.75:
            interpretation = "Moderate - Standard surveillance recommended"
        elif velocity_per_year > 0:
            interpretation = "Stable - Low concern"
        else:
            interpretation = "Declining - Favorable trend"
        
        return {
            "velocity": float(velocity_per_year),
            "velocity_per_month": float(slope),
            "r_squared": float(r_value ** 2),
            "p_value": float(p_value),
            "std_err": float(std_err),
            "interpretation": interpretation,
            "significant": bool(p_value < 0.05)
        }
    except Exception as e:
        return {"velocity": None, "error": str(e), "interpretation": "Calculation error"}


def calculate_psa_doubling_time(psa_values: List[float], time_points: List[float]) -> Dict[str, Any]:
    """
    Calculate PSA doubling time using exponential regression
    PSADT = ln(2) / slope of log(PSA) vs time
    Returns doubling time in months
    """
    if len(psa_values) < 2 or min(psa_values) <= 0:
        return {"doubling_time": None, "interpretation": "Insufficient or invalid data"}
    
    try:
        log_psa = np.log(psa_values)
        slope, intercept, r_value, p_value, std_err = stats.linregress(time_points, log_psa)
        
        if slope <= 0:
            return {
                "doubling_time": None,
                "r_squared": float(r_value ** 2),
                "interpretation": "PSA declining - No doubling time applicable"
            }
        
        doubling_time_months = float(np.log(2) / slope)
        
        # Clinical interpretation based on PSADT
        if doubling_time_months < 3:
            interpretation = "CRITICAL - Rapid progression, consider immediate intervention"
            risk_level = "Very High"
        elif doubling_time_months < 6:
            interpretation = "HIGH RISK - Aggressive disease pattern"
            risk_level = "High"
        elif doubling_time_months < 12:
            interpretation = "MODERATE - Close monitoring required"
            risk_level = "Intermediate"
        else:
            interpretation = "FAVORABLE - Slow progression"
            risk_level = "Low"
        
        return {
            "doubling_time_months": doubling_time_months,
            "doubling_time_years": doubling_time_months / 12,
            "r_squared": float(r_value ** 2),
            "p_value": float(p_value),
            "interpretation": interpretation,
            "risk_level": risk_level
        }
    except Exception as e:
        return {"doubling_time": None, "error": str(e), "interpretation": "Calculation error"}


def calculate_capra_score(
    age: int,
    psa: float,
    gleason_primary: int,
    gleason_secondary: int,
    clinical_stage: str,
    percent_positive_cores: float
) -> Dict[str, Any]:
    """
    Calculate UCSF-CAPRA Score (Cancer of the Prostate Risk Assessment)
    Returns score 0-10 and risk category
    """
    score = 0
    components = []
    
    # Age (0-1 points)
    if age >= 50:
        score += 1
        components.append(f"Age ≥50: +1")
    else:
        components.append(f"Age <50: +0")
    
    # PSA (0-4 points)
    if psa < 6:
        components.append(f"PSA <6: +0")
    elif psa < 10:
        score += 1
        components.append(f"PSA 6-10: +1")
    elif psa < 20:
        score += 2
        components.append(f"PSA 10-20: +2")
    elif psa < 30:
        score += 3
        components.append(f"PSA 20-30: +3")
    else:
        score += 4
        components.append(f"PSA ≥30: +4")
    
    # Gleason pattern (0-3 points)
    if gleason_primary <= 3 and gleason_secondary <= 3:
        components.append(f"Gleason ≤6: +0")
    elif gleason_primary == 3 and gleason_secondary == 4:
        score += 1
        components.append(f"Gleason 3+4: +1")
    elif gleason_primary == 4 and gleason_secondary == 3:
        score += 2
        components.append(f"Gleason 4+3: +2")
    else:
        score += 3
        components.append(f"Gleason ≥8: +3")
    
    # Clinical stage (0-1 points)
    if clinical_stage and (clinical_stage.startswith('T3') or clinical_stage.startswith('T4')):
        score += 1
        components.append(f"Stage T3/T4: +1")
    else:
        components.append(f"Stage ≤T2: +0")
    
    # Percent positive cores (0-1 points)
    if percent_positive_cores >= 34:
        score += 1
        components.append(f"≥34% positive cores: +1")
    else:
        components.append(f"<34% positive cores: +0")
    
    # Risk category
    if score <= 2:
        risk_category = "Low"
        five_year_recurrence = "< 20%"
        ten_year_mortality = "< 5%"
    elif score <= 5:
        risk_category = "Intermediate"
        five_year_recurrence = "20-50%"
        ten_year_mortality = "5-20%"
    else:
        risk_category = "High"
        five_year_recurrence = "> 50%"
        ten_year_mortality = "> 20%"
    
    return {
        "score": score,
        "max_score": 10,
        "risk_category": risk_category,
        "components": components,
        "five_year_recurrence_free": five_year_recurrence,
        "ten_year_prostate_cancer_mortality": ten_year_mortality
    }


def calculate_surgical_difficulty_index(
    age: int,
    bmi: Optional[float],
    prostate_volume: Optional[float],
    prior_surgery: bool,
    gleason: int,
    clinical_stage: str
) -> Dict[str, Any]:
    """
    Calculate a Surgical Difficulty Index for pre-operative planning
    Scale: 1-10 (1 = straightforward, 10 = highly complex)
    """
    score = 0
    factors = []
    
    # Age factor
    if age >= 75:
        score += 2
        factors.append("Age ≥75: +2 (increased comorbidity risk)")
    elif age >= 65:
        score += 1
        factors.append("Age 65-74: +1")
    else:
        factors.append("Age <65: +0")
    
    # BMI factor
    if bmi:
        if bmi >= 35:
            score += 2
            factors.append(f"BMI ≥35: +2 (Obese Class II+)")
        elif bmi >= 30:
            score += 1
            factors.append(f"BMI 30-35: +1 (Obese Class I)")
        else:
            factors.append(f"BMI <30: +0")
    
    # Prostate volume
    if prostate_volume:
        if prostate_volume >= 80:
            score += 2
            factors.append(f"Prostate ≥80cc: +2 (large gland)")
        elif prostate_volume >= 50:
            score += 1
            factors.append(f"Prostate 50-80cc: +1")
        else:
            factors.append(f"Prostate <50cc: +0")
    
    # Prior surgery
    if prior_surgery:
        score += 1
        factors.append("Prior pelvic surgery: +1 (adhesions likely)")
    
    # Gleason score
    if gleason >= 8:
        score += 2
        factors.append(f"Gleason ≥8: +2 (aggressive disease)")
    elif gleason == 7:
        score += 1
        factors.append(f"Gleason 7: +1")
    else:
        factors.append(f"Gleason ≤6: +0")
    
    # Clinical stage
    if clinical_stage:
        if clinical_stage.startswith('T3') or clinical_stage.startswith('T4'):
            score += 2
            factors.append(f"Stage T3/T4: +2 (extraprostatic extension)")
        elif clinical_stage.startswith('T2c'):
            score += 1
            factors.append(f"Stage T2c: +1")
    
    # Normalize to 1-10 scale
    normalized_score = min(10, max(1, (score / 10) * 10 + 1))
    
    # Interpretation
    if normalized_score <= 3:
        complexity = "Low"
        recommendation = "Standard approach appropriate"
    elif normalized_score <= 5:
        complexity = "Moderate"
        recommendation = "Consider nerve-sparing feasibility"
    elif normalized_score <= 7:
        complexity = "Elevated"
        recommendation = "Extended operative time expected"
    else:
        complexity = "High"
        recommendation = "Senior surgeon recommended"
    
    return {
        "score": round(normalized_score, 1),
        "raw_score": score,
        "complexity": complexity,
        "recommendation": recommendation,
        "factors": factors
    }


def predict_recovery_timeline(
    age: int,
    gleason: int,
    psa: float,
    nerve_sparing: bool = True,
    bmi: Optional[float] = None
) -> Dict[str, Any]:
    """
    Predict recovery milestones using statistical modeling
    """
    # Base predictions (median values from literature)
    base_continence_weeks = 8
    base_potency_months = 12
    
    continence_weeks = base_continence_weeks
    potency_months = base_potency_months
    
    # Age adjustments
    if age >= 70:
        continence_weeks += 4
        potency_months += 6
    elif age >= 60:
        continence_weeks += 2
        potency_months += 3
    
    # BMI adjustments
    if bmi and bmi >= 30:
        continence_weeks += 2
        potency_months += 2
    
    # Nerve-sparing impact
    if not nerve_sparing:
        potency_months = None
    
    # Calculate confidence intervals
    continence_ci_lower = max(4, continence_weeks - 3)
    continence_ci_upper = continence_weeks + 4
    
    potency_ci_lower = potency_months - 4 if potency_months else None
    potency_ci_upper = potency_months + 6 if potency_months else None
    
    return {
        "continence": {
            "predicted_weeks": continence_weeks,
            "predicted_months": round(continence_weeks / 4.33, 1),
            "ci_lower_weeks": continence_ci_lower,
            "ci_upper_weeks": continence_ci_upper,
            "interpretation": f"Expected pad-free continence: {continence_weeks} weeks (95% CI: {continence_ci_lower}-{continence_ci_upper} weeks)"
        },
        "potency": {
            "predicted_months": potency_months,
            "ci_lower_months": potency_ci_lower,
            "ci_upper_months": potency_ci_upper,
            "nerve_sparing": nerve_sparing,
            "interpretation": f"Expected return of function: {potency_months} months" if potency_months else "N/A - Non nerve-sparing approach"
        },
        "psa_nadir": {
            "expected_weeks": 6,
            "target_value": "< 0.1 ng/mL",
            "interpretation": "Undetectable PSA expected by 6 weeks post-op"
        }
    }


def generate_surgical_intelligence_pdf(
    patient_data: Dict[str, Any],
    lab_history: List[Dict[str, Any]],
    procedure_data: Optional[Dict[str, Any]] = None,
    include_predictions: bool = True
) -> BytesIO:
    """
    Generate the complete Surgical Intelligence Report PDF
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, 
        pagesize=letter,
        topMargin=0.5*inch,
        bottomMargin=0.5*inch,
        leftMargin=0.75*inch,
        rightMargin=0.75*inch
    )
    
    elements = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=20,
        textColor=colors.HexColor('#1a365d'),
        spaceAfter=6,
        alignment=1
    )
    
    subtitle_style = ParagraphStyle(
        'Subtitle',
        parent=styles['Normal'],
        fontSize=11,
        textColor=colors.HexColor('#4a5568'),
        alignment=1,
        spaceAfter=20
    )
    
    section_style = ParagraphStyle(
        'Section',
        parent=styles['Heading2'],
        fontSize=14,
        textColor=colors.HexColor('#2d3748'),
        spaceBefore=20,
        spaceAfter=10
    )
    
    body_style = ParagraphStyle(
        'BodyText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#2d3748'),
        spaceAfter=8
    )
    
    # =====================
    # HEADER
    # =====================
    elements.append(Paragraph("SURGICAL INTELLIGENCE REPORT", title_style))
    elements.append(Paragraph("Precision Urology & Predictive Analytics", subtitle_style))
    
    report_id = f"SIR-{patient_data.get('mrn', 'UNKNOWN')}-{datetime.now().strftime('%Y%m%d')}"
    elements.append(Paragraph(f"<b>Report ID:</b> {report_id}", body_style))
    elements.append(Paragraph(f"<b>Generated:</b> {datetime.now().strftime('%B %d, %Y at %H:%M')}", body_style))
    elements.append(Paragraph(f"<b>Patient ID:</b> {patient_data.get('mrn', 'N/A')} (De-identified)", body_style))
    
    elements.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#1a365d')))
    elements.append(Spacer(1, 15))
    
    # =====================
    # SECTION 1: PATIENT DIGITAL TWIN
    # =====================
    elements.append(Paragraph("1. PATIENT DIGITAL TWIN (Pre-Operative Profile)", section_style))
    
    age = patient_data.get('age', 'N/A')
    psa = patient_data.get('psa_level', 0) or 0
    gleason = patient_data.get('gleason_score', 0) or 0
    stage = patient_data.get('clinical_stage', 'N/A') or 'N/A'
    
    custom_fields = patient_data.get('custom_fields', {}) or {}
    if isinstance(custom_fields, str):
        import json
        try:
            custom_fields = json.loads(custom_fields)
        except:
            custom_fields = {}
    
    bmi = custom_fields.get('bmi')
    prostate_volume = custom_fields.get('prostate_volume')
    
    demographics_data = [
        ['Parameter', 'Value', 'Reference Range'],
        ['Age', f"{age} years" if age != 'N/A' else 'N/A', '< 65 optimal'],
        ['PSA Level', f"{psa:.2f} ng/mL" if isinstance(psa, (int, float)) and psa > 0 else 'N/A', '< 4.0 ng/mL'],
        ['Gleason Score', str(gleason) if gleason else 'N/A', '≤ 6 (low grade)'],
        ['Clinical Stage', stage, 'T1-T2a (organ-confined)'],
    ]
    
    if bmi:
        demographics_data.append(['BMI', f"{bmi:.1f} kg/m²", '18.5-24.9'])
    if prostate_volume:
        demographics_data.append(['Prostate Volume', f"{prostate_volume:.1f} cc", '< 50 cc'])
    
    demo_table = Table(demographics_data, colWidths=[2*inch, 2*inch, 2.5*inch])
    demo_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a365d')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f7fafc')])
    ]))
    elements.append(demo_table)
    elements.append(Spacer(1, 15))
    
    # Surgical Difficulty Index
    if include_predictions and age and isinstance(age, int):
        sdi = calculate_surgical_difficulty_index(
            age=age,
            bmi=bmi,
            prostate_volume=prostate_volume,
            prior_surgery=custom_fields.get('prior_pelvic_surgery', False),
            gleason=gleason if isinstance(gleason, int) else 6,
            clinical_stage=stage if stage != 'N/A' else ''
        )
        
        elements.append(Paragraph("<b>Surgical Difficulty Index</b>", body_style))
        sdi_data = [
            ['Metric', 'Value'],
            ['Difficulty Score', f"{sdi['score']}/10"],
            ['Complexity Level', sdi['complexity']],
            ['Recommendation', sdi['recommendation']]
        ]
        sdi_table = Table(sdi_data, colWidths=[2.5*inch, 4*inch])
        sdi_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2b6cb0')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#ebf8ff')])
        ]))
        elements.append(sdi_table)
        elements.append(Spacer(1, 10))
        
        elements.append(Paragraph("<i>Contributing Factors:</i>", body_style))
        for factor in sdi['factors'][:5]:
            elements.append(Paragraph(f"  • {factor}", body_style))
    
    # =====================
    # SECTION 2: PREDICTIVE ANALYTICS
    # =====================
    elements.append(Spacer(1, 10))
    elements.append(Paragraph("2. PREDICTIVE ANALYTICS ENGINE", section_style))
    
    # Extract PSA history
    psa_values = []
    psa_dates = []
    for lab in sorted(lab_history, key=lambda x: x.get('test_date', '') or ''):
        test_type = lab.get('test_type', '')
        if test_type and test_type.upper() == 'PSA' and lab.get('test_value'):
            try:
                psa_values.append(float(lab['test_value']))
                psa_dates.append(lab.get('test_date'))
            except (ValueError, TypeError):
                pass
    
    # PSA Velocity & Doubling Time
    if len(psa_values) >= 2:
        time_points = list(range(len(psa_values)))
        velocity_result = calculate_psa_velocity(psa_values, time_points)
        doubling_result = calculate_psa_doubling_time(psa_values, time_points)
        
        elements.append(Paragraph("<b>PSA Kinetics Analysis</b>", body_style))
        
        kinetics_data = [
            ['Metric', 'Value', 'Clinical Significance'],
            [
                'PSA Velocity', 
                f"{velocity_result['velocity']:.3f} ng/mL/year" if velocity_result.get('velocity') else 'N/A',
                velocity_result.get('interpretation', 'N/A')
            ],
            [
                'Model R²',
                f"{velocity_result.get('r_squared', 0):.3f}" if velocity_result.get('r_squared') else 'N/A',
                'Model fit (>0.8 = strong)'
            ],
            [
                'PSA Doubling Time',
                f"{doubling_result.get('doubling_time_months', 0):.1f} months" if doubling_result.get('doubling_time_months') else 'N/A',
                doubling_result.get('interpretation', 'N/A')
            ]
        ]
        
        kinetics_table = Table(kinetics_data, colWidths=[1.8*inch, 1.8*inch, 3*inch])
        kinetics_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2f855a')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f0fff4')])
        ]))
        elements.append(kinetics_table)
        elements.append(Spacer(1, 10))
        
        # PSA History Table
        elements.append(Paragraph("<b>Longitudinal PSA History</b>", body_style))
        psa_history_data = [['Date', 'PSA (ng/mL)', 'Change']]
        prev_psa = None
        for i, (val, dt) in enumerate(zip(psa_values, psa_dates)):
            if prev_psa is not None:
                change = val - prev_psa
                change_str = f"+{change:.2f}" if change > 0 else f"{change:.2f}"
            else:
                change_str = "—"
            psa_history_data.append([str(dt) if dt else f"Time {i}", f"{val:.2f}", change_str])
            prev_psa = val
        
        psa_table = Table(psa_history_data[:8], colWidths=[2.2*inch, 2*inch, 2*inch])
        psa_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4a5568')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0'))
        ]))
        elements.append(psa_table)
    else:
        elements.append(Paragraph("<i>Insufficient PSA history for kinetics analysis (minimum 2 values required)</i>", body_style))
    
    # CAPRA Score
    elements.append(Spacer(1, 15))
    elements.append(Paragraph("<b>CAPRA Risk Score</b>", body_style))
    
    cores_positive = custom_fields.get('cores_positive', 0) or 0
    cores_total = custom_fields.get('cores_total', 12) or 12
    percent_positive = (cores_positive / cores_total * 100) if cores_total > 0 else 0
    
    gleason_primary = custom_fields.get('gleason_primary', 3) or 3
    gleason_secondary = custom_fields.get('gleason_secondary', 3) or 3
    if isinstance(gleason, int) and gleason > 0:
        if gleason <= 6:
            gleason_primary, gleason_secondary = 3, 3
        elif gleason == 7:
            gleason_primary, gleason_secondary = 3, 4
        else:
            gleason_primary, gleason_secondary = 4, 4
    
    if age and isinstance(age, int) and psa:
        capra = calculate_capra_score(
            age=age,
            psa=psa,
            gleason_primary=gleason_primary,
            gleason_secondary=gleason_secondary,
            clinical_stage=stage if stage != 'N/A' else '',
            percent_positive_cores=percent_positive
        )
        
        capra_data = [
            ['Component', 'Value'],
            ['CAPRA Score', f"{capra['score']}/10"],
            ['Risk Category', capra['risk_category']],
            ['5-Year Recurrence-Free', capra['five_year_recurrence_free']],
            ['10-Year PCa Mortality', capra['ten_year_prostate_cancer_mortality']]
        ]
        
        capra_table = Table(capra_data, colWidths=[3*inch, 3.5*inch])
        capra_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#9f7aea')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#faf5ff')])
        ]))
        elements.append(capra_table)
    
    # =====================
    # SECTION 3: INTRA-OPERATIVE
    # =====================
    elements.append(Spacer(1, 15))
    elements.append(Paragraph("3. INTRA-OPERATIVE METRICS (Phase II Integration)", section_style))
    
    if procedure_data:
        elements.append(Paragraph(f"<b>Procedure:</b> {procedure_data.get('procedure_type', 'N/A')}", body_style))
        elements.append(Paragraph(f"<b>Date:</b> {procedure_data.get('procedure_date', 'N/A')}", body_style))
        elements.append(Paragraph(f"<b>Surgeon:</b> {procedure_data.get('provider', 'N/A')}", body_style))
        
        if procedure_data.get('operative_time'):
            elements.append(Paragraph(f"<b>Operative Time:</b> {procedure_data['operative_time']} minutes", body_style))
        if procedure_data.get('blood_loss'):
            elements.append(Paragraph(f"<b>Estimated Blood Loss:</b> {procedure_data['blood_loss']} mL", body_style))
    else:
        placeholder_data = [
            ['Metric', 'Value', 'Status'],
            ['Nerve-Sparing Confidence', '— %', 'Pending AI Analysis'],
            ['Margin Quality Score', '— /10', 'Pending AI Analysis'],
            ['Lymph Node Assessment', '—', 'Pending AI Analysis']
        ]
        
        placeholder_table = Table(placeholder_data, colWidths=[2.2*inch, 1.8*inch, 2.5*inch])
        placeholder_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#718096')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('TEXTCOLOR', (2, 1), (2, -1), colors.HexColor('#718096'))
        ]))
        elements.append(placeholder_table)
        elements.append(Paragraph("<i>*Intra-operative AI metrics will be populated post-procedure</i>", body_style))
    
    # =====================
    # SECTION 4: RECOVERY FORECAST
    # =====================
    elements.append(Spacer(1, 15))
    elements.append(Paragraph("4. RECOVERY FORECAST (Post-Operative Predictions)", section_style))
    
    if age and isinstance(age, int):
        recovery = predict_recovery_timeline(
            age=age,
            gleason=gleason if isinstance(gleason, int) else 6,
            psa=psa if isinstance(psa, (int, float)) else 0,
            nerve_sparing=True,
            bmi=bmi
        )
        
        recovery_data = [
            ['Milestone', 'Predicted Timeline', '95% Confidence Interval'],
            [
                'Urinary Continence',
                f"{recovery['continence']['predicted_months']} months",
                f"{recovery['continence']['ci_lower_weeks']}-{recovery['continence']['ci_upper_weeks']} weeks"
            ],
            [
                'Erectile Function',
                f"{recovery['potency']['predicted_months']} months" if recovery['potency']['predicted_months'] else 'N/A',
                f"{recovery['potency']['ci_lower_months']}-{recovery['potency']['ci_upper_months']} months" if recovery['potency']['predicted_months'] else 'N/A'
            ],
            [
                'PSA Nadir',
                f"{recovery['psa_nadir']['expected_weeks']} weeks",
                recovery['psa_nadir']['target_value']
            ]
        ]
        
        recovery_table = Table(recovery_data, colWidths=[2*inch, 2.2*inch, 2.3*inch])
        recovery_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#dd6b20')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#fffaf0')])
        ]))
        elements.append(recovery_table)
        
        elements.append(Spacer(1, 10))
        elements.append(Paragraph("<b>Clinical Notes:</b>", body_style))
        elements.append(Paragraph(f"  • {recovery['continence']['interpretation']}", body_style))
        elements.append(Paragraph(f"  • {recovery['potency']['interpretation']}", body_style))
        elements.append(Paragraph(f"  • {recovery['psa_nadir']['interpretation']}", body_style))
    
    # =====================
    # FOOTER
    # =====================
    elements.append(Spacer(1, 30))
    elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#e2e8f0')))
    
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#718096'),
        alignment=1
    )
    
    elements.append(Spacer(1, 10))
    elements.append(Paragraph("CONFIDENTIAL - FOR CLINICAL USE ONLY", footer_style))
    elements.append(Paragraph("Research Dashboard | Surgical Intelligence Module v1.0", footer_style))
    elements.append(Paragraph(f"Report generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} | IRB Protocol: De-identified Data", footer_style))
    elements.append(Paragraph("This report is generated by predictive algorithms and should be used in conjunction with clinical judgment.", footer_style))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    return buffer
