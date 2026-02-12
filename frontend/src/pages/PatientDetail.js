import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
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
  Button,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  FileDownload as FileDownloadIcon,
  Print as PrintIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';
import {
  getPatient,
  getPatientProcedures,
  getPatientLabResults,
  getPSATrends,
  exportPatientSummary,
  downloadSurgicalIntelligenceReport,
} from '../services/api';
import PSATrendChart from '../components/PSATrendChart';
import PatientTimeline from '../components/PatientTimeline';
import { printPatientSummary } from '../utils/print';

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [procedures, setProcedures] = useState([]);
  const [labResults, setLabResults] = useState([]);
  const [psaTrends, setPsaTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    loadPatientData();
  }, [id]);

  const loadPatientData = async () => {
    try {
      setLoading(true);
      const [patientData, proceduresData, labResultsData, trendsData] = await Promise.all([
        getPatient(id),
        getPatientProcedures(id),
        getPatientLabResults(id),
        getPSATrends(id),
      ]);
      setPatient(patientData);
      setProcedures(proceduresData);
      setLabResults(labResultsData);
      setPsaTrends(trendsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !patient) {
    return <Alert severity="error">Error loading patient: {error || 'Patient not found'}</Alert>;
  }

  const getRiskChip = () => {
    if (patient.gleason_score >= 8 || patient.psa_level > 20) {
      return <Chip label="High Risk" color="error" />;
    }
    if (patient.gleason_score <= 6 && patient.psa_level < 10) {
      return <Chip label="Low Risk" color="success" />;
    }
    return <Chip label="Intermediate Risk" color="warning" />;
  };

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Box display="flex" alignItems="center">
          <ArrowBackIcon
            sx={{ cursor: 'pointer', mr: 1 }}
            onClick={() => navigate('/patients')}
          />
          <Typography variant="h4">
            {patient.first_name} {patient.last_name}
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={() => {
              printPatientSummary(patient, procedures, labResults, []);
            }}
          >
            Print Summary
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={async () => {
              try {
                const blob = await exportPatientSummary(id);
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `patient_${patient.mrn}_summary_${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
              } catch (err) {
                setError(err.message);
              }
            }}
          >
            Export Summary
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PdfIcon />}
            onClick={async () => {
              try {
                const blob = await downloadSurgicalIntelligenceReport(id);
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Surgical_Intelligence_Report_${patient.mrn}_${new Date().toISOString().split('T')[0]}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
              } catch (err) {
                setError(err.message || 'Failed to generate report');
              }
            }}
          >
            Surgical Intelligence PDF
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Patient Information
              </Typography>
              <Typography variant="body2" color="textSecondary">
                MRN: {patient.mrn}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Age: {patient.age || 'N/A'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Gender: {patient.gender}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Date of Birth: {patient.date_of_birth ? (typeof patient.date_of_birth === 'string' ? patient.date_of_birth : new Date(patient.date_of_birth).toLocaleDateString()) : 'N/A'}
              </Typography>
              {patient.phone && (
                <Typography variant="body2" color="textSecondary">
                  Phone: {patient.phone}
                </Typography>
              )}
              {patient.email && (
                <Typography variant="body2" color="textSecondary">
                  Email: {patient.email}
                </Typography>
              )}
              {patient.tags && Array.isArray(patient.tags) && patient.tags.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 1 }}>
                    Tags:
                  </Typography>
                  <Box display="flex" gap={0.5} flexWrap="wrap">
                    {patient.tags.map((tag) => (
                      <Chip
                        key={tag.id || tag}
                        label={tag.name || tag}
                        size="small"
                        sx={{ bgcolor: tag.color || '#1976d2', color: 'white' }}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Clinical Data
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Diagnosis: {patient.diagnosis || 'N/A'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Gleason Score: {patient.gleason_score || 'N/A'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                PSA Level: {patient.psa_level ? `${patient.psa_level} ng/mL` : 'N/A'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Clinical Stage: {patient.clinical_stage || 'N/A'}
              </Typography>
              <Box sx={{ mt: 2 }}>{getRiskChip()}</Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Demographics
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Race: {patient.race || 'N/A'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Ethnicity: {patient.ethnicity || 'N/A'}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Insurance: {patient.insurance || 'N/A'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {patient.custom_fields && typeof patient.custom_fields === 'object' && !Array.isArray(patient.custom_fields) && Object.keys(patient.custom_fields).length > 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Custom Fields
                </Typography>
                <Grid container spacing={2}>
                  {Object.entries(patient.custom_fields).map(([key, value]) => (
                    <Grid item xs={12} sm={6} md={4} key={key}>
                      <Typography variant="body2" color="textSecondary">
                        <strong>{key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong> {value !== null && value !== undefined ? String(value) : 'N/A'}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        <Grid item xs={12}>
          <Paper>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="Timeline" />
              <Tab label="PSA Trends" />
              <Tab label="Procedures" />
              <Tab label="Lab Results" />
            </Tabs>

            <TabPanel value={tabValue} index={0}>
              <PatientTimeline
                patientId={parseInt(id)}
                procedures={procedures}
                labResults={labResults}
              />
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              {psaTrends && psaTrends.trends && psaTrends.trends.length > 0 ? (
                <PSATrendChart trends={psaTrends.trends} />
              ) : (
                <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', py: 4 }}>
                  No PSA trend data available
                </Typography>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Provider</TableCell>
                      <TableCell>Facility</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {procedures.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          No procedures found
                        </TableCell>
                      </TableRow>
                    ) : (
                      procedures.map((proc) => (
                        <TableRow key={proc.id}>
                          <TableCell>
                            {new Date(proc.procedure_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{proc.procedure_type || 'N/A'}</TableCell>
                          <TableCell>{proc.provider || 'N/A'}</TableCell>
                          <TableCell>{proc.facility || 'N/A'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Test Type</TableCell>
                      <TableCell>Value</TableCell>
                      <TableCell>Unit</TableCell>
                      <TableCell>Reference Range</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {labResults.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          No lab results found
                        </TableCell>
                      </TableRow>
                    ) : (
                      labResults.map((lab) => (
                        <TableRow key={lab.id}>
                          <TableCell>
                            {new Date(lab.test_date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{lab.test_type}</TableCell>
                          <TableCell>{lab.test_value || 'N/A'}</TableCell>
                          <TableCell>{lab.test_unit || 'N/A'}</TableCell>
                          <TableCell>{lab.reference_range || 'N/A'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </TabPanel>

          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default PatientDetail;
