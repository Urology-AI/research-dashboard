import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  Divider,
  Avatar,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  Badge as BadgeIcon,
  Edit as EditIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getRoleLabel = (role) => {
    if (!role) return 'User';
    if (role === 'admin') return 'Administrator';
    if (role === 'clinician') return 'Clinician';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  const getRoleColor = (role) => {
    if (role === 'admin') return 'primary';
    if (role === 'clinician') return 'secondary';
    return 'default';
  };

  const initials = user?.full_name
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.username?.slice(0, 2).toUpperCase() || '?';

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
        Profile
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        View your account information
      </Typography>

      <Grid container spacing={3}>
        {/* Profile Header Card */}
        <Grid item xs={12}>
          <Card>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: 'primary.main',
                    fontSize: '1.75rem',
                  }}
                >
                  {initials}
                </Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {user?.full_name || 'No name set'}
                  </Typography>
                  <Typography variant="body1" color="textSecondary" sx={{ mb: 1 }}>
                    @{user?.username}
                  </Typography>
                  <Chip
                    label={getRoleLabel(user?.role)}
                    color={getRoleColor(user?.role)}
                    size="small"
                    sx={{ fontWeight: 600 }}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => navigate('/settings')}
                  >
                    Edit Profile
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<LockIcon />}
                    onClick={() => navigate('/settings')}
                  >
                    Change Password
                  </Button>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Details Card */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
              <PersonIcon color="primary" />
              Account Details
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>
                  Full Name
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {user?.full_name || '—'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>
                  Username
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {user?.username || '—'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>
                  Email
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EmailIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  {user?.email || '—'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 0.5 }}>
                  Role
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BadgeIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  <Chip
                    label={getRoleLabel(user?.role)}
                    color={getRoleColor(user?.role)}
                    size="small"
                    variant="outlined"
                  />
                </Box>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Quick Actions
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<EditIcon />}
                onClick={() => navigate('/settings')}
                sx={{ justifyContent: 'flex-start' }}
              >
                Update profile & preferences
              </Button>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<LockIcon />}
                onClick={() => navigate('/settings')}
                sx={{ justifyContent: 'flex-start' }}
              >
                Change password
              </Button>
              {user?.role === 'admin' && (
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => navigate('/admin/sessions')}
                  sx={{ justifyContent: 'flex-start' }}
                >
                  Manage sessions
                </Button>
              )}
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Profile;
