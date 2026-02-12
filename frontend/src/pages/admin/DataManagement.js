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
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Button,
  Collapse,
  Card,
  CardContent,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Visibility as VisibilityIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import api from '../../services/api';

function DataManagement() {
  const [uploads, setUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});
  const [processingDetails, setProcessingDetails] = useState({});
  const [loadingDetails, setLoadingDetails] = useState({});

  useEffect(() => {
    loadUploads();
  }, []);

  const loadUploads = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/admin/data-uploads');
      setUploads(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (uploadId) => {
    if (!window.confirm('Are you sure you want to delete this upload record?')) {
      return;
    }
    try {
      await api.delete(`/api/admin/data-uploads/${uploadId}`);
      loadUploads();
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'error';
      case 'processing':
        return 'warning';
      default:
        return 'default';
    }
  };

  const handleExpandRow = async (uploadId) => {
    const isExpanded = expandedRows[uploadId];
    setExpandedRows({ ...expandedRows, [uploadId]: !isExpanded });

    if (!isExpanded && !processingDetails[uploadId]) {
      // Load processing details
      setLoadingDetails({ ...loadingDetails, [uploadId]: true });
      try {
        const response = await api.get(`/api/admin/data-uploads/${uploadId}/processing-details`);
        setProcessingDetails({ ...processingDetails, [uploadId]: response.data });
      } catch (err) {
        console.error('Error loading processing details:', err);
      } finally {
        setLoadingDetails({ ...loadingDetails, [uploadId]: false });
      }
    }
  };

  const getSuccessRate = (upload) => {
    if (!upload.total_rows || upload.total_rows === 0) return 'N/A';
    const rate = ((upload.successful_rows || 0) / upload.total_rows) * 100;
    return `${rate.toFixed(1)}%`;
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
        <Typography variant="h4">Data Upload Management</Typography>
        <Button variant="outlined" onClick={loadUploads}>
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell></TableCell>
              <TableCell>Filename</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Upload Date</TableCell>
              <TableCell>Uploaded By</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Records Added</TableCell>
              <TableCell>Success Rate</TableCell>
              <TableCell>File Size</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {uploads.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  <Typography variant="body2" color="textSecondary">
                    No uploads found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              uploads.map((upload) => (
                <React.Fragment key={upload.id}>
                  <TableRow>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleExpandRow(upload.id)}
                      >
                        <ExpandMoreIcon
                          sx={{
                            transform: expandedRows[upload.id] ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.3s',
                          }}
                        />
                      </IconButton>
                    </TableCell>
                    <TableCell>{upload.filename}</TableCell>
                    <TableCell>
                      <Chip label={upload.file_type || 'N/A'} size="small" />
                    </TableCell>
                    <TableCell>
                      {new Date(upload.upload_date).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {upload.uploaded_by?.full_name || upload.uploaded_by?.username || 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={upload.status}
                        color={getStatusColor(upload.status)}
                        size="small"
                        icon={
                          upload.status === 'completed' ? (
                            <CheckCircleIcon />
                          ) : upload.status === 'failed' ? (
                            <ErrorIcon />
                          ) : null
                        }
                      />
                    </TableCell>
                    <TableCell>{upload.records_added || 0}</TableCell>
                    <TableCell>
                      <Chip
                        label={getSuccessRate(upload)}
                        size="small"
                        color={
                          upload.total_rows && upload.successful_rows / upload.total_rows > 0.9
                            ? 'success'
                            : upload.total_rows && upload.successful_rows / upload.total_rows > 0.5
                            ? 'warning'
                            : 'error'
                        }
                      />
                    </TableCell>
                    <TableCell>{formatFileSize(upload.file_size)}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(upload.id)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell
                      style={{ paddingBottom: 0, paddingTop: 0 }}
                      colSpan={10}
                    >
                      <Collapse
                        in={expandedRows[upload.id]}
                        timeout="auto"
                        unmountOnExit
                      >
                        <Box sx={{ margin: 2 }}>
                          {loadingDetails[upload.id] ? (
                            <Box display="flex" justifyContent="center" p={2}>
                              <CircularProgress size={24} />
                            </Box>
                          ) : processingDetails[upload.id] ? (
                            <Grid container spacing={2}>
                              <Grid item xs={12} md={6}>
                                <Card>
                                  <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                      Data Quality Metrics
                                    </Typography>
                                    <List dense>
                                      <ListItem>
                                        <ListItemText
                                          primary="Total Rows"
                                          secondary={processingDetails[upload.id].data_quality?.total_rows || 0}
                                        />
                                      </ListItem>
                                      <ListItem>
                                        <ListItemText
                                          primary="Successful Rows"
                                          secondary={
                                            <Chip
                                              label={processingDetails[upload.id].data_quality?.successful_rows || 0}
                                              color="success"
                                              size="small"
                                            />
                                          }
                                        />
                                      </ListItem>
                                      <ListItem>
                                        <ListItemText
                                          primary="Failed Rows"
                                          secondary={
                                            <Chip
                                              label={processingDetails[upload.id].data_quality?.failed_rows || 0}
                                              color="error"
                                              size="small"
                                            />
                                          }
                                        />
                                      </ListItem>
                                      <ListItem>
                                        <ListItemText
                                          primary="Records Added"
                                          secondary={processingDetails[upload.id].data_quality?.records_added || 0}
                                        />
                                      </ListItem>
                                    </List>
                                  </CardContent>
                                </Card>
                              </Grid>
                              <Grid item xs={12} md={6}>
                                <Card>
                                  <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                      Processing Log
                                    </Typography>
                                    {processingDetails[upload.id].processing_details?.log ? (
                                      <List dense>
                                        {processingDetails[upload.id].processing_details.log.map(
                                          (log, idx) => (
                                            <ListItem key={idx}>
                                              <ListItemText
                                                primary={log}
                                                primaryTypographyProps={{
                                                  variant: 'body2',
                                                  color: log.includes('WARNING') || log.includes('ERROR')
                                                    ? 'error'
                                                    : 'textPrimary',
                                                }}
                                              />
                                            </ListItem>
                                          )
                                        )}
                                      </List>
                                    ) : (
                                      <Typography variant="body2" color="textSecondary">
                                        No processing log available
                                      </Typography>
                                    )}
                                  </CardContent>
                                </Card>
                              </Grid>
                              <Grid item xs={12}>
                                <Accordion>
                                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography variant="subtitle1">
                                      Pandas Operations & Processing Details
                                    </Typography>
                                  </AccordionSummary>
                                  <AccordionDetails>
                                    {processingDetails[upload.id].processing_details?.pandas_operations ? (
                                      <List>
                                        {processingDetails[upload.id].processing_details.pandas_operations.map(
                                          (op, idx) => (
                                            <ListItem key={idx}>
                                              <ListItemText
                                                primary={op}
                                                primaryTypographyProps={{ variant: 'body2' }}
                                              />
                                            </ListItem>
                                          )
                                        )}
                                      </List>
                                    ) : (
                                      <Typography variant="body2" color="textSecondary">
                                        No pandas operations logged
                                      </Typography>
                                    )}
                                    {processingDetails[upload.id].processing_details?.failed_rows &&
                                      processingDetails[upload.id].processing_details.failed_rows.length > 0 && (
                                        <Box sx={{ mt: 2 }}>
                                          <Typography variant="subtitle2" gutterBottom>
                                            Failed Rows (showing first 10):
                                          </Typography>
                                          <List dense>
                                            {processingDetails[upload.id].processing_details.failed_rows.map(
                                              (row, idx) => (
                                                <ListItem key={idx}>
                                                  <ListItemText
                                                    primary={`Row ${row.row}: ${row.reason}`}
                                                    primaryTypographyProps={{
                                                      variant: 'body2',
                                                      color: 'error',
                                                    }}
                                                  />
                                                </ListItem>
                                              )
                                            )}
                                          </List>
                                        </Box>
                                      )}
                                  </AccordionDetails>
                                </Accordion>
                              </Grid>
                            </Grid>
                          ) : (
                            <Alert severity="info">
                              Click the expand icon to view processing details
                            </Alert>
                          )}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default DataManagement;
