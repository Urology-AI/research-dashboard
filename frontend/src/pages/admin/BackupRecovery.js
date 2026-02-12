import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import {
  Backup as BackupIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Delete as DeleteIcon,
  Restore as RestoreIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import {
  createBackup,
  listBackups,
  downloadBackup,
  restoreBackup,
  deleteBackup,
} from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

function BackupRecovery() {
  const { isAdmin } = useAuth();
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState(null);

  const loadBackups = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await listBackups();
      setBackups(response.backups || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadBackups();
    }
  }, [isAdmin, loadBackups]);

  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      setError(null);
      await createBackup();
      loadBackups();
      alert('Backup created successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadBackup = async (filename) => {
    try {
      const blob = await downloadBackup(filename);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRestoreClick = (backup) => {
    setSelectedBackup(backup);
    setRestoreDialogOpen(true);
  };

  const handleRestoreConfirm = async () => {
    try {
      await restoreBackup(selectedBackup.filename);
      setRestoreDialogOpen(false);
      setSelectedBackup(null);
      alert('Database restored successfully! Please restart the application.');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteClick = (backup) => {
    setSelectedBackup(backup);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteBackup(selectedBackup.filename);
      setDeleteDialogOpen(false);
      setSelectedBackup(null);
      loadBackups();
    } catch (err) {
      setError(err.message);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (!isAdmin) {
    return (
      <Alert severity="error">
        You do not have permission to access this page.
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <BackupIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Backup & Recovery
          </Typography>
        </Box>
        <Typography variant="body1" color="textSecondary">
          Create, manage, and restore database backups
        </Typography>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Backup Management</Typography>
          <Box display="flex" gap={1}>
            <Button
              startIcon={<RefreshIcon />}
              onClick={loadBackups}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="contained"
              startIcon={<BackupIcon />}
              onClick={handleCreateBackup}
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Create Backup'}
            </Button>
          </Box>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Filename</TableCell>
                  <TableCell>Created At</TableCell>
                  <TableCell>Created By</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {backups.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No backups available
                    </TableCell>
                  </TableRow>
                ) : (
                  backups.map((backup) => (
                    <TableRow key={backup.filename}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {backup.filename}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {new Date(backup.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>{backup.created_by || 'N/A'}</TableCell>
                      <TableCell>{formatFileSize(backup.file_size)}</TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleDownloadBackup(backup.filename)}
                          title="Download"
                        >
                          <DownloadIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="warning"
                          onClick={() => handleRestoreClick(backup)}
                          title="Restore"
                        >
                          <RestoreIcon />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteClick(backup)}
                          title="Delete"
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
        )}
      </Paper>

      <Alert severity="warning" sx={{ mb: 2 }}>
        <Typography variant="body2">
          <strong>Warning:</strong> Restoring a backup will replace the current database. Make sure to create a backup before restoring.
        </Typography>
      </Alert>

      {/* Restore Confirmation Dialog */}
      <Dialog open={restoreDialogOpen} onClose={() => setRestoreDialogOpen(false)}>
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <WarningIcon color="warning" />
            Restore Backup
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            <strong>WARNING:</strong> This will replace the current database with the backup. This action cannot be undone.
            <br />
            <br />
            <strong>Backup:</strong> {selectedBackup?.filename}
            <br />
            <strong>Created:</strong>{' '}
            {selectedBackup
              ? new Date(selectedBackup.created_at).toLocaleString()
              : 'N/A'}
            <br />
            <strong>Size:</strong>{' '}
            {selectedBackup ? formatFileSize(selectedBackup.file_size) : 'N/A'}
            <br />
            <br />
            A backup of the current database will be created before restoration. Please restart the application after restoration.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRestoreConfirm} color="warning" variant="contained">
            Restore Backup
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Backup</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this backup? This action cannot be undone.
            <br />
            <br />
            <strong>Backup:</strong> {selectedBackup?.filename}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default BackupRecovery;
