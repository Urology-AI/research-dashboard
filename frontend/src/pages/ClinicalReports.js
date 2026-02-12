import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Divider,
  CircularProgress,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  Person as PersonIcon,
  TrendingUp as TrendingIcon,
  Assessment as AssessmentIcon,
  LocalHospital as HospitalIcon,
  Speed as SpeedIcon,
  Timeline as TimelineIcon,
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import {
  getPatients,
  downloadSurgicalIntelligenceReport,
  getPSAAnalysis,
  getRiskAssessment,
  getRecoveryPrediction,
} from '../services/api';

const ClinicalReports = () => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Analysis results
  const [psaAnalysis, setPsaAnalysis] = useState(null);
  const [riskAssessment, setRiskAssessment] = useState(null);
  const [recoveryPrediction, setRecoveryPrediction] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  
  // Options
  const [includePredictions, setIncludePredictions] = useState(true);
  const [nerveSparing, setNerveSparing] = useState(true);
  
  // Preview dialog
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const data = await getPatients({}, 0, 500);
      setPatients(data);
    } catch (err) {
      setError('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSelect = async (patient) => {
    setSelectedPatient(patient);
    setPsaAnalysis(null);
    setRiskAssessment(null);
    setRecoveryPrediction(null);
    setError('');
    setSuccess('');
    
    if (patient) {
      loadAnalysis(patient.id);
    }
  };

  const loadAnalysis = async (patientId) => {
    setAnalysisLoading(true);
    try {
      const [psa, risk, recovery] = await Promise.all([
        getPSAAnalysis(patientId).catch(() => null),
        getRiskAssessment(patientId).catch(() => null),
        getRecoveryPrediction(patientId, nerveSparing).catch(() => null),
      ]);
      setPsaAnalysis(psa);
      setRiskAssessment(risk);
      setRecoveryPrediction(recovery);
    } catch (err) {
      console.error('Analysis error:', err);
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!selectedPatient) {
      setError('Please select a patient first');
      return;
    }
    
    setGenerating(true);
    setError('');
    setSuccess('');
    
    try {
      const blob = await downloadSurgicalIntelligenceReport(selectedPatient.id, includePredictions);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Surgical_Intelligence_Report_${selectedPatient.mrn}_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      setSuccess('Report downloaded successfully!');
    } catch (err) {
      setError('Failed to generate report. Please try again.');
      console.error('Report generation error:', err);
    } finally {
      setGenerating(false);
    }
  };

  const getRiskColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'low': return 'success';
      case 'intermediate': return 'warning';
      case 'high': return 'error';
      default: return 'default';
    }
  };

  const getScoreColor = (score, max = 10) => {
    const ratio = score / max;
    if (ratio <= 0.3) return '#4caf50';
    if (ratio <= 0.6) return '#ff9800';
    return '#f44336';
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #1a365d 0%, #2b6cb0 100%)', color: 'white' }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold' }}>
          Surgical Intelligence Reports
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.9 }}>
          Generate comprehensive clinical summary PDFs with predictive analytics, risk assessments, and recovery forecasts
        </Typography>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      <Grid container spacing={3}>
        {/* Patient Selection Panel */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon color="primary" />
              Select Patient
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Autocomplete
              options={patients}
              getOptionLabel={(patient) => `${patient.mrn} - ${patient.first_name || ''} ${patient.last_name || ''} (Age: ${patient.age || 'N/A'})`}
              value={selectedPatient}
              onChange={(e, newValue) => handlePatientSelect(newValue)}
              loading={loading}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search patients by MRN or name"
                  variant="outlined"
                  fullWidth
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loading ? <CircularProgress size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              sx={{ mb: 3 }}
            />
            
            {selectedPatient && (
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="bold">
                    Patient #{selectedPatient.mrn}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Age: {selectedPatient.age || 'N/A'} | Gender: {selectedPatient.gender || 'N/A'}
                  </Typography>
                  <Divider sx={{ my: 1 }} />
                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">PSA Level</Typography>
                      <Typography variant="body2">{selectedPatient.psa_level?.toFixed(2) || 'N/A'} ng/mL</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Gleason Score</Typography>
                      <Typography variant="body2">{selectedPatient.gleason_score || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Clinical Stage</Typography>
                      <Typography variant="body2">{selectedPatient.clinical_stage || 'N/A'}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="caption" color="text.secondary">Diagnosis</Typography>
                      <Typography variant="body2" noWrap>{selectedPatient.diagnosis || 'N/A'}</Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}

            {/* Report Options */}
            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
              Report Options
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={includePredictions}
                  onChange={(e) => setIncludePredictions(e.target.checked)}
                  color="primary"
                />
              }
              label="Include Predictive Analytics"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={nerveSparing}
                  onChange={(e) => {
                    setNerveSparing(e.target.checked);
                    if (selectedPatient) {
                      getRecoveryPrediction(selectedPatient.id, e.target.checked)
                        .then(setRecoveryPrediction)
                        .catch(() => {});
                    }
                  }}
                  color="primary"
                />
              }
              label="Nerve-Sparing Approach Planned"
            />

            {/* Generate Button */}
            <Button
              variant="contained"
              size="large"
              fullWidth
              startIcon={generating ? <CircularProgress size={20} color="inherit" /> : <PdfIcon />}
              onClick={handleDownloadReport}
              disabled={!selectedPatient || generating}
              sx={{ 
                mt: 3, 
                py: 1.5,
                background: 'linear-gradient(135deg, #1a365d 0%, #2b6cb0 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #2d3748 0%, #3182ce 100%)',
                }
              }}
            >
              {generating ? 'Generating Report...' : 'Download Surgical Intelligence Report'}
            </Button>
          </Paper>
        </Grid>

        {/* Analysis Preview Panel */}
        <Grid item xs={12} md={8}>
          {!selectedPatient ? (
            <Paper sx={{ p: 6, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <AssessmentIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Select a patient to preview analytics
              </Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
                The report will include PSA kinetics, CAPRA score, surgical difficulty index, and recovery predictions
              </Typography>
            </Paper>
          ) : analysisLoading ? (
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <CircularProgress size={60} />
              <Typography variant="h6" sx={{ mt: 2 }}>Loading Analysis...</Typography>
            </Paper>
          ) : (
            <Box>
              {/* PSA Kinetics */}
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <TrendingIcon sx={{ mr: 1 }} color="primary" />
                  <Typography variant="h6">PSA Kinetics Analysis</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {psaAnalysis?.status === 'success' ? (
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="subtitle2" color="text.secondary">PSA Velocity</Typography>
                            <Typography variant="h4" sx={{ color: psaAnalysis.velocity?.velocity > 2 ? '#f44336' : psaAnalysis.velocity?.velocity > 0.75 ? '#ff9800' : '#4caf50' }}>
                              {psaAnalysis.velocity?.velocity?.toFixed(3) || 'N/A'} ng/mL/year
                            </Typography>
                            <Chip 
                              size="small" 
                              label={psaAnalysis.velocity?.interpretation || 'N/A'}
                              color={psaAnalysis.velocity?.velocity > 2 ? 'error' : psaAnalysis.velocity?.velocity > 0.75 ? 'warning' : 'success'}
                              sx={{ mt: 1 }}
                            />
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="subtitle2" color="text.secondary">PSA Doubling Time</Typography>
                            <Typography variant="h4" sx={{ color: psaAnalysis.doubling_time?.doubling_time_months < 6 ? '#f44336' : psaAnalysis.doubling_time?.doubling_time_months < 12 ? '#ff9800' : '#4caf50' }}>
                              {psaAnalysis.doubling_time?.doubling_time_months?.toFixed(1) || 'N/A'} months
                            </Typography>
                            <Chip 
                              size="small" 
                              label={psaAnalysis.doubling_time?.risk_level || psaAnalysis.doubling_time?.interpretation || 'N/A'}
                              color={getRiskColor(psaAnalysis.doubling_time?.risk_level)}
                              sx={{ mt: 1 }}
                            />
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" gutterBottom>Model Statistics</Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          <Chip label={`R² = ${psaAnalysis.velocity?.r_squared?.toFixed(3) || 'N/A'}`} variant="outlined" />
                          <Chip label={`p-value = ${psaAnalysis.velocity?.p_value?.toFixed(4) || 'N/A'}`} variant="outlined" />
                          <Chip label={`Data points: ${psaAnalysis.psa_count}`} variant="outlined" />
                        </Box>
                      </Grid>
                    </Grid>
                  ) : (
                    <Alert severity="info">{psaAnalysis?.message || 'Insufficient PSA data for kinetics analysis'}</Alert>
                  )}
                </AccordionDetails>
              </Accordion>

              {/* Risk Assessment */}
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <SpeedIcon sx={{ mr: 1 }} color="secondary" />
                  <Typography variant="h6">Risk Assessment</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {riskAssessment ? (
                    <Grid container spacing={2}>
                      {/* CAPRA Score */}
                      <Grid item xs={12} md={6}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="subtitle2" color="text.secondary">UCSF-CAPRA Score</Typography>
                            {riskAssessment.capra_score ? (
                              <>
                                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                                  <Typography variant="h3" sx={{ color: getScoreColor(riskAssessment.capra_score.score) }}>
                                    {riskAssessment.capra_score.score}
                                  </Typography>
                                  <Typography variant="h6" color="text.secondary">/10</Typography>
                                </Box>
                                <Chip 
                                  label={`${riskAssessment.capra_score.risk_category} Risk`}
                                  color={getRiskColor(riskAssessment.capra_score.risk_category)}
                                  sx={{ mt: 1 }}
                                />
                                <Typography variant="body2" sx={{ mt: 2 }}>
                                  5-Year Recurrence-Free: {riskAssessment.capra_score.five_year_recurrence_free}
                                </Typography>
                                <Typography variant="body2">
                                  10-Year Mortality: {riskAssessment.capra_score.ten_year_prostate_cancer_mortality}
                                </Typography>
                              </>
                            ) : (
                              <Typography color="text.secondary">Insufficient data</Typography>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                      
                      {/* Surgical Difficulty Index */}
                      <Grid item xs={12} md={6}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="subtitle2" color="text.secondary">Surgical Difficulty Index</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                              <Typography variant="h3" sx={{ color: getScoreColor(riskAssessment.surgical_difficulty_index?.score || 0) }}>
                                {riskAssessment.surgical_difficulty_index?.score || 'N/A'}
                              </Typography>
                              <Typography variant="h6" color="text.secondary">/10</Typography>
                            </Box>
                            <Chip 
                              label={`${riskAssessment.surgical_difficulty_index?.complexity || 'Unknown'} Complexity`}
                              color={getRiskColor(riskAssessment.surgical_difficulty_index?.complexity)}
                              sx={{ mt: 1 }}
                            />
                            <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic' }}>
                              {riskAssessment.surgical_difficulty_index?.recommendation}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* Factors */}
                      {riskAssessment.surgical_difficulty_index?.factors && (
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" gutterBottom>Contributing Factors</Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {riskAssessment.surgical_difficulty_index.factors.map((factor, idx) => (
                              <Chip key={idx} label={factor} size="small" variant="outlined" />
                            ))}
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                  ) : (
                    <Alert severity="info">Risk assessment data unavailable</Alert>
                  )}
                </AccordionDetails>
              </Accordion>

              {/* Recovery Prediction */}
              <Accordion defaultExpanded>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <TimelineIcon sx={{ mr: 1 }} color="warning" />
                  <Typography variant="h6">Recovery Forecast</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {recoveryPrediction?.predictions ? (
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Milestone</TableCell>
                            <TableCell>Predicted Timeline</TableCell>
                            <TableCell>95% Confidence Interval</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CheckIcon color="success" fontSize="small" />
                                Urinary Continence
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography fontWeight="bold">
                                {recoveryPrediction.predictions.continence?.predicted_months} months
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {recoveryPrediction.predictions.continence?.ci_lower_weeks}-{recoveryPrediction.predictions.continence?.ci_upper_weeks} weeks
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {nerveSparing ? <CheckIcon color="success" fontSize="small" /> : <InfoIcon color="disabled" fontSize="small" />}
                                Erectile Function
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography fontWeight="bold">
                                {recoveryPrediction.predictions.potency?.predicted_months 
                                  ? `${recoveryPrediction.predictions.potency.predicted_months} months`
                                  : 'N/A (Non nerve-sparing)'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {recoveryPrediction.predictions.potency?.ci_lower_months
                                ? `${recoveryPrediction.predictions.potency.ci_lower_months}-${recoveryPrediction.predictions.potency.ci_upper_months} months`
                                : 'N/A'}
                            </TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CheckIcon color="primary" fontSize="small" />
                                PSA Nadir
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography fontWeight="bold">
                                {recoveryPrediction.predictions.psa_nadir?.expected_weeks} weeks
                              </Typography>
                            </TableCell>
                            <TableCell>
                              Target: {recoveryPrediction.predictions.psa_nadir?.target_value}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <Alert severity="info">Recovery prediction data unavailable</Alert>
                  )}
                </AccordionDetails>
              </Accordion>

              {/* Download Card */}
              <Card sx={{ mt: 2, background: 'linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%)' }}>
                <CardContent>
                  <Grid container alignItems="center" spacing={2}>
                    <Grid item xs={12} md={8}>
                      <Typography variant="h6" gutterBottom>
                        Ready to Generate Report
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        The Surgical Intelligence Report will include all analytics shown above, 
                        formatted as a professional clinical summary suitable for patient charts, 
                        conferences, or offline reference.
                      </Typography>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Button
                        variant="contained"
                        size="large"
                        fullWidth
                        startIcon={generating ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
                        onClick={handleDownloadReport}
                        disabled={generating}
                        sx={{ py: 2 }}
                      >
                        {generating ? 'Generating...' : 'Download PDF'}
                      </Button>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            </Box>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default ClinicalReports;
