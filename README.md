# EPIA CRM Backend — Technical Assessment

A Node.js / Express backend for patient appointments, WhatsApp reminders, and follow-ups, backed by SQLite so records survive restarts. Built for the EPIA take-home assessment. **All data is fictional.**

## Stack
- Node.js + Express.js
- SQLite via `better-sqlite3` (lightweight, file-based, zero external DB server)
- Tests: Node's built-in test runner (`node --test`)

## Setup & run

```bash
npm install
npm start          # http://localhost:3000   (creates epia.db on first run)
# or: npm run dev  # auto-restarts on file changes
```

## Run the tests
```bash
npm test           # 5 integration tests, in-memory DB, no setup needed
```

## API reference & examples

### Appointments (Task 1)
```bash
# Create (201)
curl -X POST localhost:3000/appointments \
  -H "Content-Type: application/json" \
  -d '{"name":"Asha Verma","phone":"+919876543210","date":"2026-11-20"}'

# Retrieve one (200, or 404 if not found)
curl localhost:3000/appointments/1

# List all
curl localhost:3000/appointments

# Validation error (400)
curl -X POST localhost:3000/appointments -H "Content-Type: application/json" -d '{"name":"X"}'
```

### WhatsApp reminder (Task 2)
```bash
# Send a reminder. By default the simulated provider returns the assignment's
# "code 190 / invalid OAuth token" error, handled gracefully (502, app stays up).
curl -X POST localhost:3000/appointments/1/reminder

# See the success path instead:
WA_VALID_TOKEN=true npm start   # then call the same endpoint -> {"status":"sent"}

# View the message/delivery log for an appointment
curl localhost:3000/appointments/1/messages
```

### Follow-ups (Task 3)
```bash
# Create (201)
curl -X POST localhost:3000/followups \
  -H "Content-Type: application/json" \
  -d '{"appointmentId":1,"date":"2026-12-05","notes":"call back"}'

# Duplicate for same appointment + date is rejected (409)
# List pending
curl localhost:3000/followups/pending

# Mark complete
curl -X PATCH localhost:3000/followups/1/complete
```

## What I changed (the original Task 1 bugs I fixed)
1. **Added `express.json()`** — without it `req.body` was `undefined`, so every POST lost its data.
2. **Fixed retrieval** — the original compared a numeric `id` to `req.params.id` (always a string), so `1 === "1"` was false and GET never matched. Now the id is parsed to a number.
3. **Added validation** — required fields plus light phone/date sanity checks, returning `400` with clear messages.
4. **Correct status codes** — `201` + JSON on create, `404` when not found, `400` on bad input, `502` on upstream provider failure.
5. **Robust IDs + persistence** — replaced `appointments.length + 1` and the in-memory array with SQLite `AUTOINCREMENT` so IDs don't collide and data survives restarts.
6. **Crash safety** — a global error handler plus `unhandledRejection` / `uncaughtException` guards; the WhatsApp service never throws.

See `DIAGNOSIS.md` for the Task 2 Part A write-up (WhatsApp error analysis).

## Project structure
```
src/
  app.js                 # express app + middleware + routes + error handler
  server.js              # starts the HTTP server
  db/database.js         # SQLite setup + schema
  middleware/validate.js # field/phone/date validation helpers
  routes/
    appointments.js      # Task 1
    reminders.js         # Task 2 (Part B)
    followups.js         # Task 3
  services/whatsapp.js   # simulated Meta API + safe sender
tests/api.test.js        # 5 integration tests
```

## Limitations (honest scope notes)
- The WhatsApp provider is **simulated** (no real Meta credentials), as the brief allows. Swapping in the real Graph API call is isolated to `services/whatsapp.js`.
- No auth/authorization — out of scope for this assessment; production would need it.
- Validation is intentionally light so fictional test data isn't blocked; production would use stricter schemas (e.g. Zod/Joi) and E.164 phone validation.
- SQLite is single-node; a multi-instance production deployment would move to Postgres (the repository/query layer would change, not the routes).
- No rate limiting, retries/backoff on reminders, or a message queue — noted as production improvements.
