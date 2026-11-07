# Screen Recording Script (3–5 minutes)

A simple walkthrough so you can record confidently. Open a terminal + have the
README API examples ready to paste. Keep it calm; narrate what each call proves.

## 0. Intro (15 sec)
"This is my EPIA CRM backend — Node.js, Express, SQLite. I'll demo the three
tasks: appointments, WhatsApp error handling, and follow-ups."

## 1. Start the app (15 sec)
```
npm install      # (can be done before recording)
npm start
```
Say: "It creates a SQLite file, so data survives restarts."

## 2. Task 1 — appointments (60 sec)
- Create one:
  `curl -X POST localhost:3000/appointments -H "Content-Type: application/json" -d '{"name":"Asha Verma","phone":"+919876543210","date":"2026-11-20"}'`
  → "Returns 201 and the created record with an id."
- Retrieve it:
  `curl localhost:3000/appointments/1`
  → "Retrieval works — this was the original bug: it compared a number id to a
     string param, so it never matched. I fixed it by parsing the id."
- Show validation + 404:
  `curl -X POST localhost:3000/appointments -H "Content-Type: application/json" -d '{"name":"X"}'`  → 400
  `curl localhost:3000/appointments/999`  → 404

## 3. Task 2 — WhatsApp error handling (60 sec)
- Send a reminder:
  `curl -X POST localhost:3000/appointments/1/reminder`
  → "The simulated Meta API returns the code-190 invalid-token error. My app
     handles it: returns 502 with a safe message, logs a masked phone number,
     and the server stays up — it doesn't crash."
- Show it was recorded:
  `curl localhost:3000/appointments/1/messages`  → status "failed" logged.
- (Optional) success path: stop, run `WA_VALID_TOKEN=true npm start`, resend → "sent".

## 4. Task 3 — follow-ups (60 sec)
- Create:
  `curl -X POST localhost:3000/followups -H "Content-Type: application/json" -d '{"appointmentId":1,"date":"2026-12-05","notes":"call back"}'` → 201
- Duplicate:
  `curl -X POST localhost:3000/followups -H "Content-Type: application/json" -d '{"appointmentId":1,"date":"2026-12-05"}'` → 409 "already exists"
- Pending list: `curl localhost:3000/followups/pending`
- Complete: `curl -X PATCH localhost:3000/followups/1/complete` → status "completed"

## 5. Tests + wrap (30 sec)
`npm test`  → "5 integration tests, all passing."
"That covers all three tasks. Thanks for watching."
