import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  IconButton,
  Divider,
  Tooltip,
  Chip,
  CircularProgress,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SettingsIcon from '@mui/icons-material/Settings';
import HistoryIcon from '@mui/icons-material/History';
import LogoutIcon from '@mui/icons-material/Logout';
import ScienceIcon from '@mui/icons-material/Science';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import SecurityIcon from '@mui/icons-material/Security';
import ErrorIcon from '@mui/icons-material/Error';
import WarningIcon from '@mui/icons-material/Warning';
import HelpOutline from '@mui/icons-material/HelpOutline';
import PsychologyIcon from '@mui/icons-material/Psychology';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import api from '../services/api';
import SearchBar from './SearchBar';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

const drawerWidth = 240;
const SIMPLE_BAR_HEIGHT = 56;

function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [healthStatus, setHealthStatus] = useState(null);
  const [checkingHealth, setCheckingHealth] = useState(true);
  const [demoBannerDismissed, setDemoBannerDismissed] = useState(() => {
    return localStorage.getItem('demo-banner-dismissed') === 'true';
  });
  const navigate = useNavigate();

  const dismissDemoBanner = () => {
    setDemoBannerDismissed(true);
    localStorage.setItem('demo-banner-dismissed', 'true');
  };
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();
  const { colorMode, toggleColorMode } = useTheme();

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  // Check health and connection security
  const checkHealth = useCallback(async () => {
    try {
      setCheckingHealth(true);
      const response = await api.get('/health');
      setHealthStatus(response.data);
      
      // In production, ensure we're using HTTPS
      if (process.env.NODE_ENV === 'production' && !response.data.secure) {
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
  }, []);

  useEffect(() => {
    checkHealth();
    // Check health every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  // Navigation: Research-first, then Cohort Exploration, then Intelligence
  const menuGroups = [
    {
      title: 'RESEARCH',
      items: [
        { text: 'Research Analytics', icon: <AnalyticsIcon />, path: '/analytics', primary: true },
        { text: 'Error & Failure Analysis', icon: <ErrorIcon />, path: '/error-analysis' },
      ]
    },
    {
      title: 'COHORT EXPLORATION',
      items: [
        { text: 'Patients', icon: <PeopleIcon />, path: '/patients' },
        { text: 'Data Explorer', icon: <AnalyticsIcon />, path: '/data-explorer' },
        { text: 'Data Insights', icon: <WarningIcon />, path: '/data-insights' },
        { text: 'Data Quality', icon: <SecurityIcon />, path: '/data-quality' },
      ]
    },
    {
      title: 'INTELLIGENCE',
      items: [
        { text: 'ML & Statistics', icon: <PsychologyIcon />, path: '/ml-statistics' },
        { text: 'Clinical Reports', icon: <PictureAsPdfIcon />, path: '/clinical-reports' },
      ]
    },
    {
      title: null, // System items - no header
      items: [
        { text: 'Profile', icon: <PersonIcon />, path: '/profile' },
        { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
        { text: 'Help', icon: <HelpOutline />, path: '/help' },
      ]
    },
  ];

  // Admin-only menu items
  const adminOnlyMenuItems = [
    { text: 'Data Upload', icon: <UploadFileIcon />, path: '/upload' },
    { text: 'Admin Dashboard', icon: <AdminPanelSettingsIcon />, path: '/admin' },
    { text: 'Audit Logs', icon: <HistoryIcon />, path: '/admin/audit-logs' },
  ];

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', background: (theme) => `linear-gradient(180deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)` }}>
      <Toolbar sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ScienceIcon sx={{ color: 'white' }} />
          </Box>
          <Typography variant="h6" noWrap component="div" sx={{ color: 'white', fontWeight: 700, fontSize: '1rem' }}>
            Hi, {user?.full_name?.split(' ')[0] || user?.username || 'there'}
          </Typography>
        </Box>
      </Toolbar>
      <List sx={{ px: 1, py: 1 }}>
        {menuGroups.map((group, groupIndex) => (
          <React.Fragment key={groupIndex}>
            {group.title && (
              <Typography
                variant="caption"
                sx={{
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontWeight: 600,
                  fontSize: '0.65rem',
                  letterSpacing: '0.1em',
                  pl: 2,
                  pt: groupIndex > 0 ? 1.5 : 0,
                  pb: 0.5,
                  display: 'block',
                }}
              >
                {group.title}
              </Typography>
            )}
            {group.items.map((item) => (
              <ListItem key={item.text} disablePadding sx={{ mb: 0.25 }}>
                <ListItemButton
                  selected={location.pathname === item.path || (item.path === '/analytics' && location.pathname === '/')}
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    borderRadius: 2,
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontWeight: item.primary ? 600 : 400,
                    borderLeft: item.primary ? '3px solid rgba(255, 255, 255, 0.5)' : 'none',
                    pl: item.primary ? 1.5 : 2,
                    py: 0.75,
                    '&.Mui-selected': {
                      background: 'rgba(255, 255, 255, 0.15)',
                      color: 'white',
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.2)',
                      },
                    },
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.1)',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'inherit',
                      minWidth: 36,
                    },
                  }}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: '0.875rem' }} />
                </ListItemButton>
              </ListItem>
            ))}
          </React.Fragment>
        ))}
        {isAdmin() && (
          <>
            <Divider sx={{ my: 2, borderColor: 'rgba(255, 255, 255, 0.2)' }} />
            {adminOnlyMenuItems.map((item) => (
              <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  selected={location.pathname === item.path || location.pathname.startsWith(item.path + '/')}
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    borderRadius: 2,
                    color: 'rgba(255, 255, 255, 0.8)',
                    '&.Mui-selected': {
                      background: 'rgba(255, 255, 255, 0.15)',
                      color: 'white',
                      '&:hover': {
                        background: 'rgba(255, 255, 255, 0.2)',
                      },
                    },
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.1)',
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'inherit',
                    },
                  }}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </>
        )}
      </List>
      <Box sx={{ mt: 'auto', p: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <ListItemButton
          selected={location.pathname === '/profile'}
          onClick={() => handleNavigation('/profile')}
          sx={{
            borderRadius: 2,
            mb: 1.5,
            color: 'rgba(255, 255, 255, 0.8)',
            '&:hover': { background: 'rgba(255, 255, 255, 0.1)' },
            '&.Mui-selected': {
              background: 'rgba(255, 255, 255, 0.15)',
              color: 'white',
            },
          }}
        >
          <Box sx={{ px: 1, width: '100%' }}>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)', fontWeight: 500, mb: 0.5 }}>
              {user?.full_name || user?.username}
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.6)', textTransform: 'capitalize' }}>
              {user?.role === 'admin' ? 'Administrator' : user?.role === 'clinician' ? 'Clinician' : user?.role || 'User'}
            </Typography>
          </Box>
        </ListItemButton>
        
        <ListItem disablePadding>
          <ListItemButton
            onClick={logout}
            sx={{
              borderRadius: 2,
              color: 'rgba(255, 255, 255, 0.8)',
              '&:hover': {
                background: 'rgba(255, 255, 255, 0.1)',
              },
              '& .MuiListItemIcon-root': {
                color: 'inherit',
              },
            }}
          >
            <ListItemIcon>
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </ListItem>
      </Box>
    </Box>
  );

  // Demo banner height for offset calculations (0 when dismissed)
  const demoBannerHeight = demoBannerDismissed ? 0 : 40;
  const totalTopOffset = demoBannerHeight + SIMPLE_BAR_HEIGHT;

  return (
    <Box sx={{ display: 'flex', width: '100%', maxWidth: '100%', overflowX: 'hidden', minWidth: 0 }}>
      {/* Research Demo Banner - Dismissible */}
      {!demoBannerDismissed && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            background: 'linear-gradient(90deg, #37474F 0%, #546E7A 50%, #37474F 100%)',
            color: 'white',
            py: 0.75,
            px: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1,
            height: 40,
            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
          }}
        >
          <WarningAmberIcon sx={{ fontSize: 18 }} />
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
            BETA TESTING WARNING — Do not add any real patient data or PHI. Use dummy data only.
          </Typography>
          <Tooltip title="Dismiss banner">
            <IconButton
              size="small"
              onClick={dismissDemoBanner}
              sx={{ color: 'white', ml: 1, '&:hover': { backgroundColor: 'rgba(255,255,255,0.15)' } }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      )}

      {/* Main AppBar: Research Dashboard on all pages */}
      <AppBar
        position="fixed"
        sx={{
          top: demoBannerHeight,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          maxWidth: '100%',
          ml: { sm: `${drawerWidth}px` },
          height: SIMPLE_BAR_HEIGHT,
          background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
        }}
      >
        <Toolbar sx={{ minHeight: `${SIMPLE_BAR_HEIGHT}px !important`, py: 0, px: { xs: 1.5, sm: 2 }, minWidth: 0, overflowX: 'auto' }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 1, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
            Research Dashboard
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          {/* Search - integrated inline */}
          <Box sx={{ width: { xs: 140, sm: 200, md: 260 }, maxWidth: '100%', ml: 1 }}>
            <SearchBar global variant="toolbar" />
          </Box>
          {healthStatus && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
              {checkingHealth ? (
                <CircularProgress size={16} sx={{ color: 'white' }} />
              ) : healthStatus.secure ? (
                <Tooltip title="Secure connection">
                  <span>
                    <Chip icon={<SecurityIcon />} label="Secure" size="small" sx={{ backgroundColor: 'rgba(76,175,80,0.9)', color: 'white', fontWeight: 600, height: 24, '& .MuiChip-icon': { color: 'white' } }} />
                  </span>
                </Tooltip>
              ) : (
                <Tooltip title="Not secure">
                  <span>
                    <Chip icon={<ErrorIcon />} label="Not Secure" size="small" sx={{ backgroundColor: 'rgba(255,152,0,0.9)', color: 'white', fontWeight: 600, height: 24, '& .MuiChip-icon': { color: 'white' } }} />
                  </span>
                </Tooltip>
              )}
            </Box>
          )}
          <Tooltip title={colorMode === 'dark' ? 'Light mode' : 'Dark mode'}>
            <IconButton color="inherit" size="small" onClick={toggleColorMode} sx={{ p: 1 }}>
              {colorMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              top: demoBannerHeight,
              height: `calc(100% - ${demoBannerHeight}px)`,
              background: (theme) => `linear-gradient(180deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              borderRight: 'none',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              top: demoBannerHeight,
              height: `calc(100% - ${demoBannerHeight}px)`,
              background: (theme) => `linear-gradient(180deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              borderRight: 'none',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3, md: 4 },
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minWidth: 0,
          maxWidth: '100%',
          overflowX: 'auto',
          mt: `${totalTopOffset}px`,
          minHeight: `calc(100vh - ${totalTopOffset}px)`,
          background: (theme) => theme.palette.background.default,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export default Layout;
