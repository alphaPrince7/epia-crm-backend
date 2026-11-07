# Task 2 — Part A: WhatsApp API Error Diagnosis

**The error:** `{ "error": { "message": "Invalid OAuth access token", "type": "OAuthException", "code": 190 } }`

## 1. Most likely cause
Meta error **code 190** means the **access token is invalid or expired**. For the WhatsApp Cloud API this usually comes from one of:
- a **short-lived token** that has expired (they last ~1–24 hours),
- a **revoked or regenerated** token (the old one stopped working),
- a token **copied incorrectly** (truncated, trailing space, wrong environment), or
- the token belongs to the **wrong app / phone-number ID**.

## 2. How I would investigate and resolve it
1. Confirm which token the app actually sent (without logging the token itself) — e.g. log its length and last 4 chars.
2. Verify it in isolation with a single known-good `curl` call to the Graph API, or Meta's Access Token Debugger, to see its validity and expiry.
3. If expired/short-lived → generate a **long-lived system-user token** and store it in a secret manager / env var, not in code.
4. Re-check the **App ID, phone-number ID, and API version** in the request URL.
5. Add a startup/health check that validates the token before the first reminder goes out.

## 3. If the API accepted the message but it was never delivered
A `200` only means Meta *queued* it, not that it reached the patient. I would:
- Read the **message status webhooks** (`sent` → `delivered` → `read`, or `failed`) — delivery is asynchronous.
- Check the recipient is a **valid WhatsApp number** and (in test mode) is on the **allowed recipient list**.
- Confirm an approved **message template** is used (outside the 24-hour session window, free-form messages are blocked).
- Look for **quality-rating / rate-limit** throttling on the sending number.

## 4. How I would detect similar failures promptly
- **Record every attempt** with its status (this project writes to a `messages` table).
- **Structured, non-sensitive logging** (never log tokens or full phone numbers — we mask to `****1234`).
- **Alerting** on a spike in `failed` statuses or on auth errors (190) specifically.
- A **dashboard / metric** for delivery rate, and webhook handling so `failed` deliveries are surfaced, not just send-time errors.
