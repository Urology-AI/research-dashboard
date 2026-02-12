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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Alert,
  CircularProgress,
  Chip,
  InputAdornment,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import api from '../../services/api';

function CustomFields() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [showInactive, setShowInactive] = useState(false);
  const [showOnlyCustom, setShowOnlyCustom] = useState(false);
  const [formData, setFormData] = useState({
    field_name: '',
    field_label: '',
    field_type: 'text',
    entity_type: 'patient',
    is_required: false,
    default_value: '',
    options: [],
    display_order: 0,
    is_active: true,
  });
  const [optionsText, setOptionsText] = useState('');

  useEffect(() => {
    loadFields();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive]);

  const loadFields = async () => {
    try {
      setLoading(true);
      const params = showInactive ? { include_inactive: true } : {};
      const response = await api.get('/api/admin/custom-fields', { params });
      // Ensure is_standard is set for all fields
      const fieldsWithStandard = response.data.map(field => ({
        ...field,
        is_standard: field.is_standard !== undefined ? field.is_standard : false
      }));
      setFields(fieldsWithStandard);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFields();
  }, [showInactive]);

  // Filter fields based on showOnlyCustom
  const displayedFields = showOnlyCustom 
    ? fields.filter(f => !f.is_standard)
    : fields;

  const handleOpenDialog = (field = null) => {
    // Don't allow editing standard fields
    if (field && field.is_standard) {
      setError('Standard fields cannot be edited. They are built-in system fields.');
      return;
    }
    
    if (field) {
      setEditingField(field);
      setFormData({
        field_name: field.field_name,
        field_label: field.field_label,
        field_type: field.field_type,
        entity_type: field.entity_type,
        is_required: field.is_required,
        default_value: field.default_value || '',
        options: field.options || [],
        display_order: field.display_order,
        is_active: field.is_active,
      });
      setOptionsText((field.options || []).join(', '));
    } else {
      setEditingField(null);
      setFormData({
        field_name: '',
        field_label: '',
        field_type: 'text',
        entity_type: 'patient',
        is_required: false,
        default_value: '',
        options: [],
        display_order: 0,
        is_active: true,
      });
      setOptionsText('');
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingField(null);
    setError(null);
    // Reset form
    setFormData({
      field_name: '',
      field_label: '',
      field_type: 'text',
      entity_type: 'patient',
      is_required: false,
      default_value: '',
      options: [],
      display_order: 0,
      is_active: true,
    });
    setOptionsText('');
  };

  const handleSave = async () => {
    try {
      setError(null);
      
      // Validate required fields
      if (!formData.field_name.trim()) {
        setError('Field name is required');
        return;
      }
      if (!formData.field_label.trim()) {
        setError('Field label is required');
        return;
      }

      const normalizedFieldName = formData.field_name.trim().toLowerCase().replace(/\s+/g, '_');
      
      const data = {
        ...formData,
        field_name: normalizedFieldName,
        options: formData.field_type === 'select' && optionsText
          ? optionsText.split(',').map(o => o.trim()).filter(o => o)
          : [],
      };

      if (editingField) {
        // Editing existing field - ensure field_name matches original
        data.field_name = editingField.field_name; // Keep original field_name (cannot be changed)
        await api.put(`/api/admin/custom-fields/${editingField.id}`, data);
      } else {
        // Creating new field - backend will check if it already exists
        await api.post('/api/admin/custom-fields', data);
      }
      handleCloseDialog();
      loadFields();
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to save field';
      setError(errorMessage);
      // Don't close dialog on error so user can fix it
    }
  };

  const handleDelete = async (fieldId) => {
    // Find the field to check if it's standard
    const field = fields.find(f => f.id === fieldId);
    if (field && field.is_standard) {
      setError('Standard fields cannot be deleted. They are built-in system fields.');
      return;
    }
    
    if (!window.confirm('Are you sure you want to deactivate this field? It will be hidden but data will be preserved.')) {
      return;
    }
    try {
      await api.delete(`/api/admin/custom-fields/${fieldId}`);
      loadFields();
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
        <Typography variant="h4">Field Definitions</Typography>
        <Box display="flex" gap={2} alignItems="center">
          <FormControlLabel
            control={
              <Switch
                checked={showOnlyCustom}
                onChange={(e) => setShowOnlyCustom(e.target.checked)}
              />
            }
            label="Custom Only"
          />
          <FormControlLabel
            control={
              <Switch
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
            }
            label="Show Inactive"
          />
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadFields}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => handleOpenDialog()}
          >
            Add New Field
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="body2" color="textSecondary" paragraph>
          <strong>Flexible Schema System:</strong> This page shows all available fields - both <strong>Standard</strong> (built-in) and <strong>Custom</strong> (user-defined).
          Standard fields are read-only and cannot be edited or deleted. Only MRN is required for patients - all other fields are optional and can be added/removed dynamically.
          Custom fields can be entered manually or uploaded via Excel/CSV.
        </Typography>
        <Typography variant="body2" color="textSecondary">
          <strong>Total Fields:</strong> {fields.length} ({fields.filter(f => f.is_standard).length} standard, {fields.filter(f => !f.is_standard).length} custom)
        </Typography>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Field Name</TableCell>
              <TableCell>Label</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Entity</TableCell>
              <TableCell>Field Source</TableCell>
              <TableCell>Required</TableCell>
              <TableCell>Order</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayedFields.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography variant="body2" color="textSecondary">
                    {showOnlyCustom 
                      ? "No custom fields found. Click 'Add New Field' to create one."
                      : "No fields found. Standard fields are shown automatically. Click 'Add New Field' to create custom fields."}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              displayedFields.map((field) => (
                <TableRow 
                  key={field.id || `standard-${field.entity_type}-${field.field_name}`}
                  sx={{ 
                    opacity: field.is_active !== false ? 1 : 0.6,
                    backgroundColor: editingField?.id === field.id ? 'action.selected' : 'inherit',
                    '&:hover': {
                      backgroundColor: field.is_standard ? 'action.hover' : 'inherit'
                    }
                  }}
                >
                  <TableCell>
                    <code>{field.field_name}</code>
                    {editingField?.id === field.id && (
                      <Chip label="Currently Editing" size="small" color="info" sx={{ ml: 1 }} />
                    )}
                  </TableCell>
                  <TableCell>{field.field_label}</TableCell>
                  <TableCell>
                    <Chip label={field.field_type} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip label={field.entity_type} size="small" color="primary" />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={field.is_standard ? "Standard" : "Custom"} 
                      size="small" 
                      color={field.is_standard ? "default" : "secondary"}
                      variant={field.is_standard ? "outlined" : "filled"}
                    />
                  </TableCell>
                  <TableCell>
                    {field.is_required ? (
                      <Chip label="Yes" color="error" size="small" />
                    ) : (
                      <Chip label="No" size="small" />
                    )}
                  </TableCell>
                  <TableCell>{field.display_order}</TableCell>
                  <TableCell>
                    {field.is_standard ? (
                      <Chip label="Always Active" color="success" size="small" />
                    ) : (
                      <Chip
                        label={field.is_active ? 'Active' : 'Inactive'}
                        color={field.is_active ? 'success' : 'default'}
                        size="small"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    {field.is_standard ? (
                      <Typography variant="body2" color="textSecondary" sx={{ fontStyle: 'italic' }}>
                        Read-only
                      </Typography>
                    ) : (
                      <>
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDialog(field)}
                          color="primary"
                          title="Edit this custom field"
                        >
                          <EditIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(field.id)}
                          color="error"
                          title={field.is_active ? "Deactivate field" : "Field already inactive"}
                          disabled={!field.is_active}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingField ? (
            <>
              Edit Custom Field
              <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                Field Name: <code>{editingField.field_name}</code> (cannot be changed)
              </Typography>
            </>
          ) : (
            'Add New Custom Field'
          )}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          <TextField
            fullWidth
            label="Field Name (internal)"
            value={formData.field_name}
            onChange={(e) => setFormData({ ...formData, field_name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
            margin="normal"
            required
            helperText={
              editingField 
                ? "Field name cannot be changed (it's the unique identifier). Create a new field if you need a different name." 
                : "Internal name (e.g., tumor_size, biomarker_1). Must be unique. Cannot be changed after creation."
            }
            disabled={!!editingField}
            error={!formData.field_name.trim()}
            InputProps={{
              readOnly: !!editingField,
              startAdornment: editingField && (
                <InputAdornment position="start">
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '1.2rem' }}>
                    🔒
                  </Typography>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            fullWidth
            label="Field Label (display)"
            value={formData.field_label}
            onChange={(e) => setFormData({ ...formData, field_label: e.target.value })}
            margin="normal"
            required
            helperText="Display name shown in UI"
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Field Type</InputLabel>
            <Select
              value={formData.field_type}
              onChange={(e) => setFormData({ ...formData, field_type: e.target.value })}
              label="Field Type"
            >
              <MenuItem value="text">Text</MenuItem>
              <MenuItem value="number">Number</MenuItem>
              <MenuItem value="date">Date</MenuItem>
              <MenuItem value="select">Select (Dropdown)</MenuItem>
              <MenuItem value="boolean">Boolean (Yes/No)</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Entity Type</InputLabel>
            <Select
              value={formData.entity_type}
              onChange={(e) => setFormData({ ...formData, entity_type: e.target.value })}
              label="Entity Type"
            >
              <MenuItem value="patient">Patient</MenuItem>
              <MenuItem value="procedure">Procedure</MenuItem>
              <MenuItem value="lab_result">Lab Result</MenuItem>
              <MenuItem value="follow_up">Follow-up</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              />
            }
            label="Active (visible in forms)"
            sx={{ mt: 2 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={formData.is_required}
                onChange={(e) => setFormData({ ...formData, is_required: e.target.checked })}
              />
            }
            label="Required Field"
            sx={{ mt: 1 }}
          />
          <TextField
            fullWidth
            label="Default Value"
            value={formData.default_value}
            onChange={(e) => setFormData({ ...formData, default_value: e.target.value })}
            margin="normal"
          />
          {formData.field_type === 'select' && (
            <TextField
              fullWidth
              label="Options (comma-separated)"
              value={optionsText}
              onChange={(e) => setOptionsText(e.target.value)}
              margin="normal"
              helperText="Enter options separated by commas (e.g., Option1, Option2, Option3)"
            />
          )}
          <TextField
            fullWidth
            label="Display Order"
            type="number"
            value={formData.display_order}
            onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
            margin="normal"
            helperText="Lower numbers appear first"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button 
            onClick={handleSave} 
            variant="contained"
            disabled={!formData.field_name.trim() || !formData.field_label.trim()}
          >
            {editingField ? 'Update Existing Field' : 'Create New Field'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default CustomFields;
