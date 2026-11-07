/**
 * Integration tests using Node's built-in test runner + the http module.
 * Run with:  npm test   (uses an in-memory DB so it's fast and isolated)
 */
process.env.DB_PATH = ":memory:";

const test = require("node:test");
const assert = require("node:assert");
const http = require("node:http");
const app = require("../src/app");

let server, base;

test.before(async () => {
  server = http.createServer(app).listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://localhost:${server.address().port}`;
});

test.after(() => server.close());

async function req(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

test("POST /appointments rejects missing fields (400)", async () => {
  const r = await req("POST", "/appointments", { name: "Asha" });
  assert.strictEqual(r.status, 400);
  assert.ok(r.body.details.length >= 1);
});

test("POST /appointments creates (201) and GET retrieves it", async () => {
  const created = await req("POST", "/appointments", {
    name: "Asha Verma", phone: "+919876543210", date: "2026-11-20",
  });
  assert.strictEqual(created.status, 201);
  const id = created.body.appointment.id;

  const got = await req("GET", `/appointments/${id}`);
  assert.strictEqual(got.status, 200);
  assert.strictEqual(got.body.name, "Asha Verma"); // retrieval works (the original bug)
});

test("GET /appointments/:id returns 404 when absent", async () => {
  const r = await req("GET", "/appointments/99999");
  assert.strictEqual(r.status, 404);
});

test("reminder failure is handled gracefully (502, app alive)", async () => {
  const appt = await req("POST", "/appointments", {
    name: "Test Patient", phone: "+911112223334", date: "2026-12-01",
  });
  const id = appt.body.appointment.id;
  const r = await req("POST", `/appointments/${id}/reminder`);
  assert.strictEqual(r.status, 502);        // simulated code-190 failure
  assert.strictEqual(r.body.status, "failed");

  const msgs = await req("GET", `/appointments/${id}/messages`);
  assert.strictEqual(msgs.body[0].status, "failed"); // status was recorded
});

test("follow-ups: create, prevent duplicate (409), list pending, complete", async () => {
  const appt = await req("POST", "/appointments", {
    name: "Riya Shah", phone: "+919000000000", date: "2026-11-25",
  });
  const appointmentId = appt.body.appointment.id;

  const f1 = await req("POST", "/followups", { appointmentId, date: "2026-12-05", notes: "call back" });
  assert.strictEqual(f1.status, 201);

  const dup = await req("POST", "/followups", { appointmentId, date: "2026-12-05" });
  assert.strictEqual(dup.status, 409); // duplicate prevented

  const pending = await req("GET", "/followups/pending");
  assert.ok(pending.body.some((f) => f.id === f1.body.followup.id));

  const done = await req("PATCH", `/followups/${f1.body.followup.id}/complete`);
  assert.strictEqual(done.body.followup.status, "completed");
});
