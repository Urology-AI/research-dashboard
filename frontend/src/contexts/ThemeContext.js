import React, { createContext, useContext, useState, useEffect } from 'react';
import { createTheme } from '@mui/material/styles';

// Theme presets
const themePresets = {
  'mount-sinai': {
    name: ' Brand',
    primary: '#00B5E2', //  Cyan
    secondary: '#E91E63', //  Magenta
    info: '#00B5E2',
  },
  'blue': {
    name: 'Professional Blue',
    primary: '#1976d2',
    secondary: '#dc004e',
    info: '#1976d2',
  },
  'teal': {
    name: 'Medical Teal',
    primary: '#00A896',
    secondary: '#00695C',
    info: '#00A896',
  },
  'purple': {
    name: 'Healthcare Purple',
    primary: '#7B1FA2',
    secondary: '#E91E63',
    info: '#7B1FA2',
  },
  'green': {
    name: 'Nature Green',
    primary: '#2E7D32',
    secondary: '#66BB6A',
    info: '#2E7D32',
  },
  'dark': {
    name: 'Dark Theme',
    primary: '#90CAF9',
    secondary: '#F48FB1',
    info: '#90CAF9',
    // Note: mode is now controlled separately via colorMode state
  },
  'research': {
    name: 'Research (Academic)',
    primary: '#37474F',
    secondary: '#546E7A',
    info: '#1565C0',
    // Calm, academic, publication-ready — oncology focus
  },
};

const createAppTheme = (presetKey = 'research', modeOverride = null) => {
  const preset = themePresets[presetKey] || themePresets['research'] || themePresets['mount-sinai'];
  // Use modeOverride if provided, otherwise use preset's mode, default to 'light'
  const mode = modeOverride !== null ? modeOverride : (preset.mode || 'light');
  const isDark = mode === 'dark';

  return createTheme({
    palette: {
      mode: mode,
      primary: {
        main: preset.primary,
        light: isDark ? '#BBDEFB' : '#4DD0E1',
        dark: isDark ? '#64B5F6' : '#0097A7',
        contrastText: '#ffffff',
      },
      secondary: {
        main: preset.secondary,
        light: isDark ? '#F8BBD0' : '#F06292',
        dark: isDark ? '#F48FB1' : '#C2185B',
        contrastText: '#ffffff',
      },
      success: {
        main: '#4CAF50',
        light: '#81C784',
        dark: '#388E3C',
      },
      warning: {
        main: '#FF9800',
        light: '#FFB74D',
        dark: '#F57C00',
      },
      error: {
        main: '#F44336',
        light: '#E57373',
        dark: '#D32F2F',
      },
      info: {
        main: preset.info,
        light: isDark ? '#BBDEFB' : '#4DD0E1',
        dark: isDark ? '#64B5F6' : '#0097A7',
      },
      background: {
        default: isDark ? '#121212' : '#F8FAFC',
        paper: isDark ? '#1E1E1E' : '#FFFFFF',
      },
      divider: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
      text: {
        primary: isDark ? '#FFFFFF' : '#1E293B',
        secondary: isDark ? '#B0B0B0' : '#64748B',
      },
      grey: {
        50: '#F8FAFC',
        100: '#F1F5F9',
        200: '#E2E8F0',
        300: '#CBD5E1',
        400: '#94A3B8',
        500: '#64748B',
        600: '#475569',
        700: '#334155',
        800: '#1E293B',
        900: '#0F172A',
      },
    },
    typography: {
      fontFamily: [
        'Helvetica Neue',
        'Helvetica',
        'Arial',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        'sans-serif',
      ].join(','),
      h1: {
        fontSize: '2.5rem',
        fontWeight: 700,
        lineHeight: 1.2,
        letterSpacing: '-0.02em',
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 700,
        lineHeight: 1.3,
        letterSpacing: '-0.01em',
      },
      h3: {
        fontSize: '1.75rem',
        fontWeight: 600,
        lineHeight: 1.4,
      },
      h4: {
        fontSize: '1.5rem',
        fontWeight: 600,
        lineHeight: 1.4,
      },
      h5: {
        fontSize: '1.25rem',
        fontWeight: 600,
        lineHeight: 1.5,
      },
      h6: {
        fontSize: '1.125rem',
        fontWeight: 600,
        lineHeight: 1.5,
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.6,
      },
      body2: {
        fontSize: '0.875rem',
        lineHeight: 1.5,
      },
      button: {
        textTransform: 'none',
        fontWeight: 600,
        letterSpacing: '0.02em',
      },
    },
    shape: {
      borderRadius: 12,
    },
    shadows: [
      'none',
      '0px 1px 2px rgba(15, 23, 42, 0.05)',
      '0px 1px 3px rgba(15, 23, 42, 0.1), 0px 1px 2px rgba(15, 23, 42, 0.06)',
      '0px 4px 6px -1px rgba(15, 23, 42, 0.1), 0px 2px 4px -1px rgba(15, 23, 42, 0.06)',
      '0px 10px 15px -3px rgba(15, 23, 42, 0.1), 0px 4px 6px -2px rgba(15, 23, 42, 0.05)',
      '0px 20px 25px -5px rgba(15, 23, 42, 0.1), 0px 10px 10px -5px rgba(15, 23, 42, 0.04)',
      '0px 25px 50px -12px rgba(15, 23, 42, 0.25)',
      '0px 25px 50px -12px rgba(15, 23, 42, 0.25)',
      '0px 25px 50px -12px rgba(15, 23, 42, 0.25)',
      '0px 25px 50px -12px rgba(15, 23, 42, 0.25)',
      '0px 25px 50px -12px rgba(15, 23, 42, 0.25)',
      '0px 25px 50px -12px rgba(15, 23, 42, 0.25)',
      '0px 25px 50px -12px rgba(15, 23, 42, 0.25)',
      '0px 25px 50px -12px rgba(15, 23, 42, 0.25)',
      '0px 25px 50px -12px rgba(15, 23, 42, 0.25)',
      '0px 25px 50px -12px rgba(15, 23, 42, 0.25)',
      '0px 25px 50px -12px rgba(15, 23, 42, 0.25)',
      '0px 25px 50px -12px rgba(15, 23, 42, 0.25)',
      '0px 25px 50px -12px rgba(15, 23, 42, 0.25)',
      '0px 25px 50px -12px rgba(15, 23, 42, 0.25)',
      '0px 25px 50px -12px rgba(15, 23, 42, 0.25)',
      '0px 25px 50px -12px rgba(15, 23, 42, 0.25)',
      '0px 25px 50px -12px rgba(15, 23, 42, 0.25)',
      '0px 25px 50px -12px rgba(15, 23, 42, 0.25)',
      '0px 25px 50px -12px rgba(15, 23, 42, 0.25)',
      '0px 25px 50px -12px rgba(15, 23, 42, 0.25)',
    ],
    components: {
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            boxShadow: presetKey === 'research' ? 'none' : '0px 1px 3px rgba(15, 23, 42, 0.1), 0px 1px 2px rgba(15, 23, 42, 0.06)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
            transition: 'all 0.2s ease-in-out',
            ...(presetKey !== 'research' && {
              '&:hover': {
                boxShadow: '0px 10px 15px -3px rgba(15, 23, 42, 0.1), 0px 4px 6px -2px rgba(15, 23, 42, 0.05)',
                transform: 'translateY(-2px)',
              },
            }),
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            boxShadow: '0px 1px 3px rgba(15, 23, 42, 0.1), 0px 1px 2px rgba(15, 23, 42, 0.06)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(226, 232, 240, 0.8)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            padding: '10px 24px',
            fontSize: '0.9375rem',
            fontWeight: 600,
            boxShadow: 'none',
            '&:hover': {
              boxShadow: '0px 4px 6px -1px rgba(15, 23, 42, 0.1), 0px 2px 4px -1px rgba(15, 23, 42, 0.06)',
            },
          },
          contained: {
            boxShadow: '0px 1px 2px rgba(15, 23, 42, 0.05)',
            '&:hover': {
              boxShadow: '0px 4px 6px -1px rgba(15, 23, 42, 0.1), 0px 2px 4px -1px rgba(15, 23, 42, 0.06)',
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 10,
              backgroundColor: isDark ? '#2E2E2E' : '#FFFFFF',
              '&:hover fieldset': {
                borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : '#CBD5E1',
              },
              '&.Mui-focused fieldset': {
                borderColor: preset.primary,
                borderWidth: '2px',
              },
            },
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            fontWeight: 500,
            fontSize: '0.8125rem',
          },
        },
      },
      MuiTableContainer: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(226, 232, 240, 0.8)',
            boxShadow: '0px 1px 3px rgba(15, 23, 42, 0.1), 0px 1px 2px rgba(15, 23, 42, 0.06)',
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            backgroundColor: isDark ? '#2E2E2E' : '#F8FAFC',
            '& .MuiTableCell-head': {
              fontWeight: 600,
              fontSize: '0.875rem',
              color: isDark ? 'rgba(255, 255, 255, 0.7)' : '#475569',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              borderBottom: isDark ? '2px solid rgba(255, 255, 255, 0.12)' : '2px solid #E2E8F0',
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: {
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid #F1F5F9',
            padding: '16px',
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 20,
            boxShadow: '0px 25px 50px -12px rgba(15, 23, 42, 0.25)',
          },
        },
      },
      MuiAppBar: {
        styleOverrides: {
          root: {
            boxShadow: '0px 1px 3px rgba(15, 23, 42, 0.1), 0px 1px 2px rgba(15, 23, 42, 0.06)',
            borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(226, 232, 240, 0.8)',
          },
        },
      },
    },
  });
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(() => {
    // Load theme from localStorage or default to research (academic)
    const savedTheme = localStorage.getItem('app-theme');
    return savedTheme && themePresets[savedTheme] ? savedTheme : 'research';
  });

  const [colorMode, setColorModeState] = useState(() => {
    // Load color mode from localStorage or default to 'light'
    const savedMode = localStorage.getItem('app-color-mode');
    return savedMode === 'dark' || savedMode === 'light' ? savedMode : 'light';
  });

  const theme = createAppTheme(currentTheme, colorMode);

  const changeTheme = (themeKey) => {
    if (themePresets[themeKey]) {
      setCurrentTheme(themeKey);
      localStorage.setItem('app-theme', themeKey);
    }
  };

  const toggleColorMode = () => {
    const newMode = colorMode === 'light' ? 'dark' : 'light';
    setColorModeState(newMode);
    localStorage.setItem('app-color-mode', newMode);
  };

  const setColorMode = (mode) => {
    if (mode === 'light' || mode === 'dark') {
      setColorModeState(mode);
      localStorage.setItem('app-color-mode', mode);
    }
  };

  const getAvailableThemes = () => {
    return Object.keys(themePresets).map(key => ({
      key,
      ...themePresets[key],
    }));
  };

  const getCurrentThemeInfo = () => {
    return {
      key: currentTheme,
      ...themePresets[currentTheme],
    };
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        currentTheme,
        colorMode,
        changeTheme,
        toggleColorMode,
        setColorMode,
        getAvailableThemes,
        getCurrentThemeInfo,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export { themePresets };
