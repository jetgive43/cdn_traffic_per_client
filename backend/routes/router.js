const express = require("express");
const router = express.Router();
const path = require("path");
const axios = require("axios");
const {
  getLogLines,
  parseLogFile,
  parseLogFileContent,
  getHostNameStatsWithSize,
  calculateTimeDifference,
} = require("../utils/logParser");

// IP to Long conversion function
function ipToLong(ip) {
  const parts = ip.split(".");
  return (
    ((parseInt(parts[0]) << 24) >>> 0) +
    ((parseInt(parts[1]) << 16) >>> 0) +
    ((parseInt(parts[2]) << 8) >>> 0) +
    (parseInt(parts[3]) >>> 0)
  );
}

async function getDnsData() {
  const res = await axios.get("https://slave.host-palace.net/user_domain_list");
  const data_entries = res.data;
  return data_entries;
}

// Get all log lines as string array
router.get("/getlogs", async (req, res) => {
  try {
    const logFilePath = path.join(__dirname, "..", "stream3510570066.log");
    const logLines = getLogLines(logFilePath);

    res.json({
      success: true,
      totalLines: logLines.length,
      lines: logLines,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get parsed log entries
router.get("/getlogs/parsed", async (req, res) => {
  try {
    const logFilePath = path.join(__dirname, "..", "stream3510570066.log");
    const parsedLogs = parseLogFile(logFilePath);

    res.json({
      success: true,
      totalEntries: parsedLogs.length,
      entries: parsedLogs,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get host statistics with size information (sorted by total size)
router.get("/getlogs/hosts/stats-with-size", async (req, res) => {
  try {
    const logFilePath = path.join(__dirname, "..", "stream3510570066.log");
    const hostStatsWithSize = getHostNameStatsWithSize(logFilePath);

    res.json({
      success: true,
      totalHosts: hostStatsWithSize.length,
      hostStats: hostStatsWithSize,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Get node list and read log files from category 4 servers
router.get("/getlogs/category4/nodes", async (req, res) => {
  try {
    // Get node list from the API
    const nodeListResponse = await axios.get(
      "https://slave.host-palace.net/portugal_cdn/get_node_list"
    );

    if (!nodeListResponse.data || !Array.isArray(nodeListResponse.data)) {
      throw new Error("Invalid response from node list API");
    }

    // Filter servers with category 4
    const category4Servers = nodeListResponse.data.filter(
      (server) => server.category === 4
    );

    // Read log files from category 4 servers
    const logResults = [];

    for (const server of category4Servers) {
      try {
        const ip = server.ip;
        const ipLong = ipToLong(ip);
        const logUrl = `http://${ip}:29876/stream${ipLong}.log`;

        // Try to fetch the log file with a timeout
        const logResponse = await axios.get(logUrl, {
          timeout: 10000, // 10 second timeout
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        logResults.push({
          server: server,
          ip: ip,
          ipLong: ipLong,
          logUrl: logUrl,
          success: true,
          logContent: logResponse.data,
          logSize: logResponse.data.length,
          contentType: logResponse.headers["content-type"] || "unknown",
        });

        console.log(
          `Successfully read log from ${ip} (${logResponse.data.length} characters)`
        );
      } catch (logError) {
        console.log(
          `Failed to read log from ${server.ip}: ${logError.message}`
        );

        logResults.push({
          server: server,
          ip: server.ip,
          ipLong: ipToLong(server.ip),
          logUrl: `http://${server.ip}:29876/stream${ipToLong(server.ip)}.log`,
          success: false,
          error: logError.message,
          logContent: null,
          logSize: 0,
        });
      }
    }

    // Summary statistics
    const successfulReads = logResults.filter((result) => result.success);
    const failedReads = logResults.filter((result) => !result.success);
    const totalLogSize = successfulReads.reduce(
      (sum, result) => sum + result.logSize,
      0
    );

    res.json({
      success: true,
      summary: {
        totalNodes: nodeListResponse.data.length,
        category4Servers: category4Servers.length,
        successfulLogReads: successfulReads.length,
        failedLogReads: failedReads.length,
        totalLogSize: totalLogSize,
        totalLogSizeMB: (totalLogSize / (1024 * 1024)).toFixed(2),
      },
      category4Servers: category4Servers,
      logResults: logResults,
    });
  } catch (error) {
    console.error("Error in category4 nodes endpoint:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      details: "Failed to fetch node list or read log files",
    });
  }
});

// Get only the node list (without reading log files)
router.get("/getlogs/category4/nodes-only", async (req, res) => {
  try {
    console.log("Fetching node list from slave.host-palace.net...");

    // Get node list from the API
    const nodeListResponse = await axios.get(
      "https://slave.host-palace.net/portugal_cdn/get_node_list"
    );

    if (!nodeListResponse.data || !Array.isArray(nodeListResponse.data)) {
      throw new Error("Invalid response from node list API");
    }

    // Filter servers with category 4
    const category4Servers = nodeListResponse.data.filter(
      (server) => server.category === 4
    );

    // Add IP to Long conversion for each server
    const serversWithIpLong = category4Servers.map((server) => ({
      ...server,
      ipLong: ipToLong(server.ip),
      logUrl: `http://${server.ip}:29876/stream${ipToLong(server.ip)}.log`,
    }));

    res.json({
      success: true,
      summary: {
        totalNodes: nodeListResponse.data.length,
        category4Servers: category4Servers.length,
      },
      category4Servers: serversWithIpLong,
      allNodes: nodeListResponse.data,
    });
  } catch (error) {
    console.error("Error in category4 nodes-only endpoint:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      details: "Failed to fetch node list",
    });
  }
});

// Get category 4 nodes with valid log content (filter out null and empty)
router.get("/getlogs/category4/valid-nodes", async (req, res) => {
  try {
    console.log("Fetching category 4 nodes with valid log content...");

    // Query parameters
    const includeContent = req.query.includeContent !== "false"; // Include by default
    const includeLines = req.query.includeLines === "true"; // Don't include by default (can be large)
    const maxContentLength = parseInt(req.query.maxContentLength) || null; // Limit content length if specified

    console.log(
      `Options: includeContent=${includeContent}, includeLines=${includeLines}, maxContentLength=${maxContentLength}`
    );

    // Get node list from the API
    const nodeListResponse = await axios.get(
      "https://slave.host-palace.net/portugal_cdn/get_node_list"
    );

    if (!nodeListResponse.data || !Array.isArray(nodeListResponse.data)) {
      throw new Error("Invalid response from node list API");
    }

    // Filter servers with category 4
    const category4Servers = nodeListResponse.data.filter(
      (server) => server.category === 4
    );
    console.log(`Category 4 servers found: ${category4Servers.length}`);

    // Check each category 4 server for valid log content
    const validNodes = [];
    const invalidNodes = [];

    for (const server of category4Servers) {
      try {
        const ip = server.ip;
        const ipLong = ipToLong(ip);
        const logUrl = `http://${ip}:29876/stream${ipLong}.log`;

        console.log(`Checking log content from: ${logUrl}`);

        // Try to fetch the log file with a timeout
        const logResponse = await axios.get(logUrl, {
          timeout: 10000, // 10 second timeout
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        // Check if log content is valid (not null and not empty)
        if (
          logResponse.data !== null &&
          logResponse.data !== undefined &&
          typeof logResponse.data === "string" &&
          logResponse.data.trim() !== ""
        ) {
          // Count lines in the log content
          const lines = logResponse.data
            .split("\n")
            .filter((line) => line.trim() !== "");

          // Prepare the node data
          const nodeData = {
            server: server,
            ip: ip,
            ipLong: ipLong,
            logUrl: logUrl,
            logSize: logResponse.data.length,
            logSizeMB: (logResponse.data.length / (1024 * 1024)).toFixed(2),
            logSizeKB: (logResponse.data.length / 1024).toFixed(2),
            totalLines: lines.length,
            hasValidContent: true,
            contentPreview:
              logResponse.data.substring(0, 200) +
              (logResponse.data.length > 200 ? "..." : ""),
            status: "success",
          };

          // Conditionally add full log content
          if (includeContent) {
            let logContent = logResponse.data;

            // Limit content length if specified
            if (maxContentLength && logContent.length > maxContentLength) {
              logContent =
                logContent.substring(0, maxContentLength) +
                `\n... [Content truncated. Original size: ${logResponse.data.length} chars]`;
            }

            nodeData.logContent = logContent;
          }

          // Conditionally add log lines array
          if (includeLines) {
            nodeData.logLines = lines;
          }

          validNodes.push(nodeData);

          console.log(
            `✅ Valid log content from ${ip} - ${lines.length} lines, ${(
              logResponse.data.length / 1024
            ).toFixed(2)} KB`
          );
        } else {
          invalidNodes.push({
            server: server,
            ip: ip,
            ipLong: ipLong,
            logUrl: logUrl,
            logSize: 0,
            hasValidContent: false,
            reason: "Empty or null log content",
            status: "invalid_content",
          });

          console.log(`❌ Invalid log content from ${ip} - empty or null`);
        }
      } catch (logError) {
        console.log(
          `❌ Failed to fetch log from ${server.ip}: ${logError.message}`
        );

        invalidNodes.push({
          server: server,
          ip: server.ip,
          ipLong: ipToLong(server.ip),
          logUrl: `http://${server.ip}:29876/stream${ipToLong(server.ip)}.log`,
          logSize: 0,
          hasValidContent: false,
          reason: `Network error: ${logError.message}`,
          status: "network_error",
        });
      }
    }

    // Calculate summary statistics
    const totalLogSize = validNodes.reduce(
      (sum, node) => sum + node.logSize,
      0
    );
    const totalLines = validNodes.reduce(
      (sum, node) => sum + node.totalLines,
      0
    );

    res.json({
      success: true,
      summary: {
        totalNodes: nodeListResponse.data.length,
        category4Servers: category4Servers.length,
        validNodes: validNodes.length,
        invalidNodes: invalidNodes.length,
        validPercentage:
          ((validNodes.length / category4Servers.length) * 100).toFixed(2) +
          "%",
        totalLogSize: totalLogSize,
        totalLogSizeMB: (totalLogSize / (1024 * 1024)).toFixed(2),
        totalLogSizeGB: (totalLogSize / (1024 * 1024 * 1024)).toFixed(3),
        totalLines: totalLines,
      },
      // Valid category 4 nodes with non-null, non-empty log content
      validNodes: validNodes,
      // Invalid nodes (null, empty, or network errors)
      invalidNodes: invalidNodes,
      // Quick access to just the valid server info
      validServerIPs: validNodes.map((node) => ({
        ip: node.ip,
        ipLong: node.ipLong,
        logUrl: node.logUrl,
        logSizeMB: node.logSizeMB,
      })),
    });
  } catch (error) {
    console.error("Error in category4 valid-nodes endpoint:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      details: "Failed to fetch node list or check log content validity",
    });
  }
});

// Process log content per IP address from validNodes array
router.get("/getlogs/category4/process-content", async (req, res) => {
  try {
    console.log("Processing log content per IP address from validNodes...");

    // First, get the valid nodes with log content
    const validNodesResponse = await axios.get(
      "http://localhost:4000/getlogs/category4/valid-nodes?includeContent=true"
    );

    if (!validNodesResponse.data.success) {
      throw new Error("Failed to fetch valid nodes data");
    }

    const validNodes = validNodesResponse.data.validNodes;
    console.log(
      `Processing ${validNodes.length} valid nodes with log content...`
    );

    const processedResults = [];

    for (const node of validNodes) {
      try {
        const ip = node.ip;
        const logContent = node.logContent;

        if (!logContent) {
          console.log(`⚠️ No log content for IP ${ip}`);
          continue;
        }

        console.log(`🔍 Processing log content for IP: ${ip}`);

        // Parse the log content using the parseLogFileContent function
        const parsedLogs = parseLogFileContent(logContent);
        const hostCounts = {};
        const hostSizes = {};

        parsedLogs.forEach((entry) => {
          const host = entry.host;
          const size = parseInt(entry.size) || 0;
          if (host) {
            hostCounts[host] = (hostCounts[host] || 0) + 1;
            hostSizes[host] = (hostSizes[host] || 0) + size;
          }
        });

        const hostStatsArray = Object.entries(hostCounts)
          .map(([host, count]) => {
            const ipRegex = /^(?:\d{1,3}\.){3}\d{1,3}$/;
            if (ipRegex.test(host)) return null;
            const totalSize = hostSizes[host] || 0;
            const hostLogs = parsedLogs.filter((entry) => entry.host === host);
            const timestamps = hostLogs.map((log) => log.timestamp).sort();
            const firstRequest = timestamps[0] || "N/A";
            const lastRequest = timestamps[timestamps.length - 1] || "N/A";

            let transferRateBytesPerSecond = 0;
            let transferRateMBPerSecond = 0;
            let transferRateMbps = 0;
            let timeDifferenceSeconds = 0;

            if (firstRequest !== "N/A" && lastRequest !== "N/A") {
              timeDifferenceSeconds = calculateTimeDifference(
                firstRequest,
                lastRequest
              );

              if (timeDifferenceSeconds > 0) {
                transferRateBytesPerSecond = totalSize / timeDifferenceSeconds;
                transferRateMBPerSecond =
                  transferRateBytesPerSecond / (1024 * 1024);
                transferRateMbps = (transferRateBytesPerSecond * 8) / 1_000_000;
              }
            }

            if (count > 2) {
              return {
                host,
                count,
                totalSize,
                timeDifferenceSeconds,
                timeDifferenceSeconds,
                timeDifferenceMinutes: (timeDifferenceSeconds / 60).toFixed(2),
                transferRateMBPerSecond: transferRateMBPerSecond.toFixed(2),
                transferRateMbps: transferRateMbps.toFixed(2),
              };
            }
          })
          .filter(Boolean) // remove undefined
          .sort((a, b) => b.totalSize - a.totalSize);
        processedResults.push({
          serverIP: ip,
          serverIPLong: node.ipLong,
          logUrl: node.logUrl,
          originalLogSize: node.logSize,
          originalLogSizeMB: node.logSizeMB,
          hostStatistics: hostStatsArray,
        });

        console.log(
          `✅ Processed ${parsedLogs.length} log entries for IP ${ip} - ${hostStatsArray.length} unique hosts`
        );
      } catch (error) {
        console.error(`❌ Error processing IP ${node.ip}: ${error.message}`);

        processedResults.push({
          serverIP: node.ip,
          serverIPLong: node.ipLong,
          logUrl: node.logUrl,
          error: error.message,
          status: "processing_error",
        });
      }
    }

    res.json({
      success: true,
      summary: {
        validNodesProcessed: validNodes.length,
        successfullyProcessed: processedResults.filter((r) => !r.error).length,
        processingErrors: processedResults.filter((r) => r.error).length,
      },
      processedLogContent: processedResults,
    });
  } catch (error) {
    console.error("Error in process-content endpoint:", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      details: "Failed to process log content from validNodes",
    });
  }
});

router.get("/getdns/traffic", async (req, res) => {
  try {
    const groups_data = await getDnsData();

    res.status(200).json(groups_data);
  } catch (error) {
    res.status(500).json({
      sucess: false,
      error: error.message,
    });
  }
});
module.exports = router;
