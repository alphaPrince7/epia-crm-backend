/**
 * Task 2 (Part B) — endpoint that sends a WhatsApp reminder for an appointment,
 * records the message status, and returns a clear result. A provider failure
 * produces a 502 with a safe message — it never crashes the server.
 */
const express = require("express");
const db = require("../db/database");
const { sendReminder } = require("../services/whatsapp");

const router = express.Router();

// POST /appointments/:id/reminder
router.post("/:id/reminder", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid appointment id" });
  }

  const appointment = db.prepare("SELECT * FROM appointments WHERE id = ?").get(id);
  if (!appointment) {
    return res.status(404).json({ error: "Appointment not found" });
  }

  const result = await sendReminder({
    to: appointment.phone,
    patientName: appointment.name,
    date: appointment.date,
  });

  // Record every attempt (sent or failed) for an audit trail.
  db.prepare(
    "INSERT INTO messages (appointmentId, status, providerId, error) VALUES (?, ?, ?, ?)"
  ).run(id, result.status, result.providerId || null, result.error || null);

  if (result.status === "sent") {
    return res.status(200).json({ status: "sent", providerId: result.providerId });
  }
  // Upstream provider failed, but our app handled it gracefully.
  return res.status(502).json({ status: "failed", error: result.error });
});

// GET /appointments/:id/messages — see the delivery log for a demo
router.get("/:id/messages", (req, res) => {
  const id = Number(req.params.id);
  const rows = db
    .prepare("SELECT * FROM messages WHERE appointmentId = ? ORDER BY id DESC")
    .all(id);
  return res.json(rows);
});

module.exports = router;
