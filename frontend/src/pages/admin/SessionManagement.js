import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  Chip,
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
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { getUserSessions, revokeSession } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

function SessionManagement() {
  const { isAdmin } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUserSessions();
      setSessions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      loadSessions();
    }
  }, [isAdmin, loadSessions]);

  const handleRevokeClick = (session) => {
    setSelectedSession(session);
    setRevokeDialogOpen(true);
  };

  const handleRevokeConfirm = async () => {
    try {
      await revokeSession(selectedSession.id);
      setRevokeDialogOpen(false);
      setSelectedSession(null);
      loadSessions();
    } catch (err) {
      setError(err.message);
    }
  };

  const formatUserAgent = (ua) => {
    if (!ua) return 'Unknown';
    // Extract browser and OS info
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    if (ua.includes('Edge')) return 'Edge';
    return 'Unknown Browser';
  };

  const isExpired = (expiresAt) => {
    return new Date(expiresAt) < new Date();
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
          <SecurityIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Session Management
          </Typography>
        </Box>
        <Typography variant="body1" color="textSecondary">
          View and manage active user sessions
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            Active Sessions ({sessions.length})
          </Typography>
          <Button
            startIcon={<RefreshIcon />}
            onClick={loadSessions}
            disabled={loading}
          >
            Refresh
          </Button>
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
                  <TableCell>User</TableCell>
                  <TableCell>IP Address</TableCell>
                  <TableCell>Browser</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Last Activity</TableCell>
                  <TableCell>Expires</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center">
                      No active sessions
                    </TableCell>
                  </TableRow>
                ) : (
                  sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {session.user_full_name || session.username || 'Unknown'}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {session.username}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{session.ip_address || 'N/A'}</TableCell>
                      <TableCell>{formatUserAgent(session.user_agent)}</TableCell>
                      <TableCell>
                        {new Date(session.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {new Date(session.last_activity).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {new Date(session.expires_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {isExpired(session.expires_at) ? (
                          <Chip label="Expired" size="small" color="error" />
                        ) : (
                          <Chip label="Active" size="small" color="success" />
                        )}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRevokeClick(session)}
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

      {/* Revoke Session Dialog */}
      <Dialog open={revokeDialogOpen} onClose={() => setRevokeDialogOpen(false)}>
        <DialogTitle>Revoke Session</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to revoke this session? The user will be logged out immediately.
            <br />
            <br />
            <strong>User:</strong> {selectedSession?.user_full_name || selectedSession?.username}
            <br />
            <strong>IP Address:</strong> {selectedSession?.ip_address || 'N/A'}
            <br />
            <strong>Last Activity:</strong>{' '}
            {selectedSession
              ? new Date(selectedSession.last_activity).toLocaleString()
              : 'N/A'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRevokeDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleRevokeConfirm} color="error" variant="contained">
            Revoke Session
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default SessionManagement;
