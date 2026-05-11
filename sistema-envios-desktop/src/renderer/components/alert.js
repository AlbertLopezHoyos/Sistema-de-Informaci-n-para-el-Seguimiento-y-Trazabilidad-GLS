(() => {
  /**
   * Mensaje legible para errores típicos de Firestore (p. ej. índice faltante).
   */
  function humanizeFirestoreMessage(message) {
    const m = String(message || "");
    if (/requires an index|FAILED_PRECONDITION|failed-precondition/i.test(m)) {
      const url = (m.match(/https:\/\/console\.firebase\.google\.com[^\s)\]'"<>]+/) || [])[0];
      const deploy =
        "Si tienes Firebase CLI: en la carpeta `sistema-envios-desktop` ejecuta `firebase deploy --only firestore:indexes`.";
      return url
        ? `Firestore requiere un índice para esta consulta. Puedes crearlo en la consola:\n${url}\n\n${deploy}`
        : `Firestore requiere un índice para esta consulta. ${deploy}`;
    }
    if (/permission|PERMISSION_DENIED|Missing or insufficient permissions/i.test(m)) {
      return "Sin permiso en Firestore. Revisa las reglas de seguridad del proyecto.";
    }
    if (/unavailable|UNAVAILABLE|client is offline|offline/i.test(m)) {
      return "Firestore no disponible o sin conexión. Intenta de nuevo.";
    }
    return m;
  }

  function showAlert(container, { type = "info", message }) {
    if (!container) return;
    const klass = type === "error" ? "alert alert-error" : type === "success" ? "alert alert-success" : "alert";
    const raw = type === "error" ? humanizeFirestoreMessage(message) : message;
    const safe = escapeHtml(raw || "").replaceAll("\n", "<br>");
    container.innerHTML = `<div class="${klass}">${safe}</div>`;
  }

  function clearAlert(container) {
    if (!container) return;
    container.innerHTML = "";
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  window.GlsAlert = { showAlert, clearAlert, humanizeFirestoreMessage };
})();

