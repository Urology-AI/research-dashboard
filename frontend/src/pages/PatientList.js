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
  TextField,
  Typography,
  Button,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Stack,
  TablePagination,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import {
  Search as SearchIcon,
  Visibility as ViewIcon,
  FileDownload as FileDownloadIcon,
  CheckBox as CheckBoxIcon,
  CheckBoxOutlineBlank as CheckBoxOutlineBlankIcon,
} from '@mui/icons-material';
import { getPatients, exportPatientsCSV, exportPatientsExcel } from '../services/api';

function PatientList() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPatients, setSelectedPatients] = useState([]);
  const [filters, setFilters] = useState({
    age_min: '',
    age_max: '',
    diagnosis: '',
    gleason_score_min: '',
    gleason_score_max: '',
    psa_level_min: '',
    psa_level_max: '',
    gender: [],
    race: [],
    clinical_stage: [],
    date_from: '',
    date_to: '',
  });
  const [savedFilters, setSavedFilters] = useState([]);
  const [filterPresetName, setFilterPresetName] = useState('');
  const [showSaveFilter, setShowSaveFilter] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    loadPatients();
  }, [page, rowsPerPage]);

  useEffect(() => {
    // Reset to first page when filters change
    setPage(0);
    loadPatients();
  }, [filters]);

  const loadPatients = async () => {
    try {
      setLoading(true);
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).map(([key, value]) => {
          if (value === '' || value === null || (Array.isArray(value) && value.length === 0)) {
            return [key, null];
          }
          if (Array.isArray(value)) {
            return [key, value];
          }
          if (isNaN(value)) {
            return [key, value];
          }
          return [key, Number(value)];
        })
      );
      const skip = page * rowsPerPage;
      const data = await getPatients(cleanFilters, skip, rowsPerPage);
      setPatients(data);
      // Get total count from response
      setTotalCount(data._totalCount || data.length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleSearch = () => {
    loadPatients();
  };

  const handleSaveFilter = () => {
    if (!filterPresetName.trim()) {
      return;
    }
    const newPreset = {
      id: Date.now(),
      name: filterPresetName,
      filters: { ...filters },
    };
    const updated = [...savedFilters, newPreset];
    setSavedFilters(updated);
    localStorage.setItem('patient_filter_presets', JSON.stringify(updated));
    setFilterPresetName('');
    setShowSaveFilter(false);
  };

  const handleLoadFilter = (preset) => {
    setFilters(preset.filters);
    loadPatients();
  };

  const handleDeleteFilter = (presetId) => {
    const updated = savedFilters.filter(p => p.id !== presetId);
    setSavedFilters(updated);
    localStorage.setItem('patient_filter_presets', JSON.stringify(updated));
  };

  useEffect(() => {
    // Load saved filter presets from localStorage
    const saved = localStorage.getItem('patient_filter_presets');
    if (saved) {
      try {
        setSavedFilters(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading saved filters:', e);
      }
    }
  }, []);

  const handleExportCSV = async () => {
    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).map(([key, value]) => [
          key,
          value === '' ? null : (isNaN(value) ? value : Number(value)),
        ])
      );
      const blob = await exportPatientsCSV(cleanFilters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `patients_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleExportExcel = async () => {
    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).map(([key, value]) => [
          key,
          value === '' ? null : (isNaN(value) ? value : Number(value)),
        ])
      );
      const blob = await exportPatientsExcel(cleanFilters);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `patients_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err.message);
    }
  };

  const getRiskChip = (patient) => {
    if (patient.gleason_score >= 8 || patient.psa_level > 20) {
      return <Chip label="High Risk" color="error" size="small" />;
    }
    if (patient.gleason_score <= 6 && patient.psa_level < 10) {
      return <Chip label="Low Risk" color="success" size="small" />;
    }
    return <Chip label="Intermediate" color="warning" size="small" />;
  };

  if (loading && patients.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h4">
            Patient Data Explorer
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Explore patients in your cohort — use filters to align with your research question
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportCSV}
          >
            Export CSV
          </Button>
          <Button
            variant="outlined"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportExcel}
          >
            Export Excel
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Filters</Typography>
          <Box display="flex" gap={1}>
            {savedFilters.length > 0 && (
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Saved Filters</InputLabel>
                <Select
                  value=""
                  label="Saved Filters"
                  onChange={(e) => {
                    const preset = savedFilters.find(p => p.id === e.target.value);
                    if (preset) handleLoadFilter(preset);
                  }}
                >
                  {savedFilters.map((preset) => (
                    <MenuItem key={preset.id} value={preset.id}>
                      {preset.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <Button
              variant="outlined"
              size="small"
              onClick={() => setShowSaveFilter(!showSaveFilter)}
            >
              {showSaveFilter ? 'Cancel' : 'Save Filter'}
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClick={() => {
                setFilters({
                  age_min: '',
                  age_max: '',
                  diagnosis: '',
                  gleason_score_min: '',
                  gleason_score_max: '',
                  psa_level_min: '',
                  psa_level_max: '',
                  gender: [],
                  race: [],
                  clinical_stage: [],
                  date_from: '',
                  date_to: '',
                });
                loadPatients();
              }}
            >
              Clear All
            </Button>
          </Box>
        </Box>

        {showSaveFilter && (
          <Box sx={{ mb: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  label="Filter Preset Name"
                  value={filterPresetName}
                  onChange={(e) => setFilterPresetName(e.target.value)}
                  placeholder="e.g., High Risk Patients"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Button
                  variant="contained"
                  onClick={handleSaveFilter}
                  disabled={!filterPresetName.trim()}
                >
                  Save Preset
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}

        {savedFilters.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="textSecondary" sx={{ mb: 1, display: 'block' }}>
              Quick Filters:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {savedFilters.map((preset) => (
                <Chip
                  key={preset.id}
                  label={preset.name}
                  onClick={() => handleLoadFilter(preset)}
                  onDelete={() => handleDeleteFilter(preset.id)}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Stack>
          </Box>
        )}

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Age Min"
              type="number"
              value={filters.age_min}
              onChange={(e) => handleFilterChange('age_min', e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Age Max"
              type="number"
              value={filters.age_max}
              onChange={(e) => handleFilterChange('age_max', e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Gleason Score Min"
              type="number"
              value={filters.gleason_score_min}
              onChange={(e) => handleFilterChange('gleason_score_min', e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Gleason Score Max"
              type="number"
              value={filters.gleason_score_max}
              onChange={(e) => handleFilterChange('gleason_score_max', e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="PSA Level Min"
              type="number"
              value={filters.psa_level_min}
              onChange={(e) => handleFilterChange('psa_level_min', e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="PSA Level Max"
              type="number"
              value={filters.psa_level_max}
              onChange={(e) => handleFilterChange('psa_level_max', e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Diagnosis"
              value={filters.diagnosis}
              onChange={(e) => handleFilterChange('diagnosis', e.target.value)}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Autocomplete
              multiple
              options={['M', 'F', 'O']}
              getOptionLabel={(option) => option === 'M' ? 'Male' : option === 'F' ? 'Female' : 'Other'}
              value={filters.gender || []}
              onChange={(e, newValue) => handleFilterChange('gender', newValue)}
              renderInput={(params) => (
                <TextField {...params} label="Gender" size="small" />
              )}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Date From"
              type="date"
              value={filters.date_from}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Date To"
              type="date"
              value={filters.date_to}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="contained"
              startIcon={<SearchIcon />}
              onClick={handleSearch}
              sx={{ mt: 1 }}
              fullWidth
            >
              Search
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {selectedPatients.length > 0 && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'action.selected' }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {selectedPatients.length} patient(s) selected
            </Typography>
            <Box display="flex" gap={1}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  // Bulk export selected
                  const selectedData = patients.filter(p => selectedPatients.includes(p.id));
                  // Create CSV
                  const csv = [
                    ['MRN', 'First Name', 'Last Name', 'Age', 'Diagnosis', 'Gleason Score', 'PSA Level'].join(','),
                    ...selectedData.map(p => [
                      p.mrn,
                      p.first_name || '',
                      p.last_name || '',
                      p.age || '',
                      p.diagnosis || '',
                      p.gleason_score || '',
                      p.psa_level || '',
                    ].join(','))
                  ].join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `selected_patients_${new Date().toISOString().split('T')[0]}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                }}
              >
                Export Selected
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setSelectedPatients([])}
              >
                Clear Selection
              </Button>
            </Box>
          </Box>
        </Paper>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedPatients.length > 0 && selectedPatients.length < patients.length}
                  checked={patients.length > 0 && selectedPatients.length === patients.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedPatients(patients.map(p => p.id));
                    } else {
                      setSelectedPatients([]);
                    }
                  }}
                />
              </TableCell>
              <TableCell>MRN</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Age</TableCell>
              <TableCell>Diagnosis</TableCell>
              <TableCell>Gleason Score</TableCell>
              <TableCell>PSA Level</TableCell>
              <TableCell>Risk</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {patients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} align="center">
                  <Typography variant="body2" color="textSecondary">
                    No patients found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              patients.map((patient) => (
                <TableRow key={patient.id} hover selected={selectedPatients.includes(patient.id)}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedPatients.includes(patient.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPatients([...selectedPatients, patient.id]);
                        } else {
                          setSelectedPatients(selectedPatients.filter(id => id !== patient.id));
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>{patient.mrn}</TableCell>
                  <TableCell>
                    {patient.first_name} {patient.last_name}
                  </TableCell>
                  <TableCell>{patient.age || 'N/A'}</TableCell>
                  <TableCell>{patient.diagnosis || 'N/A'}</TableCell>
                  <TableCell>{patient.gleason_score || 'N/A'}</TableCell>
                  <TableCell>
                    {patient.psa_level ? `${patient.psa_level} ng/mL` : 'N/A'}
                  </TableCell>
                  <TableCell>{getRiskChip(patient)}</TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => navigate(`/patients/${patient.id}`)}
                    >
                      <ViewIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        onPageChange={(e, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[10, 25, 50, 100]}
      />
    </Box>
  );
}

export default PatientList;
