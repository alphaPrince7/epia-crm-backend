/**
 * Tiny validation helpers — no heavy library needed for this scope.
 * Returns a list of human-readable problems; empty list = valid.
 */

function requireFields(body, fields) {
  const errors = [];
  for (const f of fields) {
    const v = body?.[f];
    if (v === undefined || v === null || String(v).trim() === "") {
      errors.push(`'${f}' is required`);
    }
  }
  return errors;
}

// Very light phone/date sanity checks — enough to reject obvious junk
// without being so strict we block valid fictional test data.
function validatePhone(phone) {
  if (phone && !/^[+]?[\d\s-]{7,15}$/.test(String(phone))) {
    return ["'phone' must be 7–15 digits (optionally with +, spaces or dashes)"];
  }
  return [];
}

function validateDate(date) {
  // Accept an ISO-ish date; reject anything Date can't parse.
  if (date && Number.isNaN(Date.parse(date))) {
    return ["'date' must be a valid date (e.g. 2026-11-10 or 2026-11-10T14:30:00Z)"];
  }
  return [];
}

module.exports = { requireFields, validatePhone, validateDate };
