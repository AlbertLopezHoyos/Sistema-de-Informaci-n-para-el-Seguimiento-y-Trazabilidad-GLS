/**
 * Mensajes de error unificados (main + tests).
 * El renderer usa gls-error-handler.js con la misma lógica expuesta en window.GlsErrors.
 */

function humanizeError(message, context = "") {
  const m = String(message || "").trim();
  const ctx = String(context || "").toLowerCase();

  if (!m) {
    if (ctx.includes("storage")) return "No se pudo subir la evidencia. Verifique Firebase Storage.";
    if (ctx.includes("export") || ctx.includes("pdf")) return "No se pudo completar la exportación.";
    if (ctx.includes("qr")) return "No se pudo procesar el código QR.";
    return "Ocurrió un error inesperado. Intente de nuevo.";
  }

  if (/requires an index|FAILED_PRECONDITION|failed-precondition/i.test(m)) {
    const url = (m.match(/https:\/\/console\.firebase\.google\.com[^\s)\]'"<>]+/) || [])[0];
    const deploy =
      "Si tiene Firebase CLI: en `sistema-envios-desktop` ejecute `firebase deploy --only firestore:indexes`.";
    return url
      ? `Firestore requiere un índice para esta consulta.\n${url}\n\n${deploy}`
      : `Firestore requiere un índice para esta consulta. ${deploy}`;
  }
  if (/permission|PERMISSION_DENIED|Missing or insufficient permissions/i.test(m)) {
    return "Sin permiso en Firestore o Storage. Revise las reglas de seguridad.";
  }
  if (/unavailable|UNAVAILABLE|client is offline|offline|network/i.test(m)) {
    return "Sin conexión o servicio no disponible. Verifique su red e intente de nuevo.";
  }
  if (/deadline-exceeded|DEADLINE_EXCEEDED|timeout/i.test(m)) {
    return "Tiempo de espera agotado. Intente de nuevo.";
  }
  if (/storage\/object-not-found|bucket/i.test(m) && ctx.includes("storage")) {
    return "Firebase Storage no está configurado o el bucket no existe.";
  }
  if (/AUTH_REQUIRED|Debe iniciar sesión/i.test(m)) {
    return "Su sesión expiró. Vuelva a iniciar sesión.";
  }
  if (/SESSION_EXPIRED|sesión expirada/i.test(m)) {
    return "Sesión expirada por inactividad. Inicie sesión nuevamente.";
  }
  if (/rate limit|demasiados intentos|login_bloqueado/i.test(m)) {
    return "Demasiados intentos fallidos. Espere unos minutos e intente de nuevo.";
  }
  if (/Campo requerido:/i.test(m)) {
    const campo = m.replace(/^.*Campo requerido:\s*/i, "").trim();
    return `Falta un dato obligatorio${campo ? ` (${campo})` : ""}.`;
  }
  if (/Código de envío inválido|ENV-\d{4}/i.test(m)) {
    return m;
  }
  if (/archivo|tamaño|mime|imagen|pdf/i.test(m) && /inválid|excede|no soportad/i.test(m)) {
    return m;
  }

  return m;
}

/** Normaliza respuesta IPC { ok, error } para el renderer. */
function normalizeIpcResult(result, context = "ipc") {
  if (result && result.ok === false && result.error) {
    return { ...result, error: humanizeError(result.error, context) };
  }
  return result;
}

/** Para handlers IPC en main: mensaje seguro al renderer. */
function formatIpcCatch(err, context = "") {
  const raw = err?.message || String(err);
  return humanizeError(raw, context);
}

module.exports = { humanizeError, normalizeIpcResult, formatIpcCatch };
