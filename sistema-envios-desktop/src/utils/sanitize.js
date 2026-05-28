/** Sanitización básica de entradas (main + renderer). */
function stripControlChars(s) {
  return String(s || "").replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

function sanitizeText(s, maxLen = 500) {
  return stripControlChars(s).trim().slice(0, maxLen);
}

function sanitizeEmail(s) {
  return sanitizeText(s, 120).toLowerCase();
}

function sanitizeFilename(s) {
  return sanitizeText(s, 120).replace(/[^a-zA-Z0-9._-]/g, "_");
}

module.exports = { stripControlChars, sanitizeText, sanitizeEmail, sanitizeFilename };
