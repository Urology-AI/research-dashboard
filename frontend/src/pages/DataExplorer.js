import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Autocomplete,
} from '@mui/material';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { getPatients } from '../services/api';

/**
 * DataExplorer - Explore correlations and relationships in your cohort data.
 * Framed by the research question; use filters to focus on your study population.
 */
function DataExplorer() {
  const [patients, setPatients] = useState([]);
  const [filteredPatients, setFilteredPatients] = useState([]);
  const [xAxis, setXAxis] = useState('psa_level');
  const [yAxis, setYAxis] = useState('gleason_score');
  const [filters, setFilters] = useState({
    risk_category: '',
    age_min: '',
    age_max: '',
    psa_min: '',
    psa_max: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [patients, filters, xAxis, yAxis]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getPatients({}, 0, 1000);
      setPatients(data);
      setFilteredPatients(data);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...patients];

    if (filters.risk_category) {
      filtered = filtered.filter(p => {
        if (filters.risk_category === 'high') {
          return (p.gleason_score >= 8 || p.psa_level > 20);
        } else if (filters.risk_category === 'low') {
          return (p.gleason_score <= 6 && p.psa_level < 10);
        } else if (filters.risk_category === 'intermediate') {
          return !((p.gleason_score >= 8 || p.psa_level > 20) || (p.gleason_score <= 6 && p.psa_level < 10));
        }
        return true;
      });
    }

    if (filters.age_min) {
      filtered = filtered.filter(p => p.age >= parseInt(filters.age_min));
    }
    if (filters.age_max) {
      filtered = filtered.filter(p => p.age <= parseInt(filters.age_max));
    }
    if (filters.psa_min) {
      filtered = filtered.filter(p => p.psa_level >= parseFloat(filters.psa_min));
    }
    if (filters.psa_max) {
      filtered = filtered.filter(p => p.psa_level <= parseFloat(filters.psa_max));
    }

    setFilteredPatients(filtered);
  };

  const scatterData = filteredPatients
    .filter(p => p[xAxis] != null && p[yAxis] != null)
    .map(p => ({
      x: p[xAxis],
      y: p[yAxis],
      name: `${p.first_name} ${p.last_name}`,
      mrn: p.mrn,
      risk: p.gleason_score >= 8 || p.psa_level > 20 ? 'high' : 
            p.gleason_score <= 6 && p.psa_level < 10 ? 'low' : 'intermediate',
    }));

  const calculateCorrelation = () => {
    if (scatterData.length < 2) return 0;
    
    const xValues = scatterData.map(d => d.x);
    const yValues = scatterData.map(d => d.y);
    
    const xMean = xValues.reduce((a, b) => a + b, 0) / xValues.length;
    const yMean = yValues.reduce((a, b) => a + b, 0) / yValues.length;
    
    let numerator = 0;
    let xSumSq = 0;
    let ySumSq = 0;
    
    for (let i = 0; i < scatterData.length; i++) {
      const xDiff = xValues[i] - xMean;
      const yDiff = yValues[i] - yMean;
      numerator += xDiff * yDiff;
      xSumSq += xDiff * xDiff;
      ySumSq += yDiff * yDiff;
    }
    
    const denominator = Math.sqrt(xSumSq * ySumSq);
    return denominator === 0 ? 0 : numerator / denominator;
  };

  const correlation = calculateCorrelation();

  const axisOptions = [
    { value: 'psa_level', label: 'PSA Level' },
    { value: 'gleason_score', label: 'Gleason Score' },
    { value: 'age', label: 'Age' },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
        Data Explorer
      </Typography>
      <Typography variant="body1" color="textSecondary" paragraph>
        Explore correlations in your cohort — filter by risk, age, PSA to focus on your research population
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* Filters */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Filters
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Risk Category</InputLabel>
              <Select
                value={filters.risk_category}
                label="Risk Category"
                onChange={(e) => setFilters({ ...filters, risk_category: e.target.value })}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="low">Low Risk</MenuItem>
                <MenuItem value="intermediate">Intermediate Risk</MenuItem>
                <MenuItem value="high">High Risk</MenuItem>
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Min Age"
              type="number"
              value={filters.age_min}
              onChange={(e) => setFilters({ ...filters, age_min: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Max Age"
              type="number"
              value={filters.age_max}
              onChange={(e) => setFilters({ ...filters, age_max: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Min PSA"
              type="number"
              value={filters.psa_min}
              onChange={(e) => setFilters({ ...filters, psa_min: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Max PSA"
              type="number"
              value={filters.psa_max}
              onChange={(e) => setFilters({ ...filters, psa_max: e.target.value })}
            />
          </Paper>
        </Grid>

        {/* Scatter Plot */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">
                Correlation Analysis
              </Typography>
              <Chip 
                label={`Correlation: ${correlation.toFixed(3)}`}
                color={Math.abs(correlation) > 0.5 ? 'primary' : 'default'}
              />
            </Box>
            <Box display="flex" gap={2} mb={2}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>X-Axis</InputLabel>
                <Select value={xAxis} label="X-Axis" onChange={(e) => setXAxis(e.target.value)}>
                  {axisOptions.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Y-Axis</InputLabel>
                <Select value={yAxis} label="Y-Axis" onChange={(e) => setYAxis(e.target.value)}>
                  {axisOptions.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <ResponsiveContainer width="100%" height={400}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  type="number" 
                  dataKey="x" 
                  name={axisOptions.find(o => o.value === xAxis)?.label}
                />
                <YAxis 
                  type="number" 
                  dataKey="y" 
                  name={axisOptions.find(o => o.value === yAxis)?.label}
                />
                <Tooltip 
                  cursor={{ strokeDasharray: '3 3' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload[0]) {
                      const data = payload[0].payload;
                      return (
                        <Paper sx={{ p: 1 }}>
                          <Typography variant="body2"><strong>{data.name}</strong></Typography>
                          <Typography variant="caption">MRN: {data.mrn}</Typography>
                          <Typography variant="caption" display="block">
                            {axisOptions.find(o => o.value === xAxis)?.label}: {data.x}
                          </Typography>
                          <Typography variant="caption" display="block">
                            {axisOptions.find(o => o.value === yAxis)?.label}: {data.y}
                          </Typography>
                          <Chip 
                            label={data.risk} 
                            size="small" 
                            color={data.risk === 'high' ? 'error' : data.risk === 'low' ? 'success' : 'warning'}
                            sx={{ mt: 0.5 }}
                          />
                        </Paper>
                      );
                    }
                    return null;
                  }}
                />
                <Scatter data={scatterData} fill="#1976d2" />
              </ScatterChart>
            </ResponsiveContainer>
            <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
              Showing {scatterData.length} of {filteredPatients.length} patients
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Summary Statistics */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Total Patients (Filtered)
              </Typography>
              <Typography variant="h4">{filteredPatients.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Average {axisOptions.find(o => o.value === xAxis)?.label}
              </Typography>
              <Typography variant="h4">
                {scatterData.length > 0 
                  ? (scatterData.reduce((sum, d) => sum + d.x, 0) / scatterData.length).toFixed(2)
                  : 'N/A'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom variant="body2">
                Average {axisOptions.find(o => o.value === yAxis)?.label}
              </Typography>
              <Typography variant="h4">
                {scatterData.length > 0 
                  ? (scatterData.reduce((sum, d) => sum + d.y, 0) / scatterData.length).toFixed(2)
                  : 'N/A'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default DataExplorer;
