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

  /** Misma imagen que login/signup (`pages/` → `../assets/img/`). */
  const BRAND_LOGO_SRC = "../assets/img/logo.png";

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
      <div class="sidebar-col" id="glsSidebarCol">
        <aside class="sidebar">
          <div class="brand">
            <div class="brand-logo-wrap" aria-hidden="true">
              <img class="brand-logo" src="${BRAND_LOGO_SRC}" alt="GLS" width="36" height="36" decoding="async" loading="eager" />
            </div>
            <div class="brand-text">
              <div class="brand-title">Grupo Logístico Salazar</div>
              <div class="brand-subtitle">Operaciones · Trazabilidad</div>
            </div>
          </div>
          <nav class="side-nav">${items}</nav>
          <div class="side-footer">
            <div id="glsUserMini" class="side-user-mini muted-on-dark"></div>
            <button id="glsBtnLogout" class="btn btn-ghost w-100 nav-logout" type="button">Salir</button>
          </div>
        </aside>
      </div>
    `;
  }

  /** Botón hamburguesa (DOM) — se monta en la topbar del módulo (derecha), no en el sidebar. */
  function createNavToggleButton() {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "glsNavToggle";
    btn.className = "nav-toggle-main";
    btn.setAttribute("aria-expanded", "true");
    btn.setAttribute("aria-controls", "glsSidebarCol");
    btn.setAttribute("aria-label", "Ocultar menú lateral");
    btn.title = "Mostrar / ocultar menú";
    btn.innerHTML = `
      <span class="nav-toggle-inner" aria-hidden="true">
        <span class="nav-toggle-bar"></span>
        <span class="nav-toggle-bar"></span>
        <span class="nav-toggle-bar"></span>
      </span>`;
    return btn;
  }

  /** Colapsa / expande el panel lateral; el control vive en .topbar-inner (área del módulo). */
  function mountNavToggle() {
    const root = document.getElementById("app");
    const inner = document.querySelector("main.main .topbar-inner");
    if (!root || !inner) return;

    let btn = document.getElementById("glsNavToggle");
    if (!btn) {
      const pill = inner.querySelector(".area-pill");
      if (pill && !inner.querySelector(".topbar-right")) {
        const right = document.createElement("div");
        right.className = "topbar-right";
        pill.replaceWith(right);
        right.appendChild(pill);
        right.appendChild(createNavToggleButton());
      } else if (!inner.querySelector("#glsNavToggle")) {
        const wrap = document.createElement("div");
        wrap.className = "topbar-nav-toggle-wrap topbar-nav-toggle-wrap--solo";
        wrap.appendChild(createNavToggleButton());
        inner.appendChild(wrap);
      }
      btn = document.getElementById("glsNavToggle");
    }

    if (!btn || btn.dataset.glsNavBound === "1") return;
    btn.dataset.glsNavBound = "1";

    function syncUi(collapsed) {
      root.classList.toggle("nav-collapsed", collapsed);
      btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
      btn.setAttribute("aria-label", collapsed ? "Mostrar menú lateral" : "Ocultar menú lateral");
    }

    try {
      syncUi(localStorage.getItem("gls_nav_collapsed") === "1");
    } catch {
      syncUi(false);
    }

    btn.addEventListener("click", () => {
      const next = !root.classList.contains("nav-collapsed");
      syncUi(next);
      try {
        localStorage.setItem("gls_nav_collapsed", next ? "1" : "0");
      } catch {}
    });
  }

  async function mountAuthMenu() {
    mountNavToggle();
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

