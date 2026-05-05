(() => {
  function openModal({ title, bodyHtml }) {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">${escapeHtml(title || "")}</div>
          <button class="btn btn-ghost" data-close>✕</button>
        </div>
        <div class="modal-body">${bodyHtml || ""}</div>
      </div>
    `;
    overlay.addEventListener("click", (e) => {
      const close = e.target?.dataset?.close !== undefined || e.target === overlay;
      if (close) overlay.remove();
    });
    document.body.appendChild(overlay);
    return overlay;
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  window.GlsModal = { openModal };
})();

