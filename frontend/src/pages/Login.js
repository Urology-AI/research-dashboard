import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  Chip,
  CircularProgress,
  Paper,
} from '@mui/material';
import ScienceIcon from '@mui/icons-material/Science';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import SecurityIcon from '@mui/icons-material/Security';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [healthStatus, setHealthStatus] = useState(null);
  const [checkingHealth, setCheckingHealth] = useState(true);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Check health and connection security on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        setCheckingHealth(true);
        const response = await api.get('/health');
        setHealthStatus(response.data);
        
        // In production, ensure we're using HTTPS
        if (process.env.NODE_ENV === 'production' && !response.data.secure) {
          // Redirect to HTTPS if not secure
          if (window.location.protocol !== 'https:') {
            window.location.replace(window.location.href.replace('http:', 'https:'));
            return;
          }
        }
      } catch (err) {
        setHealthStatus({
          status: 'offline',
          secure: window.location.protocol === 'https:',
          message: 'Unable to connect to server'
        });
      } finally {
        setCheckingHealth(false);
      }
    };

    checkHealth();
    // Check health every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Prevent login if connection is not secure in production
    if (process.env.NODE_ENV === 'production' && healthStatus && !healthStatus.secure) {
      setError('Secure connection (HTTPS) is required for login. Please use HTTPS to access this application.');
      return;
    }
    
    // Prevent login if server is offline
    if (healthStatus && healthStatus.status !== 'online') {
      setError('Server is offline. Please try again later.');
      return;
    }
    
    setLoading(true);

    const result = await login(username, password, twoFactorCode || null);
    setLoading(false);

    if (result.success) {
      navigate('/');
    } else if (result.requires_2fa) {
      setRequires2FA(true);
      setError('');
    } else {
      setError(result.error || 'Login failed');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
        },
      }}
    >
      {/* Demo Warning Banner */}
      <Paper
        elevation={0}
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          background: 'linear-gradient(90deg, #ff6b35 0%, #f7931e 50%, #ff6b35 100%)',
          color: 'white',
          py: 1.5,
          px: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          borderRadius: 0,
        }}
      >
        <WarningAmberIcon sx={{ fontSize: 24 }} />
        <Typography variant="body1" sx={{ fontWeight: 600, textAlign: 'center' }}>
          BETA TESTING WARNING — Do not add any real patient data or PHI. Use dummy data only.
        </Typography>
        <WarningAmberIcon sx={{ fontSize: 24 }} />
      </Paper>

      <Container maxWidth="sm" sx={{ pt: 6 }}>
        <Card 
          sx={{ 
            width: '100%',
            maxWidth: 450,
            borderRadius: 4,
            boxShadow: '0px 25px 50px -12px rgba(15, 23, 42, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <CardContent sx={{ p: 5 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: 3,
                  background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                  boxShadow: (theme) => `0px 10px 25px ${theme.palette.primary.main}4D`,
                }}
              >
                <ScienceIcon sx={{ fontSize: 48, color: 'white' }} />
              </Box>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, color: '#1E293B' }}>
                Research Dashboard
              </Typography>
              <Typography variant="h6" color="textSecondary" sx={{ fontWeight: 500, mb: 2 }}>
                Oncology Research Analytics & Patient Insights
              </Typography>
              
              {/* Connection Status */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
                {checkingHealth ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={16} />
                    <Typography variant="caption" color="textSecondary">
                      Checking connection...
                    </Typography>
                  </Box>
                ) : healthStatus ? (
                  <>
                    {healthStatus.status === 'online' ? (
                      <Chip
                        icon={<CheckCircleIcon />}
                        label="Online"
                        color="success"
                        size="small"
                        sx={{ fontWeight: 500 }}
                      />
                    ) : (
                      <Chip
                        icon={<ErrorIcon />}
                        label="Offline"
                        color="error"
                        size="small"
                        sx={{ fontWeight: 500 }}
                      />
                    )}
                    {healthStatus.secure ? (
                      <Chip
                        icon={<SecurityIcon />}
                        label="Connection is secure"
                        color="success"
                        size="small"
                        sx={{ fontWeight: 500 }}
                      />
                    ) : (
                      <Chip
                        icon={<ErrorIcon />}
                        label="Connection not secure"
                        color="warning"
                        size="small"
                        sx={{ fontWeight: 500 }}
                      />
                    )}
                  </>
                ) : null}
              </Box>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              {!requires2FA ? (
                <>
                  <TextField
                    fullWidth
                    label="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    margin="normal"
                    required
                    autoFocus
                    disabled={loading}
                  />
                  <TextField
                    fullWidth
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    margin="normal"
                    required
                    disabled={loading}
                  />
                </>
              ) : (
                <>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Two-factor authentication is required. Enter the code from your authenticator app.
                  </Alert>
                  <TextField
                    fullWidth
                    label="2FA Code"
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    margin="normal"
                    required
                    autoFocus
                    disabled={loading}
                    placeholder="000000"
                    inputProps={{ maxLength: 6 }}
                  />
                </>
              )}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ 
                  mt: 3, 
                  mb: 2,
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600,
                  background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  '&:hover': {
                    background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                    boxShadow: (theme) => `0px 10px 25px ${theme.palette.primary.main}4D`,
                  },
                }}
                disabled={loading || (healthStatus && healthStatus.status !== 'online') || (process.env.NODE_ENV === 'production' && healthStatus && !healthStatus.secure) || (requires2FA && !twoFactorCode)}
              >
                {loading ? (requires2FA ? 'Verifying...' : 'Logging in...') : (requires2FA ? 'Verify' : 'Sign In')}
              </Button>
              {requires2FA && (
                <Button
                  fullWidth
                  variant="text"
                  onClick={() => {
                    setRequires2FA(false);
                    setTwoFactorCode('');
                    setError('');
                  }}
                  sx={{ mt: 1 }}
                >
                  Back to Login
                </Button>
              )}
            </form>

            <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 3 }}>
              Contact your administrator for access
            </Typography>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}

export default Login;
