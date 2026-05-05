(() => {
  const pages = [
    { id: "dashboard", label: "Dashboard", file: "dashboard.html" },
    { id: "registro", label: "Registro de envíos", file: "registro-envio.html" },
    { id: "seguimiento", label: "Seguimiento / Trazabilidad", file: "seguimiento-envio.html" },
    { id: "historial", label: "Historial general", file: "historial.html" },
    { id: "geo", label: "Geolocalización + QR", file: "geolocalizacion-qr.html" }
  ];

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderMenu(activeId) {
    const items = pages
      .map((p) => {
        const active = p.id === activeId ? "is-active" : "";
        return `<a class="side-link ${active}" href="./${escapeHtml(p.file)}">${escapeHtml(
          p.label
        )}</a>`;
      })
      .join("");

    return `
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-badge">GLS</div>
          <div class="brand-text">
            <div class="brand-title">GLS · Operaciones</div>
            <div class="brand-subtitle">Información logística y trazabilidad</div>
          </div>
        </div>
        <nav class="side-nav">${items}</nav>
      </aside>
    `;
  }

  window.GlsMenu = { renderMenu };
})();

