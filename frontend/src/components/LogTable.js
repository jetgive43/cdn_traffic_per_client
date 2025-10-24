import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert,
  Button,
  Grid,
  Card,
  CardContent,
  IconButton,
  Collapse,
  Tabs,
  Tab,
  Chip,
} from "@mui/material";
import {
  Refresh,
  Storage,
  Speed,
  Timeline,
  TableChart,
} from "@mui/icons-material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import BandwidthGraph from "./BandwidthGraph";

const LogTable = () => {
  const [userStats, setUserStats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const API_BASE_URL = "http://92.246.87.165:4001";
  const [openRowIndex, setOpenRowIndex] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [userStats1, setUserStats1] = useState([]);
  const [loading1, setLoading1] = useState(false);
  const [error1, setError1] = useState(null);
  const API_BASE_URL1 = "http://92.246.87.165:4000"; // Tracks which row's menu is open
  const [openRowIndex1, setOpenRowIndex1] = useState(null);

  const toggleRow1 = (index) => {
    setOpenRowIndex1(openRowIndex1 === index ? null : index);
  };

  const convertToMbps1 = (bandwidth) => {
    return bandwidth * 8;
  };

  const formatSpeed = (speed) => {
    if (speed >= 1000) {
      const gbps = speed / 1000;
      return `${gbps.toFixed(2)} Gbps`;
    } else {
      return `${speed.toFixed(2)} Mbps`;
    }
  };

  const fetchLogData1 = async () => {
    setLoading1(true);
    setError1(null);
    try {
      fetch(`${API_BASE_URL1}/getusername_dns`)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then((result) => {
          const users_data = result;
          const aggregation = {};
          if (users_data) {
            users_data.forEach((data) => {
              const username = data.user_name;
              const bandwidthMbps = convertToMbps1(data.bandwidth);
              const five_bandwidth = bandwidthMbps;
              if (!aggregation[username]) {
                aggregation[username] = {
                  username,
                  domains: [],
                  totalMps: 0,
                };
              }
              const exists = aggregation[username].domains.find(
                (d) => d.domain === data.domain
              );
              if (!exists) {
                aggregation[username].domains.push({
                  domain: data.domain,
                  speed: five_bandwidth,
                });
              } else {
                exists.speed += five_bandwidth;
              }
              aggregation[username].totalMps += five_bandwidth;
            });
          }

          const userAggregationArray = Object.values(aggregation);
          userAggregationArray.sort((a, b) => b.totalMps - a.totalMps);
          setUserStats1(userAggregationArray);
          setLoading1(false);
        })
        .catch((error) => {
          console.error("Error fetching data:", error);
          setLoading1(false);
        });
    } catch (err) {
      setError(
        "Failed to fetch log data. Make sure the backend server is running."
      );
      console.error("Error fetching log data:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (index) => {
    setOpenRowIndex(openRowIndex === index ? null : index);
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const TrafficTable = ({ userStats }) => {
    if (!userStats || userStats.length === 0) {
      return (
        <Box sx={{ p: 2, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            No traffic data available
          </Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ flexGrow: 1 }}>
        {error1 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error1}
          </Alert>
        )}

        <Grid container spacing={2}>
          {/* User Bandwidth Statistics */}
          <Grid sx={{ width: "100%" }}>
            <Card>
              <CardContent sx={{ p: 0 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "end",
                    alignItems: "center",
                  }}
                >
                  <Button
                    variant="contained"
                    startIcon={<Refresh />}
                    onClick={fetchLogData1}
                    disabled={loading1}
                    sx={{ float: "right", marginBottom: "15px" }}
                  >
                    Refresh
                  </Button>
                </Box>

                {loading1 ? (
                  <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <TableContainer component={Paper}>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>
                            <strong>Username</strong>
                          </TableCell>
                          <TableCell align="center">
                            <strong>Total Mbps</strong>
                          </TableCell>
                          <TableCell align="center">
                            <strong>WildcardS</strong>
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {userStats1.map((user, index) => (
                          <React.Fragment key={index}>
                            <TableRow hover>
                              <TableCell>
                                <Typography
                                  variant="body2"
                                  sx={{ fontWeight: "bold" }}
                                >
                                  {user.username}
                                </Typography>
                              </TableCell>
                              <TableCell align="center">
                                <Chip
                                  label={`${formatSpeed(user.totalMps)}`}
                                  color="primary"
                                  size="small"
                                />
                              </TableCell>
                              <TableCell
                                sx={{
                                  display: "flex",
                                  justifyContent: "center",
                                  alignItems: "center",
                                }}
                              >
                                <IconButton
                                  size="small"
                                  onClick={() => toggleRow1(index)}
                                >
                                  {openRowIndex1 === index ? (
                                    <KeyboardArrowUpIcon />
                                  ) : (
                                    <KeyboardArrowDownIcon />
                                  )}
                                </IconButton>
                              </TableCell>
                            </TableRow>
                            <TableRow>
                              <TableCell
                                colSpan={3}
                                style={{ paddingBottom: 0, paddingTop: 0 }}
                              >
                                <Collapse
                                  in={openRowIndex1 === index}
                                  timeout="auto"
                                  unmountOnExit
                                >
                                  <Box
                                    margin={1}
                                    sx={{ maxHeight: 350, overflow: "auto" }}
                                  >
                                    <Table
                                      size="small"
                                      aria-label="nested table"
                                    >
                                      <TableHead>
                                        <TableRow>
                                          <TableCell>Domain</TableCell>
                                          <TableCell>Total Mbps</TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {user.domains.map((domain, i) => (
                                          <TableRow key={i}>
                                            <TableCell>
                                              {domain.domain}
                                            </TableCell>
                                            <TableCell>
                                              {formatSpeed(domain.speed) || 0}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                  </Box>
                                </Collapse>
                              </TableCell>
                            </TableRow>
                          </React.Fragment>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  };

  const convertToMbps = (bandwidth) => {
    return bandwidth * 8;
  };

  const fetchLogData = async () => {
    setLoading(true);
    setError(null);
    try {
      fetch(`${API_BASE_URL}/getusername_dns_graph`)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then((result) => {
          const users_data = result;
          const aggregation = {};
          if (users_data) {
            users_data.forEach((data) => {
              const username = data.user_name;
              const bandwidthMbps = convertToMbps(data.bandwidth);
              const five_multiple = bandwidthMbps * 5;
              const timeline = new Date(data.timeline);

              if (!aggregation[username]) {
                aggregation[username] = {
                  username,
                  totalMps: 0,
                  timelineData: [],
                };
              }
              aggregation[username].totalMps = five_multiple;
              aggregation[username].timelineData.push({
                time: timeline,
                bandwidth: five_multiple,
                timestamp: data.timeline,
              });
            });
          }

          Object.values(aggregation).forEach((user) => {
            user.timelineData.sort((a, b) => a.time - b.time);
          });

          const userAggregationArray = Object.values(aggregation);
          userAggregationArray.sort((a, b) => b.totalMps - a.totalMps);
          setUserStats(userAggregationArray);
          setLoading(false);
        })
        .catch((error) => {
          console.error("Error fetching data:", error);
          setLoading(false);
        });
    } catch (err) {
      setError(
        "Failed to fetch log data. Make sure the backend server is running."
      );
      console.error("Error fetching log data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogData();
    fetchLogData1();
    const interval1 = setInterval(fetchLogData1, 1 * 60 * 1000);
    const interval = setInterval(fetchLogData, 2 * 60 * 1000);
    return () => {
      clearInterval(interval);
      clearInterval(interval1);
    };
  }, []);

  return (
    <Box sx={{ p: 2, flexGrow: 1 }}>
      <Typography
        variant="h4"
        gutterBottom
        sx={{
          mb: 3,
          display: "flex",
          alignItems: "center",
          gap: 1,
          color: "#000000",
        }}
      >
        <Storage /> Bandwidth Analytics Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Main Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          aria-label="main tabs"
          variant="fullWidth"
        >
          <Tab
            icon={<Timeline />}
            label="Graph Table"
            iconPosition="start"
            sx={{ minHeight: 48 }}
          />
          <Tab
            icon={<TableChart />}
            label="Traffic Table"
            iconPosition="start"
            sx={{ minHeight: 48 }}
          />
        </Tabs>
      </Box>

      <Grid container spacing={2}>
        {/* User Bandwidth Statistics */}
        <Grid sx={{ width: "100%" }}>
          <Card>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <Speed /> {activeTab === 0 ? "Graph View" : "Traffic Summary"}
                </Typography>
              </Box>

              {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Box>
                  {activeTab === 0 ? (
                    // Graph Table View
                    <TableContainer component={Paper}>
                      <Button
                        variant="contained"
                        startIcon={<Refresh />}
                        onClick={fetchLogData}
                        disabled={loading}
                        sx={{ float: "right", marginBottom: "15px" }}
                      >
                        Refresh
                      </Button>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>
                              <strong>Username</strong>
                            </TableCell>
                            <TableCell align="center">
                              <strong>Graph</strong>
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {userStats.map((user, index) => (
                            <React.Fragment key={index}>
                              <TableRow hover>
                                <TableCell>
                                  <Typography
                                    variant="body2"
                                    sx={{ fontWeight: "bold" }}
                                  >
                                    {user.username}
                                  </Typography>
                                </TableCell>
                                <TableCell
                                  sx={{
                                    display: "flex",
                                    justifyContent: "center",
                                    alignItems: "center",
                                  }}
                                >
                                  <IconButton
                                    size="small"
                                    onClick={() => toggleRow(index)}
                                  >
                                    {openRowIndex === index ? (
                                      <KeyboardArrowUpIcon />
                                    ) : (
                                      <KeyboardArrowDownIcon />
                                    )}
                                  </IconButton>
                                </TableCell>
                              </TableRow>
                              <TableRow>
                                <TableCell
                                  colSpan={2}
                                  style={{ paddingBottom: 0, paddingTop: 0 }}
                                >
                                  <Collapse
                                    in={openRowIndex === index}
                                    timeout="auto"
                                    unmountOnExit
                                  >
                                    <Box margin={1}>
                                      {user.timelineData &&
                                      user.timelineData.length > 0 ? (
                                        <BandwidthGraph
                                          username={user.username}
                                          timelineData={user.timelineData}
                                        />
                                      ) : (
                                        <Box sx={{ p: 2, textAlign: "center" }}>
                                          <Typography
                                            variant="body2"
                                            color="text.secondary"
                                          >
                                            No timeline data available for this
                                            user
                                          </Typography>
                                        </Box>
                                      )}
                                    </Box>
                                  </Collapse>
                                </TableCell>
                              </TableRow>
                            </React.Fragment>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  ) : (
                    <TrafficTable userStats={userStats1} />
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LogTable;
