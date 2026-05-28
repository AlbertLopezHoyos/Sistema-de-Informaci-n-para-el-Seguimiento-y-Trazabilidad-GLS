(() => {
  const DEFAULT_HEADLINE =
    "Sistema de Información para el Seguimiento y Trazabilidad de Envíos en el Área de Operaciones";
  const DEFAULT_TAGLINE =
    "GRUPO LOGÍSTICO SALAZAR S.A.C. · Área de Operaciones – Gestión de información logística";

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  /**
   * Cabecera fija del módulo (misma estructura en todas las pantallas autenticadas).
   * @param {{ headline?: string, tagline?: string, pill?: string|false }} [opts]
   */
  function renderTopbar(opts = {}) {
    const headline = opts.headline != null ? String(opts.headline) : DEFAULT_HEADLINE;
    const tagline = opts.tagline != null ? String(opts.tagline) : DEFAULT_TAGLINE;
    const pill = opts.pill !== undefined ? opts.pill : "Operaciones";
    const pillHtml =
      pill === false || pill === null || pill === ""
        ? ""
        : `<div class="area-pill" role="status"><span class="area-pill-dot" aria-hidden="true">●</span><span>${escapeHtml(
            String(pill)
          )}</span></div>`;
    return `
      <header class="topbar">
        <div class="topbar-inner">
          <div class="topbar-left" id="glsTopbarNavToggleMount" aria-label="Control del menú lateral"></div>
          <div class="topbar-title">
            <div class="app-name">${escapeHtml(headline)}</div>
            <div class="company">${escapeHtml(tagline)}</div>
          </div>
          <div class="topbar-right" id="glsTopbarRight">
            ${pillHtml}
            <div id="glsTopbarProfileMount"></div>
          </div>
        </div>
      </header>
    `;
  }

  window.GlsPageChrome = { renderTopbar, DEFAULT_HEADLINE, DEFAULT_TAGLINE };
})();
