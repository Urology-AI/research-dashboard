import React, { useEffect, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { getDataQualityAnalysis } from '../services/api';

function DataQuality() {
  const [qualityData, setQualityData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadQualityData();
  }, []);

  const loadQualityData = async () => {
    try {
      setLoading(true);
      const data = await getDataQualityAnalysis();
      setQualityData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">Error loading data quality analysis: {error}</Alert>;
  }

  if (!qualityData) {
    return <Alert severity="info">No data quality information available</Alert>;
  }

  const getQualityColor = (score) => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    return 'error';
  };

  const getQualityIcon = (score) => {
    if (score >= 90) return <CheckCircleIcon color="success" />;
    if (score >= 70) return <WarningIcon color="warning" />;
    return <ErrorIcon color="error" />;
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Data Quality Dashboard
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Assess cohort data quality — completeness, outliers, consistency — before analysis
        </Typography>
      </Box>

      {/* Overall Quality Score */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">Overall Quality Score</Typography>
                {getQualityIcon(qualityData.overall_quality_score)}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h3" color={`${getQualityColor(qualityData.overall_quality_score)}.main`}>
                  {qualityData.overall_quality_score.toFixed(1)}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={qualityData.overall_quality_score}
                  sx={{ flex: 1, height: 10, borderRadius: 5 }}
                  color={getQualityColor(qualityData.overall_quality_score)}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Patients
              </Typography>
              <Typography variant="h4">{qualityData.total_patients}</Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Data Completeness: {qualityData.summary.data_completeness.toFixed(1)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Total Issues
              </Typography>
              <Typography variant="h4" color="error.main">
                {qualityData.summary.total_issues}
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                {qualityData.duplicates.count} duplicates, {qualityData.consistency_issues.length} consistency issues
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Data Completeness */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Data Completeness
        </Typography>
        <Grid container spacing={2}>
          {Object.entries(qualityData.completeness).map(([field, percentage]) => {
            const missing = qualityData.missing_data[field];
            return (
              <Grid item xs={12} sm={6} md={4} key={field}>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">
                      {field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Typography>
                    <Typography variant="body2" fontWeight={600}>
                      {percentage.toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={percentage}
                    sx={{ height: 8, borderRadius: 4 }}
                    color={percentage >= 90 ? 'success' : percentage >= 70 ? 'warning' : 'error'}
                  />
                  {missing > 0 && (
                    <Typography variant="caption" color="textSecondary">
                      {missing} missing
                    </Typography>
                  )}
                </Box>
              </Grid>
            );
          })}
        </Grid>
      </Paper>

      {/* Duplicates */}
      {qualityData.duplicates.count > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Duplicate Records ({qualityData.duplicates.count})
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>MRN</TableCell>
                  <TableCell>Count</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {qualityData.duplicates.details.map((dup, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{dup.mrn}</TableCell>
                    <TableCell>
                      <Chip label={dup.count} color="error" size="small" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Outliers */}
      {qualityData.outliers.count > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Outliers ({qualityData.outliers.count})
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>MRN</TableCell>
                  <TableCell>Name</TableCell>
                  <TableCell>PSA Level</TableCell>
                  <TableCell>Reason</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {qualityData.outliers.details.map((outlier, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{outlier.mrn}</TableCell>
                    <TableCell>{outlier.name || 'N/A'}</TableCell>
                    <TableCell>{outlier.psa_level}</TableCell>
                    <TableCell>
                      <Chip
                        label={outlier.reason}
                        size="small"
                        color="warning"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Consistency Issues */}
      {qualityData.consistency_issues.length > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Consistency Issues
          </Typography>
          <Grid container spacing={2}>
            {qualityData.consistency_issues.map((issue, idx) => (
              <Grid item xs={12} sm={6} md={4} key={idx}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <ErrorIcon color="error" />
                      <Typography variant="subtitle1" fontWeight={600}>
                        {issue.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Typography>
                    </Box>
                    <Typography variant="h6" color="error.main">
                      {issue.count}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {issue.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      )}
    </Box>
  );
}

export default DataQuality;
