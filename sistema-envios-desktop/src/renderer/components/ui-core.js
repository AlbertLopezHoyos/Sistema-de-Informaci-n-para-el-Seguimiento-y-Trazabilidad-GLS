/** Integra toast con alertas y utilidades UI globales. */
(() => {
  if (window.GlsAlert?.showAlert && window.GlsToast) {
    const orig = window.GlsAlert.showAlert.bind(window.GlsAlert);
    window.GlsAlert.showAlert = (container, opts = {}) => {
      const type = opts.type || "info";
      const msg = opts.message || "";
      if (type === "success") window.GlsToast.success(msg);
      else if (type === "error") window.GlsToast.error(msg);
      else if (type === "warn" || type === "warning") window.GlsToast.warning(msg);
      else window.GlsToast.info(msg);
      return orig(container, opts);
    };
  }

  window.GlsUi = {
    loaderHtml: (text) =>
      `<div class="gls-loader"><span class="gls-spinner"></span><span>${String(text || "Cargando…")}</span></div>`,
    emptyHtml: (title, sub) =>
      `<div class="gls-empty"><div class="gls-empty-ico">📭</div><div><b>${title || "Sin datos"}</b></div>${
        sub ? `<div class="muted" style="margin-top:6px;font-size:12px">${sub}</div>` : ""
      }</div>`
  };
})();
