const fs = require("fs");

/**
 * Read log file and return as array of strings (lines)
 * @param {string} filePath - Path to the log file
 * @returns {string[]} Array of log lines
 */
function getLogLines(filePath) {
  try {
    const data = fs.readFileSync(filePath, "utf8");
    return data.split("\n").filter((line) => line.trim() !== "");
  } catch (error) {
    console.error("Error reading log file:", error.message);
    return [];
  }
}

/**
 * Parse log entries into structured objects
 * @param {string} filePath - Path to the log file
 * @returns {Array} Array of parsed log objects
 */
function parseLogFile(filePath) {
  const lines = getLogLines(filePath);

  return lines.map((line, index) => {
    const parts = line.split("**");
    return {
      lineNumber: index + 1,
      ip: parts[0] || "",
      timestamp: parts[1] || "",
      host: parts[2] || "",
      request: parts[3] || "",
      status: parts[4] || "",
      size: parts[5] || "",
      referer: parts[6] || "",
      userAgent: parts[7] || "",
      responseTime: parts[8] || "",
    };
  });
}

/**
 * Extract specific field as array
 * @param {string} filePath - Path to the log file
 * @param {string} field - Field to extract ('ip', 'timestamp', 'status', etc.)
 * @returns {string[]} Array of field values
 */
function extractField(filePath, field) {
  const parsedLogs = parseLogFile(filePath);
  return parsedLogs
    .map((entry) => entry[field])
    .filter((value) => value !== "");
}

/**
 * Filter log entries based on condition
 * @param {string} filePath - Path to the log file
 * @param {Function} filterFn - Filter function
 * @returns {string[]} Filtered log lines
 */
function filterLogs(filePath, filterFn) {
  const lines = getLogLines(filePath);
  return lines.filter(filterFn);
}

/**
 * Get unique values from a specific field
 * @param {string} filePath - Path to the log file
 * @param {string} field - Field to get unique values from
 * @returns {string[]} Array of unique values
 */
function getUniqueValues(filePath, field) {
  const values = extractField(filePath, field);
  return [...new Set(values)];
}

/**
 * Group log entries by host name and count occurrences
 * @param {string} filePath - Path to the log file
 * @returns {Object} Object with host names as keys and counts as values
 */
function groupByHostName(filePath) {
  const parsedLogs = parseLogFile(filePath);
  const hostCounts = {};

  parsedLogs.forEach((entry) => {
    const host = entry.host;
    if (host) {
      hostCounts[host] = (hostCounts[host] || 0) + 1;
    }
  });

  return hostCounts;
}

/**
 * Group log entries by host name and sum up size field
 * @param {string} filePath - Path to the log file
 * @returns {Object} Object with host names as keys and total sizes as values
 */
function groupByHostNameWithSize(filePath) {
  const parsedLogs = parseLogFile(filePath);
  const hostSizes = {};

  parsedLogs.forEach((entry) => {
    const host = entry.host;
    const size = parseInt(entry.size) || 0;

    if (host) {
      hostSizes[host] = (hostSizes[host] || 0) + size;
    }
  });

  return hostSizes;
}

/**
 * Get host names with their counts sorted by frequency
 * @param {string} filePath - Path to the log file
 * @returns {Array} Array of objects with host and count, sorted by count
 */
function getHostNameStats(filePath) {
  const hostCounts = groupByHostName(filePath);

  return Object.entries(hostCounts)
    .map(([host, count]) => ({ host, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Get host names with their total sizes sorted by size
 * @param {string} filePath - Path to the log file
 * @returns {Array} Array of objects with host, count, and total size, sorted by size
 */
function getHostNameStatsWithSize(filePath) {
  const hostCounts = groupByHostName(filePath);
  const hostSizes = groupByHostNameWithSize(filePath);

  return Object.entries(hostCounts)
    .map(([host, count]) => {
      const totalSize = hostSizes[host] || 0;
      const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

      // Get time range for transfer rate calculation
      const hostLogs = getLogsByHostName(filePath, host);       
      const timestamps = hostLogs.map((log) => log.timestamp).sort();
      const firstRequest = timestamps[0] || "N/A";
      const lastRequest = timestamps[timestamps.length - 1] || "N/A";

      let transferRateBytesPerSecond = 0;
      let transferRateMBPerSecond = 0;
      let timeDifferenceSeconds = 0;

      if (firstRequest !== "N/A" && lastRequest !== "N/A") {
        timeDifferenceSeconds = calculateTimeDifference(
          firstRequest,
          lastRequest
        );

        if (timeDifferenceSeconds > 0) {
          transferRateBytesPerSecond = totalSize / timeDifferenceSeconds;
          transferRateMBPerSecond = transferRateBytesPerSecond / (1024 * 1024);
        }
      }
      if (count > 2) {
        return {
          host,
          count,
          totalSize,
          totalSizeMB,
          timeDifferenceSeconds: timeDifferenceSeconds,
          timeDifferenceMinutes: timeDifferenceSeconds / 60,
          transferRateBytesPerSecond: transferRateBytesPerSecond.toFixed(2),
          transferRateMBPerSecond: transferRateMBPerSecond.toFixed(4),
          firstRequest,
          lastRequest,
        };
      }
    })
    .sort((a, b) => b.totalSize - a.totalSize);
}

/**
 * Get logs for a specific host name
 * @param {string} filePath - Path to the log file
 * @param {string} hostName - Host name to filter by
 * @returns {Array} Array of log entries for the specified host
 */
function getLogsByHostName(filePath, hostName) {
  const parsedLogs = parseLogFile(filePath);
  return parsedLogs.filter((entry) => entry.host === hostName);
}

/**
 * Parse timestamp to Date object
 * @param {string} timestamp - Timestamp string like "[10/Sep/2025:06:45:01 +0000]"
 * @returns {Date} Date object
 */
function parseTimestamp(timestamp) {
  try {
    // Remove brackets and parse the timestamp
    const cleanTimestamp = timestamp.replace(/[\[\]]/g, "");
    // Format: "10/Sep/2025:06:45:01 +0000"

    // Split by the first colon to separate date and time
    const colonIndex = cleanTimestamp.indexOf(":");
    const datePart = cleanTimestamp.substring(0, colonIndex);
    const timePart = cleanTimestamp.substring(colonIndex + 1);

    // Parse date part: "10/Sep/2025"
    const [day, month, year] = datePart.split("/");

    // Parse time part: "06:45:01 +0000"
    const timeAndTimezone = timePart.split(" ");
    const timeOnly = timeAndTimezone[0]; // "06:45:01"
    const [hour, minute, second] = timeOnly.split(":");

    // Convert month name to number
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthIndex = monthNames.indexOf(month);

    return new Date(
      year,
      monthIndex,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    );
  } catch (error) {
    return new Date();
  }
}

/**
 * Calculate time difference in seconds between two timestamps
 * @param {string} firstTimestamp - First timestamp
 * @param {string} lastTimestamp - Last timestamp
 * @returns {number} Time difference in seconds
 */
function calculateTimeDifference(firstTimestamp, lastTimestamp) {
  const firstDate = parseTimestamp(firstTimestamp);
  const lastDate = parseTimestamp(lastTimestamp);


  if (isNaN(firstDate.getTime()) || isNaN(lastDate.getTime())) {
    console.error("Invalid dates detected, returning 0");
    return 0;
  }

  const timeDiff = (lastDate - firstDate) / 1000;

  return timeDiff;
}

/**
 * Get comprehensive summary for a specific DNS/host name
 * @param {string} filePath - Path to the log file
 * @param {string} hostName - Host name to analyze
 * @returns {Object} Summary object with all statistics for the host
 */
function getHostSummary(filePath, hostName) {
  const hostLogs = getLogsByHostName(filePath, hostName);

  if (hostLogs.length === 0) {
    return {
      hostName: hostName,
      totalRequests: 0,
      message: "No logs found for this host",
    };
  }

  // Calculate statistics
  const totalRequests = hostLogs.length;
  const uniqueIPs = [...new Set(hostLogs.map((log) => log.ip))];
  const statusCodes = hostLogs.map((log) => log.status);
  const statusCounts = {};
  statusCodes.forEach((status) => {
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  // Calculate total data transferred (sum of size field)
  const totalSize = hostLogs.reduce((sum, log) => {
    const size = parseInt(log.size) || 0;
    return sum + size;
  }, 0);

  // Calculate average response time
  const responseTimes = hostLogs.map(
    (log) => parseFloat(log.responseTime) || 0
  );
  const avgResponseTime =
    responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) /
        responseTimes.length
      : 0;

  // Get unique user agents
  const uniqueUserAgents = [...new Set(hostLogs.map((log) => log.userAgent))];

  // Get time range and calculate transfer rate
  const timestamps = hostLogs.map((log) => log.timestamp);
  const sortedTimestamps = timestamps.sort();
  const firstRequest = sortedTimestamps[0] || "N/A";
  const lastRequest = sortedTimestamps[sortedTimestamps.length - 1] || "N/A";

  // Calculate time difference and transfer rate
  let timeDifferenceSeconds = 0;
  let transferRateBytesPerSecond = 0;
  let transferRateMBPerSecond = 0;

  if (firstRequest !== "N/A" && lastRequest !== "N/A") {
    timeDifferenceSeconds = calculateTimeDifference(firstRequest, lastRequest);
    if (timeDifferenceSeconds > 0) {
      transferRateBytesPerSecond = totalSize / timeDifferenceSeconds;
      transferRateMBPerSecond = transferRateBytesPerSecond / (1024 * 1024);
    }
  }

  return {
    hostName: hostName,
    totalRequests: totalRequests,
    uniqueIPs: uniqueIPs.length,
    ipList: uniqueIPs,
    statusCodeBreakdown: statusCounts,
    totalDataTransferred: totalSize,
    totalDataTransferredMB: (totalSize / (1024 * 1024)).toFixed(2),
    averageResponseTime: avgResponseTime.toFixed(3),
    uniqueUserAgents: uniqueUserAgents.length,
    userAgentList: uniqueUserAgents,
    firstRequest: firstRequest,
    lastRequest: lastRequest,
    timeDifferenceSeconds: timeDifferenceSeconds.toFixed(2),
    timeDifferenceMinutes: (timeDifferenceSeconds / 60).toFixed(2),
    transferRateBytesPerSecond: transferRateBytesPerSecond.toFixed(2),
    transferRateMBPerSecond: transferRateMBPerSecond.toFixed(4),
    allLogEntries: hostLogs,
  };
}

/**
 * Get summary for all hosts with their totals
 * @param {string} filePath - Path to the log file
 * @returns {Array} Array of host summaries sorted by total requests
 */
function getAllHostsSummary(filePath) {
  const hostStats = getHostNameStats(filePath);

  return hostStats.map((stat) => {
    const summary = getHostSummary(filePath, stat.host);
    return {
      hostName: stat.host,
      totalRequests: stat.count,
      uniqueIPs: summary.uniqueIPs,
      totalDataTransferredMB: summary.totalDataTransferredMB,
      averageResponseTime: summary.averageResponseTime,
      statusCodeBreakdown: summary.statusCodeBreakdown,
    };
  });
}

/**
 * Parse log content from string (similar to parseLogFile but for string input)
 * @param {string} logContent - The log content as a string
 * @returns {Array} Array of parsed log entries
 */
function parseLogFileContent(logContent) {
  if (!logContent || typeof logContent !== "string") {
    return [];
  }

  const lines = logContent.split("\n").filter((line) => line.trim() !== "");
  const parsedLogs = [];
  
  lines.forEach((line, index) => {
    try {
      const parts = line.split("**");
      if (parts.length >= 6) {
        const logEntry = {
          lineNumber: index + 1,
          ip: parts[0] || "",
          timestamp: parts[1] || "",
          host: parts[2] || "",
          request: parts[3] || "",
          status: parts[4] || "",
          size: parts[5] || "",
          referer: parts[6] || "",
          userAgent: parts[7] || "",
          responseTime: parts[8] || "",
        };
        parsedLogs.push(logEntry);
      }
    } catch (error) {
      console.error(`Error parsing line ${index + 1}: ${error.message}`);
    }
  });

  return parsedLogs;
}

module.exports = {
  getLogLines,
  parseLogFile,
  extractField,
  filterLogs,
  getUniqueValues,
  groupByHostName,
  groupByHostNameWithSize,
  getHostNameStats,
  getHostNameStatsWithSize,
  getLogsByHostName,
  getHostSummary,
  getAllHostsSummary,
  parseTimestamp,
  parseLogFileContent,
  calculateTimeDifference,
};
