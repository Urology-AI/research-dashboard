import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis as RechartsXAxis,
  YAxis as RechartsYAxis,
  Cell,
} from 'recharts';
import { getPatients, getRiskStratification } from '../services/api';
import ResearchFilters from '../components/ResearchFilters';
import { useResearch } from '../contexts/ResearchContext';

/**
 * ErrorAnalysis - Dedicated views for model failure analysis.
 * Surfaces: false positives/negatives, high-confidence errors,
 * performance stratified by race/age/stage/treatment, temporal drift.
 * 
 * Design: Encourage hypothesis generation rather than hide errors.
 */
function ErrorAnalysis() {
  const { researchState } = useResearch();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [patients, setPatients] = useState([]);
  const [riskData, setRiskData] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [patientsData, riskStratData] = await Promise.all([
        getPatients({}, 0, 200),
        getRiskStratification(),
      ]);
      setPatients(Array.isArray(patientsData) ? patientsData : []);
      setRiskData(riskStratData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Simulate error analysis data (in production, this would come from model evaluation)
  const patientList = Array.isArray(patients) ? patients : [];
  const falsePositives = patientList
    .filter((p) => (p.gleason_score ?? 0) <= 6 && (p.psa_level ?? 0) < 10)
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      mrn: p.mrn,
      gleason: p.gleason_score,
      psa: p.psa_level,
      aiRisk: 'High',
      baselineRisk: 'Low',
      confidence: 0.92,
    }));

  const falseNegatives = patientList
    .filter((p) => (p.gleason_score ?? 0) >= 8 || (p.psa_level ?? 0) > 20)
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      mrn: p.mrn,
      gleason: p.gleason_score,
      psa: p.psa_level,
      aiRisk: 'Low',
      baselineRisk: 'High',
      confidence: 0.88,
    }));

  // Performance by subgroup (simulated)
  const performanceBySubgroup = [
    { subgroup: 'Age <60', sensitivity: 0.85, specificity: 0.92, n: 45 },
    { subgroup: 'Age 60-70', sensitivity: 0.88, specificity: 0.89, n: 78 },
    { subgroup: 'Age >70', sensitivity: 0.82, specificity: 0.91, n: 52 },
    { subgroup: 'Stage T1-T2', sensitivity: 0.86, specificity: 0.90, n: 120 },
    { subgroup: 'Stage T3+', sensitivity: 0.91, specificity: 0.85, n: 55 },
    { subgroup: 'Gleason ≤6', sensitivity: 0.80, specificity: 0.94, n: 65 },
    { subgroup: 'Gleason 7', sensitivity: 0.87, specificity: 0.88, n: 72 },
    { subgroup: 'Gleason ≥8', sensitivity: 0.93, specificity: 0.82, n: 38 },
  ];

  const highConfidenceErrors = [...falsePositives, ...falseNegatives]
    .filter((e) => e.confidence > 0.85)
    .sort((a, b) => b.confidence - a.confidence);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Error loading data: {error}</Alert>;
  }

  return (
    <Box>
      <ResearchFilters />
      <Box sx={{ mb: 3 }}>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1 }}>
          Model Failure & Bias Analysis
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Identify model failures, calibration drift, and subgroup-specific performance. Use for hypothesis generation.
        </Typography>
      </Box>

      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="False Positives / Negatives" />
        <Tab label="High-Confidence Errors" />
        <Tab label="Performance by Subgroup" />
        <Tab label="Calibration & Drift" />
      </Tabs>

      {/* Tab 1: FP/FN */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
              }}
            >
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                False Positives
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                AI predicted high risk; clinical baseline suggests low risk. Potential over-treatment if model is trusted.
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>MRN</TableCell>
                      <TableCell align="right">Gleason</TableCell>
                      <TableCell align="right">PSA</TableCell>
                      <TableCell>AI</TableCell>
                      <TableCell>Baseline</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {falsePositives.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                          No false positives in current cohort
                        </TableCell>
                      </TableRow>
                    ) : (
                      falsePositives.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{row.mrn}</TableCell>
                          <TableCell align="right">{row.gleason}</TableCell>
                          <TableCell align="right">{row.psa}</TableCell>
                          <TableCell><Chip label={row.aiRisk} size="small" color="error" /></TableCell>
                          <TableCell><Chip label={row.baselineRisk} size="small" color="success" /></TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
              }}
            >
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                False Negatives
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                AI predicted low risk; clinical baseline suggests high risk. Potential under-treatment.
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>MRN</TableCell>
                      <TableCell align="right">Gleason</TableCell>
                      <TableCell align="right">PSA</TableCell>
                      <TableCell>AI</TableCell>
                      <TableCell>Baseline</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {falseNegatives.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                          No false negatives in current cohort
                        </TableCell>
                      </TableRow>
                    ) : (
                      falseNegatives.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{row.mrn}</TableCell>
                          <TableCell align="right">{row.gleason}</TableCell>
                          <TableCell align="right">{row.psa}</TableCell>
                          <TableCell><Chip label={row.aiRisk} size="small" color="success" /></TableCell>
                          <TableCell><Chip label={row.baselineRisk} size="small" color="error" /></TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Tab 2: High-confidence errors */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
              }}
            >
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                High-Confidence Incorrect Predictions
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Cases where the model was highly confident but wrong. Highest priority for model improvement.
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>MRN</TableCell>
                      <TableCell align="right">Gleason</TableCell>
                      <TableCell align="right">PSA</TableCell>
                      <TableCell>AI Risk</TableCell>
                      <TableCell>Baseline</TableCell>
                      <TableCell align="right">Confidence</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {highConfidenceErrors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                          No high-confidence errors in current cohort
                        </TableCell>
                      </TableRow>
                    ) : (
                      highConfidenceErrors.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{row.mrn}</TableCell>
                          <TableCell align="right">{row.gleason}</TableCell>
                          <TableCell align="right">{row.psa}</TableCell>
                          <TableCell><Chip label={row.aiRisk} size="small" /></TableCell>
                          <TableCell><Chip label={row.baselineRisk} size="small" /></TableCell>
                          <TableCell align="right">{(row.confidence * 100).toFixed(0)}%</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Tab 3: Performance by subgroup */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
              }}
            >
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                Performance Stratified by Subgroup
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Sensitivity and specificity by age, stage, Gleason. Look for disparities that may indicate bias.
              </Typography>
              <ResponsiveContainer width="100%" height={380}>
                <BarChart data={performanceBySubgroup} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 1]} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="subgroup" width={95} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => (typeof v === 'number' ? (v * 100).toFixed(1) + '%' : v)} />
                  <Legend />
                  <Bar dataKey="sensitivity" name="Sensitivity" fill="#1565C0" radius={[0, 2, 2, 0]} />
                  <Bar dataKey="specificity" name="Specificity" fill="#2E7D32" radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Tab 4: Calibration & Drift */}
      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
              }}
            >
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                Calibration
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Predicted probability vs observed outcome. Perfect calibration lies on the diagonal.
              </Typography>
              <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Calibration plot (requires outcome labels)
                </Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
              }}
            >
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                Temporal Drift
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Model performance over time. Declining metrics may indicate cohort shift.
              </Typography>
              <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Drift analysis (requires longitudinal data)
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}

export default ErrorAnalysis;
