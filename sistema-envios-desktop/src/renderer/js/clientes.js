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

  function renderTopbar() {
    return `
      <header class="topbar">
        <div class="topbar-inner">
          <div class="topbar-title">
            <div class="app-name">Catálogo de clientes</div>
            <div class="company">Referencias para asociar a envíos durante el registro.</div>
          </div>
        </div>
      </header>
    `;
  }

  appEl.innerHTML = `
    ${window.GlsMenu.renderMenu("clientes")}
    <main class="main">
      ${renderTopbar()}
      <div class="content">
        <div class="page-head">
          <div>
            <div class="page-title">Clientes</div>
          </div>
        </div>
        <div id="alert"></div>

        <div class="card">
          <div class="card-title">Nuevo o actualizar cliente</div>
          <form id="formCliente" class="grid" autocomplete="off">
            <div class="form-row grid grid-2">
              <div class="field"><label>Razón social / nombres</label><input name="nombres" required /></div>
              <div class="field"><label>Documento (RUC / DNI)</label><input name="documento" required /></div>
            </div>
            <div class="form-row grid grid-2">
              <div class="field"><label>Teléfono</label><input name="telefono" required /></div>
              <div class="field"><label>Dirección fiscal / fiscal</label><input name="direccion" required /></div>
            </div>
            <div class="field"><label>Empresa (opcional)</label><input name="empresa" placeholder="GLS / filial" /></div>
            <div class="actions">
              <button class="btn btn-primary" type="submit" id="btnSave">Guardar</button>
              <span class="muted" id="status"></span>
            </div>
          </form>
        </div>

        <div class="card" style="margin-top:14px">
          <div class="card-title">Listado</div>
          <div style="overflow:auto">
            <table class="table" style="min-width:720px">
              <thead>
                <tr><th>Nombres</th><th>Documento</th><th>Teléfono</th><th>Dirección</th><th>Empresa</th></tr>
              </thead>
              <tbody id="tbl">
                <tr><td colspan="5" class="muted">Cargando…</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  `;

  window.GlsAuthGuard?.requireAuthOrRedirect?.().then(() => window.GlsMenu?.mountAuthMenu?.());

  const alertEl = document.getElementById("alert");
  const tbl = document.getElementById("tbl");
  const form = document.getElementById("formCliente");
  const statusEl = document.getElementById("status");

  async function load() {
    window.GlsAlert.clearAlert(alertEl);
    tbl.innerHTML = `<tr><td colspan="5" class="muted">Cargando…</td></tr>`;
    const r = await window.glsApi.clientes.listar({ limitCount: 500 });
    if (!r?.ok) {
      window.GlsAlert.showAlert(alertEl, { type: "error", message: r?.error || "Error al listar" });
      tbl.innerHTML = `<tr><td colspan="5" class="muted">—</td></tr>`;
      return;
    }
    const rows = r.clientes || [];
    if (!rows.length) {
      tbl.innerHTML = `<tr><td colspan="5" class="muted">Sin clientes.</td></tr>`;
      return;
    }
    tbl.innerHTML = rows
      .map(
        (c) => `
      <tr>
        <td>${escapeHtml(c.nombres || "")}</td>
        <td class="mono">${escapeHtml(c.documento || "")}</td>
        <td>${escapeHtml(c.telefono || "")}</td>
        <td>${escapeHtml(c.direccion || "")}</td>
        <td>${escapeHtml(c.empresa || "")}</td>
      </tr>`
      )
      .join("");
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    window.GlsAlert.clearAlert(alertEl);
    statusEl.textContent = "Guardando…";
    const fd = new FormData(form);
    const r = await window.glsApi.clientes.crear({
      nombres: fd.get("nombres"),
      documento: fd.get("documento"),
      telefono: fd.get("telefono"),
      direccion: fd.get("direccion"),
      empresa: fd.get("empresa")
    });
    if (!r?.ok) {
      window.GlsAlert.showAlert(alertEl, { type: "error", message: r?.error || "No se pudo guardar" });
      statusEl.textContent = "";
      return;
    }
    window.GlsAlert.showAlert(alertEl, { type: "success", message: "Cliente guardado." });
    form.reset();
    statusEl.textContent = "";
    await load();
  });

  load();
})();
