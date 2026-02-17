import React, { useState, useEffect } from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Alert,
  Button,
  Container,
} from '@mui/material';
import ErrorIcon from '@mui/icons-material/Error';
import RefreshIcon from '@mui/icons-material/Refresh';
import api from '../services/api';

/**
 * BackendHealthCheck component
 * 
 * Blocks rendering of the app until backend health check passes.
 * Shows loading state while checking, error state if backend is unavailable.
 * Only renders children once backend is confirmed healthy.
 */
function BackendHealthCheck({ children }) {
  const [isHealthy, setIsHealthy] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const checkHealth = async () => {
    try {
      setIsChecking(true);
      setError(null);
      
      const response = await api.get('/health');
      
      // Verify backend is actually online
      if (response.data && response.data.status === 'online') {
        setIsHealthy(true);
        setIsChecking(false);
      } else {
        throw new Error('Backend is not online');
      }
    } catch (err) {
      setIsHealthy(false);
      setIsChecking(false);
      
      // Provide helpful error message
      if (err.response) {
        // Server responded but with error status
        setError({
          message: 'Backend server is not responding correctly',
          details: err.response.status === 404 
            ? 'Health endpoint not found. Is the backend server running?' 
            : `Server returned error: ${err.response.status}`,
        });
      } else if (err.request) {
        // Request made but no response (server not running)
        setError({
          message: 'Cannot connect to backend server',
          details: 'Please ensure the backend server is running and accessible.',
        });
      } else {
        // Other error
        setError({
          message: 'Failed to check backend health',
          details: err.message || 'Unknown error',
        });
      }
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    checkHealth();
  };

  // If backend is healthy, render children
  if (isHealthy) {
    return <>{children}</>;
  }

  // Show loading state while checking
  if (isChecking) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
        }}
      >
        <Container maxWidth="sm">
          <Box
            sx={{
              textAlign: 'center',
              p: 4,
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: 3,
            }}
          >
            <CircularProgress size={60} sx={{ mb: 3 }} />
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              Connecting to backend...
            </Typography>
            <Typography variant="body1" color="textSecondary">
              Waiting for server to be ready
            </Typography>
          </Box>
        </Container>
      </Box>
    );
  }

  // Show error state if backend is unavailable
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
      }}
    >
      <Container maxWidth="sm">
        <Box
          sx={{
            textAlign: 'center',
            p: 4,
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 3,
          }}
        >
          <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
            Backend Server Unavailable
          </Typography>
          <Alert severity="error" sx={{ mt: 2, mb: 3, textAlign: 'left' }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
              {error?.message || 'Cannot connect to backend'}
            </Typography>
            <Typography variant="body2">
              {error?.details || 'Please check that the backend server is running.'}
            </Typography>
          </Alert>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
            Expected backend URL: {process.env.REACT_APP_API_URL || 'http://localhost:8000'}
          </Typography>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={handleRetry}
            size="large"
            sx={{ mt: 2 }}
          >
            Retry Connection
          </Button>
          {retryCount > 0 && (
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 2 }}>
              Retry attempt: {retryCount}
            </Typography>
          )}
        </Box>
      </Container>
    </Box>
  );
}

export default BackendHealthCheck;
