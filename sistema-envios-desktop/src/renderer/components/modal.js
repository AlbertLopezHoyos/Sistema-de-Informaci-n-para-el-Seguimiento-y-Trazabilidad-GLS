(() => {
  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  /**
   * Modal genérico.
   * - closeOnOverlayClick=false: no cierra al pulsar el fondo oscuro (el ✕ y Escape siguen cerrando).
   */
  function openModal({ title, bodyHtml, closeOnOverlayClick = true, showHeaderClose = true, onDismiss } = {}) {
    const mid = `gls-modal-${Date.now().toString(36)}`;
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.setAttribute("data-modal-overlay", "");

    function tearDown() {
      document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", onKeyDown);
    }

    overlay._glsOnDismiss = typeof onDismiss === "function" ? onDismiss : null;

    function closeModal() {
      try {
        overlay._glsOnDismiss?.();
      } catch (_) {}
      overlay._glsOnDismiss = null;
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

    const closeBtn = showHeaderClose
      ? `<button type="button" class="btn btn-ghost modal-close-btn" data-close aria-label="Cerrar">✕</button>`
      : "";

    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="${mid}-title">
        <div class="modal-header">
          <div class="modal-title" id="${mid}-title">${escapeHtml(title || "")}</div>
          ${closeBtn}
        </div>
        <div class="modal-body">${bodyHtml || ""}</div>
      </div>
    `;

    const modalEl = overlay.querySelector(".modal");
    // No detener la propagación del clic en el botón ✕: siempre se detiene en .modal,
    // el overlay nunca recibe el evento y el cierre por data-close no se ejecutaba.
    modalEl?.addEventListener("click", (e) => {
      if (e.target.closest?.("[data-close]")) return;
      e.stopPropagation();
    });

    overlay.addEventListener("click", (e) => {
      if (e.target.closest?.("[data-close]")) {
        closeModal();
        return;
      }
      if (e.target === overlay && closeOnOverlayClick) closeModal();
    });

    document.body.appendChild(overlay);
    document.body.classList.add("modal-open");
    document.addEventListener("keydown", onKeyDown);

    requestAnimationFrame(() => {
      overlay.querySelector("[data-close]")?.focus?.();
    });
    return overlay;
  }

  /**
   * Confirmación con dos acciones (no cierra al pulsar fuera del panel).
   */
  function openConfirmModal({ title, bodyHtml, confirmLabel = "Confirmar", cancelLabel = "Cancelar", onConfirm, onCancel }) {
    const mid = `gls-confirm-${Date.now().toString(36)}`;
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
        onCancel?.();
        closeModal();
      }
    }

    overlay.innerHTML = `
      <div class="modal modal-confirm" role="dialog" aria-modal="true" aria-labelledby="${mid}-title">
        <div class="modal-header">
          <div class="modal-title" id="${mid}-title">${escapeHtml(title || "")}</div>
          <button type="button" class="btn btn-ghost modal-close-btn" data-confirm-dismiss aria-label="Cerrar">✕</button>
        </div>
        <div class="modal-body">
          ${bodyHtml || ""}
          <div class="modal-confirm-actions actions" style="margin-top:16px; justify-content:flex-end; gap:10px; flex-wrap:wrap">
            <button type="button" class="btn" id="${mid}-cancel">${escapeHtml(cancelLabel)}</button>
            <button type="button" class="btn btn-primary" id="${mid}-ok">${escapeHtml(confirmLabel)}</button>
          </div>
        </div>
      </div>
    `;

    const modalEl = overlay.querySelector(".modal");
    modalEl?.addEventListener("click", (e) => {
      if (e.target.closest?.("[data-confirm-dismiss]")) return;
      e.stopPropagation();
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        onCancel?.();
        closeModal();
      }
    });

    overlay.querySelector(`#${mid}-cancel`)?.addEventListener("click", (e) => {
      e.preventDefault();
      onCancel?.();
      closeModal();
    });
    overlay.querySelector("[data-confirm-dismiss]")?.addEventListener("click", (e) => {
      e.preventDefault();
      onCancel?.();
      closeModal();
    });
    overlay.querySelector(`#${mid}-ok`)?.addEventListener("click", (e) => {
      e.preventDefault();
      onConfirm?.();
      closeModal();
    });

    document.body.appendChild(overlay);
    document.body.classList.add("modal-open");
    document.addEventListener("keydown", onKeyDown);
    requestAnimationFrame(() => {
      overlay.querySelector(`#${mid}-ok`)?.focus?.();
    });
    return overlay;
  }

  function dismissOverlay(el) {
    if (!el?.classList?.contains?.("modal-overlay")) return;
    try {
      el._glsOnDismiss?.();
    } catch (_) {}
    el._glsOnDismiss = null;
    if (typeof el._glsTearDown === "function") el._glsTearDown();
    el.remove();
  }

  window.GlsModal = { openModal, openConfirmModal, dismissOverlay };
})();
