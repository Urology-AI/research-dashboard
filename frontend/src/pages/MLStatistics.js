import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Autocomplete,
  Checkbox,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Psychology as PsychologyIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  BarChart as BarChartIcon,
  PersonAdd as PersonAddIcon,
  Refresh as RefreshIcon,
  Description as ReportIcon,
  FileDownload as DownloadIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  predictRisk,
  predictPSATrend,
  detectAnomalies,
  clusterPatients,
  performTTest,
  performChiSquare,
  performRegression,
  performCorrelation,
  performANOVA,
  getDescriptiveStats,
  getPatients,
  getPatient,
  getPatientLabResults,
} from '../services/api';

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function MLStatistics() {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [patients, setPatients] = useState([]);
  const [selectedPatients, setSelectedPatients] = useState([]);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [filteredPatients, setFilteredPatients] = useState([]);

  // ML States
  const [riskFeatures, setRiskFeatures] = useState([{ psa_level: '', gleason_score: '', clinical_stage: '' }]);
  const [riskResults, setRiskResults] = useState(null);
  const [psaHistory, setPsaHistory] = useState('');
  const [psaTimePoints, setPsaTimePoints] = useState('');
  const [psaTrendResults, setPsaTrendResults] = useState(null);
  const [anomalyData, setAnomalyData] = useState('');
  const [anomalyMethod, setAnomalyMethod] = useState('iqr');
  const [anomalyResults, setAnomalyResults] = useState(null);
  const [clusterFeatures, setClusterFeatures] = useState([]);
  const [nClusters, setNClusters] = useState(3);
  const [clusterResults, setClusterResults] = useState(null);

  // Statistics States
  const [tTestGroup1, setTTestGroup1] = useState('');
  const [tTestGroup2, setTTestGroup2] = useState('');
  const [tTestResults, setTTestResults] = useState(null);
  const [chiSquareObserved, setChiSquareObserved] = useState('');
  const [chiSquareResults, setChiSquareResults] = useState(null);
  const [regressionX, setRegressionX] = useState('');
  const [regressionY, setRegressionY] = useState('');
  const [regressionResults, setRegressionResults] = useState(null);
  const [correlationX, setCorrelationX] = useState('');
  const [correlationY, setCorrelationY] = useState('');
  const [correlationMethod, setCorrelationMethod] = useState('pearson');
  const [correlationResults, setCorrelationResults] = useState(null);
  const [anovaGroups, setAnovaGroups] = useState('');
  const [anovaResults, setAnovaResults] = useState(null);
  const [descriptiveData, setDescriptiveData] = useState('');
  const [descriptiveResults, setDescriptiveResults] = useState(null);
  const [mlReportData, setMlReportData] = useState(null);

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    if (patientSearchQuery) {
      const filtered = patients.filter(p => {
        const name = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
        const mrn = (p.mrn || '').toLowerCase();
        const query = patientSearchQuery.toLowerCase();
        return name.includes(query) || mrn.includes(query);
      });
      setFilteredPatients(filtered);
    } else {
      setFilteredPatients(patients);
    }
  }, [patientSearchQuery, patients]);

  const loadPatients = async () => {
    try {
      const data = await getPatients({}, 0, 200);
      setPatients(Array.isArray(data) ? data : []);
      setFilteredPatients(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading patients:', err);
    }
  };

  const loadSelectedPatientsForRisk = () => {
    if (selectedPatients.length === 0) {
      setError('Please select at least one patient');
      return;
    }
    const features = selectedPatients.map(p => ({
      psa_level: p.psa_level || '',
      gleason_score: p.gleason_score || '',
      clinical_stage: p.clinical_stage || '',
    }));
    setRiskFeatures(features);
    setPatientSearchOpen(false);
  };

  const loadPatientPSAHistory = async (patientId) => {
    try {
      setLoading(true);
      const labResults = await getPatientLabResults(patientId);
      // Filter PSA lab results and sort by date
      const psaResults = labResults
        .filter(lab => lab.test_type?.toLowerCase().includes('psa') || lab.test_type === 'PSA')
        .sort((a, b) => new Date(a.test_date || 0) - new Date(b.test_date || 0));
      
      if (psaResults.length < 2) {
        setError('Patient needs at least 2 PSA lab results for trend prediction');
        return;
      }

      const values = psaResults.map(lab => parseFloat(lab.test_value) || 0);
      const dates = psaResults.map((lab, idx) => idx); // Use index as time points
      
      setPsaHistory(values.join(', '));
      setPsaTimePoints(dates.join(', '));
      setPatientSearchOpen(false);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPatientPSAForAnomaly = async (patientId) => {
    try {
      setLoading(true);
      const labResults = await getPatientLabResults(patientId);
      const psaResults = labResults
        .filter(lab => lab.test_type?.toLowerCase().includes('psa') || lab.test_type === 'PSA')
        .map(lab => parseFloat(lab.test_value) || 0)
        .filter(val => val > 0);
      
      if (psaResults.length < 4) {
        setError('Patient needs at least 4 PSA lab results for anomaly detection');
        return;
      }

      setAnomalyData(psaResults.join(', '));
      setPatientSearchOpen(false);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAllPatientsPSAForAnomaly = () => {
    const allPSA = patients
      .filter(p => p.psa_level && p.psa_level > 0)
      .map(p => p.psa_level);
    
    if (allPSA.length < 4) {
      setError('Need at least 4 patients with PSA levels for anomaly detection');
      return;
    }

    setAnomalyData(allPSA.join(', '));
  };

  const parseArray = (str) => {
    if (!str) return [];
    return str.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
  };

  const parseMatrix = (str) => {
    if (!str) return [];
    return str.split(';').map(row => 
      row.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n))
    ).filter(row => row.length > 0);
  };

  // ML Functions
  const handlePredictRisk = async () => {
    try {
      setLoading(true);
      setError(null);
      const features = riskFeatures.map(f => ({
        psa_level: parseFloat(f.psa_level) || 0,
        gleason_score: parseFloat(f.gleason_score) || 0,
        clinical_stage: f.clinical_stage || '',
      }));
      const result = await predictRisk(features);
      setRiskResults(result);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePredictPSATrend = async () => {
    try {
      setLoading(true);
      setError(null);
      const historical = parseArray(psaHistory);
      const timePoints = parseArray(psaTimePoints);
      if (historical.length !== timePoints.length) {
        setError('Historical PSA and time points must have the same length');
        return;
      }
      const result = await predictPSATrend(historical, timePoints);
      setPsaTrendResults(result);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDetectAnomalies = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = parseArray(anomalyData);
      if (data.length < 4) {
        setError('Need at least 4 data points for anomaly detection');
        return;
      }
      const result = await detectAnomalies(data, anomalyMethod);
      setAnomalyResults(result);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClusterPatients = async () => {
    try {
      setLoading(true);
      setError(null);
      if (clusterFeatures.length < nClusters) {
        setError(`Need at least ${nClusters} patients for clustering`);
        return;
      }
      const result = await clusterPatients(clusterFeatures, nClusters);
      setClusterResults(result);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  // Statistics Functions
  const handleTTest = async () => {
    try {
      setLoading(true);
      setError(null);
      const group1 = parseArray(tTestGroup1);
      const group2 = parseArray(tTestGroup2);
      if (group1.length < 2 || group2.length < 2) {
        setError('Each group needs at least 2 values');
        return;
      }
      const result = await performTTest(group1, group2);
      setTTestResults(result);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChiSquare = async () => {
    try {
      setLoading(true);
      setError(null);
      const observed = parseMatrix(chiSquareObserved);
      if (observed.length === 0) {
        setError('Invalid matrix format');
        return;
      }
      const result = await performChiSquare(observed);
      setChiSquareResults(result);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegression = async () => {
    try {
      setLoading(true);
      setError(null);
      const xData = parseArray(regressionX);
      const yData = parseArray(regressionY);
      if (xData.length !== yData.length || xData.length < 2) {
        setError('X and Y data must have the same length (minimum 2 points)');
        return;
      }
      const result = await performRegression(xData, yData);
      setRegressionResults(result);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCorrelation = async () => {
    try {
      setLoading(true);
      setError(null);
      const xData = parseArray(correlationX);
      const yData = parseArray(correlationY);
      if (xData.length !== yData.length || xData.length < 2) {
        setError('X and Y data must have the same length (minimum 2 points)');
        return;
      }
      const result = await performCorrelation(xData, yData, correlationMethod);
      setCorrelationResults(result);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleANOVA = async () => {
    try {
      setLoading(true);
      setError(null);
      const groups = parseMatrix(anovaGroups);
      if (groups.length < 2) {
        setError('Need at least 2 groups for ANOVA');
        return;
      }
      const result = await performANOVA(groups);
      setAnovaResults(result);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDescriptiveStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = parseArray(descriptiveData);
      if (data.length === 0) {
        setError('Please provide data');
        return;
      }
      const result = await getDescriptiveStats(data);
      setDescriptiveResults(result);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPatientForClustering = () => {
    if (patients.length === 0) return;
    const features = patients.slice(0, Math.min(20, patients.length)).map(p => ({
      psa_level: p.psa_level || 0,
      gleason_score: p.gleason_score || 0,
      age: p.age || 0,
    }));
    setClusterFeatures(features);
  };

  const generateMLReport = () => {
    const report = {
      generated_at: new Date().toISOString(),
      risk_predictions: riskResults,
      psa_trends: psaTrendResults,
      anomaly_detection: anomalyResults,
      patient_clustering: clusterResults,
      statistical_tests: {
        t_test: tTestResults,
        chi_square: chiSquareResults,
        regression: regressionResults,
        correlation: correlationResults,
        anova: anovaResults,
        descriptive_stats: descriptiveResults,
      },
      input_data: {
        risk_features: riskFeatures,
        psa_history: psaHistory,
        psa_time_points: psaTimePoints,
        anomaly_data: anomalyData,
        cluster_features_count: clusterFeatures.length,
        n_clusters: nClusters,
      },
    };
    setMlReportData(report);
  };

  const exportMLReportCSV = () => {
    if (!mlReportData) return;
    
    let csvContent = 'Machine Learning & Statistical Analysis Report\n';
    csvContent += `Generated: ${new Date(mlReportData.generated_at).toLocaleString()}\n\n`;
    
    // Risk Predictions
    if (mlReportData.risk_predictions) {
      csvContent += '=== RISK PREDICTIONS ===\n';
      csvContent += 'Patient,Risk Score,Predicted Category,Confidence\n';
      mlReportData.risk_predictions.predictions?.forEach((pred, idx) => {
        csvContent += `Patient ${idx + 1},${pred.risk_score},${pred.predicted_category},${pred.confidence?.toFixed(1)}%\n`;
      });
      csvContent += '\n';
    }
    
    // PSA Trends
    if (mlReportData.psa_trends && !mlReportData.psa_trends.error) {
      csvContent += '=== PSA TREND ANALYSIS ===\n';
      csvContent += `Current Trend,${mlReportData.psa_trends.current_trend}\n`;
      csvContent += `R² Value,${mlReportData.psa_trends.r_squared?.toFixed(4)}\n`;
      csvContent += `Slope,${mlReportData.psa_trends.slope?.toFixed(4)}\n`;
      csvContent += `Confidence,${mlReportData.psa_trends.confidence?.toFixed(1)}%\n`;
      if (mlReportData.psa_trends.future_predictions) {
        csvContent += '\nFuture Predictions:\n';
        csvContent += 'Time Point,Predicted PSA (ng/mL)\n';
        mlReportData.psa_trends.future_predictions.forEach(pred => {
          csvContent += `${pred.time_point},${pred.predicted_psa?.toFixed(2)}\n`;
        });
      }
      csvContent += '\n';
    }
    
    // Anomaly Detection
    if (mlReportData.anomaly_detection && !mlReportData.anomaly_detection.error) {
      csvContent += '=== ANOMALY DETECTION ===\n';
      csvContent += `Anomalies Found,${mlReportData.anomaly_detection.anomaly_count}\n`;
      csvContent += `Method,${mlReportData.anomaly_detection.method}\n`;
      if (mlReportData.anomaly_detection.bounds) {
        csvContent += `Lower Bound,${mlReportData.anomaly_detection.bounds.lower?.toFixed(2)}\n`;
        csvContent += `Upper Bound,${mlReportData.anomaly_detection.bounds.upper?.toFixed(2)}\n`;
      }
      if (mlReportData.anomaly_detection.anomalies && mlReportData.anomaly_detection.anomalies.length > 0) {
        csvContent += '\nDetected Anomalies:\n';
        csvContent += 'Index,Value,Reason\n';
        mlReportData.anomaly_detection.anomalies.forEach(anomaly => {
          csvContent += `${anomaly.index},${anomaly.value?.toFixed(2)},${anomaly.reason}\n`;
        });
      }
      csvContent += '\n';
    }
    
    // Patient Clustering
    if (mlReportData.patient_clustering && !mlReportData.patient_clustering.error) {
      csvContent += '=== PATIENT CLUSTERING ===\n';
      csvContent += `Number of Clusters,${mlReportData.patient_clustering.n_clusters}\n`;
      csvContent += `Inertia,${mlReportData.patient_clustering.inertia?.toFixed(2)}\n`;
      if (mlReportData.patient_clustering.cluster_sizes) {
        csvContent += '\nCluster Sizes:\n';
        csvContent += 'Cluster,Size\n';
        mlReportData.patient_clustering.cluster_sizes.forEach((size, idx) => {
          csvContent += `Cluster ${idx + 1},${size}\n`;
        });
      }
      csvContent += '\n';
    }
    
    // Statistical Tests
    csvContent += '=== STATISTICAL TESTS ===\n\n';
    
    if (mlReportData.statistical_tests.t_test) {
      csvContent += 'T-Test Results:\n';
      csvContent += `t-statistic,${mlReportData.statistical_tests.t_test.t_statistic?.toFixed(4)}\n`;
      csvContent += `p-value,${mlReportData.statistical_tests.t_test.p_value?.toFixed(4)}\n`;
      csvContent += `Significant,${mlReportData.statistical_tests.t_test.p_value < 0.05 ? 'Yes' : 'No'}\n\n`;
    }
    
    if (mlReportData.statistical_tests.chi_square) {
      csvContent += 'Chi-Square Test Results:\n';
      csvContent += `Chi-square,${mlReportData.statistical_tests.chi_square.chi_square?.toFixed(4)}\n`;
      csvContent += `p-value,${mlReportData.statistical_tests.chi_square.p_value?.toFixed(4)}\n`;
      csvContent += `Degrees of Freedom,${mlReportData.statistical_tests.chi_square.dof}\n\n`;
    }
    
    if (mlReportData.statistical_tests.regression) {
      csvContent += 'Linear Regression Results:\n';
      csvContent += `Slope,${mlReportData.statistical_tests.regression.slope?.toFixed(4)}\n`;
      csvContent += `Intercept,${mlReportData.statistical_tests.regression.intercept?.toFixed(4)}\n`;
      csvContent += `R²,${mlReportData.statistical_tests.regression.r_squared?.toFixed(4)}\n`;
      csvContent += `p-value,${mlReportData.statistical_tests.regression.p_value?.toFixed(4)}\n\n`;
    }
    
    if (mlReportData.statistical_tests.correlation) {
      csvContent += 'Correlation Analysis Results:\n';
      csvContent += `Correlation Coefficient,${mlReportData.statistical_tests.correlation.correlation?.toFixed(4)}\n`;
      csvContent += `Method,${mlReportData.statistical_tests.correlation.method}\n`;
      csvContent += `p-value,${mlReportData.statistical_tests.correlation.p_value?.toFixed(4)}\n\n`;
    }
    
    if (mlReportData.statistical_tests.anova) {
      csvContent += 'ANOVA Results:\n';
      csvContent += `F-statistic,${mlReportData.statistical_tests.anova.f_statistic?.toFixed(4)}\n`;
      csvContent += `p-value,${mlReportData.statistical_tests.anova.p_value?.toFixed(4)}\n\n`;
    }
    
    if (mlReportData.statistical_tests.descriptive_stats) {
      csvContent += 'Descriptive Statistics:\n';
      const ds = mlReportData.statistical_tests.descriptive_stats;
      csvContent += `Mean,${ds.mean?.toFixed(4)}\n`;
      csvContent += `Median,${ds.median?.toFixed(4)}\n`;
      csvContent += `Standard Deviation,${ds.std_dev?.toFixed(4)}\n`;
      csvContent += `Variance,${ds.variance?.toFixed(4)}\n`;
      csvContent += `Min,${ds.min?.toFixed(4)}\n`;
      csvContent += `Max,${ds.max?.toFixed(4)}\n`;
      csvContent += `Q1,${ds.q1?.toFixed(4)}\n`;
      csvContent += `Q3,${ds.q3?.toFixed(4)}\n`;
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ml_statistics_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const exportMLReportPDF = async () => {
    if (!mlReportData) return;
    
    // Create HTML content for PDF
    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>ML & Statistics Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #1976d2; border-bottom: 2px solid #1976d2; padding-bottom: 10px; }
          h2 { color: #424242; margin-top: 30px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          .section { margin-bottom: 30px; }
        </style>
      </head>
      <body>
        <h1>Machine Learning & Statistical Analysis Report</h1>
        <p><strong>Generated:</strong> ${new Date(mlReportData.generated_at).toLocaleString()}</p>
    `;
    
    // Risk Predictions
    if (mlReportData.risk_predictions) {
      htmlContent += `
        <div class="section">
          <h2>Risk Predictions</h2>
          <table>
            <thead>
              <tr><th>Patient</th><th>Risk Score</th><th>Category</th><th>Confidence</th></tr>
            </thead>
            <tbody>
      `;
      mlReportData.risk_predictions.predictions?.forEach((pred, idx) => {
        htmlContent += `<tr><td>Patient ${idx + 1}</td><td>${pred.risk_score}</td><td>${pred.predicted_category}</td><td>${pred.confidence?.toFixed(1)}%</td></tr>`;
      });
      htmlContent += `</tbody></table></div>`;
    }
    
    // PSA Trends
    if (mlReportData.psa_trends && !mlReportData.psa_trends.error) {
      htmlContent += `
        <div class="section">
          <h2>PSA Trend Analysis</h2>
          <p><strong>Current Trend:</strong> ${mlReportData.psa_trends.current_trend}</p>
          <p><strong>R² Value:</strong> ${mlReportData.psa_trends.r_squared?.toFixed(4)}</p>
          <p><strong>Slope:</strong> ${mlReportData.psa_trends.slope?.toFixed(4)}</p>
          <p><strong>Confidence:</strong> ${mlReportData.psa_trends.confidence?.toFixed(1)}%</p>
      `;
      if (mlReportData.psa_trends.future_predictions) {
        htmlContent += `<table><thead><tr><th>Time Point</th><th>Predicted PSA (ng/mL)</th></tr></thead><tbody>`;
        mlReportData.psa_trends.future_predictions.forEach(pred => {
          htmlContent += `<tr><td>${pred.time_point}</td><td>${pred.predicted_psa?.toFixed(2)}</td></tr>`;
        });
        htmlContent += `</tbody></table>`;
      }
      htmlContent += `</div>`;
    }
    
    // Statistical Tests Summary
    htmlContent += `<div class="section"><h2>Statistical Tests Summary</h2>`;
    if (mlReportData.statistical_tests.t_test) {
      htmlContent += `<p><strong>T-Test:</strong> t=${mlReportData.statistical_tests.t_test.t_statistic?.toFixed(4)}, p=${mlReportData.statistical_tests.t_test.p_value?.toFixed(4)}</p>`;
    }
    if (mlReportData.statistical_tests.regression) {
      htmlContent += `<p><strong>Regression:</strong> R²=${mlReportData.statistical_tests.regression.r_squared?.toFixed(4)}, p=${mlReportData.statistical_tests.regression.p_value?.toFixed(4)}</p>`;
    }
    if (mlReportData.statistical_tests.correlation) {
      htmlContent += `<p><strong>Correlation:</strong> r=${mlReportData.statistical_tests.correlation.correlation?.toFixed(4)}, p=${mlReportData.statistical_tests.correlation.p_value?.toFixed(4)}</p>`;
    }
    htmlContent += `</div>`;
    
    htmlContent += `
        <div class="footer">
          <p>Research Dashboard — ML & Statistics Report</p>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
      </body>
      </html>
    `;
    
    // Open print dialog
    const printWindow = window.open('', '_blank');
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Machine Learning & Statistics
          </Typography>
          <Typography variant="body1" color="textSecondary">
            Predictive analytics, anomaly detection, and statistical analysis tools
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<ReportIcon />}
            onClick={generateMLReport}
            disabled={!riskResults && !psaTrendResults && !anomalyResults && !clusterResults && !tTestResults && !regressionResults && !correlationResults && !anovaResults && !descriptiveResults}
          >
            Generate Report
          </Button>
          {mlReportData && (
            <>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={exportMLReportCSV}
              >
                Export CSV
              </Button>
              <Button
                variant="contained"
                startIcon={<PdfIcon />}
                onClick={exportMLReportPDF}
                color="error"
              >
                Export PDF
              </Button>
            </>
          )}
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper>
        <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab icon={<PsychologyIcon />} label="ML Predictions" />
          <Tab icon={<TrendingUpIcon />} label="PSA Trends" />
          <Tab icon={<WarningIcon />} label="Anomaly Detection" />
          <Tab icon={<BarChartIcon />} label="Patient Clustering" />
          <Tab label="Statistical Tests" />
        </Tabs>

        {/* ML Predictions Tab */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Risk Category Prediction
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Predict risk category based on PSA level, Gleason score, and clinical stage
                </Typography>
                
                <Button
                  variant="outlined"
                  startIcon={<PersonAddIcon />}
                  onClick={() => {
                    setSelectedPatients([]);
                    setPatientSearchOpen(true);
                  }}
                  sx={{ mb: 2 }}
                  fullWidth
                >
                  Load from Patient Database
                </Button>
                <Typography variant="caption" color="textSecondary" sx={{ mb: 2, display: 'block' }}>
                  Select patients to automatically populate PSA level, Gleason score, and clinical stage
                </Typography>
                
                {riskFeatures.map((feature, idx) => (
                  <Box key={idx} sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Patient {idx + 1}
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          size="small"
                          label="PSA Level"
                          type="number"
                          value={feature.psa_level}
                          onChange={(e) => {
                            const newFeatures = [...riskFeatures];
                            newFeatures[idx].psa_level = e.target.value;
                            setRiskFeatures(newFeatures);
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Gleason Score"
                          type="number"
                          value={feature.gleason_score}
                          onChange={(e) => {
                            const newFeatures = [...riskFeatures];
                            newFeatures[idx].gleason_score = e.target.value;
                            setRiskFeatures(newFeatures);
                          }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <TextField
                          fullWidth
                          size="small"
                          label="Clinical Stage"
                          value={feature.clinical_stage}
                          onChange={(e) => {
                            const newFeatures = [...riskFeatures];
                            newFeatures[idx].clinical_stage = e.target.value;
                            setRiskFeatures(newFeatures);
                          }}
                          placeholder="e.g., T2a"
                        />
                      </Grid>
                    </Grid>
                  </Box>
                ))}
                
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setRiskFeatures([...riskFeatures, { psa_level: '', gleason_score: '', clinical_stage: '' }])}
                  >
                    Add Patient
                  </Button>
                  {riskFeatures.length > 1 && (
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      onClick={() => setRiskFeatures(riskFeatures.slice(0, -1))}
                    >
                      Remove Last
                    </Button>
                  )}
                </Box>
                
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handlePredictRisk}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Predict Risk'}
                </Button>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Prediction Results
                </Typography>
                {riskResults ? (
                  <Box>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      Model Type: {riskResults.model_type || 'N/A'}
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Patient</TableCell>
                            <TableCell>Risk Score</TableCell>
                            <TableCell>Category</TableCell>
                            <TableCell>Confidence</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {riskResults.predictions?.map((pred, idx) => (
                            <TableRow key={idx}>
                              <TableCell>{idx + 1}</TableCell>
                              <TableCell>{pred.risk_score}</TableCell>
                              <TableCell>
                                <Chip
                                  label={pred.predicted_category}
                                  color={
                                    pred.predicted_category === 'high' ? 'error' :
                                    pred.predicted_category === 'intermediate' ? 'warning' : 'success'
                                  }
                                  size="small"
                                />
                              </TableCell>
                              <TableCell>{pred.confidence?.toFixed(1)}%</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Box>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    Enter patient features and click "Predict Risk" to see results
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* PSA Trends Tab */}
        <TabPanel value={activeTab} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  PSA Trend Prediction
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Predict future PSA values based on historical data using linear regression
                </Typography>
                
                <Button
                  variant="outlined"
                  startIcon={<PersonAddIcon />}
                  onClick={() => {
                    setSelectedPatients([]);
                    setPatientSearchOpen(true);
                  }}
                  sx={{ mb: 2 }}
                  fullWidth
                >
                  Load PSA History from Patient
                </Button>
                <Typography variant="caption" color="textSecondary" sx={{ mb: 2, display: 'block' }}>
                  Select a patient to load their historical PSA values from lab results
                </Typography>
                
                <TextField
                  fullWidth
                  label="Historical PSA Values (comma-separated)"
                  value={psaHistory}
                  onChange={(e) => setPsaHistory(e.target.value)}
                  placeholder="e.g., 4.5, 5.2, 6.1, 7.0"
                  sx={{ mb: 2 }}
                />
                
                <TextField
                  fullWidth
                  label="Time Points (comma-separated)"
                  value={psaTimePoints}
                  onChange={(e) => setPsaTimePoints(e.target.value)}
                  placeholder="e.g., 0, 1, 2, 3 (months)"
                  sx={{ mb: 2 }}
                />
                
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handlePredictPSATrend}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Predict Trend'}
                </Button>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Trend Analysis Results
                </Typography>
                {psaTrendResults ? (
                  psaTrendResults.error ? (
                    <Alert severity="error">{psaTrendResults.error}</Alert>
                  ) : (
                    <Box>
                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={6}>
                          <Card>
                            <CardContent>
                              <Typography variant="body2" color="textSecondary">Current Trend</Typography>
                              <Chip
                                label={psaTrendResults.current_trend}
                                color={
                                  psaTrendResults.current_trend === 'increasing' ? 'error' :
                                  psaTrendResults.current_trend === 'decreasing' ? 'success' : 'default'
                                }
                                sx={{ mt: 1 }}
                              />
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={6}>
                          <Card>
                            <CardContent>
                              <Typography variant="body2" color="textSecondary">R² Value</Typography>
                              <Typography variant="h6">{psaTrendResults.r_squared?.toFixed(3)}</Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={6}>
                          <Card>
                            <CardContent>
                              <Typography variant="body2" color="textSecondary">Slope</Typography>
                              <Typography variant="h6">{psaTrendResults.slope?.toFixed(3)}</Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={6}>
                          <Card>
                            <CardContent>
                              <Typography variant="body2" color="textSecondary">Confidence</Typography>
                              <Typography variant="h6">{psaTrendResults.confidence?.toFixed(1)}%</Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      </Grid>
                      
                      {psaTrendResults.future_predictions && psaTrendResults.future_predictions.length > 0 && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>Future Predictions</Typography>
                          <TableContainer>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Time Point</TableCell>
                                  <TableCell>Predicted PSA</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {psaTrendResults.future_predictions.map((pred, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell>{pred.time_point}</TableCell>
                                    <TableCell>{pred.predicted_psa?.toFixed(2)} ng/mL</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
                      )}
                    </Box>
                  )
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    Enter historical PSA data and time points to predict future trends
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Anomaly Detection Tab */}
        <TabPanel value={activeTab} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Anomaly Detection
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Detect outliers in data using IQR (Interquartile Range) method
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<PersonAddIcon />}
                    onClick={() => {
                      setSelectedPatients([]);
                      setPatientSearchOpen(true);
                    }}
                    sx={{ flex: 1 }}
                  >
                    Load from Patient
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={loadAllPatientsPSAForAnomaly}
                    sx={{ flex: 1 }}
                  >
                    Load All Patients PSA
                  </Button>
                </Box>
                <Typography variant="caption" color="textSecondary" sx={{ mb: 2, display: 'block' }}>
                  Select a patient to load their PSA values, or load all patients' PSA levels at once
                </Typography>
                
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Data Values (comma-separated)"
                  value={anomalyData}
                  onChange={(e) => setAnomalyData(e.target.value)}
                  placeholder="e.g., 4.5, 5.2, 6.1, 7.0, 25.0, 5.8"
                  sx={{ mb: 2 }}
                />
                
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Detection Method</InputLabel>
                  <Select
                    value={anomalyMethod}
                    label="Detection Method"
                    onChange={(e) => setAnomalyMethod(e.target.value)}
                  >
                    <MenuItem value="iqr">IQR (Interquartile Range)</MenuItem>
                  </Select>
                </FormControl>
                
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleDetectAnomalies}
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Detect Anomalies'}
                </Button>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Anomaly Detection Results
                </Typography>
                {anomalyResults ? (
                  anomalyResults.error ? (
                    <Alert severity="error">{anomalyResults.error}</Alert>
                  ) : (
                    <Box>
                      <Card sx={{ mb: 2 }}>
                        <CardContent>
                          <Typography variant="body2" color="textSecondary">Anomalies Found</Typography>
                          <Typography variant="h4" color="error">
                            {anomalyResults.anomaly_count}
                          </Typography>
                        </CardContent>
                      </Card>
                      
                      {anomalyResults.bounds && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>Detection Bounds</Typography>
                          <Grid container spacing={1}>
                            <Grid item xs={6}>
                              <Typography variant="caption">Lower: {anomalyResults.bounds.lower?.toFixed(2)}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption">Upper: {anomalyResults.bounds.upper?.toFixed(2)}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption">Q1: {anomalyResults.bounds.q1?.toFixed(2)}</Typography>
                            </Grid>
                            <Grid item xs={6}>
                              <Typography variant="caption">Q3: {anomalyResults.bounds.q3?.toFixed(2)}</Typography>
                            </Grid>
                          </Grid>
                        </Box>
                      )}
                      
                      {anomalyResults.anomalies && anomalyResults.anomalies.length > 0 && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>Detected Anomalies</Typography>
                          <TableContainer>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Index</TableCell>
                                  <TableCell>Value</TableCell>
                                  <TableCell>Reason</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {anomalyResults.anomalies.map((anomaly, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell>{anomaly.index}</TableCell>
                                    <TableCell>{anomaly.value?.toFixed(2)}</TableCell>
                                    <TableCell>
                                      <Chip
                                        label={anomaly.reason === 'above_upper_bound' ? 'Above Upper Bound' : 'Below Lower Bound'}
                                        color="error"
                                        size="small"
                                      />
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
                      )}
                    </Box>
                  )
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    Enter data values to detect anomalies
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Patient Clustering Tab */}
        <TabPanel value={activeTab} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Patient Clustering
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  Cluster patients based on PSA level, Gleason score, and age using K-means
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  <Button
                    variant="outlined"
                    startIcon={<PersonAddIcon />}
                    onClick={() => {
                      setSelectedPatients([]);
                      setPatientSearchOpen(true);
                    }}
                    sx={{ flex: 1 }}
                  >
                    Select Patients
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<RefreshIcon />}
                    onClick={loadPatientForClustering}
                    sx={{ flex: 1 }}
                  >
                    Load All Patients
                  </Button>
                </Box>
                <Typography variant="caption" color="textSecondary" sx={{ mb: 2, display: 'block' }}>
                  Select specific patients or load all patients for clustering analysis
                </Typography>
                
                <TextField
                  fullWidth
                  multiline
                  rows={6}
                  label="Patient Features (JSON format)"
                  value={JSON.stringify(clusterFeatures, null, 2)}
                  onChange={(e) => {
                    try {
                      setClusterFeatures(JSON.parse(e.target.value));
                    } catch (err) {
                      // Invalid JSON, ignore
                    }
                  }}
                  sx={{ mb: 2 }}
                />
                
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel>Number of Clusters</InputLabel>
                  <Select
                    value={nClusters}
                    label="Number of Clusters"
                    onChange={(e) => setNClusters(e.target.value)}
                  >
                    <MenuItem value={2}>2 Clusters</MenuItem>
                    <MenuItem value={3}>3 Clusters</MenuItem>
                    <MenuItem value={4}>4 Clusters</MenuItem>
                    <MenuItem value={5}>5 Clusters</MenuItem>
                  </Select>
                </FormControl>
                
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleClusterPatients}
                  disabled={loading || clusterFeatures.length < nClusters}
                >
                  {loading ? <CircularProgress size={24} /> : 'Cluster Patients'}
                </Button>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Clustering Results
                </Typography>
                {clusterResults ? (
                  clusterResults.error ? (
                    <Alert severity="error">{clusterResults.error}</Alert>
                  ) : (
                    <Box>
                      <Grid container spacing={2} sx={{ mb: 2 }}>
                        <Grid item xs={6}>
                          <Card>
                            <CardContent>
                              <Typography variant="body2" color="textSecondary">Number of Clusters</Typography>
                              <Typography variant="h6">{clusterResults.n_clusters}</Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={6}>
                          <Card>
                            <CardContent>
                              <Typography variant="body2" color="textSecondary">Inertia</Typography>
                              <Typography variant="h6">{clusterResults.inertia?.toFixed(2)}</Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      </Grid>
                      
                      {clusterResults.cluster_sizes && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="subtitle2" gutterBottom>Cluster Sizes</Typography>
                          <Grid container spacing={1}>
                            {clusterResults.cluster_sizes.map((size, idx) => (
                              <Grid item xs={4} key={idx}>
                                <Chip label={`Cluster ${idx + 1}: ${size}`} color="primary" />
                              </Grid>
                            ))}
                          </Grid>
                        </Box>
                      )}
                      
                      {clusterResults.clusters && (
                        <Box>
                          <Typography variant="subtitle2" gutterBottom>Patient Assignments</Typography>
                          <TableContainer>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Patient</TableCell>
                                  <TableCell>Cluster</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {clusterResults.clusters.slice(0, 20).map((cluster, idx) => (
                                  <TableRow key={idx}>
                                    <TableCell>{idx + 1}</TableCell>
                                    <TableCell>
                                      <Chip label={`Cluster ${cluster + 1}`} size="small" />
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        </Box>
                      )}
                    </Box>
                  )
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    Load patients or enter features to perform clustering
                  </Typography>
                )}
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Statistical Tests Tab */}
        <TabPanel value={activeTab} index={4}>
          <Grid container spacing={3}>
            {/* T-Test */}
            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Independent Samples T-Test</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ mb: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<PersonAddIcon />}
                      onClick={() => {
                        setSelectedPatients([]);
                        setPatientSearchOpen(true);
                      }}
                      sx={{ mb: 1 }}
                    >
                      Load PSA Values from Patients
                    </Button>
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 2 }}>
                      Select patients to compare PSA levels between two groups
                    </Typography>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={5}>
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Group 1 (comma-separated)"
                        value={tTestGroup1}
                        onChange={(e) => setTTestGroup1(e.target.value)}
                        placeholder="e.g., 4.5, 5.2, 6.1, 7.0"
                      />
                    </Grid>
                    <Grid item xs={12} md={5}>
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Group 2 (comma-separated)"
                        value={tTestGroup2}
                        onChange={(e) => setTTestGroup2(e.target.value)}
                        placeholder="e.g., 3.2, 3.8, 4.1, 4.5"
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={handleTTest}
                        disabled={loading}
                        sx={{ height: '100%' }}
                      >
                        {loading ? <CircularProgress size={24} /> : 'Run Test'}
                      </Button>
                    </Grid>
                    {tTestResults && (
                      <Grid item xs={12}>
                        <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                          <Typography variant="subtitle2" gutterBottom>Results</Typography>
                          <Typography variant="body2">t-statistic: {tTestResults.t_statistic?.toFixed(4)}</Typography>
                          <Typography variant="body2">p-value: {tTestResults.p_value?.toFixed(4)}</Typography>
                          <Typography variant="body2">
                            Significant: {tTestResults.p_value < 0.05 ? 'Yes (p < 0.05)' : 'No (p ≥ 0.05)'}
                          </Typography>
                          {tTestResults.interpretation && (
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              {tTestResults.interpretation}
                            </Typography>
                          )}
                        </Paper>
                      </Grid>
                    )}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>

            {/* Chi-Square */}
            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Chi-Square Test</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
                      Enter observed frequency matrix manually (categorical data analysis)
                    </Typography>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={10}>
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Observed Matrix (semicolon-separated rows, comma-separated values)"
                        value={chiSquareObserved}
                        onChange={(e) => setChiSquareObserved(e.target.value)}
                        placeholder="e.g., 10,20,30;15,25,35"
                        helperText="Format: row1;row2;row3 where each row is comma-separated values"
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={handleChiSquare}
                        disabled={loading}
                        sx={{ height: '100%' }}
                      >
                        {loading ? <CircularProgress size={24} /> : 'Run Test'}
                      </Button>
                    </Grid>
                    {chiSquareResults && (
                      <Grid item xs={12}>
                        <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                          <Typography variant="subtitle2" gutterBottom>Results</Typography>
                          <Typography variant="body2">Chi-square: {chiSquareResults.chi_square?.toFixed(4)}</Typography>
                          <Typography variant="body2">p-value: {chiSquareResults.p_value?.toFixed(4)}</Typography>
                          <Typography variant="body2">Degrees of freedom: {chiSquareResults.dof}</Typography>
                          {chiSquareResults.interpretation && (
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              {chiSquareResults.interpretation}
                            </Typography>
                          )}
                        </Paper>
                      </Grid>
                    )}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>

            {/* Regression */}
            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Linear Regression</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ mb: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<PersonAddIcon />}
                      onClick={() => {
                        setSelectedPatients([]);
                        setPatientSearchOpen(true);
                      }}
                      sx={{ mb: 1 }}
                    >
                      Load Patient Data (Age vs PSA)
                    </Button>
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 2 }}>
                      Select patients to analyze relationship between age (X) and PSA level (Y)
                    </Typography>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={5}>
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="X Data (comma-separated)"
                        value={regressionX}
                        onChange={(e) => setRegressionX(e.target.value)}
                        placeholder="e.g., 1,2,3,4,5"
                      />
                    </Grid>
                    <Grid item xs={12} md={5}>
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Y Data (comma-separated)"
                        value={regressionY}
                        onChange={(e) => setRegressionY(e.target.value)}
                        placeholder="e.g., 2,4,6,8,10"
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={handleRegression}
                        disabled={loading}
                        sx={{ height: '100%' }}
                      >
                        {loading ? <CircularProgress size={24} /> : 'Run Test'}
                      </Button>
                    </Grid>
                    {regressionResults && (
                      <Grid item xs={12}>
                        <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                          <Typography variant="subtitle2" gutterBottom>Results</Typography>
                          <Typography variant="body2">Slope: {regressionResults.slope?.toFixed(4)}</Typography>
                          <Typography variant="body2">Intercept: {regressionResults.intercept?.toFixed(4)}</Typography>
                          <Typography variant="body2">R²: {regressionResults.r_squared?.toFixed(4)}</Typography>
                          <Typography variant="body2">p-value: {regressionResults.p_value?.toFixed(4)}</Typography>
                          {regressionResults.interpretation && (
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              {regressionResults.interpretation}
                            </Typography>
                          )}
                        </Paper>
                      </Grid>
                    )}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>

            {/* Correlation */}
            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Correlation Analysis</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ mb: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<PersonAddIcon />}
                      onClick={() => {
                        setSelectedPatients([]);
                        setPatientSearchOpen(true);
                      }}
                      sx={{ mb: 1 }}
                    >
                      Load Patient Data (Age vs PSA)
                    </Button>
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 2 }}>
                      Select patients to analyze correlation between age (X) and PSA level (Y)
                    </Typography>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="X Data (comma-separated)"
                        value={correlationX}
                        onChange={(e) => setCorrelationX(e.target.value)}
                        placeholder="e.g., 1,2,3,4,5"
                      />
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Y Data (comma-separated)"
                        value={correlationY}
                        onChange={(e) => setCorrelationY(e.target.value)}
                        placeholder="e.g., 2,4,6,8,10"
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <FormControl fullWidth>
                        <InputLabel>Method</InputLabel>
                        <Select
                          value={correlationMethod}
                          label="Method"
                          onChange={(e) => setCorrelationMethod(e.target.value)}
                        >
                          <MenuItem value="pearson">Pearson</MenuItem>
                          <MenuItem value="spearman">Spearman</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={handleCorrelation}
                        disabled={loading}
                        sx={{ height: '100%' }}
                      >
                        {loading ? <CircularProgress size={24} /> : 'Run Test'}
                      </Button>
                    </Grid>
                    {correlationResults && (
                      <Grid item xs={12}>
                        <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                          <Typography variant="subtitle2" gutterBottom>Results</Typography>
                          <Typography variant="body2">Correlation Coefficient: {correlationResults.correlation?.toFixed(4)}</Typography>
                          <Typography variant="body2">Method: {correlationResults.method}</Typography>
                          <Typography variant="body2">p-value: {correlationResults.p_value?.toFixed(4)}</Typography>
                          {correlationResults.interpretation && (
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              {correlationResults.interpretation}
                            </Typography>
                          )}
                        </Paper>
                      </Grid>
                    )}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>

            {/* ANOVA */}
            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">One-Way ANOVA</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ mb: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<PersonAddIcon />}
                      onClick={() => {
                        setSelectedPatients([]);
                        setPatientSearchOpen(true);
                      }}
                      sx={{ mb: 1 }}
                    >
                      Load PSA Values by Risk Group
                    </Button>
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 2 }}>
                      Select patients to compare PSA levels across multiple groups (e.g., by risk category)
                    </Typography>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={10}>
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Groups (semicolon-separated, comma-separated values per group)"
                        value={anovaGroups}
                        onChange={(e) => setAnovaGroups(e.target.value)}
                        placeholder="e.g., 1,2,3;4,5,6;7,8,9"
                        helperText="Format: group1;group2;group3 where each group is comma-separated values"
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={handleANOVA}
                        disabled={loading}
                        sx={{ height: '100%' }}
                      >
                        {loading ? <CircularProgress size={24} /> : 'Run Test'}
                      </Button>
                    </Grid>
                    {anovaResults && (
                      <Grid item xs={12}>
                        <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                          <Typography variant="subtitle2" gutterBottom>Results</Typography>
                          <Typography variant="body2">F-statistic: {anovaResults.f_statistic?.toFixed(4)}</Typography>
                          <Typography variant="body2">p-value: {anovaResults.p_value?.toFixed(4)}</Typography>
                          {anovaResults.interpretation && (
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              {anovaResults.interpretation}
                            </Typography>
                          )}
                        </Paper>
                      </Grid>
                    )}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>

            {/* Descriptive Statistics */}
            <Grid item xs={12}>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="h6">Descriptive Statistics</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Box sx={{ mb: 2 }}>
                    <Button
                      variant="outlined"
                      startIcon={<PersonAddIcon />}
                      onClick={() => {
                        setSelectedPatients([]);
                        setPatientSearchOpen(true);
                      }}
                      sx={{ mb: 1 }}
                    >
                      Load PSA Values from Patients
                    </Button>
                    <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 2 }}>
                      Select patients to calculate descriptive statistics for their PSA levels
                    </Typography>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={10}>
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Data (comma-separated)"
                        value={descriptiveData}
                        onChange={(e) => setDescriptiveData(e.target.value)}
                        placeholder="e.g., 4.5, 5.2, 6.1, 7.0, 5.8, 6.5"
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <Button
                        variant="contained"
                        fullWidth
                        onClick={handleDescriptiveStats}
                        disabled={loading}
                        sx={{ height: '100%' }}
                      >
                        {loading ? <CircularProgress size={24} /> : 'Calculate'}
                      </Button>
                    </Grid>
                    {descriptiveResults && (
                      <Grid item xs={12}>
                        <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                          <Typography variant="subtitle2" gutterBottom>Results</Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={6} md={3}>
                              <Typography variant="body2">Mean: {descriptiveResults.mean?.toFixed(4)}</Typography>
                            </Grid>
                            <Grid item xs={6} md={3}>
                              <Typography variant="body2">Median: {descriptiveResults.median?.toFixed(4)}</Typography>
                            </Grid>
                            <Grid item xs={6} md={3}>
                              <Typography variant="body2">Std Dev: {descriptiveResults.std_dev?.toFixed(4)}</Typography>
                            </Grid>
                            <Grid item xs={6} md={3}>
                              <Typography variant="body2">Variance: {descriptiveResults.variance?.toFixed(4)}</Typography>
                            </Grid>
                            <Grid item xs={6} md={3}>
                              <Typography variant="body2">Min: {descriptiveResults.min?.toFixed(4)}</Typography>
                            </Grid>
                            <Grid item xs={6} md={3}>
                              <Typography variant="body2">Max: {descriptiveResults.max?.toFixed(4)}</Typography>
                            </Grid>
                            <Grid item xs={6} md={3}>
                              <Typography variant="body2">Q1: {descriptiveResults.q1?.toFixed(4)}</Typography>
                            </Grid>
                            <Grid item xs={6} md={3}>
                              <Typography variant="body2">Q3: {descriptiveResults.q3?.toFixed(4)}</Typography>
                            </Grid>
                          </Grid>
                        </Paper>
                      </Grid>
                    )}
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>

      {/* ML Report Summary */}
      {mlReportData && (
        <Paper sx={{ p: 3, mt: 3, bgcolor: 'background.default' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              ML & Statistics Report Generated
            </Typography>
            <Chip
              label={`Generated: ${new Date(mlReportData.generated_at).toLocaleString()}`}
              size="small"
            />
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="textSecondary">Risk Predictions</Typography>
                  <Typography variant="h6">
                    {mlReportData.risk_predictions?.predictions?.length || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="textSecondary">PSA Trends</Typography>
                  <Typography variant="h6">
                    {mlReportData.psa_trends && !mlReportData.psa_trends.error ? 'Available' : 'N/A'}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="textSecondary">Anomalies Detected</Typography>
                  <Typography variant="h6">
                    {mlReportData.anomaly_detection?.anomaly_count || 0}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent>
                  <Typography variant="body2" color="textSecondary">Statistical Tests</Typography>
                  <Typography variant="h6">
                    {Object.values(mlReportData.statistical_tests).filter(r => r !== null).length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Patient Selection Dialog */}
      <Dialog
        open={patientSearchOpen}
        onClose={() => setPatientSearchOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              {activeTab === 0 && 'Select Patients for Risk Prediction'}
              {activeTab === 1 && 'Select Patient for PSA Trend Analysis'}
              {activeTab === 2 && 'Select Patient for Anomaly Detection'}
              {activeTab === 3 && 'Select Patients for Clustering'}
              {activeTab === 4 && 'Select Patients for Statistical Analysis'}
            </Typography>
            <Button
              size="small"
              onClick={loadPatients}
              startIcon={<RefreshIcon />}
            >
              Refresh
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Search Patients"
            value={patientSearchQuery}
            onChange={(e) => setPatientSearchQuery(e.target.value)}
            placeholder="Search by name or MRN..."
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth>
            <InputLabel>Select Patients</InputLabel>
            <Select
              multiple
              value={selectedPatients.map(p => p.id)}
              onChange={(e) => {
                const selectedIds = e.target.value;
                const selected = patients.filter(p => selectedIds.includes(p.id));
                setSelectedPatients(selected);
              }}
              renderValue={(selected) => `${selected.length} patient(s) selected`}
            >
              {filteredPatients.map((patient) => (
                <MenuItem key={patient.id} value={patient.id}>
                  <Checkbox checked={selectedPatients.some(p => p.id === patient.id)} />
                  <ListItemText
                    primary={`${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Unknown'}
                    secondary={`MRN: ${patient.mrn} | PSA: ${patient.psa_level || 'N/A'} | Gleason: ${patient.gleason_score || 'N/A'}`}
                  />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {selectedPatients.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Selected Patients ({selectedPatients.length}):
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {selectedPatients.map((p) => (
                  <Chip
                    key={p.id}
                    label={`${p.first_name || ''} ${p.last_name || ''}`.trim() || p.mrn}
                    onDelete={() => setSelectedPatients(selectedPatients.filter(pat => pat.id !== p.id))}
                    size="small"
                  />
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setPatientSearchOpen(false);
            setSelectedPatients([]);
            setPatientSearchQuery('');
          }}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (selectedPatients.length === 0) {
                setError('Please select at least one patient');
                return;
              }
              
              try {
                if (activeTab === 0) {
                  // Risk Prediction
                  loadSelectedPatientsForRisk();
                } else if (activeTab === 1) {
                  // PSA Trend - load from first selected patient
                  await loadPatientPSAHistory(selectedPatients[0].id);
                } else if (activeTab === 2) {
                  // Anomaly Detection - load from first selected patient
                  await loadPatientPSAForAnomaly(selectedPatients[0].id);
                } else if (activeTab === 3) {
                  // Clustering
                  const features = selectedPatients.map(p => ({
                    psa_level: p.psa_level || 0,
                    gleason_score: p.gleason_score || 0,
                    age: p.age || 0,
                  }));
                  setClusterFeatures(features);
                  setPatientSearchOpen(false);
                  setSelectedPatients([]);
                  setPatientSearchQuery('');
                } else if (activeTab === 4) {
                  // Statistical Tests - handle based on which accordion is open
                  // For now, we'll load PSA values for T-Test, Regression, Correlation, ANOVA, and Descriptive Stats
                  const psaValues = selectedPatients
                    .filter(p => p.psa_level && p.psa_level > 0)
                    .map(p => p.psa_level);
                  
                  if (psaValues.length === 0) {
                    setError('Selected patients must have PSA levels');
                    return;
                  }
                  
                  // For T-Test: split into two groups
                  if (tTestGroup1 === '' && tTestGroup2 === '') {
                    const mid = Math.floor(psaValues.length / 2);
                    setTTestGroup1(psaValues.slice(0, mid).join(', '));
                    setTTestGroup2(psaValues.slice(mid).join(', '));
                  }
                  
                  // For Regression/Correlation: use age as X, PSA as Y
                  const ageValues = selectedPatients
                    .filter(p => p.age && p.age > 0 && p.psa_level && p.psa_level > 0)
                    .map(p => p.age);
                  const psaForRegression = selectedPatients
                    .filter(p => p.age && p.age > 0 && p.psa_level && p.psa_level > 0)
                    .map(p => p.psa_level);
                  
                  if (regressionX === '' && regressionY === '' && ageValues.length > 0) {
                    setRegressionX(ageValues.join(', '));
                    setRegressionY(psaForRegression.join(', '));
                  }
                  
                  if (correlationX === '' && correlationY === '' && ageValues.length > 0) {
                    setCorrelationX(ageValues.join(', '));
                    setCorrelationY(psaForRegression.join(', '));
                  }
                  
                  // For ANOVA: group by risk category
                  if (anovaGroups === '') {
                    const lowRisk = selectedPatients
                      .filter(p => (p.gleason_score || 0) <= 6 && (p.psa_level || 0) < 10)
                      .map(p => p.psa_level)
                      .filter(v => v && v > 0);
                    const intermediateRisk = selectedPatients
                      .filter(p => {
                        const gleason = p.gleason_score || 0;
                        const psa = p.psa_level || 0;
                        return (gleason === 7) || (gleason <= 6 && psa >= 10 && psa <= 20);
                      })
                      .map(p => p.psa_level)
                      .filter(v => v && v > 0);
                    const highRisk = selectedPatients
                      .filter(p => (p.gleason_score || 0) >= 8 || (p.psa_level || 0) > 20)
                      .map(p => p.psa_level)
                      .filter(v => v && v > 0);
                    
                    if (lowRisk.length > 0 || intermediateRisk.length > 0 || highRisk.length > 0) {
                      const groups = [];
                      if (lowRisk.length > 0) groups.push(lowRisk.join(', '));
                      if (intermediateRisk.length > 0) groups.push(intermediateRisk.join(', '));
                      if (highRisk.length > 0) groups.push(highRisk.join(', '));
                      setAnovaGroups(groups.join(';'));
                    }
                  }
                  
                  // For Descriptive Stats: use all PSA values
                  if (descriptiveData === '') {
                    setDescriptiveData(psaValues.join(', '));
                  }
                  
                  setPatientSearchOpen(false);
                  setSelectedPatients([]);
                  setPatientSearchQuery('');
                }
              } catch (err) {
                setError(err.message);
              }
            }}
            variant="contained"
            disabled={selectedPatients.length === 0}
          >
            {activeTab === 1 || activeTab === 2 ? 'Load Patient Data' : 'Load Selected'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default MLStatistics;
