(() => {
  const appEl = document.getElementById("app");
  let puedeCliente = false;

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  appEl.innerHTML = `
    ${window.GlsMenu.renderMenu("clientes")}
    <main class="main">
      ${window.GlsPageChrome.renderTopbar({
        headline: "Catálogo de clientes",
        tagline: "Referencias para asociar a envíos durante el registro.",
        pill: "Datos maestros"
      })}
      <div class="content">
        <div class="page-head">
          <div>
            <div class="page-title">Clientes</div>
            <div class="page-subtitle muted">Listado compacto; el detalle y el alta/edición se abren en modales.</div>
          </div>
          <div class="actions">
            <button type="button" class="btn btn-primary" id="btnNuevoCliente" style="display:none">Nuevo cliente</button>
          </div>
        </div>
        <div id="alert"></div>

        <div class="card u-mb-md">
          <div class="card-title">Buscar por documento</div>
          <div class="form-row grid grid-2" style="align-items:end">
            <div class="field">
              <label>Documento (RUC / DNI)</label>
              <input id="docBuscar" class="input--doc" placeholder="Ej. 20100070991" />
            </div>
            <div class="actions" style="align-self:end">
              <button type="button" class="btn btn-primary" id="btnBuscarDoc">Buscar</button>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-title">Listado</div>
          <div class="table-scroll u-mt-sm">
            <table class="table" style="min-width:640px">
              <thead>
                <tr>
                  <th>Nombres</th>
                  <th>Documento</th>
                  <th>Teléfono</th>
                  <th>Empresa</th>
                  <th style="width:1%; white-space:nowrap"></th>
                </tr>
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

  const alertEl = document.getElementById("alert");
  const tbl = document.getElementById("tbl");

  function openClienteVerModal(c) {
    window.GlsModal.openModal({
      title: `Cliente · ${escapeHtml(c.documento || "")}`,
      closeOnOverlayClick: true,
      bodyHtml: `
        <dl class="gls-dl-readonly">
          <dt>Razón social / nombres</dt><dd>${escapeHtml(c.nombres || "—")}</dd>
          <dt>Documento</dt><dd class="mono">${escapeHtml(c.documento || "—")}</dd>
          <dt>Teléfono</dt><dd>${escapeHtml(c.telefono || "—")}</dd>
          <dt>Dirección</dt><dd>${escapeHtml(c.direccion || "—")}</dd>
          <dt>Empresa</dt><dd>${escapeHtml(c.empresa || "—")}</dd>
        </dl>
      `
    });
  }

  function openClienteEditorModal(cliente) {
    const isEdit = Boolean(cliente?.documento);
    const overlay = window.GlsModal.openModal({
      title: isEdit ? `Editar cliente · ${cliente.documento}` : "Nuevo cliente",
      closeOnOverlayClick: false,
      bodyHtml: `
        <form id="glscli-form" class="grid" autocomplete="off">
          <div class="form-row grid grid-2">
            <div class="field"><label>Razón social / nombres</label><input name="nombres" required /></div>
            <div class="field"><label>Documento (RUC / DNI)</label><input name="documento" required ${isEdit ? "readonly" : ""} /></div>
          </div>
          <div class="form-row grid grid-2">
            <div class="field"><label>Teléfono</label><input name="telefono" required /></div>
            <div class="field"><label>Dirección fiscal</label><input name="direccion" required /></div>
          </div>
          <div class="field"><label>Empresa (opcional)</label><input name="empresa" placeholder="GLS / filial" /></div>
          <div class="actions">
            <button class="btn btn-primary" type="submit" id="glscli-save">Guardar</button>
            <span class="muted" id="glscli-status"></span>
          </div>
        </form>
      `
    });

    const form = overlay.querySelector("#glscli-form");
    const st = overlay.querySelector("#glscli-status");
    if (cliente) {
      form.nombres.value = cliente.nombres || "";
      form.documento.value = cliente.documento || "";
      form.telefono.value = cliente.telefono || "";
      form.direccion.value = cliente.direccion || "";
      form.empresa.value = cliente.empresa || "";
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      window.GlsAlert.clearAlert(alertEl);
      st.textContent = "Guardando…";
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
        st.textContent = "";
        return;
      }
      window.GlsAlert.showAlert(alertEl, { type: "success", message: "Cliente guardado." });
      window.GlsModal.dismissOverlay(overlay);
      await load();
    });
  }

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
      <tr data-doc="${escapeHtml(c.documento || "")}">
        <td>${escapeHtml(c.nombres || "")}</td>
        <td class="mono">${escapeHtml(c.documento || "")}</td>
        <td>${escapeHtml(c.telefono || "")}</td>
        <td>${escapeHtml(c.empresa || "—")}</td>
        <td>
          <div class="actions" style="gap:6px;flex-wrap:nowrap">
            <button type="button" class="btn btn-ghost btn--sm" data-cli-ver>Ver</button>
            ${puedeCliente ? `<button type="button" class="btn btn-primary btn--sm" data-cli-edit>Editar</button>` : ""}
          </div>
        </td>
      </tr>`
      )
      .join("");
  }

  tbl.addEventListener("click", (e) => {
    const ver = e.target.closest?.("[data-cli-ver]");
    const edit = e.target.closest?.("[data-cli-edit]");
    const tr = e.target.closest?.("tr[data-doc]");
    if (!tr || (!ver && !edit)) return;
    const doc = (tr.dataset.doc || "").trim();
    if (!doc) return;
    void (async () => {
      const r = await window.glsApi.clientes.obtenerPorDocumento(doc);
      if (!r?.ok || !r.cliente) {
        window.GlsAlert.showAlert(alertEl, { type: "info", message: r?.error || "Cliente no encontrado." });
        return;
      }
      if (edit && puedeCliente) openClienteEditorModal(r.cliente);
      else openClienteVerModal(r.cliente);
    })();
  });

  const btnBuscarDoc = document.getElementById("btnBuscarDoc");
  const docBuscar = document.getElementById("docBuscar");
  const btnNuevoCliente = document.getElementById("btnNuevoCliente");

  btnNuevoCliente?.addEventListener?.("click", () => {
    if (!puedeCliente) return;
    openClienteEditorModal(null);
  });

  btnBuscarDoc?.addEventListener?.("click", async () => {
    window.GlsAlert.clearAlert(alertEl);
    const doc = String(docBuscar?.value || "").trim();
    if (!doc) {
      window.GlsAlert.showAlert(alertEl, { type: "error", message: "Ingrese un documento." });
      return;
    }
    const r = await window.glsApi.clientes.obtenerPorDocumento(doc);
    if (!r?.ok || !r.cliente) {
      window.GlsAlert.showAlert(alertEl, { type: "info", message: r?.error || "Cliente no encontrado." });
      return;
    }
    const c = r.cliente;
    if (puedeCliente) openClienteEditorModal(c);
    else openClienteVerModal(c);
  });

  window.GlsAuthGuard?.requireAuthOrRedirect?.().then(async (user) => {
    window.GlsMenu?.mountAuthMenu?.();
    if (!user) return;
    const rol = String(user?.rol || "").toLowerCase();
    puedeCliente = rol === "admin" || rol === "operaciones";
    if (btnNuevoCliente) btnNuevoCliente.style.display = puedeCliente ? "inline-flex" : "none";
    await load();
  });
})();
