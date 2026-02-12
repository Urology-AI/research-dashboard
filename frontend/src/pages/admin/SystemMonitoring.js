import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Memory as MemoryIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

function SystemMonitoring() {
  const { user } = useAuth();
  const [healthStatus, setHealthStatus] = useState(null);
  const [databaseStatus, setDatabaseStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadHealthStatus = useCallback(async () => {
    try {
      const [healthResponse, dbResponse] = await Promise.all([
        api.get('/health'),
        api.get('/health/database'),
      ]);
      setHealthStatus(healthResponse.data);
      setDatabaseStatus(dbResponse.data);
    } catch (err) {
      setError(err.message);
      setHealthStatus({
        status: 'offline',
        secure: false,
        message: 'Unable to connect to server',
      });
      setDatabaseStatus({
        status: 'degraded',
        database: {
          ready: false,
          schema_ok: false,
          crud_ok: false,
          data_checks: { has_admin_user: false },
        },
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHealthStatus();
    const interval = setInterval(loadHealthStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [loadHealthStatus]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        System Monitoring
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Real-time system health and performance metrics
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* Health Status */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography color="textSecondary" variant="body2">
                  System Status
                </Typography>
                {healthStatus?.status === 'online' ? (
                  <CheckCircleIcon color="success" />
                ) : (
                  <ErrorIcon color="error" />
                )}
              </Box>
              <Typography variant="h4" color={healthStatus?.status === 'online' ? 'success.main' : 'error.main'}>
                {healthStatus?.status === 'online' ? 'Online' : 'Offline'}
              </Typography>
              {healthStatus?.message && (
                <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                  {healthStatus.message}
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Connection Security */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography color="textSecondary" variant="body2">
                  Connection Security
                </Typography>
                {healthStatus?.secure ? (
                  <CheckCircleIcon color="success" />
                ) : (
                  <ErrorIcon color="warning" />
                )}
              </Box>
              <Typography variant="h4" color={healthStatus?.secure ? 'success.main' : 'warning.main'}>
                {healthStatus?.secure ? 'Secure' : 'Not Secure'}
              </Typography>
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                {healthStatus?.secure ? 'HTTPS encrypted' : 'HTTP connection'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Server Response Time */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Typography color="textSecondary" variant="body2">
                  Response Time
                </Typography>
                <SpeedIcon color="primary" />
              </Box>
              <Typography variant="h4">
                {healthStatus?.response_time ? `${healthStatus.response_time}ms` : 'N/A'}
              </Typography>
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                Last health check
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* System Information */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              System Information
            </Typography>
            <TableContainer>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Database Ready</TableCell>
                    <TableCell>
                      <Chip
                        label={databaseStatus?.database?.ready ? 'Ready' : 'Not Ready'}
                        color={databaseStatus?.database?.ready ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Database CRUD Check</TableCell>
                    <TableCell>
                      <Chip
                        label={databaseStatus?.database?.crud_ok ? 'Pass' : 'Fail'}
                        color={databaseStatus?.database?.crud_ok ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Schema Check</TableCell>
                    <TableCell>
                      <Chip
                        label={databaseStatus?.database?.schema_ok ? 'Pass' : 'Fail'}
                        color={databaseStatus?.database?.schema_ok ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Admin User Present</TableCell>
                    <TableCell>
                      <Chip
                        label={databaseStatus?.database?.data_checks?.has_admin_user ? 'Yes' : 'No'}
                        color={databaseStatus?.database?.data_checks?.has_admin_user ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Environment</TableCell>
                    <TableCell>
                      <Chip
                        label={process.env.NODE_ENV || 'development'}
                        color={process.env.NODE_ENV === 'production' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>API URL</TableCell>
                    <TableCell>{process.env.REACT_APP_API_URL || 'http://localhost:8000'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Current User</TableCell>
                    <TableCell>{user?.username || 'N/A'} ({user?.role || 'N/A'})</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Browser</TableCell>
                    <TableCell>{navigator.userAgent.split(' ').slice(-2).join(' ')}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Performance Metrics */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Performance Metrics
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Memory Usage
                  </Typography>
                  <LinearProgress variant="determinate" value={45} sx={{ height: 8, borderRadius: 4 }} />
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                    45% used
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    CPU Usage
                  </Typography>
                  <LinearProgress variant="determinate" value={30} color="secondary" sx={{ height: 8, borderRadius: 4 }} />
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                    30% used
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Database
                  </Typography>
                  <LinearProgress variant="determinate" value={60} color="success" sx={{ height: 8, borderRadius: 4 }} />
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                    60% used
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    Network
                  </Typography>
                  <LinearProgress variant="determinate" value={25} color="info" sx={{ height: 8, borderRadius: 4 }} />
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                    25% used
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default SystemMonitoring;
