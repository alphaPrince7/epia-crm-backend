/**
 * EPIA CRM backend — app wiring.
 * Exported separately from the server so tests can import the app without
 * opening a port.
 */
const express = require("express");

const appointments = require("./routes/appointments");
const reminders = require("./routes/reminders");
const followups = require("./routes/followups");

const app = express();

// THE key fix from Task 1: without this, req.body is undefined on every POST.
app.use(express.json());

// Simple request log (non-sensitive).
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/appointments", appointments);
app.use("/appointments", reminders); // /appointments/:id/reminder, /messages
app.use("/followups", followups);

// 404 for anything unmatched.
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// Global error handler — the last line of defence so a thrown error returns
// a clean 500 instead of crashing the process.
app.use((err, _req, res, _next) => {
  console.error(`[error] ${err.message}`);
  res.status(500).json({ error: "Internal server error" });
});

module.exports = app;
