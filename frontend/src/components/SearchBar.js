import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  CircularProgress,
  InputAdornment,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Person as PersonIcon,
  LocalHospital as HospitalIcon,
  Science as ScienceIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { searchPatients, globalSearch } from '../services/api';

function SearchBar({ onSelectPatient, global = false, variant = 'default' }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        if (global) {
          const data = await globalSearch(query);
          setResults(data);
        } else {
          const data = await searchPatients(query);
          setResults({ patients: data });
        }
        setOpen(true);
      } catch (err) {
        console.error('Search error:', err);
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 300); // Debounce 300ms

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, global]);

  const handleSelectPatient = (patientId) => {
    setOpen(false);
    setQuery('');
    if (onSelectPatient) {
      onSelectPatient(patientId);
    } else {
      navigate(`/patients/${patientId}`);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'patient':
        return <PersonIcon fontSize="small" />;
      case 'procedure':
        return <HospitalIcon fontSize="small" />;
      case 'lab_result':
        return <ScienceIcon fontSize="small" />;
      case 'follow_up':
        return <CalendarIcon fontSize="small" />;
      default:
        return null;
    }
  };

  const isToolbar = variant === 'toolbar';

  return (
    <Box ref={searchRef} sx={{ position: 'relative', width: '100%' }}>
      <TextField
        fullWidth
        placeholder={global ? "Search patients, procedures..." : "Search patients..."}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => {
          if (results && query.trim().length >= 2) {
            setOpen(true);
          }
        }}
        size="small"
        sx={isToolbar ? {
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'rgba(255,255,255,0.15)',
            borderRadius: 2,
            '& fieldset': {
              borderColor: 'rgba(255,255,255,0.3)',
              borderWidth: 1,
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255,255,255,0.5)',
            },
            '&.Mui-focused fieldset': {
              borderColor: 'rgba(255,255,255,0.8)',
              borderWidth: 1.5,
            },
            '& input': {
              color: 'white',
              '&::placeholder': { color: 'rgba(255,255,255,0.7)', opacity: 1 },
            },
          },
          '& .MuiInputAdornment-root .MuiSvgIcon-root': {
            color: 'rgba(255,255,255,0.9)',
          },
        } : {}}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={isToolbar ? { color: 'rgba(255,255,255,0.9)' } : {}} />
            </InputAdornment>
          ),
          endAdornment: loading && (
            <InputAdornment position="end">
              <CircularProgress size={20} sx={isToolbar ? { color: 'rgba(255,255,255,0.9)' } : {}} />
            </InputAdornment>
          ),
        }}
      />

      {open && results && (
        <Paper
          elevation={8}
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            mt: 1,
            maxHeight: 400,
            overflow: 'auto',
            zIndex: 1300,
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          {results.patients && results.patients.length > 0 && (
            <>
              <Box sx={{ p: 1, bgcolor: 'background.default' }}>
                <Typography variant="caption" color="textSecondary">
                  Patients ({results.patients.length})
                </Typography>
              </Box>
              <List dense>
                {results.patients.map((patient) => (
                  <ListItem key={patient.id} disablePadding>
                    <ListItemButton onClick={() => handleSelectPatient(patient.id)}>
                      <PersonIcon sx={{ mr: 1, color: 'text.secondary' }} />
                      <ListItemText
                        primary={`${patient.first_name || ''} ${patient.last_name || ''}`.trim() || 'Unnamed'}
                        secondary={`MRN: ${patient.mrn}${patient.diagnosis ? ` | ${patient.diagnosis}` : ''}`}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </>
          )}

          {global && results.procedures && results.procedures.length > 0 && (
            <>
              {results.patients && results.patients.length > 0 && <Divider />}
              <Box sx={{ p: 1, bgcolor: 'background.default' }}>
                <Typography variant="caption" color="textSecondary">
                  Procedures ({results.procedures.length})
                </Typography>
              </Box>
              <List dense>
                {results.procedures.map((procedure) => (
                  <ListItem key={procedure.id} disablePadding>
                    <ListItemButton onClick={() => handleSelectPatient(procedure.patient_id)}>
                      <HospitalIcon sx={{ mr: 1, color: 'text.secondary' }} />
                      <ListItemText
                        primary={procedure.procedure_type || 'Procedure'}
                        secondary={`${procedure.patient_name} (MRN: ${procedure.patient_mrn})`}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </>
          )}

          {global && results.lab_results && results.lab_results.length > 0 && (
            <>
              {(results.patients?.length > 0 || results.procedures?.length > 0) && <Divider />}
              <Box sx={{ p: 1, bgcolor: 'background.default' }}>
                <Typography variant="caption" color="textSecondary">
                  Lab Results ({results.lab_results.length})
                </Typography>
              </Box>
              <List dense>
                {results.lab_results.map((lab) => (
                  <ListItem key={lab.id} disablePadding>
                    <ListItemButton onClick={() => handleSelectPatient(lab.patient_id)}>
                      <ScienceIcon sx={{ mr: 1, color: 'text.secondary' }} />
                      <ListItemText
                        primary={`${lab.test_type}: ${lab.test_value || 'N/A'} ${lab.test_unit || ''}`}
                        secondary={`${lab.patient_name} (MRN: ${lab.patient_mrn})`}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </>
          )}

          {global && results.follow_ups && results.follow_ups.length > 0 && (
            <>
              {(results.patients?.length > 0 || results.procedures?.length > 0 || results.lab_results?.length > 0) && <Divider />}
              <Box sx={{ p: 1, bgcolor: 'background.default' }}>
                <Typography variant="caption" color="textSecondary">
                  Follow-ups ({results.follow_ups.length})
                </Typography>
              </Box>
              <List dense>
                {results.follow_ups.map((followUp) => (
                  <ListItem key={followUp.id} disablePadding>
                    <ListItemButton onClick={() => handleSelectPatient(followUp.patient_id)}>
                      <CalendarIcon sx={{ mr: 1, color: 'text.secondary' }} />
                      <ListItemText
                        primary={followUp.follow_up_type || 'Follow-up'}
                        secondary={`${followUp.patient_name} (MRN: ${followUp.patient_mrn})`}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            </>
          )}

          {(!results.patients || results.patients.length === 0) &&
            (!global || (
              (!results.procedures || results.procedures.length === 0) &&
              (!results.lab_results || results.lab_results.length === 0) &&
              (!results.follow_ups || results.follow_ups.length === 0)
            )) && (
              <Box sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="textSecondary">
                  No results found
                </Typography>
              </Box>
            )}
        </Paper>
      )}
    </Box>
  );
}

export default SearchBar;
