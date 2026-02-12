import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';
import { useResearch } from '../contexts/ResearchContext';

/**
 * ResearchFilters - Inline filters for research pages (Topic, Outcome, Baseline, Cohort).
 * Styled like page filters, not a bar.
 */
function ResearchFilters() {
  const { researchState, updateResearchState } = useResearch();
  const [editingQuestion, setEditingQuestion] = useState(false);
  const [questionDraft, setQuestionDraft] = useState(researchState.researchQuestion);

  useEffect(() => {
    setQuestionDraft(researchState.researchQuestion);
  }, [researchState.researchQuestion]);

  const handleSaveQuestion = () => {
    updateResearchState({ researchQuestion: questionDraft });
    setEditingQuestion(false);
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        mb: 3,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 1, display: 'block', mb: 2 }}>
        Research Context
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>
        {/* Topic / Research Question */}
        <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Topic
          </Typography>
          {editingQuestion ? (
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                fullWidth
                size="small"
                value={questionDraft}
                onChange={(e) => setQuestionDraft(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveQuestion()}
                placeholder="Research question..."
                autoFocus
              />
              <Tooltip title="Save">
                <IconButton size="small" onClick={handleSaveQuestion}>
                  <SaveIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ flex: 1 }}>
                {researchState.researchQuestion}
              </Typography>
              <Tooltip title="Edit research question">
                <IconButton size="small" onClick={() => setEditingQuestion(true)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>

        {/* Outcome */}
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Outcome</InputLabel>
          <Select
            value={researchState.outcomeVariable}
            label="Outcome"
            onChange={(e) => updateResearchState({ outcomeVariable: e.target.value })}
          >
            {researchState.outcomeOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Baseline */}
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Baseline</InputLabel>
          <Select
            value={researchState.baselineComparator}
            label="Baseline"
            onChange={(e) => updateResearchState({ baselineComparator: e.target.value })}
          >
            {researchState.baselineOptions.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Cohort definition */}
        <Box sx={{ flex: '1 1 100%', mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            Cohort
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
            <strong>Inclusion:</strong> {researchState.cohortDefinition.inclusion.join('; ')}
            {' · '}
            <strong>Exclusion:</strong> {researchState.cohortDefinition.exclusion.join('; ')}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
}

export default ResearchFilters;
