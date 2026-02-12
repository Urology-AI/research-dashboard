import React from 'react';
import {
  Box,
  Typography,
} from '@mui/material';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { format } from 'date-fns';

/**
 * PSATrendChart - Event-aligned timeline with optional prediction overlay.
 * Supports: observed PSA, predicted trajectory, confidence interval.
 * Design: Publication-ready, analytical tool for longitudinal reasoning.
 */
function PSATrendChart({ data, trends, predictedTrajectory, showPredictionOverlay = false }) {
  // Support both 'data' and 'trends' prop names for backward compatibility
  const trendData = data || trends || [];
  
  if (!trendData || !Array.isArray(trendData) || trendData.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="textSecondary">
          No PSA trend data available
        </Typography>
      </Box>
    );
  }
  
  const chartData = trendData.map((point) => ({
    date: format(new Date(point.date), 'MM/dd/yyyy'),
    psa: point.value,
    fullDate: point.date,
    predicted: point.predicted,
    lower: point.lower,
    upper: point.upper,
  }));

  // Merge predicted trajectory if provided
  const mergedData = predictedTrajectory?.length
    ? [...chartData, ...predictedTrajectory.map((p) => ({
        date: format(new Date(p.date), 'MM/dd/yyyy'),
        psa: null,
        predicted: p.value,
        lower: p.lower,
        upper: p.upper,
      }))]
    : chartData;

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={mergedData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis label={{ value: 'PSA (ng/mL)', angle: -90, position: 'insideLeft', fontSize: 11 }} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="psa"
          stroke="#1565C0"
          strokeWidth={2}
          dot={{ r: 4 }}
          name="Observed PSA"
          connectNulls
        />
        {showPredictionOverlay && (
          <>
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="#C62828"
              strokeWidth={1.5}
              strokeDasharray="5 5"
              dot={false}
              name="Predicted"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="upper"
              stroke="#C62828"
              strokeWidth={0.5}
              strokeOpacity={0.5}
              dot={false}
              name="95% CI upper"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="lower"
              stroke="#C62828"
              strokeWidth={0.5}
              strokeOpacity={0.5}
              dot={false}
              name="95% CI lower"
              connectNulls
            />
          </>
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export default PSATrendChart;
