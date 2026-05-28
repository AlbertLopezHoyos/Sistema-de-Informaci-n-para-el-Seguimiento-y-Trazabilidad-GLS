const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const attempts = new Map();

function checkLoginAllowed(email) {
  const key = String(email || "").toLowerCase().trim();
  if (!key) return { allowed: true };
  const now = Date.now();
  let rec = attempts.get(key);
  if (!rec || now - rec.firstAt > WINDOW_MS) {
    rec = { count: 0, firstAt: now };
    attempts.set(key, rec);
  }
  if (rec.count >= MAX_ATTEMPTS) {
    const waitMin = Math.ceil((WINDOW_MS - (now - rec.firstAt)) / 60000);
    return {
      allowed: false,
      message: `Demasiados intentos fallidos. Espere ${waitMin} minuto(s) e intente de nuevo.`
    };
  }
  return { allowed: true };
}

function recordLoginFailure(email) {
  const key = String(email || "").toLowerCase().trim();
  if (!key) return;
  const now = Date.now();
  let rec = attempts.get(key);
  if (!rec || now - rec.firstAt > WINDOW_MS) rec = { count: 0, firstAt: now };
  rec.count += 1;
  attempts.set(key, rec);
}

function clearLoginAttempts(email) {
  attempts.delete(String(email || "").toLowerCase().trim());
}

module.exports = { checkLoginAllowed, recordLoginFailure, clearLoginAttempts };
