import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Grid,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import { CloudUpload as CloudUploadIcon } from '@mui/icons-material';
import { uploadExcelFile, ingestRedcapData } from '../services/api';

function DataUpload() {
  const [excelFile, setExcelFile] = useState(null);
  const [redcapUrl, setRedcapUrl] = useState('');
  const [redcapToken, setRedcapToken] = useState('');
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleExcelFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.type === 'text/csv' ||
          file.name.endsWith('.xlsx') ||
          file.name.endsWith('.csv')) {
        setExcelFile(file);
        setError(null);
      } else {
        setError('Please upload a valid Excel (.xlsx) or CSV file');
        setExcelFile(null);
      }
    }
  };

  const handleExcelUpload = async () => {
    if (!excelFile) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setMessage(null);

      const result = await uploadExcelFile(excelFile);
      setMessage(
        `Upload successful! Added ${result.patients_added} patients, ` +
        `${result.procedures_added} procedures, and ${result.lab_results_added} lab results.`
      );
      setExcelFile(null);
      // Reset file input
      document.getElementById('excel-file-input').value = '';
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleRedcapIngest = async () => {
    if (!redcapUrl || !redcapToken) {
      setError('Please provide both REDCap URL and API token');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setMessage(null);

      const result = await ingestRedcapData(redcapUrl, redcapToken);
      setMessage(
        `REDCap ingestion successful! Processed ${result.records_processed} records ` +
        `and added ${result.patients_added} patients.`
      );
      setRedcapUrl('');
      setRedcapToken('');
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'REDCap ingestion failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Data Upload
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* Excel Upload */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Excel/CSV File Upload
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Upload patient data from Excel (.xlsx) or CSV files. The system will
                automatically detect and import patient information, procedures, and lab results.
              </Typography>

              <Box sx={{ mt: 2 }}>
                <input
                  accept=".xlsx,.csv"
                  style={{ display: 'none' }}
                  id="excel-file-input"
                  type="file"
                  onChange={handleExcelFileChange}
                />
                <label htmlFor="excel-file-input">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<CloudUploadIcon />}
                    fullWidth
                  >
                    {excelFile ? excelFile.name : 'Select File'}
                  </Button>
                </label>
              </Box>

              {excelFile && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="textSecondary">
                    Selected: {excelFile.name} ({(excelFile.size / 1024).toFixed(2)} KB)
                  </Typography>
                </Box>
              )}

              <Button
                variant="contained"
                onClick={handleExcelUpload}
                disabled={!excelFile || uploading}
                fullWidth
                sx={{ mt: 2 }}
              >
                {uploading ? <CircularProgress size={24} /> : 'Upload File'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* REDCap Integration */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                REDCap Integration
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Connect to a REDCap project to automatically import patient data.
                Provide your REDCap API URL and token.
              </Typography>

              <TextField
                fullWidth
                label="REDCap URL"
                value={redcapUrl}
                onChange={(e) => setRedcapUrl(e.target.value)}
                placeholder="https://redcap.example.com/api/"
                margin="normal"
                disabled={uploading}
              />

              <TextField
                fullWidth
                label="API Token"
                type="password"
                value={redcapToken}
                onChange={(e) => setRedcapToken(e.target.value)}
                margin="normal"
                disabled={uploading}
              />

              <Button
                variant="contained"
                onClick={handleRedcapIngest}
                disabled={!redcapUrl || !redcapToken || uploading}
                fullWidth
                sx={{ mt: 2 }}
              >
                {uploading ? <CircularProgress size={24} /> : 'Import from REDCap'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Messages */}
        <Grid item xs={12}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {message && (
            <Alert severity="success" onClose={() => setMessage(null)}>
              {message}
            </Alert>
          )}
        </Grid>

        {/* Instructions */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Data Format Guidelines
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" component="div">
              <strong>Excel/CSV Format:</strong>
              <ul>
                <li>Required columns: MRN (or Medical Record Number), First Name, Last Name</li>
                <li>Optional columns: Age, Gender, Diagnosis, Gleason Score, PSA Level, Clinical Stage</li>
                <li>For procedures: Procedure Type, Procedure Date, Provider</li>
                <li>For lab results: PSA, Test Date</li>
                <li>Column names are case-insensitive and spaces are automatically handled</li>
              </ul>
              <strong>REDCap Integration:</strong>
              <ul>
                <li>Ensure your REDCap project has appropriate API access enabled</li>
                <li>Field names should map to standard patient data fields</li>
                <li>MRN field is required for patient matching</li>
              </ul>
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default DataUpload;
