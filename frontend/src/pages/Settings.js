import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  Divider,
  Alert,
  Switch,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormControl,
  TextField,
  Button,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Palette as PaletteIcon,
  CheckCircle as CheckCircleIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Brightness4 as Brightness4Icon,
  Lock as LockIcon,
  Security as SecurityIcon,
} from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import {
  setup2FA,
  verify2FASetup,
  get2FAStatus,
  disable2FA,
} from '../services/api';

function ThemeCard({ themeKey, themeInfo, isSelected, onSelect }) {
  return (
    <Card
      sx={{
        height: '100%',
        border: isSelected ? '3px solid' : '1px solid',
        borderColor: isSelected ? 'primary.main' : 'divider',
        position: 'relative',
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: 4,
        },
      }}
    >
      <CardActionArea onClick={() => onSelect(themeKey)}>
        <CardContent sx={{ p: 3 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mb: 2,
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {themeInfo.name}
            </Typography>
            {isSelected && (
              <CheckCircleIcon color="primary" sx={{ fontSize: 28 }} />
            )}
          </Box>

          {/* Color Preview */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            <Box
              sx={{
                flex: 1,
                height: 60,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${themeInfo.primary} 0%, ${themeInfo.secondary} 100%)`,
                border: '1px solid rgba(0,0,0,0.1)',
              }}
            />
          </Box>

          {/* Color Swatches */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1,
                backgroundColor: themeInfo.primary,
                border: '1px solid rgba(0,0,0,0.1)',
              }}
            />
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1,
                backgroundColor: themeInfo.secondary,
                border: '1px solid rgba(0,0,0,0.1)',
              }}
            />
            {themeInfo.info && themeInfo.info !== themeInfo.primary && (
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1,
                  backgroundColor: themeInfo.info,
                  border: '1px solid rgba(0,0,0,0.1)',
                }}
              />
            )}
          </Box>

          {/* Note: Dark mode is now controlled separately, not per-theme */}
        </CardContent>
      </CardActionArea>
    </Card>
  );
}

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

function Settings() {
  const { 
    currentTheme, 
    colorMode, 
    changeTheme, 
    toggleColorMode,
    setColorMode,
    getAvailableThemes, 
    getCurrentThemeInfo 
  } = useTheme();
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    full_name: user?.full_name || '',
  });
  const [passwordError, setPasswordError] = useState(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [twoFactorStatus, setTwoFactorStatus] = useState(null);
  const [twoFactorSetup, setTwoFactorSetup] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorDisableCode, setTwoFactorDisableCode] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorDialogOpen, setTwoFactorDialogOpen] = useState(false);
  const [twoFactorDisableDialogOpen, setTwoFactorDisableDialogOpen] = useState(false);
  
  const availableThemes = getAvailableThemes();
  const currentThemeInfo = getCurrentThemeInfo();

  useEffect(() => {
    load2FAStatus();
  }, [user]);

  const load2FAStatus = async () => {
    try {
      const status = await get2FAStatus();
      setTwoFactorStatus(status);
    } catch (err) {
      console.error('Error loading 2FA status:', err);
    }
  };

  const handleSetup2FA = async () => {
    try {
      setTwoFactorLoading(true);
      const setup = await setup2FA();
      setTwoFactorSetup(setup);
      setTwoFactorDialogOpen(true);
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    try {
      setTwoFactorLoading(true);
      await verify2FASetup(twoFactorCode);
      setTwoFactorDialogOpen(false);
      setTwoFactorCode('');
      setTwoFactorSetup(null);
      load2FAStatus();
      alert('2FA enabled successfully!');
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    try {
      setTwoFactorLoading(true);
      await disable2FA(twoFactorDisableCode);
      setTwoFactorDisableDialogOpen(false);
      setTwoFactorDisableCode('');
      load2FAStatus();
      alert('2FA disabled successfully!');
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordData.current_password) {
      setPasswordError('Current password is required');
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.new_password.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    }

    try {
      setPasswordSaving(true);
      setPasswordError(null);
      await api.put('/api/auth/me', {
        current_password: passwordData.current_password,
        password: passwordData.new_password,
      });
      setPasswordDialogOpen(false);
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      alert('Password changed successfully');
    } catch (err) {
      setPasswordError(err.response?.data?.detail || err.message);
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setUpdatingProfile(true);
      await api.put('/api/auth/me', profileData);
      alert('Profile updated successfully');
      window.location.reload(); // Refresh to get updated user data
    } catch (err) {
      alert(err.response?.data?.detail || err.message);
    } finally {
      setUpdatingProfile(false);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <PaletteIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>
            Settings
          </Typography>
        </Box>
        <Typography variant="body1" color="textSecondary">
          Customize your dashboard and manage your account
        </Typography>
      </Box>

      <Paper sx={{ mb: 3 }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Appearance" />
          <Tab label="Account" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>

      <Alert severity="info" sx={{ mb: 4 }}>
        Your theme and color mode preferences are saved automatically and will persist across sessions.
      </Alert>

      {/* Color Mode Selection */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Brightness4Icon sx={{ fontSize: 28, color: 'primary.main' }} />
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Color Mode
          </Typography>
        </Box>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Choose between light and dark mode for the interface
        </Typography>

        <FormControl component="fieldset">
          <RadioGroup
            row
            value={colorMode}
            onChange={(e) => setColorMode(e.target.value)}
            sx={{ gap: 2 }}
          >
            <Paper
              sx={{
                p: 2,
                border: colorMode === 'light' ? '2px solid' : '1px solid',
                borderColor: colorMode === 'light' ? 'primary.main' : 'divider',
                borderRadius: 2,
                cursor: 'pointer',
                flex: 1,
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                },
              }}
              onClick={() => setColorMode('light')}
            >
              <FormControlLabel
                value="light"
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LightModeIcon />
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        Light Mode
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Bright interface for daytime use
                      </Typography>
                    </Box>
                  </Box>
                }
                sx={{ m: 0, width: '100%' }}
              />
            </Paper>

            <Paper
              sx={{
                p: 2,
                border: colorMode === 'dark' ? '2px solid' : '1px solid',
                borderColor: colorMode === 'dark' ? 'primary.main' : 'divider',
                borderRadius: 2,
                cursor: 'pointer',
                flex: 1,
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                },
              }}
              onClick={() => setColorMode('dark')}
            >
              <FormControlLabel
                value="dark"
                control={<Radio />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <DarkModeIcon />
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 600 }}>
                        Dark Mode
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        Dark interface for reduced eye strain
                      </Typography>
                    </Box>
                  </Box>
                }
                sx={{ m: 0, width: '100%' }}
              />
            </Paper>
          </RadioGroup>
        </FormControl>

        {/* Quick Toggle Switch */}
        <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
          <FormControlLabel
            control={
              <Switch
                checked={colorMode === 'dark'}
                onChange={toggleColorMode}
                size="large"
              />
            }
            label={
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {colorMode === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Toggle between light and dark mode
                </Typography>
              </Box>
            }
          />
        </Box>
      </Paper>

      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
          Theme Selection
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Choose a color scheme that works best for you. Currently using: <strong>{currentThemeInfo.name}</strong>
        </Typography>

        <Grid container spacing={3}>
          {availableThemes.map((themeInfo) => (
            <Grid item xs={12} sm={6} md={4} key={themeInfo.key}>
              <ThemeCard
                themeKey={themeInfo.key}
                themeInfo={themeInfo}
                isSelected={currentTheme === themeInfo.key}
                onSelect={changeTheme}
              />
            </Grid>
          ))}
        </Grid>
      </Paper>

      <Paper sx={{ p: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
          Theme Information
        </Typography>
        <Divider sx={{ mb: 3 }} />
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Current Theme
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              {currentThemeInfo.name}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Chip 
                label={colorMode === 'dark' ? 'Dark Mode' : 'Light Mode'} 
                size="small"
                icon={colorMode === 'dark' ? <DarkModeIcon /> : <LightModeIcon />}
                color={colorMode === 'dark' ? 'default' : 'primary'}
                variant="outlined"
              />
            </Box>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="textSecondary" sx={{ minWidth: 100 }}>
                  Primary:
                </Typography>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: currentThemeInfo.primary,
                    border: '1px solid rgba(0,0,0,0.1)',
                  }}
                />
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {currentThemeInfo.primary}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="textSecondary" sx={{ minWidth: 100 }}>
                  Secondary:
                </Typography>
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: currentThemeInfo.secondary,
                    border: '1px solid rgba(0,0,0,0.1)',
                  }}
                />
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                  {currentThemeInfo.secondary}
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Theme Features
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
              <Typography variant="body2">
                • Oncology-focused, publication-ready design
              </Typography>
              <Typography variant="body2">
                • Optimized for readability and accessibility
              </Typography>
              <Typography variant="body2">
                • Consistent across all pages and components
              </Typography>
              <Typography variant="body2" color={colorMode === 'dark' ? 'primary' : 'textSecondary'}>
                • {colorMode === 'dark' ? 'Dark mode' : 'Light mode'} enabled for {colorMode === 'dark' ? 'reduced eye strain' : 'optimal visibility'}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Account Settings
          </Typography>
          <Divider sx={{ mb: 3 }} />
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              User Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Username"
                  value={user?.username || ''}
                  disabled
                  helperText="Username cannot be changed"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Email"
                  value={user?.email || ''}
                  disabled
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={profileData.full_name}
                  onChange={(e) => setProfileData({ ...profileData, full_name: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  onClick={handleUpdateProfile}
                  disabled={updatingProfile}
                >
                  {updatingProfile ? 'Updating...' : 'Update Profile'}
                </Button>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Role"
                  value={user?.role === 'admin' ? 'Administrator' : user?.role === 'clinician' ? 'Clinician' : user?.role || 'User'}
                  disabled
                />
              </Grid>
            </Grid>
          </Box>

          <Box>
            <Typography variant="subtitle1" gutterBottom>
              Password Management
            </Typography>
            <Button
              variant="contained"
              startIcon={<LockIcon />}
              onClick={() => setPasswordDialogOpen(true)}
            >
              Change Password
            </Button>
          </Box>

          <Box sx={{ mt: 4 }}>
            <Typography variant="subtitle1" gutterBottom>
              Two-Factor Authentication
            </Typography>
            {twoFactorStatus?.is_enabled ? (
              <Box>
                <Alert severity="success" sx={{ mb: 2 }}>
                  2FA is enabled for your account
                </Alert>
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<SecurityIcon />}
                  onClick={() => setTwoFactorDisableDialogOpen(true)}
                >
                  Disable 2FA
                </Button>
              </Box>
            ) : (
              <Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  2FA is not enabled. Enable it for additional security.
                </Alert>
                <Button
                  variant="contained"
                  startIcon={<SecurityIcon />}
                  onClick={handleSetup2FA}
                  disabled={twoFactorLoading}
                >
                  {twoFactorLoading ? 'Setting up...' : 'Enable 2FA'}
                </Button>
              </Box>
            )}
          </Box>
        </TabPanel>
      </Paper>

      {/* 2FA Setup Dialog */}
      <Dialog open={twoFactorDialogOpen} onClose={() => setTwoFactorDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
          </Alert>
          {twoFactorSetup && (
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <img src={twoFactorSetup.qr_code_url} alt="QR Code" style={{ maxWidth: '100%' }} />
            </Box>
          )}
          <TextField
            fullWidth
            label="Enter verification code"
            value={twoFactorCode}
            onChange={(e) => setTwoFactorCode(e.target.value)}
            placeholder="000000"
            sx={{ mb: 2 }}
          />
          {twoFactorSetup && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Save these backup codes in a safe place:
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                {twoFactorSetup.backup_codes.map((code, idx) => (
                  <li key={idx}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {code}
                    </Typography>
                  </li>
                ))}
              </Box>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setTwoFactorDialogOpen(false);
            setTwoFactorCode('');
            setTwoFactorSetup(null);
          }}>
            Cancel
          </Button>
          <Button onClick={handleVerify2FA} variant="contained" disabled={twoFactorLoading || !twoFactorCode}>
            {twoFactorLoading ? 'Verifying...' : 'Verify & Enable'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 2FA Disable Dialog */}
      <Dialog open={twoFactorDisableDialogOpen} onClose={() => setTwoFactorDisableDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            You must enter a verification code from your authenticator app to disable 2FA.
          </Alert>
          <TextField
            fullWidth
            label="Enter verification code"
            value={twoFactorDisableCode}
            onChange={(e) => setTwoFactorDisableCode(e.target.value)}
            placeholder="000000"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setTwoFactorDisableDialogOpen(false);
            setTwoFactorDisableCode('');
          }}>
            Cancel
          </Button>
          <Button onClick={handleDisable2FA} variant="contained" color="error" disabled={twoFactorLoading || !twoFactorDisableCode}>
            {twoFactorLoading ? 'Disabling...' : 'Disable 2FA'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Password Change Dialog */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          {passwordError && (
            <Alert severity="error" sx={{ mb: 2 }}>{passwordError}</Alert>
          )}
          <TextField
            fullWidth
            label="Current Password"
            type="password"
            value={passwordData.current_password}
            onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="New Password"
            type="password"
            value={passwordData.new_password}
            onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
            margin="normal"
            required
            helperText="Must be at least 8 characters long"
          />
          <TextField
            fullWidth
            label="Confirm New Password"
            type="password"
            value={passwordData.confirm_password}
            onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
            margin="normal"
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setPasswordDialogOpen(false);
            setPasswordError(null);
            setPasswordData({
              current_password: '',
              new_password: '',
              confirm_password: '',
            });
          }}>
            Cancel
          </Button>
          <Button onClick={handleChangePassword} variant="contained" disabled={passwordSaving}>
            {passwordSaving ? 'Changing...' : 'Change Password'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Settings;
