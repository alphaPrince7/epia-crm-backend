# Technical Explanation (≤ 300 words)

**Most challenging issue.** The subtlest bug in the original code was the retrieval
failure. `a.id === req.params.id` compared a numeric `id` to a route parameter,
which Express always delivers as a string, so `1 === "1"` was `false` and GET
never returned anything — even though creation looked fine. It is the kind of bug
that passes a quick glance because the data is present; only the comparison is
wrong. The second non-obvious issue was the missing `express.json()` middleware,
which made `req.body` undefined on every POST, so appointments were created with
empty fields.

**Debugging approach.** I read the code path end to end rather than patching
symptoms: traced a request from body parsing, through creation, to retrieval, and
checked the actual types at each step. I reproduced each failure with `curl`,
fixed it, and locked the behaviour in with integration tests (create, retrieve,
404, validation, reminder-failure handling, and duplicate-follow-up prevention)
so regressions surface immediately. For the WhatsApp task I made the provider
failure deterministic (simulated code 190) so error handling could be tested
without real credentials.

**Improvements needed for production.** Authentication and authorization are the
biggest gap — the API is currently open. I would add stricter input validation
(E.164 phone numbers, schema validation), move from SQLite to Postgres for
multi-instance deployments, and make reminders resilient with retries and
exponential backoff behind a queue rather than a synchronous call. Real WhatsApp
delivery needs webhook handling to track `delivered`/`failed` status
asynchronously, plus alerting on auth failures and delivery-rate drops. Finally,
secrets belong in a managed store with token rotation, and every patient-data
access should be logged for compliance, since this is health-adjacent data.
