/**
 * Task 3 — Follow-up feature.
 *   (1) create a follow-up for an appointment
 *   (2) record date, status, optional notes
 *   (3) retrieve pending follow-ups
 *   (4) mark a follow-up complete
 *   (5) prevent duplicate follow-ups for the same appointment + date
 *       (enforced by a UNIQUE constraint in the DB, checked here for a clean 409)
 */
const express = require("express");
const db = require("../db/database");
const { requireFields, validateDate } = require("../middleware/validate");

const router = express.Router();

// POST /followups → create
router.post("/", (req, res) => {
  const { appointmentId, date, notes } = req.body || {};

  const errors = [
    ...requireFields(req.body || {}, ["appointmentId", "date"]),
    ...validateDate(date),
  ];
  if (errors.length) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }

  // The appointment must exist (referential integrity + a friendly 404).
  const appt = db.prepare("SELECT id FROM appointments WHERE id = ?").get(Number(appointmentId));
  if (!appt) {
    return res.status(404).json({ error: "Appointment not found" });
  }

  // Duplicate guard: same appointment + same date already has a follow-up.
  const dup = db
    .prepare("SELECT id FROM followups WHERE appointmentId = ? AND date = ?")
    .get(Number(appointmentId), String(date).trim());
  if (dup) {
    return res.status(409).json({
      error: "A follow-up already exists for this appointment on this date",
      existingFollowUpId: dup.id,
    });
  }

  try {
    const info = db
      .prepare("INSERT INTO followups (appointmentId, date, notes) VALUES (?, ?, ?)")
      .run(Number(appointmentId), String(date).trim(), notes ? String(notes) : null);
    const followup = db.prepare("SELECT * FROM followups WHERE id = ?").get(info.lastInsertRowid);
    return res.status(201).json({ message: "Follow-up created", followup });
  } catch (err) {
    // Backstop in case of a race that slips past the check above.
    if (String(err.message).includes("UNIQUE")) {
      return res.status(409).json({ error: "Duplicate follow-up for this appointment and date" });
    }
    throw err;
  }
});

// GET /followups/pending → list pending follow-ups (Task 3.3)
router.get("/pending", (_req, res) => {
  const rows = db
    .prepare("SELECT * FROM followups WHERE status = 'pending' ORDER BY date ASC")
    .all();
  return res.json(rows);
});

// PATCH /followups/:id/complete → mark complete (Task 3.4)
router.patch("/:id/complete", (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid follow-up id" });
  }

  const followup = db.prepare("SELECT * FROM followups WHERE id = ?").get(id);
  if (!followup) {
    return res.status(404).json({ error: "Follow-up not found" });
  }
  if (followup.status === "completed") {
    return res.status(200).json({ message: "Already completed", followup });
  }

  db.prepare(
    "UPDATE followups SET status = 'completed', completedAt = datetime('now') WHERE id = ?"
  ).run(id);
  const updated = db.prepare("SELECT * FROM followups WHERE id = ?").get(id);
  return res.json({ message: "Follow-up completed", followup: updated });
});

module.exports = router;
