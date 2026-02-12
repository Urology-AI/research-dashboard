import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  Tabs,
  Tab,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Insights as InsightsIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
} from 'recharts';
import {
  getHighRiskPatients,
  getPSADistribution,
  getGleasonDistribution,
  getTrendAnalysis,
} from '../services/api';

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function DataInsights() {
  const [risingPSA, setRisingPSA] = useState([]);
  const [highRisk, setHighRisk] = useState([]);
  const [psaDistribution, setPsaDistribution] = useState([]);
  const [gleasonDistribution, setGleasonDistribution] = useState([]);
  const [psaTrends, setPsaTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      setLoading(true);
      // Calculate rising PSA from analytics data instead of alerts endpoint
      const [riskPatients, psaDist, gleasonDist, trends] = await Promise.all([
        getHighRiskPatients(),
        getPSADistribution(),
        getGleasonDistribution(),
        getTrendAnalysis('psa', 365),
      ]);
      
      // Calculate rising PSA cases from high-risk patients
      // Rising PSA = patients with PSA > 20 (high-risk threshold)
      const risingPSACases = (riskPatients || []).filter(p => p.psa_level && p.psa_level > 20).map(p => ({
        patient_id: p.id,
        patient_name: p.name || 'Unknown',
        patient_mrn: p.mrn,
        current_psa: p.psa_level,
        threshold: '20.00',
      }));
      
      setRisingPSA(risingPSACases);
      setHighRisk(riskPatients || []);
      setPsaDistribution(psaDist);
      setGleasonDistribution(gleasonDist);
      setPsaTrends(trends);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistical outliers
  const calculateOutliers = () => {
    if (psaDistribution.length === 0) return [];
    
    const allPSA = psaDistribution.flatMap(d => 
      Array(d.count).fill(parseFloat(d.range.split('-')[0]) || 0)
    );
    
    if (allPSA.length === 0) return [];
    
    const mean = allPSA.reduce((a, b) => a + b, 0) / allPSA.length;
    const variance = allPSA.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / allPSA.length;
    const stdDev = Math.sqrt(variance);
    
    return {
      mean: mean.toFixed(2),
      stdDev: stdDev.toFixed(2),
      outliers: allPSA.filter(val => Math.abs(val - mean) > 2 * stdDev).length,
    };
  };

  const outliers = calculateOutliers();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Error loading insights: {error}</Alert>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Data Insights & Anomalies
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Explore anomalies and patterns in your cohort — rising PSA, high-risk, outliers
          </Typography>
        </Box>
        <Button variant="outlined" onClick={loadInsights}>
          Refresh
        </Button>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Rising PSA Cases
              </Typography>
              <Typography variant="h4">{risingPSA.length}</Typography>
              <Typography variant="caption" color="textSecondary">
                Last 90 days
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                High Risk Patients
              </Typography>
              <Typography variant="h4" color="error">
                {highRisk.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Statistical Outliers
              </Typography>
              <Typography variant="h4" color="warning.main">
                {outliers.outliers}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                >2σ from mean
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Mean PSA
              </Typography>
              <Typography variant="h4">
                {outliers.mean} ng/mL
              </Typography>
              <Typography variant="caption" color="textSecondary">
                σ = {outliers.stdDev}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Patterns & Trends" />
          <Tab label="Anomalies" />
          <Tab label="Risk Analysis" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  PSA Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={psaDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#1976d2" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Gleason Score Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={gleasonDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="score" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#9c27b0" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  PSA Trends Over Time
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={psaTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="average" fill="#1976d2" name="Average PSA" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Rising PSA Cases (Statistical Anomalies)
          </Typography>
          {risingPSA.length > 0 ? (
            <List>
              {risingPSA.slice(0, 20).map((alert, idx) => (
                <React.Fragment key={idx}>
                  <ListItem>
                    <TrendingUpIcon color="warning" sx={{ mr: 2 }} />
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1">
                            PSA Increased: {alert.increase?.toFixed(2) || 'N/A'} ng/mL
                            ({alert.percent_increase?.toFixed(1) || 'N/A'}% increase)
                          </Typography>
                          <Chip label="ANOMALY" size="small" color="warning" />
                        </Box>
                      }
                      secondary={
                        <Typography variant="body2" color="textSecondary">
                          {alert.patient_name || 'Unknown'} (MRN: {alert.mrn}) | 
                          Previous: {alert.previous_psa?.toFixed(2)} → Current: {alert.current_psa?.toFixed(2)} ng/mL
                          {alert.date && ` | Date: ${new Date(alert.date).toLocaleDateString()}`}
                        </Typography>
                      }
                    />
                  </ListItem>
                  {idx < Math.min(risingPSA.length, 20) - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                No significant PSA anomalies detected
              </Typography>
            </Box>
          )}
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            High Risk Patient Cohort
          </Typography>
          {highRisk.length > 0 ? (
            <List>
              {highRisk.slice(0, 20).map((patient, idx) => (
                <React.Fragment key={idx}>
                  <ListItem>
                    <WarningIcon color="error" sx={{ mr: 2 }} />
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="subtitle1">
                            {patient.name || 'Unknown'} (MRN: {patient.mrn})
                          </Typography>
                          <Chip label="HIGH RISK" size="small" color="error" />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="textSecondary">
                            Age: {patient.age || 'N/A'} | 
                            Gleason: {patient.gleason_score || 'N/A'} | 
                            PSA: {patient.psa_level ? patient.psa_level.toFixed(2) : 'N/A'} ng/mL | 
                            Stage: {patient.clinical_stage || 'N/A'}
                          </Typography>
                          {patient.risk_factors && patient.risk_factors.length > 0 && (
                            <Box display="flex" gap={0.5} flexWrap="wrap" sx={{ mt: 0.5 }}>
                              {patient.risk_factors.map((factor, i) => (
                                <Chip key={i} label={factor} size="small" variant="outlined" />
                              ))}
                            </Box>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  {idx < Math.min(highRisk.length, 20) - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="textSecondary">
                No high-risk patients identified
              </Typography>
            </Box>
          )}
        </TabPanel>
      </Paper>
    </Box>
  );
}

export default DataInsights;
