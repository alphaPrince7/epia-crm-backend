/**
 * Task 1 — Appointments API (debugged + hardened).
 *
 * Original bugs this fixes:
 *   - No express.json() → req.body was undefined (added at app level).
 *   - GET compared number id === string param → never matched. Now we parse the id.
 *   - No validation of required fields.
 *   - Wrong status codes (200 + plain text; undefined body on not-found).
 *   - Fragile id from array length → now AUTOINCREMENT in SQLite.
 *   - In-memory array → now persisted in SQLite.
 */
const express = require("express");
const db = require("../db/database");
const { requireFields, validatePhone, validateDate } = require("../middleware/validate");

const router = express.Router();

// POST /appointments → create
router.post("/", (req, res) => {
  const { name, phone, date } = req.body || {};

  const errors = [
    ...requireFields(req.body || {}, ["name", "phone", "date"]),
    ...validatePhone(phone),
    ...validateDate(date),
  ];
  if (errors.length) {
    return res.status(400).json({ error: "Validation failed", details: errors });
  }

  const info = db
    .prepare("INSERT INTO appointments (name, phone, date) VALUES (?, ?, ?)")
    .run(String(name).trim(), String(phone).trim(), String(date).trim());

  const appointment = db
    .prepare("SELECT * FROM appointments WHERE id = ?")
    .get(info.lastInsertRowid);

  // 201 Created + the created resource (not a plain string)
  return res.status(201).json({ message: "Appointment created", appointment });
});

// GET /appointments → list all (handy for the demo and the follow-up feature)
router.get("/", (_req, res) => {
  const rows = db.prepare("SELECT * FROM appointments ORDER BY id DESC").all();
  return res.json(rows);
});

// GET /appointments/:id → retrieve one
router.get("/:id", (req, res) => {
  const id = Number(req.params.id); // FIX: params are strings; coerce to number
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid appointment id" });
  }

  const appointment = db.prepare("SELECT * FROM appointments WHERE id = ?").get(id);
  if (!appointment) {
    return res.status(404).json({ error: "Appointment not found" });
  }
  return res.json(appointment);
});

module.exports = router;
