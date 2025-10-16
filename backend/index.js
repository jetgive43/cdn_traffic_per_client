const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const router = require("./routes/router");
const mysql = require("mysql2/promise");
const axios = require("axios");

require("dotenv/config");

const app = express();
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "123qwe!@#QWE",
  database: "dns_database",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

function matchesDomain(host, domain) {
  if (!host || !domain) return false;
  if (domain.startsWith("*.")) {
    const baseDomain = domain.slice(2);
    return host.includes(baseDomain);
  }
  if (host === domain) {
    return true;
  }
  if (host.includes(domain)) {
    return true;
  }
  return false;
}

async function updatednsdate(req, res) {
  try {
    const result = await axios.get(
      "http://194.120.230.143:3000/data/domain?orderby=bandwidth&category=4",
      {
        timeout: 120000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );
    const domain_list = await axios.get(
      "https://slave.host-palace.net/user_domain_list"
    );
    const value_data = [];
    for (const cdn_data of result.data) {
      const host = cdn_data.domain;
      const bandwidth = cdn_data.bandwidth;
      value_data.push({ host, bandwidth });
    }
    if (!Array.isArray(domain_list.data)) {
      return res.status(500).json({ error: "domain_list is not an array" });
    }
    const domain_result = [];
    let host_domain = "";
    let bandwidth__u = 0;
    value_data.forEach((val_d) => {
      const matched = domain_list.data.find((d) =>
        matchesDomain(val_d.host, d.domain)
      );
      if (matched) {
        const username = matched.username;
        const domain__u = matched.domain;
        host_domain = val_d.host;
        bandwidth__u = val_d.bandwidth;
        domain_result.push({
          username,
          domain__u,
          host_domain,
          bandwidth__u,
        });
      }
    });
    domain_result.sort((a, b) => b.bandwidth__u - a.bandwidth__u);
    const user_name_data = {};
    domain_result.forEach((val) => {
      const username = val.username;
      if (!user_name_data[username]) {
        user_name_data[username] = {
          timeline: "",
          bandwidth__u: 0,
        };
      }
      user_name_data[username].bandwidth__u += val.bandwidth__u;
      user_name_data[username].timeline = new Date().toISOString().slice(0, 19).replace('T', ' ');
    });
    const delete_sql = `DELETE FROM traffic_graph WHERE recorded_at < NOW() - INTERVAL 7 DAY`;
    await pool.query(delete_sql);
    const query = `
      INSERT INTO traffic_graph (user_name, bandwidth ,timeline)
      VALUES (?, ?, ?)
    `;
    const sorted = Object.entries(user_name_data).sort(
      (a, b) => b.bandwidth__u - a.bandwidth__u
    );
    for (const [index, val] of sorted) {
      const user_name = index;
      await pool.execute(query, [user_name, val.bandwidth__u, val.timeline]);
    }
    console.log("Traffic table processed successfully.");
  } catch (err) {
    console.error("Error fetching API:", err.message);
  }
}
updatednsdate();
setInterval(updatednsdate, 5 * 60 * 1000);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use("/", router);

app.use("/getusername_dns", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM traffic");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

app.use("/getusername_dns_graph", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM traffic_graph");
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch data" });
  }
});

const port = process.env.PORT || 4001;
const server = app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
