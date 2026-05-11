(() => {
  function openModal({ title, bodyHtml }) {
    const mid = `gls-modal-${Date.now().toString(36)}`;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.setAttribute("data-modal-overlay", "");

    function tearDown() {
      document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", onKeyDown);
    }

    function closeModal() {
      tearDown();
      overlay.remove();
    }

    overlay._glsTearDown = tearDown;

    function onKeyDown(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeModal();
      }
    }

    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="${mid}-title">
        <div class="modal-header">
          <div class="modal-title" id="${mid}-title">${escapeHtml(title || "")}</div>
          <button type="button" class="btn btn-ghost modal-close-btn" data-close aria-label="Cerrar">✕</button>
        </div>
        <div class="modal-body">${bodyHtml || ""}</div>
      </div>
    `;

    const modalEl = overlay.querySelector(".modal");
    modalEl?.addEventListener("click", (e) => e.stopPropagation());

    overlay.addEventListener("click", (e) => {
      if (e.target?.dataset?.close !== undefined || e.target === overlay) {
        closeModal();
      }
    });

    document.body.appendChild(overlay);
    document.body.classList.add("modal-open");
    document.addEventListener("keydown", onKeyDown);

    requestAnimationFrame(() => {
      overlay.querySelector("[data-close]")?.focus?.();
    });
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

  function dismissOverlay(el) {
    if (!el?.classList?.contains?.("modal-overlay")) return;
    if (typeof el._glsTearDown === "function") el._glsTearDown();
    el.remove();
  }

  window.GlsModal = { openModal, dismissOverlay };
})();

