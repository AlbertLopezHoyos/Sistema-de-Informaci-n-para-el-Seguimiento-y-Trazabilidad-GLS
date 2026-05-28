(() => {
  const appEl = document.getElementById("app");

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  appEl.innerHTML = `
    ${window.GlsMenu.renderMenu("usuarios")}
    <main class="main">
      ${window.GlsPageChrome.renderTopbar({
        headline: "Usuarios del sistema",
        tagline: "Alta de cuentas y control de acceso.",
        pill: "Administración"
      })}
      <div class="content">
        <div class="page-head">
          <div>
            <div class="page-title">Usuarios</div>
            <div class="page-subtitle">Invitación de usuarios y activación de cuentas (solo administradores).</div>
          </div>
        </div>
        <div id="alert"></div>
        <div id="denied" class="card" style="display:none">
          <div class="card-title">Acceso restringido</div>
          <p class="muted">Esta pantalla solo está disponible para administradores.</p>
          <a class="btn" href="./dashboard.html">Volver</a>
        </div>
        <div id="panel" style="display:none">
          <div class="card">
            <div class="card-title">Invitar usuario</div>
            <form id="formInvite" autocomplete="off" class="grid">
              <div class="form-row grid grid-2">
                <div class="field"><label>Nombres</label><input name="nombres" required /></div>
                <div class="field"><label>Correo</label><input name="email" type="email" required /></div>
              </div>
              <div class="form-row grid grid-2">
                <div class="field"><label>Contraseña inicial</label><input name="password" type="password" minlength="6" required /></div>
                <div class="field"><label>Rol</label>
                  <select name="rol">
                    <option value="operaciones" selected>Operaciones</option>
                    <option value="consulta">Consulta (solo lectura)</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>
              <div class="actions">
                <button class="btn btn-primary" type="submit">Crear usuario</button>
                <span class="muted" id="stInvite"></span>
              </div>
            </form>
          </div>
          <div class="card u-mt-md">
            <div class="card-title">Cuentas</div>
            <div class="card-subtitle muted">Correo, rol y estado de la cuenta en el sistema.</div>
            <div class="table-scroll u-mt-sm">
              <table class="table" style="min-width:720px">
                <thead><tr><th>Correo</th><th>Nombres</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
                <tbody id="tblU"><tr><td colspan="5" class="muted">…</td></tr></tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </main>
  `;

  const alertEl = document.getElementById("alert");
  const denied = document.getElementById("denied");
  const panel = document.getElementById("panel");
  const tblU = document.getElementById("tblU");

  window.GlsAuthGuard?.requireAuthOrRedirect?.().then(async () => {
    window.GlsMenu?.mountAuthMenu?.();
    const me = await window.glsApi.auth.me();
    if (me?.user?.rol !== "admin") {
      denied.style.display = "block";
      return;
    }
    panel.style.display = "block";
    await reload();
  });

  async function reload() {
    const r = await window.glsApi.auth.listUsers();
    if (!r?.ok) {
      window.GlsAlert.showAlert(alertEl, { type: "error", message: r?.error || "Error" });
      return;
    }
    const rows = r.users || [];
    if (!rows.length) {
      tblU.innerHTML = `<tr><td colspan="5" class="muted">No hay usuarios registrados.</td></tr>`;
      return;
    }
    tblU.innerHTML = rows
      .map((u) => {
        const act = u.activo !== false;
        return `<tr>
          <td class="mono">${escapeHtml(u.email || "")}</td>
          <td>${escapeHtml(u.nombres || "")}</td>
          <td>${escapeHtml(u.rol || "")}</td>
          <td>${act ? `<span class="badge ok">Activo</span>` : `<span class="badge danger">Inactivo</span>`}</td>
          <td>
            <button class="btn btn-ghost btn--sm" type="button" data-email="${escapeHtml(u.email || "")}" data-next="${act ? "0" : "1"}">${act ? "Desactivar" : "Activar"}</button>
          </td>
        </tr>`;
      })
      .join("");
    tblU.querySelectorAll("button[data-email]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const email = btn.getAttribute("data-email");
        const next = btn.getAttribute("data-next") === "1";
        const rr = await window.glsApi.auth.setActivo({ email, activo: next });
        if (!rr?.ok) {
          window.GlsAlert.showAlert(alertEl, { type: "error", message: rr?.error || "Error" });
          return;
        }
        await reload();
      });
    });
  }

  document.getElementById("formInvite").addEventListener("submit", async (e) => {
    e.preventDefault();
    window.GlsAlert.clearAlert(alertEl);
    const st = document.getElementById("stInvite");
    st.textContent = "Creando…";
    const fd = new FormData(e.target);
    const r = await window.glsApi.auth.inviteUser({
      nombres: fd.get("nombres"),
      email: fd.get("email"),
      password: fd.get("password"),
      rol: fd.get("rol")
    });
    if (!r?.ok) {
      window.GlsAlert.showAlert(alertEl, { type: "error", message: r?.error || "Error" });
      st.textContent = "";
      return;
    }
    window.GlsAlert.showAlert(alertEl, { type: "success", message: "Usuario creado." });
    e.target.reset();
    st.textContent = "";
    await reload();
  });
})();
