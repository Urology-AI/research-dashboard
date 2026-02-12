import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Button,
} from '@mui/material';
import {
  People as PeopleIcon,
  Storage as StorageIcon,
  Category as CategoryIcon,
  CloudSync as CloudSyncIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Backup as BackupIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const adminCards = [
    {
      title: 'User Management',
      description: 'Manage users, roles, and permissions',
      icon: <PeopleIcon sx={{ fontSize: 60 }} />,
      path: '/admin/users',
      color: 'primary',
    },
    {
      title: 'Data Management',
      description: 'View and manage uploaded data files',
      icon: <StorageIcon sx={{ fontSize: 60 }} />,
      path: '/admin/data',
      color: 'secondary',
    },
    {
      title: 'Custom Fields',
      description: 'Define custom fields for patients, procedures, and more',
      icon: <CategoryIcon sx={{ fontSize: 60 }} />,
      path: '/admin/custom-fields',
      color: 'success',
    },
    {
      title: 'REDCap Configurations',
      description: 'Manage REDCap API connections and tokens',
      icon: <CloudSyncIcon sx={{ fontSize: 60 }} />,
      path: '/admin/redcap-configs',
      color: 'info',
    },
    {
      title: 'System Monitoring',
      description: 'View system health and performance metrics',
      icon: <SpeedIcon sx={{ fontSize: 60 }} />,
      path: '/admin/monitoring',
      color: 'warning',
    },
    {
      title: 'Session Management',
      description: 'View and manage active user sessions',
      icon: <SecurityIcon sx={{ fontSize: 60 }} />,
      path: '/admin/sessions',
      color: 'info',
    },
    {
      title: 'Backup & Recovery',
      description: 'Create and restore database backups',
      icon: <BackupIcon sx={{ fontSize: 60 }} />,
      path: '/admin/backup',
      color: 'warning',
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Admin Dashboard
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Welcome, {user?.full_name || user?.username}. Manage users, data, and system settings.
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {adminCards.map((card) => (
          <Grid item xs={12} sm={6} md={4} key={card.title}>
            <Card
              sx={{
                height: '100%',
                cursor: card.disabled ? 'default' : 'pointer',
                opacity: card.disabled ? 0.6 : 1,
                '&:hover': card.disabled ? {} : { boxShadow: 6 },
                transition: 'box-shadow 0.3s',
              }}
              onClick={() => !card.disabled && navigate(card.path)}
            >
              <CardContent sx={{ textAlign: 'center', p: 4 }}>
                <Box sx={{ color: `${card.color}.main`, mb: 2 }}>
                  {card.icon}
                </Box>
                <Typography variant="h5" gutterBottom>
                  {card.title}
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  {card.description}
                </Typography>
                {!card.disabled && (
                  <Button
                    variant="contained"
                    color={card.color}
                    sx={{ mt: 2 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(card.path);
                    }}
                  >
                    Open
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default AdminDashboard;
