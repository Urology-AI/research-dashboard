import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Search as SearchIcon,
  HelpOutline as HelpIcon,
  Analytics as AnalyticsIcon,
  UploadFile as UploadIcon,
  Settings as SettingsIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';

function Help() {
  const [searchQuery, setSearchQuery] = useState('');
  const [expanded, setExpanded] = useState('');

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const faqCategories = [
    {
      title: 'Getting Started',
      icon: <HelpIcon />,
      items: [
        {
          question: 'How do I log in?',
          answer: 'Use your username and password provided by your administrator. If you don\'t have credentials, contact your system administrator.',
        },
        {
          question: 'What are the different user roles?',
          answer: 'There are two main roles: Administrator (full access including data upload) and User (view analytics and data).',
        },
        {
          question: 'How do I navigate the dashboard?',
          answer: 'Use the sidebar menu to navigate between different sections. Research Analytics is the default landing page for comparative analysis and model validation.',
        },
      ],
    },
    {
      title: 'Data Analytics',
      icon: <AnalyticsIcon />,
      items: [
        {
          question: 'What analytics are available?',
          answer: 'Research Analytics provides comparative analysis: AI vs baseline risk stratification, treatment comparison, temporal trends, and cohort summary. Error & Failure Analysis shows false positives/negatives and subgroup performance.',
        },
        {
          question: 'How do I use the Data Explorer?',
          answer: 'The Data Explorer allows you to create interactive scatter plots to analyze correlations between different variables (PSA, Gleason Score, Age). Use filters to focus on specific patient cohorts and see correlation coefficients.',
        },
        {
          question: 'What is Data Insights?',
          answer: 'Data Insights shows statistical patterns, anomalies, and outliers in your data. It identifies rising PSA cases, high-risk patient cohorts, and statistical outliers (>2 standard deviations from mean).',
        },
        {
          question: 'How do I compare patients?',
          answer: 'Use the Compare page to select up to 5 patients and view them side-by-side. This is useful for analyzing differences in clinical parameters across patients.',
        },
      ],
    },
    {
      title: 'Data Management',
      icon: <UploadIcon />,
      items: [
        {
          question: 'How do I upload patient data?',
          answer: 'Admins can upload Excel/CSV files or connect to REDCap. Go to Data Upload page (admin only). MRN is the only required field - all other fields are optional.',
        },
        {
          question: 'What file formats are supported?',
          answer: 'Excel (.xlsx) and CSV files are supported. The system automatically detects column names and maps them to patient fields.',
        },
        {
          question: 'How do I manage REDCap connections?',
          answer: 'Admins can configure REDCap connections in Admin Dashboard > REDCap Configurations. API tokens are encrypted for security.',
        },
        {
          question: 'Can I edit patient data?',
          answer: 'This is a data analytics platform. Patient data should be managed in your primary EMR system. Data here is for analysis and visualization purposes.',
        },
      ],
    },
    {
      title: 'Reports & Export',
      icon: <BarChartIcon />,
      items: [
        {
          question: 'What reports can I generate?',
          answer: 'Clinical Reports generates surgical intelligence PDFs, PSA analysis, and risk assessment. Export patient lists as CSV/Excel from the Patients page. Research Analytics exports figures with metadata.',
        },
        {
          question: 'How do I export data?',
          answer: 'Export filtered patient lists from the Patients page (CSV/Excel). Export patient summary JSON from Patient Detail. Export figures with metadata from Research Analytics.',
        },
        {
          question: 'Can I export individual patient data?',
          answer: 'Yes, on the patient detail page you can export a patient summary for analysis purposes.',
        },
      ],
    },
    {
      title: 'Settings & Customization',
      icon: <SettingsIcon />,
      items: [
        {
          question: 'How do I change the theme?',
          answer: 'Go to Settings > Appearance tab. You can select different color themes and toggle between light/dark mode.',
        },
        {
          question: 'How do I change my password?',
          answer: 'Go to Settings > Account tab and click "Change Password".',
        },
        {
          question: 'What is Two-Factor Authentication?',
          answer: '2FA adds an extra layer of security. You can enable it in Settings > Account. You\'ll need an authenticator app (like Google Authenticator) to generate codes.',
        },
      ],
    },
  ];

  const filteredCategories = faqCategories.map(category => ({
    ...category,
    items: category.items.filter(item =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter(category => category.items.length > 0);

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
        Help & Documentation
      </Typography>
      <Typography variant="body2" color="textSecondary" paragraph>
        Find answers to common questions about the Research Dashboard
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search help topics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {filteredCategories.map((category, categoryIndex) => (
        <Paper key={categoryIndex} sx={{ mb: 2 }}>
          <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
            {category.icon}
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {category.title}
            </Typography>
          </Box>
          {category.items.map((item, itemIndex) => {
            const panelId = `panel-${categoryIndex}-${itemIndex}`;
            return (
              <Accordion
                key={itemIndex}
                expanded={expanded === panelId}
                onChange={handleChange(panelId)}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {item.question}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="textSecondary">
                    {item.answer}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            );
          })}
        </Paper>
      ))}

      {searchQuery && filteredCategories.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="textSecondary">
            No results found for "{searchQuery}"
          </Typography>
        </Paper>
      )}

      <Paper sx={{ p: 3, mt: 3, bgcolor: 'info.light', color: 'info.contrastText' }}>
        <Typography variant="h6" gutterBottom>
          Need More Help?
        </Typography>
        <Typography variant="body2">
          For additional support, please contact your system administrator or IT support team.
        </Typography>
      </Paper>
    </Box>
  );
}

export default Help;
