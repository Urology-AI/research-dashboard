import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import NoteIcon from '@mui/icons-material/Note';
import { useResearch } from '../contexts/ResearchContext';

/**
 * InsightCapture - Annotate insights/observations for reproducibility.
 * Supports reproducible research workflows.
 */
function InsightCapture({ compact = false }) {
  const { insights, addInsight, removeInsight, clearInsights } = useResearch();
  const [draft, setDraft] = useState('');

  const handleAdd = () => {
    if (draft.trim()) {
      addInsight({ text: draft.trim() });
      setDraft('');
    }
  };

  if (compact) {
    return (
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <TextField
          size="small"
          placeholder="Add insight..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          sx={{ minWidth: 200 }}
        />
        <Button size="small" onClick={handleAdd} startIcon={<AddIcon />}>
          Add
        </Button>
      </Box>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
          <NoteIcon fontSize="small" />
          Insights & Annotations
        </Typography>
        {insights.length > 0 && (
          <Button size="small" color="inherit" onClick={clearInsights}>
            Clear
          </Button>
        )}
      </Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Document an observation or hypothesis..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAdd()}
          multiline
          maxRows={2}
        />
        <Button variant="outlined" size="small" onClick={handleAdd} startIcon={<AddIcon />} sx={{ alignSelf: 'flex-start' }}>
          Add
        </Button>
      </Box>
      {insights.length > 0 && (
        <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
          {insights.map((insight) => (
            <ListItem
              key={insight.id}
              secondaryAction={
                <IconButton edge="end" size="small" onClick={() => removeInsight(insight.id)}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              }
            >
              <ListItemText
                primary={insight.text}
                secondary={new Date(insight.timestamp).toLocaleString()}
                primaryTypographyProps={{ variant: 'body2' }}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
}

export default InsightCapture;
