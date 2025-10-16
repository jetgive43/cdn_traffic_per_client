import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Box, Typography, Paper } from "@mui/material";
import { TrendingUp } from "@mui/icons-material";

const BandwidthGraph = ({ username, timelineData }) => {
  // Handle empty data
  if (!timelineData || timelineData.length === 0) {
    return (
      <Box sx={{ width: "100%", height: 200, p: 2, textAlign: "center" }}>
        <Typography variant="h6" color="text.secondary">
          No bandwidth data available for {username}
        </Typography>
      </Box>
    );
  }

  // Format data for Recharts
  const chartData = timelineData.map((item, index) => ({
    time: item.time.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    }),
    bandwidth: parseFloat(item.bandwidth.toFixed(2)),
    fullTime: item.time.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }),
  }));

  // Calculate some statistics
  const maxBandwidth = Math.max(...chartData.map(d => d.bandwidth));
  const avgBandwidth = chartData.reduce((sum, d) => sum + d.bandwidth, 0) / chartData.length;

  // Custom tooltip to show full timestamp
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      return (
        <Paper sx={{ p: 1, backgroundColor: "rgba(255, 255, 255, 0.95)" }}>
          <Typography variant="body2" sx={{ fontWeight: "bold" }}>
            {`Time: ${data.fullTime}`}
          </Typography>
          <Typography variant="body2" color="primary">
            {`Bandwidth: ${data.bandwidth} Mbps`}
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  return (
    <Box sx={{ width: "100%", height: 450, p: 2 }}>
      <Box sx={{ mb: 2 }}>
        <Typography
          variant="h6"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            color: "#1976d2",
            mb: 1,
          }}
        >
          <TrendingUp /> Bandwidth Over Time - {username}
        </Typography>
        <Box sx={{ display: "flex", gap: 3, mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Max: <strong>{maxBandwidth.toFixed(2)} Mbps</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Avg: <strong>{avgBandwidth.toFixed(2)} Mbps</strong>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Data Points: <strong>{chartData.length}</strong>
          </Typography>
        </Box>
      </Box>
      
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 60,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
            interval="preserveStartEnd"
          />
          <YAxis
            label={{
              value: "Bandwidth (Mbps)",
              angle: -90,
              position: "insideLeft",
            }}
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Line
            type="monotone"
            dataKey="bandwidth"
            stroke="#1976d2"
            strokeWidth={3}
            dot={{ fill: "#1976d2", strokeWidth: 2, r: 3 }}
            activeDot={{ r: 6, stroke: "#1976d2", strokeWidth: 2, fill: "#fff" }}
            name="Bandwidth (Mbps)"
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default BandwidthGraph;
