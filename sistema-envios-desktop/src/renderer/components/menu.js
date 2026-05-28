(() => {
  const pages = [
    { id: "dashboard", label: "Dashboard", file: "dashboard.html" },
    { id: "registro", label: "Registro de envíos", file: "registro-envio.html" },
    { id: "clientes", label: "Clientes", file: "clientes.html" },
    { id: "consultaqr", label: "Consulta envío", file: "consulta-envio.html" },
    { id: "seguimiento", label: "Seguimiento / Trazabilidad", file: "seguimiento-envio.html" },
    { id: "historial", label: "Historial general", file: "historial.html" },
    { id: "reportes", label: "Reportes", file: "reportes.html" },
    { id: "geo", label: "Geolocalización + QR", file: "geolocalizacion-qr.html" }
  ];

  const adminPages = [
    { id: "usuarios", label: "Usuarios", file: "usuarios.html", desc: "Gestión de cuentas" },
    { id: "backup", label: "Respaldo", file: "backup.html", desc: "Exportar / restaurar datos" }
  ];

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function userInitials(u) {
    const n = String(u?.nombres || u?.email || "U").trim();
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return n.slice(0, 2).toUpperCase();
  }

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
          <nav class="side-nav" aria-label="Menú principal">${items}</nav>
          <div class="side-footer">
            <div id="glsUserMini" class="side-user-mini muted-on-dark"></div>
            <button id="glsBtnLogout" class="btn nav-logout w-100" type="button">
              <span class="nav-logout-ico" aria-hidden="true">⎋</span>
              <span>Salir</span>
            </button>
          </div>
        </aside>
      </div>
    `;
  }

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

  function mountNavToggle() {
    const root = document.getElementById("app");
    const leftMount = document.getElementById("glsTopbarNavToggleMount");
    if (!root || !leftMount) return;

    if (!document.getElementById("glsNavToggle")) {
      leftMount.appendChild(createNavToggleButton());
    }

    const btn = document.getElementById("glsNavToggle");
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

  let profileDocumentListenersBound = false;

  function closeProfileMenu() {
    const menu = document.getElementById("glsProfileMenu");
    const btn = document.getElementById("glsProfileBtn");
    if (menu) menu.hidden = true;
    if (btn) btn.setAttribute("aria-expanded", "false");
  }

  function bindProfileDocumentListenersOnce() {
    if (profileDocumentListenersBound) return;
    profileDocumentListenersBound = true;
    document.addEventListener("click", (e) => {
      if (!document.getElementById("glsProfileWrap")?.contains(e.target)) closeProfileMenu();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeProfileMenu();
    });
  }

  function mountProfileMenu(user, isAdmin) {
    const mount = document.getElementById("glsTopbarProfileMount");
    if (!mount) return;

    const name = user?.nombres || user?.email || "Usuario";
    const email = user?.email || "";
    const rol = user?.rol ? String(user.rol) : "";
    const initials = userInitials(user);

    const adminItems = adminPages
      .map(
        (p) => `<a class="topbar-profile-item" href="./${escapeHtml(p.file)}" data-admin-only="1">
          <span class="topbar-profile-item-title">${escapeHtml(p.label)}</span>
          <span class="topbar-profile-item-desc">${escapeHtml(p.desc)}</span>
        </a>`
      )
      .join("");

    mount.innerHTML = `
      <div class="topbar-profile-wrap" id="glsProfileWrap">
        <button type="button" class="topbar-profile-btn" id="glsProfileBtn" aria-haspopup="menu" aria-expanded="false" aria-controls="glsProfileMenu">
          <span class="topbar-profile-avatar" aria-hidden="true">${escapeHtml(initials)}</span>
          <span class="topbar-profile-label">
            <span class="topbar-profile-name">${escapeHtml(name)}</span>
            ${rol ? `<span class="topbar-profile-rol">${escapeHtml(rol)}</span>` : ""}
          </span>
          <span class="topbar-profile-chevron" aria-hidden="true">▾</span>
        </button>
        <div class="topbar-profile-menu" id="glsProfileMenu" role="menu" hidden>
          <div class="topbar-profile-menu-head">
            <div class="topbar-profile-menu-name">${escapeHtml(name)}</div>
            ${email ? `<div class="topbar-profile-menu-email">${escapeHtml(email)}</div>` : ""}
            ${rol ? `<div class="topbar-profile-menu-rol">${escapeHtml(rol)}</div>` : ""}
          </div>
          <div class="topbar-profile-menu-section" id="glsProfileAdminSection" style="display:${isAdmin ? "" : "none"}">
            <div class="topbar-profile-menu-section-title">Administración</div>
            ${adminItems}
          </div>
        </div>
      </div>`;

    const btn = document.getElementById("glsProfileBtn");
    const menu = document.getElementById("glsProfileMenu");
    if (!btn || !menu || btn.dataset.glsProfileBound === "1") return;
    btn.dataset.glsProfileBound = "1";

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = menu.hidden;
      if (open) {
        menu.hidden = false;
        btn.setAttribute("aria-expanded", "true");
      } else {
        closeProfileMenu();
      }
    });

    bindProfileDocumentListenersOnce();
  }

  async function mountAuthMenu() {
    mountNavToggle();
    const userEl = document.getElementById("glsUserMini");
    const btn = document.getElementById("glsBtnLogout");
    if (!btn) return;

    let user = null;
    let isAdmin = false;

    try {
      const me = await window.glsApi.auth.me();
      user = me?.user;
      const r = String(user?.rol || "").toLowerCase();
      isAdmin = r === "admin";

      if (userEl) {
        const rol = user?.rol ? ` · ${user.rol}` : "";
        userEl.textContent = user?.email
          ? `Sesión: ${user.nombres ? `${user.nombres} · ` : ""}${user.email}${rol}`
          : "Sesión: —";
      }

      document.querySelectorAll('.side-nav a[href="./registro-envio.html"]').forEach((a) => {
        a.style.display = r === "consulta" ? "none" : "";
      });
    } catch {
      if (userEl) userEl.textContent = "Sesión: —";
    }

    mountProfileMenu(user, isAdmin);

    if (btn.dataset.glsLogoutBound !== "1") {
      btn.dataset.glsLogoutBound = "1";
      btn.addEventListener("click", async () => {
        try {
          await window.glsApi.auth.logout();
        } finally {
          window.location.href = "./login.html";
        }
      });
    }
  }

  window.GlsMenu = { renderMenu, mountAuthMenu, adminPages };
})();
