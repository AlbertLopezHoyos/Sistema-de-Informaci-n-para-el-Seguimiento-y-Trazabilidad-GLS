const appConfig = require("../config/app.config");

let lastActivityAt = null;

function touchSession() {
  lastActivityAt = Date.now();
}

function clearSession() {
  lastActivityAt = null;
}

function startSession() {
  touchSession();
}

function getSessionStatus() {
  const timeout = appConfig.sessionTimeoutMs || 30 * 60 * 1000;
  if (!lastActivityAt) {
    return { active: false, expired: true, remainingMs: 0, timeoutMs: timeout };
  }
  const elapsed = Date.now() - lastActivityAt;
  const remainingMs = Math.max(0, timeout - elapsed);
  return {
    active: remainingMs > 0,
    expired: remainingMs <= 0,
    remainingMs,
    timeoutMs: timeout,
    expiresAt: new Date(lastActivityAt + timeout).toISOString()
  };
}

function assertSessionActive() {
  const st = getSessionStatus();
  if (!st.active) {
    const err = new Error("Su sesión ha expirado por inactividad. Inicie sesión nuevamente.");
    err.code = "SESSION_EXPIRED";
    throw err;
  }
  touchSession();
}

module.exports = {
  touchSession,
  clearSession,
  startSession,
  getSessionStatus,
  assertSessionActive
};
