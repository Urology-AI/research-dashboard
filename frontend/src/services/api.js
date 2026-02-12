import axios from 'axios';
import { toAppPath } from '../utils/appPath';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = toAppPath('/login');
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// PATIENT API
// ============================================================================

export const getPatients = async (filters = {}, skip = 0, limit = 100) => {
  const params = new URLSearchParams();
  Object.keys(filters).forEach(key => {
    if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
      if (Array.isArray(filters[key])) {
        filters[key].forEach(val => params.append(key, val));
      } else {
        params.append(key, filters[key]);
      }
    }
  });
  params.append('skip', skip);
  params.append('limit', limit);
  
  const response = await api.get(`/api/patients?${params.toString()}`);
  const totalCount = response.headers['x-total-count'] ? parseInt(response.headers['x-total-count']) : response.data.length;
  response.data._totalCount = totalCount;
  return response.data;
};

export const getPatient = async (id) => {
  const response = await api.get(`/api/patients/${id}`);
  return response.data;
};

export const getPatientProcedures = async (patientId) => {
  const response = await api.get(`/api/patients/${patientId}/procedures`);
  return response.data;
};

export const getPatientLabResults = async (patientId) => {
  const response = await api.get(`/api/patients/${patientId}/lab-results`);
  return response.data;
};

// ============================================================================
// EXPORT API
// ============================================================================

export const exportPatientsCSV = async (filters = {}) => {
  const params = filters ? { filters: JSON.stringify(filters) } : {};
  const response = await api.get('/api/export/patients/csv', {
    params,
    responseType: 'blob',
  });
  return response.data;
};

export const exportPatientsExcel = async (filters = {}) => {
  const params = filters ? { filters: JSON.stringify(filters) } : {};
  const response = await api.get('/api/export/patients/excel', {
    params,
    responseType: 'blob',
  });
  return response.data;
};

export const exportPatientSummary = async (patientId) => {
  const response = await api.get(`/api/export/patient/${patientId}/summary`, {
    responseType: 'blob',
  });
  return response.data;
};

// ============================================================================
// SEARCH API
// ============================================================================

export const searchPatients = async (query, limit = 50) => {
  const response = await api.get('/api/search/patients', {
    params: { q: query, limit },
  });
  return response.data;
};

export const globalSearch = async (query, limit = 50) => {
  const response = await api.get('/api/search/global', {
    params: { q: query, limit },
  });
  return response.data;
};

// ============================================================================
// USER SESSIONS API
// ============================================================================

export const getUserSessions = async () => {
  const response = await api.get('/api/sessions');
  return response.data;
};

export const revokeSession = async (sessionId) => {
  const response = await api.delete(`/api/sessions/${sessionId}`);
  return response.data;
};

// ============================================================================
// BACKUP & RECOVERY API (Admin)
// ============================================================================

export const createBackup = async () => {
  const response = await api.post('/api/admin/backup/create');
  return response.data;
};

export const listBackups = async () => {
  const response = await api.get('/api/admin/backup/list');
  return response.data;
};

export const downloadBackup = async (filename) => {
  const response = await api.get(`/api/admin/backup/download/${filename}`, {
    responseType: 'blob',
  });
  return response.data;
};

export const restoreBackup = async (filename) => {
  const response = await api.post(`/api/admin/backup/restore/${filename}`);
  return response.data;
};

export const deleteBackup = async (filename) => {
  const response = await api.delete(`/api/admin/backup/${filename}`);
  return response.data;
};

// ============================================================================
// TWO-FACTOR AUTHENTICATION API
// ============================================================================

export const setup2FA = async () => {
  const response = await api.post('/api/auth/2fa/setup');
  return response.data;
};

export const verify2FASetup = async (code) => {
  const response = await api.post('/api/auth/2fa/verify', { code });
  return response.data;
};

export const get2FAStatus = async () => {
  const response = await api.get('/api/auth/2fa/status');
  return response.data;
};

export const disable2FA = async (code) => {
  const response = await api.post('/api/auth/2fa/disable', { code });
  return response.data;
};

// ============================================================================
// ANALYTICS API
// ============================================================================

export const getDashboardStats = async () => {
  const response = await api.get('/api/analytics/dashboard-stats');
  return response.data;
};

export const getPSATrends = async (patientId) => {
  const response = await api.get(`/api/analytics/psa-trends/${patientId}`);
  return response.data;
};

export const getHighRiskPatients = async () => {
  const response = await api.get('/api/analytics/high-risk-patients');
  return response.data;
};

export const getPSADistribution = async () => {
  const response = await api.get('/api/analytics/psa-distribution');
  return response.data;
};

export const getGleasonDistribution = async () => {
  const response = await api.get('/api/analytics/gleason-distribution');
  return response.data;
};

export const getOutcomesByTreatment = async () => {
  const response = await api.get('/api/analytics/outcomes-by-treatment');
  return response.data;
};

export const getRiskStratification = async () => {
  const response = await api.get('/api/analytics/risk-stratification');
  return response.data;
};

export const getTrendAnalysis = async (metric = 'psa', days = 365) => {
  const response = await api.get('/api/analytics/trends', {
    params: { metric, days }
  });
  return response.data;
};

// ============================================================================
// DATA UPLOAD API
// ============================================================================

export const uploadExcelFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post('/api/upload/excel', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const ingestRedcapData = async (redcapUrl, apiToken) => {
  const response = await api.post('/api/ingest/redcap', {
    redcap_url: redcapUrl,
    api_token: apiToken,
  });
  return response.data;
};

// ============================================================================
// STATISTICS API
// ============================================================================

export const performTTest = async (group1, group2) => {
  const response = await api.post('/api/statistics/t-test', { group1, group2 });
  return response.data;
};

export const performChiSquare = async (observed, expected = null) => {
  const response = await api.post('/api/statistics/chi-square', { observed, expected });
  return response.data;
};

export const performRegression = async (xData, yData) => {
  const response = await api.post('/api/statistics/regression', { x_data: xData, y_data: yData });
  return response.data;
};

export const performCorrelation = async (xData, yData, method = 'pearson') => {
  const response = await api.post('/api/statistics/correlation', { x_data: xData, y_data: yData, method });
  return response.data;
};

export const performANOVA = async (groups) => {
  const response = await api.post('/api/statistics/anova', { groups });
  return response.data;
};

export const getDescriptiveStats = async (data) => {
  const response = await api.post('/api/statistics/descriptive', { data });
  return response.data;
};

// ============================================================================
// DATA QUALITY API
// ============================================================================

export const getDataQualityAnalysis = async () => {
  const response = await api.get('/api/data-quality/analysis');
  return response.data;
};

// ============================================================================
// MACHINE LEARNING API
// ============================================================================

export const predictRisk = async (features) => {
  const response = await api.post('/api/ml/predict-risk', { features });
  return response.data;
};

export const predictPSATrend = async (historicalPSA, timePoints) => {
  const response = await api.post('/api/ml/predict-psa-trend', {
    historical_psa: historicalPSA,
    time_points: timePoints
  });
  return response.data;
};

export const detectAnomalies = async (data, method = 'iqr') => {
  const response = await api.post('/api/ml/detect-anomalies', { data, method });
  return response.data;
};

export const clusterPatients = async (features, nClusters = 3) => {
  const response = await api.post('/api/ml/cluster-patients', {
    features,
    n_clusters: nClusters
  });
  return response.data;
};

// ============================================================================
// CLINICAL REPORTS API (Surgical Intelligence)
// ============================================================================

export const downloadSurgicalIntelligenceReport = async (patientId, includePredictions = true) => {
  const response = await api.get(`/api/reports/clinical/patient/${patientId}/surgical-intelligence`, {
    params: { include_predictions: includePredictions },
    responseType: 'blob',
  });
  return response.data;
};

export const getPSAAnalysis = async (patientId) => {
  const response = await api.get(`/api/reports/clinical/patient/${patientId}/psa-analysis`);
  return response.data;
};

export const getRiskAssessment = async (patientId) => {
  const response = await api.get(`/api/reports/clinical/patient/${patientId}/risk-assessment`);
  return response.data;
};

export const getRecoveryPrediction = async (patientId, nerveSparing = true) => {
  const response = await api.get(`/api/reports/clinical/patient/${patientId}/recovery-prediction`, {
    params: { nerve_sparing: nerveSparing }
  });
  return response.data;
};

export default api;
