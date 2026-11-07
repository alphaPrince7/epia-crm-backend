/**
 * Task 2 — WhatsApp (Meta) integration, simulated.
 *
 * A real integration would POST to graph.facebook.com with a Bearer token.
 * Here we SIMULATE the provider so no real credentials are needed, and we
 * reproduce the failure the assignment shows (code 190 — invalid OAuth token).
 *
 * Design goals from the brief:
 *   - handle success AND failure
 *   - record message status (done by the caller, in the `messages` table)
 *   - log useful, NON-SENSITIVE errors (never log tokens / phone numbers)
 *   - a provider failure must NEVER crash the app (always resolves, never throws)
 */

// Flip this to see the success path vs the failure path in the demo.
// Default false so the assignment's code-190 scenario is reproduced out of the box.
const SIMULATE_VALID_TOKEN = process.env.WA_VALID_TOKEN === "true";

/**
 * Pretend to call the Meta WhatsApp Cloud API.
 * Resolves to a normalized result — it never throws, so callers can't crash.
 * @returns {Promise<{ok:boolean, providerId?:string, error?:{code:number,message:string,type:string}}>}
 */
async function callMetaApi({ to, body }) {
  // Simulate network latency.
  await new Promise((r) => setTimeout(r, 50));

  if (!SIMULATE_VALID_TOKEN) {
    // Exactly the error the assignment provided.
    return {
      ok: false,
      error: { message: "Invalid OAuth access token", type: "OAuthException", code: 190 },
    };
  }
  // Success path.
  return { ok: true, providerId: "wamid.SIMULATED_" + Date.now() };
}

/**
 * Map a provider error to a short, safe, human-readable explanation.
 * Keeps logs useful without leaking secrets.
 */
function explain(error) {
  switch (error?.code) {
    case 190:
      return "Auth failed (code 190): access token invalid or expired. Refresh/replace the token.";
    case 131030:
      return "Recipient not in allowed list (test number restriction).";
    case 100:
      return "Invalid parameter in the request payload.";
    default:
      return `Provider error${error?.code ? ` (code ${error.code})` : ""}: ${error?.message || "unknown"}`;
  }
}

/**
 * Send a reminder. Safe by construction: catches everything, always returns a
 * normalized object. Never logs the token or the full phone number.
 * @returns {Promise<{status:'sent'|'failed', providerId?:string, error?:string}>}
 */
async function sendReminder({ to, patientName, date }) {
  const body = `Hi ${patientName}, this is a reminder for your EPIA appointment on ${date}.`;
  try {
    const result = await callMetaApi({ to, body });

    if (result.ok) {
      console.log(`[whatsapp] reminder sent (providerId=${result.providerId})`);
      return { status: "sent", providerId: result.providerId };
    }

    const safeMsg = explain(result.error);
    // Log only non-sensitive info: no token, mask the phone number.
    console.error(`[whatsapp] send failed to ${maskPhone(to)} — ${safeMsg}`);
    return { status: "failed", error: safeMsg };
  } catch (err) {
    // Any unexpected error is contained here — the app stays up.
    console.error(`[whatsapp] unexpected error — ${err.message}`);
    return { status: "failed", error: "Unexpected error while sending reminder" };
  }
}

function maskPhone(phone) {
  const s = String(phone || "");
  return s.length <= 4 ? "****" : "****" + s.slice(-4);
}

module.exports = { sendReminder, explain };
