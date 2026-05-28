(() => {
  const DEFAULT_MS = 4200;
  let root = null;

  function ensureRoot() {
    if (root) return root;
    root = document.createElement("div");
    root.id = "gls-toast-root";
    root.className = "gls-toast-root";
    root.setAttribute("aria-live", "polite");
    document.body.appendChild(root);
    return root;
  }

  function iconFor(type) {
    if (type === "success") return "✓";
    if (type === "error") return "✕";
    if (type === "warning") return "!";
    return "i";
  }

  function show(message, type = "info", durationMs = DEFAULT_MS) {
    const el = document.createElement("div");
    el.className = `gls-toast gls-toast--${type}`;
    el.innerHTML = `<span class="gls-toast-ico" aria-hidden="true">${iconFor(type)}</span><span class="gls-toast-msg">${escapeHtml(
      message || ""
    )}</span>`;
    const container = ensureRoot();
    container.appendChild(el);
    requestAnimationFrame(() => el.classList.add("is-visible"));
    const close = () => {
      el.classList.remove("is-visible");
      el.classList.add("is-leaving");
      setTimeout(() => el.remove(), 280);
    };
    const t = setTimeout(close, durationMs);
    el.addEventListener("click", () => {
      clearTimeout(t);
      close();
    });
    return { close };
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  window.GlsToast = {
    show,
    success: (m, d) => show(m, "success", d),
    error: (m, d) => show(m, "error", d ?? 6000),
    warning: (m, d) => show(m, "warning", d),
    info: (m, d) => show(m, "info", d)
  };
})();
