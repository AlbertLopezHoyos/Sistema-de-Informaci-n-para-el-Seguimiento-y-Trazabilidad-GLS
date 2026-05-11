(() => {
  const pages = [
    { id: "dashboard", label: "Dashboard", file: "dashboard.html" },
    { id: "registro", label: "Registro de envíos", file: "registro-envio.html" },
    { id: "clientes", label: "Clientes", file: "clientes.html" },
    { id: "consultaqr", label: "Consulta envío", file: "consulta-envio.html" },
    { id: "seguimiento", label: "Seguimiento / Trazabilidad", file: "seguimiento-envio.html" },
    { id: "historial", label: "Historial general", file: "historial.html" },
    { id: "geo", label: "Geolocalización + QR", file: "geolocalizacion-qr.html" },
    { id: "usuarios", label: "Usuarios (admin)", file: "usuarios.html" }
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
        <div class="side-footer" style="margin-top:auto; padding:14px 14px 18px">
          <div id="glsUserMini" class="muted" style="font-size:12px; margin-bottom:10px"></div>
          <button id="glsBtnLogout" class="btn btn-ghost w-100" type="button">Salir</button>
        </div>
      </aside>
    `;
  }

  async function mountAuthMenu() {
    const userEl = document.getElementById("glsUserMini");
    const btn = document.getElementById("glsBtnLogout");
    if (!btn) return;
    try {
      const me = await window.glsApi.auth.me();
      const u = me?.user;
      if (userEl) {
        const rol = u?.rol ? ` · ${u.rol}` : "";
        userEl.textContent = u?.email ? `Sesión: ${u.nombres ? `${u.nombres} · ` : ""}${u.email}${rol}` : "Sesión: —";
      }
    } catch {
      if (userEl) userEl.textContent = "Sesión: —";
    }
    btn.addEventListener("click", async () => {
      try {
        await window.glsApi.auth.logout();
      } finally {
        window.location.href = "./login.html";
      }
    });
  }

  window.GlsMenu = { renderMenu, mountAuthMenu };
})();

