import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TextField,
  Button,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  History as HistoryIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import api from '../../services/api';

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [filters, setFilters] = useState({
    user_id: '',
    resource_type: '',
    action: '',
    days: 30,
  });
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filters.user_id) params.user_id = parseInt(filters.user_id);
      if (filters.resource_type) params.resource_type = filters.resource_type;
      if (filters.action) params.action = filters.action;
      
      const response = await api.get('/api/admin/audit', { params });
      setLogs(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  }, [filters.user_id, filters.resource_type, filters.action]);

  const loadSummary = useCallback(async () => {
    try {
      const response = await api.get('/api/admin/audit/summary', {
        params: { days: filters.days }
      });
      setSummary(response.data);
    } catch (err) {
      console.error('Error loading summary:', err);
    }
  }, [filters.days]);

  // Initial load on mount
  useEffect(() => {
    loadLogs();
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleApplyFilters = () => {
    loadLogs();
    loadSummary();
  };

  const handleViewDetails = (log) => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
  };

  const getActionColor = (action) => {
    if (action.includes('failed') || action.includes('error')) return 'error';
    if (action === 'login' || action === 'view') return 'success';
    if (action === 'create' || action === 'update') return 'info';
    if (action === 'delete') return 'warning';
    return 'default';
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  if (loading && logs.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <HistoryIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Audit Logs
          </Typography>
        </Box>
        <Typography variant="body1" color="textSecondary">
          HIPAA-compliant audit trail of all system access and PHI interactions
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Summary Statistics */}
      {summary && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {summary.summary.total_actions.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Actions ({summary.period_days} days)
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {summary.summary.successful_logins.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Successful Logins
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="error.main">
                {summary.summary.failed_logins.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Failed Logins
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">
                {summary.summary.patient_access_count.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Patient Access Events
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Filters
        </Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="User ID"
              type="number"
              value={filters.user_id}
              onChange={(e) => handleFilterChange('user_id', e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Resource Type</InputLabel>
              <Select
                value={filters.resource_type}
                onChange={(e) => handleFilterChange('resource_type', e.target.value)}
                label="Resource Type"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="patient">Patient</MenuItem>
                <MenuItem value="procedure">Procedure</MenuItem>
                <MenuItem value="lab_result">Lab Result</MenuItem>
                <MenuItem value="user">User</MenuItem>
                <MenuItem value="user_list">User List</MenuItem>
                <MenuItem value="data_upload">Data Upload</MenuItem>
                <MenuItem value="data_upload_list">Data Upload List</MenuItem>
                <MenuItem value="data_upload_records">Upload Records</MenuItem>
                <MenuItem value="data_upload_processing">Upload Processing</MenuItem>
                <MenuItem value="custom_field">Custom Field</MenuItem>
                <MenuItem value="custom_field_list">Custom Field List</MenuItem>
                <MenuItem value="authentication">Authentication</MenuItem>
                <MenuItem value="analytics_psa_trends">PSA Trends</MenuItem>
                <MenuItem value="analytics_high_risk">High Risk Patients</MenuItem>
                <MenuItem value="dashboard">Dashboard</MenuItem>
                <MenuItem value="backup">Backup</MenuItem>
                <MenuItem value="export">Export</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Action</InputLabel>
              <Select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                label="Action"
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="view">View</MenuItem>
                <MenuItem value="create">Create</MenuItem>
                <MenuItem value="update">Update</MenuItem>
                <MenuItem value="delete">Delete</MenuItem>
                <MenuItem value="login">Login</MenuItem>
                <MenuItem value="login_failed">Login Failed</MenuItem>
                <MenuItem value="logout">Logout</MenuItem>
                <MenuItem value="export">Export</MenuItem>
                <MenuItem value="search">Search</MenuItem>
                <MenuItem value="analyze">Analyze</MenuItem>
                <MenuItem value="compare">Compare</MenuItem>
                <MenuItem value="backup">Backup</MenuItem>
                <MenuItem value="restore">Restore</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<SearchIcon />}
                onClick={handleApplyFilters}
              >
                Apply
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => {
                  setFilters({ user_id: '', resource_type: '', action: '', days: 30 });
                  loadLogs();
                  loadSummary();
                }}
              >
                Reset
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Audit Log Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Timestamp</TableCell>
              <TableCell>User</TableCell>
              <TableCell>Action</TableCell>
              <TableCell>Resource</TableCell>
              <TableCell>Resource ID</TableCell>
              <TableCell>IP Address</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" color="textSecondary">
                    No audit logs found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell>{formatTimestamp(log.timestamp)}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {log.username}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      ID: {log.user_id}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={log.action}
                      size="small"
                      color={getActionColor(log.action)}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip label={log.resource_type} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{log.resource_id || 'N/A'}</TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {log.ip_address || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={log.success === 'true' ? 'Success' : 'Failed'}
                      size="small"
                      color={log.success === 'true' ? 'success' : 'error'}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      startIcon={<VisibilityIcon />}
                      onClick={() => handleViewDetails(log)}
                    >
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Audit Log Details</DialogTitle>
        <DialogContent>
          {selectedLog && (
            <Box sx={{ mt: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Timestamp</Typography>
                  <Typography variant="body1">{formatTimestamp(selectedLog.timestamp)}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">User</Typography>
                  <Typography variant="body1">{selectedLog.username} (ID: {selectedLog.user_id})</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Action</Typography>
                  <Typography variant="body1">{selectedLog.action}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Resource Type</Typography>
                  <Typography variant="body1">{selectedLog.resource_type}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">Resource ID</Typography>
                  <Typography variant="body1">{selectedLog.resource_id || 'N/A'}</Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="textSecondary">IP Address</Typography>
                  <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                    {selectedLog.ip_address || 'N/A'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">User Agent</Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                    {selectedLog.user_agent || 'N/A'}
                  </Typography>
                </Grid>
                {selectedLog.details && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">Details</Typography>
                    <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                      <pre style={{ margin: 0, fontSize: '0.875rem', whiteSpace: 'pre-wrap' }}>
                        {JSON.stringify(JSON.parse(selectedLog.details), null, 2)}
                      </pre>
                    </Paper>
                  </Grid>
                )}
                {selectedLog.error_message && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="textSecondary">Error Message</Typography>
                    <Alert severity="error" sx={{ mt: 1 }}>
                      {selectedLog.error_message}
                    </Alert>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default AuditLogs;
