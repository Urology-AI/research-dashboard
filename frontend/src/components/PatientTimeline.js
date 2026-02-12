import React from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Divider,
} from '@mui/material';
import {
  LocalHospital as HospitalIcon,
  Science as ScienceIcon,
  Person as PersonIcon,
} from '@mui/icons-material';

function PatientTimeline({ patientId, procedures = [], labResults = [] }) {
  // Combine all events into a single timeline
  const events = [];

  // Add procedures
  if (procedures && procedures.length > 0) {
    procedures.forEach((proc) => {
      events.push({
        type: 'procedure',
        date: new Date(proc.procedure_date),
        title: `Procedure: ${proc.procedure_type || 'Unknown'}`,
        description: `${proc.provider || 'N/A'}${proc.facility ? ` at ${proc.facility}` : ''}`,
        details: proc.notes,
        icon: <HospitalIcon />,
        color: 'primary',
      });
    });
  }

  // Add lab results
  if (labResults && labResults.length > 0) {
    labResults.forEach((lab) => {
      events.push({
        type: 'lab_result',
        date: new Date(lab.test_date),
        title: `${lab.test_type}: ${lab.test_value || 'N/A'} ${lab.test_unit || ''}`,
        description: lab.reference_range ? `Ref: ${lab.reference_range}` : '',
        details: lab.notes,
        icon: <ScienceIcon />,
        color: 'secondary',
      });
    });
  }

  // Follow-ups removed - follow-up scheduling is an EMR feature
  // Patient creation event removed - not needed for analytics timeline

  // Sort by date (most recent first)
  events.sort((a, b) => b.date - a.date);

  if (events.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="textSecondary">
          No timeline events available
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {events.map((event, index) => (
        <Box key={index} sx={{ mb: 3, position: 'relative', pl: 4 }}>
          {/* Timeline line */}
          {index < events.length - 1 && (
            <Box
              sx={{
                position: 'absolute',
                left: '15px',
                top: '40px',
                bottom: '-24px',
                width: '2px',
                bgcolor: 'divider',
              }}
            />
          )}
          
          {/* Timeline dot */}
          <Box
            sx={{
              position: 'absolute',
              left: '8px',
              top: '8px',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              border: '2px solid',
              borderColor: `${event.color}.main`,
              bgcolor: 'background.paper',
              zIndex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Box sx={{ fontSize: '10px' }}>{event.icon}</Box>
          </Box>

          {/* Event content */}
          <Paper elevation={2} sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {event.title}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {event.date.toLocaleDateString()}
                <br />
                {event.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Typography>
            </Box>
            {event.description && (
              <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                {event.description}
              </Typography>
            )}
            {event.details && (
              <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic' }}>
                {event.details}
              </Typography>
            )}
            <Chip
              label={event.type.replace(/_/g, ' ').toUpperCase()}
              size="small"
              color={event.color}
              sx={{ mt: 1 }}
            />
          </Paper>
        </Box>
      ))}
    </Box>
  );
}

export default PatientTimeline;
