(() => {
  function showAlert(container, { type = "info", message }) {
    if (!container) return;
    const klass = type === "error" ? "alert alert-error" : type === "success" ? "alert alert-success" : "alert";
    container.innerHTML = `<div class="${klass}">${escapeHtml(message || "")}</div>`;
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

  window.GlsAlert = { showAlert, clearAlert };
})();

