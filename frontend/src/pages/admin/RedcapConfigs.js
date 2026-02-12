import React, { useEffect, useState } from 'react';
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
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayArrowIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import api from '../../services/api';

function RedcapConfigs() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [testingConfig, setTestingConfig] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    redcap_url: '',
    api_token: '',
    description: '',
    is_active: true,
  });

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/redcap-configs');
      setConfigs(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (config = null) => {
    if (config) {
      setEditingConfig(config);
      setFormData({
        name: config.name,
        redcap_url: config.redcap_url,
        api_token: '', // Never show existing token
        description: config.description || '',
        is_active: config.is_active,
      });
    } else {
      setEditingConfig(null);
      setFormData({
        name: '',
        redcap_url: '',
        api_token: '',
        description: '',
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingConfig(null);
    setTestResult(null);
  };

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.redcap_url) {
        setError('Name and REDCap URL are required');
        return;
      }
      if (!editingConfig && !formData.api_token) {
        setError('API token is required for new configurations');
        return;
      }

      if (editingConfig) {
        await api.put(`/api/admin/redcap-configs/${editingConfig.id}`, formData);
      } else {
        await api.post('/api/admin/redcap-configs', formData);
      }
      handleCloseDialog();
      loadConfigs();
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    }
  };

  const handleDelete = async (configId) => {
    if (!window.confirm('Are you sure you want to delete this REDCap configuration?')) {
      return;
    }
    try {
      await api.delete(`/api/admin/redcap-configs/${configId}`);
      loadConfigs();
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    }
  };

  const handleTest = async (configId) => {
    try {
      setTestingConfig(configId);
      setTestResult(null);
      const response = await api.post(`/api/admin/redcap-configs/${configId}/test`);
      setTestResult({ success: true, message: response.data.message });
      loadConfigs(); // Refresh to update last_used and usage_count
    } catch (err) {
      setTestResult({
        success: false,
        message: err.response?.data?.detail || err.message,
      });
    } finally {
      setTestingConfig(null);
    }
  };

  const handleIngest = async (configId) => {
    if (!window.confirm('This will import data from REDCap. Continue?')) {
      return;
    }
    try {
      setError(null);
      const response = await api.post(`/api/admin/redcap-configs/${configId}/ingest`);
      alert(`Success! ${response.data.patients_added} patients added.`);
      loadConfigs();
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">REDCap Configurations</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Configuration
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {testResult && (
        <Alert
          severity={testResult.success ? 'success' : 'error'}
          onClose={() => setTestResult(null)}
          sx={{ mb: 2 }}
        >
          {testResult.message}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>REDCap URL</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Usage Count</TableCell>
              <TableCell>Last Used</TableCell>
              <TableCell>Created By</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {configs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="textSecondary">
                    No REDCap configurations found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              configs.map((config) => (
                <TableRow key={config.id}>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {config.name}
                    </Typography>
                    {config.description && (
                      <Typography variant="caption" color="textSecondary">
                        {config.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                      {config.redcap_url}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={config.is_active ? 'Active' : 'Inactive'}
                      color={config.is_active ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{config.usage_count || 0}</TableCell>
                  <TableCell>
                    {config.last_used
                      ? new Date(config.last_used).toLocaleString()
                      : 'Never'}
                  </TableCell>
                  <TableCell>{config.created_by_username || 'N/A'}</TableCell>
                  <TableCell>
                    <Tooltip title="Test Connection">
                      <IconButton
                        size="small"
                        onClick={() => handleTest(config.id)}
                        disabled={testingConfig === config.id}
                        color="primary"
                      >
                        {testingConfig === config.id ? (
                          <CircularProgress size={20} />
                        ) : (
                          <PlayArrowIcon />
                        )}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Ingest Data">
                      <IconButton
                        size="small"
                        onClick={() => handleIngest(config.id)}
                        disabled={!config.is_active}
                        color="success"
                      >
                        <CheckCircleIcon />
                      </IconButton>
                    </Tooltip>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(config)}
                      color="primary"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(config.id)}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingConfig ? 'Edit REDCap Configuration' : 'Add REDCap Configuration'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Configuration Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="REDCap URL"
            value={formData.redcap_url}
            onChange={(e) => setFormData({ ...formData, redcap_url: e.target.value })}
            margin="normal"
            required
            placeholder="https://redcap.example.edu/api/"
            helperText="Full URL to REDCap API endpoint"
          />
          <TextField
            fullWidth
            label={editingConfig ? 'New API Token (leave blank to keep current)' : 'API Token'}
            type="password"
            value={formData.api_token}
            onChange={(e) => setFormData({ ...formData, api_token: e.target.value })}
            margin="normal"
            required={!editingConfig}
            helperText="Token will be encrypted before storage"
          />
          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            margin="normal"
            multiline
            rows={2}
          />
          <Box sx={{ mt: 2 }}>
            <Chip
              label={formData.is_active ? 'Active' : 'Inactive'}
              color={formData.is_active ? 'success' : 'default'}
              onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
              sx={{ cursor: 'pointer' }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained">
            {editingConfig ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default RedcapConfigs;
