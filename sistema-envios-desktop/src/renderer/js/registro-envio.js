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

  function humanizarErrorFirestore(message) {
    const m = String(message || "");
    if (/permission|PERMISSION_DENIED|Missing or insufficient permissions/i.test(m)) {
      return "Sin permiso para guardar en Firestore. Revisa las reglas de seguridad del proyecto.";
    }
    if (/unavailable|UNAVAILABLE|client is offline|offline/i.test(m)) {
      return "Sin conexión o Firestore no disponible. Intenta de nuevo.";
    }
    if (/deadline-exceeded|DEADLINE_EXCEEDED|timeout/i.test(m)) {
      return "Tiempo de espera agotado. Verifica tu conexión.";
    }
    if (/already exists|ALREADY_EXISTS|Document already exists/i.test(m)) {
      return "Conflicto al asignar el código del envío. Vuelve a intentar guardar; el sistema generará un nuevo consecutivo.";
    }
    if (/transaction|Transaction failed|aborted/i.test(m)) {
      return "No se pudo completar el guardado en base de datos. Reintenta en unos segundos.";
    }
    if (/Campo requerido:/i.test(m)) {
      const campo = m.replace(/^.*Campo requerido:\s*/i, "").trim();
      return `Falta un dato obligatorio${campo ? ` (${campo})` : ""}. Revisa el formulario.`;
    }
    if (/Número inválido|Debe ser mayor a 0|No puede ser negativo|Documento inválido|Teléfono inválido|Unidad de medida inválida|Seguro inválido/i.test(m)) {
      return `Dato numérico o formato incorrecto: ${m}`;
    }
    return m || "Ocurrió un error al guardar. Revisa los datos e intenta de nuevo.";
  }

  function validateRequiredText(v, label) {
    const s = String(v ?? "").trim();
    if (!s) return `${label}: este campo es obligatorio`;
    return null;
  }

  function validatePositiveNumber(v, label) {
    const s = String(v ?? "").trim();
    if (!s) return `${label}: este campo es obligatorio`;
    const n = Number(s.replace(",", "."));
    if (!Number.isFinite(n)) return `${label}: ingrese un número válido`;
    if (n <= 0) return `${label}: debe ser mayor que cero`;
    return null;
  }

  function validateDocumentoUi(v, label) {
    const s = String(v || "").trim();
    if (!s) return `${label}: documento requerido`;
    if (!/^[0-9A-Za-z\-]{6,20}$/.test(s)) return `${label}: formato inválido (6–20 caracteres alfanuméricos)`;
    return null;
  }

  function validateTelefonoUi(v, label) {
    const s = String(v || "").trim();
    if (!s) return `${label}: teléfono requerido`;
    if (!/^[0-9+\-\s]{6,20}$/.test(s)) return `${label}: teléfono inválido`;
    return null;
  }

  function validateRegistroForm(fd) {
    const checks = [
      validateRequiredText(fd.get("r_nombres"), "Remitente · nombres completos"),
      validateDocumentoUi(fd.get("r_documento"), "Remitente · documento"),
      validateTelefonoUi(fd.get("r_telefono"), "Remitente · teléfono"),
      validateRequiredText(fd.get("r_direccion"), "Remitente · dirección"),
      validateRequiredText(fd.get("d_nombres"), "Destinatario · nombres completos"),
      validateDocumentoUi(fd.get("d_documento"), "Destinatario · documento"),
      validateTelefonoUi(fd.get("d_telefono"), "Destinatario · teléfono"),
      validateRequiredText(fd.get("d_direccion"), "Destinatario · dirección"),
      validateRequiredText(fd.get("origen"), "Envío · origen"),
      validateRequiredText(fd.get("destino"), "Envío · destino"),
      validateRequiredText(fd.get("tipoCarga"), "Envío · tipo de carga"),
      validateRequiredText(fd.get("descripcion"), "Envío · descripción"),
      validatePositiveNumber(fd.get("peso"), "Envío · peso (kg)"),
      validatePositiveNumber(fd.get("dim_largo"), "Dimensiones · largo"),
      validatePositiveNumber(fd.get("dim_ancho"), "Dimensiones · ancho"),
      validatePositiveNumber(fd.get("dim_alto"), "Dimensiones · alto")
    ];
    return checks.find(Boolean) || null;
  }

  const ICONS = {
    user:
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12a4.2 4.2 0 1 0-4.2-4.2A4.2 4.2 0 0 0 12 12Z" stroke="currentColor" stroke-width="1.8"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    box:
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" stroke="currentColor" stroke-width="1.8"/><path d="M4 7.5l8 4.5 8-4.5" stroke="currentColor" stroke-width="1.8"/></svg>',
    note:
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7 3h10a2 2 0 0 1 2 2v14l-4-2-4 2-4-2-4 2V5a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
    send:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 11.5 21 3l-8.5 18-2.2-7.3L3 11.5Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M21 3 10.3 13.7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
  };

  function renderTopbar() {
    return `
      <header class="topbar">
        <div class="topbar-inner">
          <div class="topbar-title">
            <div class="app-name">Sistema de Información para el Seguimiento y Trazabilidad de Envíos en el Área de Operaciones</div>
            <div class="company">GRUPO LOGÍSTICO SALAZAR S.A.C. · Área de Operaciones – Gestión de información logística</div>
          </div>
          <div class="area-pill"><span style="color:var(--accent)">●</span> Operaciones</div>
        </div>
      </header>
    `;
  }

  appEl.innerHTML = `
    ${window.GlsMenu.renderMenu("registro")}
    <main class="main">
      ${renderTopbar()}
      <div class="content">
      <div class="page-head">
        <div>
          <div class="page-title">Registro de envíos</div>
          <div class="page-subtitle">Registra remitente, destinatario y datos del envío. Se genera código y QR automáticamente.</div>
        </div>
        <div class="actions">
          <a class="btn btn-icon" href="./seguimiento-envio.html"><span class="ico">${ICONS.send}</span>Ir a trazabilidad</a>
        </div>
      </div>
      <div id="alert"></div>

      <form id="formEnvio" class="grid" autocomplete="off">
        <section class="form-section">
          <div class="section-head">
            <h3 class="title">Cliente (catálogo)</h3>
            <span class="section-chip">Empresa</span>
          </div>
          <div class="form-row grid grid-2" style="align-items:end">
            <div class="field">
              <label>Seleccionar cliente registrado</label>
              <select id="selClienteCatalogo" name="cliente_documento_catalogo">
                <option value="">Sin asociación a catálogo</option>
              </select>
            </div>
            <div class="actions" style="align-self:end">
              <a class="btn btn-icon" href="./clientes.html">Gestionar clientes</a>
            </div>
          </div>
          <div class="hint">Si eliges un cliente del catálogo, se completarán los datos del remitente cuando sea posible y el envío quedará enlazado al catálogo.</div>
        </section>

        <div class="grid grid-2">
          <section class="form-section">
            <div class="section-head">
              <h3 class="title">Datos del remitente</h3>
              <span class="section-chip"><span class="ico">${ICONS.user}</span> Remitente</span>
            </div>
            <div class="form-row grid grid-2">
              <div class="field"><label>Nombres completos</label><input name="r_nombres" placeholder="Juan Pérez" required /></div>
              <div class="field"><label>Documento</label><input name="r_documento" placeholder="45678912" required /></div>
            </div>
            <div class="form-row grid grid-2" style="margin-top:10px">
              <div class="field"><label>Teléfono</label><input name="r_telefono" placeholder="999888777" required /></div>
              <div class="field"><label>Dirección</label><input name="r_direccion" placeholder="Los Olivos, Lima" required /></div>
            </div>
          </section>

          <section class="form-section">
            <div class="section-head">
              <h3 class="title">Datos del destinatario</h3>
              <span class="section-chip"><span class="ico">${ICONS.user}</span> Destinatario</span>
            </div>
            <div class="form-row grid grid-2">
              <div class="field"><label>Nombres completos</label><input name="d_nombres" placeholder="María López" required /></div>
              <div class="field"><label>Documento</label><input name="d_documento" placeholder="76543210" required /></div>
            </div>
            <div class="form-row grid grid-2" style="margin-top:10px">
              <div class="field"><label>Teléfono</label><input name="d_telefono" placeholder="988777666" required /></div>
              <div class="field"><label>Dirección</label><input name="d_direccion" placeholder="Trujillo, La Libertad" required /></div>
            </div>
          </section>
        </div>

        <section class="form-section">
          <div class="section-head">
            <h3 class="title">Datos del envío</h3>
            <span class="section-chip"><span class="ico">${ICONS.box}</span> Envío</span>
          </div>
          <div class="form-row grid grid-3">
            <div class="field"><label>Origen</label><input name="origen" placeholder="Lima" required /></div>
            <div class="field"><label>Destino</label><input name="destino" placeholder="Trujillo" required /></div>
            <div class="field"><label>Tipo de carga</label><input name="tipoCarga" placeholder="Paquete / Documentos" required /></div>
          </div>
          <div class="form-row grid grid-2" style="margin-top:10px">
            <div class="field"><label>Descripción</label><input name="descripcion" placeholder="Caja mediana / muebles varios" required /></div>
            <div class="field"><label>Peso (kg)</label><input name="peso" type="number" step="0.01" placeholder="12.5" required /></div>
          </div>
          <div class="hint" style="margin-top:8px">Dimensiones de la carga (mudanzas / voluminosos)</div>
          <div class="form-row grid grid-4" style="margin-top:10px">
            <div class="field"><label>Largo</label><input name="dim_largo" type="number" step="0.01" min="0.01" placeholder="120" required /></div>
            <div class="field"><label>Ancho</label><input name="dim_ancho" type="number" step="0.01" min="0.01" placeholder="80" required /></div>
            <div class="field"><label>Alto</label><input name="dim_alto" type="number" step="0.01" min="0.01" placeholder="90" required /></div>
            <div class="field"><label>Unidad</label>
              <select name="dim_unidad" required>
                <option value="cm" selected>cm</option>
                <option value="m">m</option>
                <option value="pulgadas">pulgadas</option>
              </select>
            </div>
          </div>
        </section>

        <section class="form-section">
          <div class="section-head">
            <h3 class="title">Cotización estimada</h3>
            <span class="section-chip">Opcional</span>
          </div>
          <div class="card-subtitle" style="margin-top:-6px">
            Completa tarifas internas para obtener un monto referencial (no es comprobante fiscal). Si no llenas tarifas, no se guarda cotización.
          </div>

          <div class="form-row grid grid-3">
            <div class="field">
              <label>Moneda</label>
              <select name="cot_moneda">
                <option value="PEN" selected>PEN (S/)</option>
                <option value="USD">USD</option>
              </select>
            </div>
            <div class="field">
              <label>Distancia aprox. (km)</label>
              <input name="cot_distanciaKm" type="number" step="0.1" min="0" placeholder="Ej. 560" />
            </div>
            <div class="field">
              <label>Seguro (%)</label>
              <input name="cot_seguroPct" type="number" step="0.1" min="0" max="100" placeholder="0" />
            </div>
          </div>

          <div class="form-row grid grid-3" style="margin-top:10px">
            <div class="field">
              <label>Tarifa por kg</label>
              <input name="cot_tarifaKg" type="number" step="0.01" min="0" placeholder="Ej. 2.50" />
            </div>
            <div class="field">
              <label>Tarifa por m³</label>
              <input name="cot_tarifaM3" type="number" step="0.01" min="0" placeholder="Ej. 180" />
            </div>
            <div class="field">
              <label>Tarifa por km</label>
              <input name="cot_tarifaKm" type="number" step="0.01" min="0" placeholder="Ej. 1.20" />
            </div>
          </div>

          <div class="card" style="margin-top:12px; box-shadow:none">
            <div class="card-title">Vista previa</div>
            <div id="cot_preview" class="muted">Ingresa peso, dimensiones y al menos una tarifa (o distancia + tarifa/km) para calcular.</div>
          </div>
        </section>

        <section class="form-section">
          <div class="section-head">
            <h3 class="title">Observaciones</h3>
            <span class="section-chip"><span class="ico">${ICONS.note}</span> Nota</span>
          </div>
          <div class="form-row">
            <div class="field"><label>Observación (opcional)</label><textarea name="observacion" placeholder="Sin observaciones"></textarea></div>
            <div class="hint">Al guardar, el sistema asigna estado inicial <b>Registrado</b>, crea el historial y genera el QR.</div>
          </div>
        </section>

        <section class="form-section">
          <div class="form-footer">
            <div class="actions">
              <button class="btn btn-primary btn-icon" type="submit" id="btnGuardar"><span class="ico">${ICONS.send}</span>Guardar envío</button>
              <button class="btn" type="button" id="btnLimpiar">Limpiar</button>
            </div>
            <span class="muted" id="status"></span>
          </div>
        </section>
      </form>
      </div>
    </main>
  `;

  window.GlsAuthGuard?.requireAuthOrRedirect?.().then(() => window.GlsMenu?.mountAuthMenu?.());

  const alertEl = document.getElementById("alert");
  const form = document.getElementById("formEnvio");
  const statusEl = document.getElementById("status");
  const btnGuardar = document.getElementById("btnGuardar");
  const btnLimpiar = document.getElementById("btnLimpiar");
  const cotPreviewEl = document.getElementById("cot_preview");
  const selClienteCatalogo = document.getElementById("selClienteCatalogo");
  /** @type {Map<string, { nombres?: string, documento?: string, telefono?: string, direccion?: string }>} */
  const catalogoClientesPorDocumento = new Map();

  function aplicarRemitenteDesdeCliente(docKey) {
    const k = String(docKey || "").trim();
    if (!k) return;
    const c = catalogoClientesPorDocumento.get(k);
    if (!c) return;
    const setVal = (name, val) => {
      const el = form.querySelector(`[name="${name}"]`);
      if (el && val != null && String(val).trim() !== "") el.value = String(val).trim();
    };
    setVal("r_nombres", c.nombres);
    setVal("r_documento", c.documento);
    setVal("r_telefono", c.telefono);
    setVal("r_direccion", c.direccion);
    window.GlsAlert.clearAlert(alertEl);
  }

  async function cargarCatalogoClientes() {
    if (!selClienteCatalogo) return;
    try {
      const r = await window.glsApi.clientes.listar({ limitCount: 500 });
      const prev = selClienteCatalogo.value;
      selClienteCatalogo.innerHTML = `<option value="">Sin asociación a catálogo</option>`;
      if (!r?.ok) {
        window.GlsAlert.showAlert(alertEl, {
          type: "info",
          message: r?.error ? `Catálogo de clientes no disponible: ${r.error}` : "Catálogo de clientes no disponible."
        });
        return;
      }
      catalogoClientesPorDocumento.clear();
      for (const c of r.clientes || []) {
        const doc = String(c.documento || "").trim();
        if (doc) catalogoClientesPorDocumento.set(doc, c);
        const opt = document.createElement("option");
        opt.value = c.documento || "";
        opt.textContent = `${c.nombres || ""} — ${c.documento || ""}`.trim();
        selClienteCatalogo.appendChild(opt);
      }
      if (prev) {
        selClienteCatalogo.value = prev;
        aplicarRemitenteDesdeCliente(prev);
      }
    } catch (e) {
      window.GlsAlert.showAlert(alertEl, {
        type: "info",
        message: `Catálogo de clientes no disponible: ${e?.message || String(e)}`
      });
    }
  }

  selClienteCatalogo?.addEventListener("change", () => {
    aplicarRemitenteDesdeCliente(selClienteCatalogo.value);
    scheduleQuotePreview();
  });

  function setBusy(busy, text) {
    btnGuardar.disabled = busy;
    btnLimpiar.disabled = busy;
    statusEl.textContent = text || "";
  }

  function payloadFromForm(fd) {
    return {
      origen: fd.get("origen"),
      destino: fd.get("destino"),
      tipoCarga: fd.get("tipoCarga"),
      descripcion: fd.get("descripcion"),
      peso: fd.get("peso"),
      dimensiones: {
        largo: fd.get("dim_largo"),
        ancho: fd.get("dim_ancho"),
        alto: fd.get("dim_alto"),
        unidadMedida: fd.get("dim_unidad")
      },
      cotizacion: {
        moneda: fd.get("cot_moneda"),
        distanciaKm: fd.get("cot_distanciaKm"),
        tarifaPorKg: fd.get("cot_tarifaKg"),
        tarifaPorM3: fd.get("cot_tarifaM3"),
        tarifaPorKm: fd.get("cot_tarifaKm"),
        seguroPorcentaje: fd.get("cot_seguroPct")
      },
      clienteDocumento: fd.get("cliente_documento_catalogo"),
      observacion: fd.get("observacion"),
      remitente: {
        nombres: fd.get("r_nombres"),
        documento: fd.get("r_documento"),
        telefono: fd.get("r_telefono"),
        direccion: fd.get("r_direccion")
      },
      destinatario: {
        nombres: fd.get("d_nombres"),
        documento: fd.get("d_documento"),
        telefono: fd.get("d_telefono"),
        direccion: fd.get("d_direccion")
      }
    };
  }

  function parseOptionalNumber(v) {
    if (v === null || v === undefined) return undefined;
    const s = String(v).trim();
    if (!s) return undefined;
    const n = Number(s);
    return Number.isFinite(n) ? n : undefined;
  }

  function applyCotizacionDefaults(formEl, defaults) {
    if (!defaults || !formEl) return;
    const monedaEl = formEl.querySelector('[name="cot_moneda"]');
    if (monedaEl && defaults.moneda) monedaEl.value = defaults.moneda;
    const map = [
      ["cot_distanciaKm", defaults.distanciaKm],
      ["cot_tarifaKg", defaults.tarifaPorKg],
      ["cot_tarifaM3", defaults.tarifaPorM3],
      ["cot_tarifaKm", defaults.tarifaPorKm],
      ["cot_seguroPct", defaults.seguroPorcentaje]
    ];
    for (const [name, val] of map) {
      if (val === undefined || val === null || Number.isNaN(val)) continue;
      const el = formEl.querySelector(`[name="${name}"]`);
      if (el) el.value = String(val);
    }
  }

  function printComprobante({ codigo, envio, imgSrc }) {
    const esc = escapeHtml;
    const e = envio || {};
    const ce = e.cotizacionEstimada;
    const d = ce?.desglose;
    const w = window.open("", "_blank");
    if (!w) {
      window.GlsAlert.showAlert(alertEl, {
        type: "info",
        message: "Permite ventanas emergentes para imprimir el comprobante."
      });
      return;
    }

    const cotRows =
      ce && d
        ? `
      <tr><td colspan="2"><b>Cotización</b></td></tr>
      <tr><td>Total estimado</td><td><b>${esc(String(d.totalEstimado))} ${esc(ce.moneda || "")}</b></td></tr>
      <tr><td>Subtotal</td><td>${esc(String(d.subtotal))} ${esc(ce.moneda || "")}</td></tr>
      <tr><td>Seguro</td><td>${esc(String(d.seguroMonto))} (${esc(String(d.seguroPorcentaje))}%)</td></tr>
    `
        : `<tr><td colspan="2" class="muted">Sin cotización calculada al registrar.</td></tr>`;

    const estadoInicial = esc(e.estadoActual || "Registrado");
    const fechaReg = esc(e.fechaRegistro || "");
    const cliSnap =
      e.clienteAsociado && (e.clienteAsociado.nombres || e.clienteAsociado.documento)
        ? `<tr><td>Cliente catálogo</td><td>${esc(e.clienteAsociado.nombres || "")} · ${esc(
            e.clienteAsociado.documento || ""
          )}</td></tr>`
        : "";

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Comprobante ${esc(codigo)}</title>
<style>
  body{font-family:Segoe UI,Arial,sans-serif;padding:22px;color:#222;max-width:720px;margin:0 auto}
  h1{font-size:17px;margin:0 0 6px;color:#7A2828}
  .sub{color:#666;font-size:12px;margin-bottom:14px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  td{padding:7px 0;border-bottom:1px solid #eee;vertical-align:top}
  td:first-child{width:38%;color:#555}
  .qr{text-align:center;margin-top:14px}
  .qr img{width:200px;height:200px}
  @media print{@page{margin:12mm}}
</style></head><body>
  <h1>GRUPO LOGÍSTICO SALAZAR S.A.C.</h1>
  <div class="sub">Comprobante de registro de envío</div>
  <table>
    <tr><td>Código</td><td><b>${esc(codigo)}</b></td></tr>
    <tr><td>Estado inicial</td><td><b>${estadoInicial}</b></td></tr>
    ${fechaReg ? `<tr><td>Fecha de registro</td><td><span class="mono">${fechaReg}</span></td></tr>` : ""}
    <tr><td>Origen → Destino</td><td>${esc(e.origen || "—")} → ${esc(e.destino || "—")}</td></tr>
    <tr><td>Remitente</td><td>${esc(e.remitente?.nombres || "")} · ${esc(e.remitente?.documento || "")}<br/><span style="color:#666;font-size:12px">${esc(
      e.remitente?.telefono || ""
    )} · ${esc(e.remitente?.direccion || "")}</span></td></tr>
    <tr><td>Destinatario</td><td>${esc(e.destinatario?.nombres || "")} · ${esc(e.destinatario?.documento || "")}<br/><span style="color:#666;font-size:12px">${esc(
      e.destinatario?.telefono || ""
    )} · ${esc(e.destinatario?.direccion || "")}</span></td></tr>
    ${cliSnap}
    <tr><td>Carga</td><td>${esc(e.tipoCarga || "")} — ${esc(e.descripcion || "")}</td></tr>
    <tr><td>Peso</td><td>${esc(String(e.peso ?? ""))} kg</td></tr>
    ${cotRows}
  </table>
  ${
    imgSrc
      ? `<div class="qr"><div style="font-size:12px;color:#555;margin-bottom:6px">Código QR (seguimiento)</div><img src="${esc(
          imgSrc
        )}" alt="QR" crossorigin="anonymous" /></div>`
      : `<div class="muted" style="margin-top:12px">QR no disponible para vista previa de impresión.</div>`
  }
</body></html>`;

    w.document.write(html);
    w.document.close();
    w.onload = () => {
      try {
        w.focus();
        w.print();
      } finally {
        w.close();
      }
    };
  }

  let previewTimer = null;

  async function applyDefaultsFromConfig() {
    try {
      const r = await window.glsApi.app.getCotizacionDefaults();
      if (r?.ok && r.defaults) applyCotizacionDefaults(form, r.defaults);
    } catch {}
  }

  function scheduleQuotePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => void runQuotePreview(), 320);
  }

  async function runQuotePreview() {
    const fd = new FormData(form);

    const cotizacion = {
      moneda: fd.get("cot_moneda") || "PEN",
      distanciaKm: parseOptionalNumber(fd.get("cot_distanciaKm")),
      tarifaPorKg: parseOptionalNumber(fd.get("cot_tarifaKg")),
      tarifaPorM3: parseOptionalNumber(fd.get("cot_tarifaM3")),
      tarifaPorKm: parseOptionalNumber(fd.get("cot_tarifaKm")),
      seguroPorcentaje: parseOptionalNumber(fd.get("cot_seguroPct")) ?? 0
    };

    const hasParams =
      cotizacion.distanciaKm !== undefined ||
      cotizacion.tarifaPorKg !== undefined ||
      cotizacion.tarifaPorM3 !== undefined ||
      cotizacion.tarifaPorKm !== undefined ||
      cotizacion.seguroPorcentaje > 0;

    if (!hasParams) {
      cotPreviewEl.className = "muted";
      cotPreviewEl.textContent =
        "Ingresa peso, dimensiones y al menos una tarifa (o distancia + tarifa/km) para calcular.";
      return;
    }

    const dl = fd.get("dim_largo");
    const da = fd.get("dim_ancho");
    const dh = fd.get("dim_alto");
    const pesoRaw = fd.get("peso");
    if (
      !String(dl || "").trim() ||
      !String(da || "").trim() ||
      !String(dh || "").trim() ||
      !String(pesoRaw || "").trim()
    ) {
      cotPreviewEl.className = "muted";
      cotPreviewEl.textContent = "Completa peso y dimensiones para ver la cotización.";
      return;
    }

    const payload = {
      peso: fd.get("peso"),
      dimensiones: {
        largo: fd.get("dim_largo"),
        ancho: fd.get("dim_ancho"),
        alto: fd.get("dim_alto"),
        unidadMedida: fd.get("dim_unidad")
      },
      cotizacion: {
        moneda: fd.get("cot_moneda"),
        distanciaKm: fd.get("cot_distanciaKm"),
        tarifaPorKg: fd.get("cot_tarifaKg"),
        tarifaPorM3: fd.get("cot_tarifaM3"),
        tarifaPorKm: fd.get("cot_tarifaKm"),
        seguroPorcentaje: fd.get("cot_seguroPct")
      }
    };

    let apiRes;
    try {
      apiRes = await window.glsApi.envios.previewCotizacion(payload);
    } catch (err) {
      cotPreviewEl.className = "muted";
      cotPreviewEl.textContent = humanizarErrorFirestore(err?.message || String(err));
      return;
    }

    if (!apiRes?.ok) {
      cotPreviewEl.className = "muted";
      cotPreviewEl.textContent = apiRes?.error || "No se pudo calcular la vista previa.";
      return;
    }

    if (!apiRes.cotizacionEstimada) {
      cotPreviewEl.className = "muted";
      cotPreviewEl.textContent = "Completa peso y dimensiones válidas para ver la vista previa.";
      return;
    }

    const est = apiRes.cotizacionEstimada;
    const d = est.desglose;
    cotPreviewEl.className = "";
    cotPreviewEl.innerHTML = `
      <div style="display:grid; gap:8px">
        <div><b>Peso cobrado:</b> ${escapeHtml(String(est.pesoCobradoKg))} kg
          <span class="muted"> (real vs volumétrico)</span>
        </div>
        <div class="muted">Volumen: ${escapeHtml(String(est.volumenM3))} m³ · Peso volumétrico (aprox.): ${escapeHtml(
      String(est.pesoVolumetricoKg)
    )} kg</div>
        <div style="margin-top:6px"><b>Desglose</b></div>
        <div class="muted">Por peso: ${escapeHtml(String(d.costoPorPeso))} · Por m³: ${escapeHtml(
      String(d.costoPorVolumen)
    )} · Por distancia: ${escapeHtml(String(d.costoPorDistancia))}</div>
        <div><b>Subtotal:</b> ${escapeHtml(String(d.subtotal))} ${escapeHtml(est.moneda)}</div>
        <div><b>Seguro:</b> ${escapeHtml(String(d.seguroMonto))} ${escapeHtml(est.moneda)}
          <span class="muted">(${escapeHtml(String(d.seguroPorcentaje))}%)</span>
        </div>
        <div style="margin-top:6px; font-size:16px; font-weight:950">
          Total estimado: ${escapeHtml(String(d.totalEstimado))} ${escapeHtml(est.moneda)}
        </div>
      </div>
    `;
  }

  btnLimpiar.addEventListener("click", async () => {
    form.reset();
    window.GlsAlert.clearAlert(alertEl);
    statusEl.textContent = "";
    await applyDefaultsFromConfig();
    scheduleQuotePreview();
  });

  form.addEventListener("input", scheduleQuotePreview);
  form.addEventListener("change", scheduleQuotePreview);

  cargarCatalogoClientes().then(() => applyDefaultsFromConfig().then(() => scheduleQuotePreview()));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    window.GlsAlert.clearAlert(alertEl);

    const fd0 = new FormData(form);
    const verr = validateRegistroForm(fd0);
    if (verr) {
      window.GlsAlert.showAlert(alertEl, { type: "error", message: verr });
      return;
    }

    try {
      setBusy(true, "Guardando en Firestore...");
      const fd = new FormData(form);
      const res = await window.glsApi.envios.crear(payloadFromForm(fd));

      if (!res?.ok) {
        window.GlsAlert.showAlert(alertEl, {
          type: "error",
          message: humanizarErrorFirestore(res?.error || "No se pudo crear el envío")
        });
        setBusy(false);
        return;
      }

      const codigo = res.codigoEnvio;
      const clienteDocElegido = String(fd.get("cliente_documento_catalogo") || "").trim();
      const imgSrc = `../assets/qr/${encodeURIComponent(codigo)}.png?ts=${Date.now()}`;
      const cot = await window.glsApi.envios.obtenerPorCodigo(codigo);
      const total =
        cot?.ok && cot.envio?.cotizacionEstimada?.desglose?.totalEstimado != null
          ? `${cot.envio.cotizacionEstimada.desglose.totalEstimado} ${cot.envio.cotizacionEstimada.moneda || ""}`.trim()
          : null;
      const clienteNoResuelto =
        Boolean(clienteDocElegido) && cot?.ok && !cot.envio?.clienteAsociado;

      window.GlsAlert.showAlert(alertEl, { type: "success", message: `Envío registrado: ${codigo}` });
      const qSeg = encodeURIComponent(codigo);
      const overlay = window.GlsModal.openModal({
        title: "Envío registrado",
        bodyHtml: `
          <div class="grid">
            <div class="badge ok">Código: <span class="mono">${escapeHtml(codigo)}</span></div>
            <div class="badge ok">Estado inicial: <b>Registrado</b></div>
            ${
              total
                ? `<div class="badge info">Total estimado: <b>${escapeHtml(total)}</b></div>`
                : `<div class="muted">Cotización: no calculada (vacía o sin tarifas).</div>`
            }
            ${
              clienteNoResuelto
                ? `<div class="hint" style="color:var(--warn, #b45309)"><b>Catálogo:</b> no hay cliente vigente para el documento elegido; el envío quedó <b>sin</b> asociación a empresa.</div>`
                : ""
            }
            <div class="card" style="display:grid; place-items:center">
              <img src="${imgSrc}" alt="QR" style="width:260px; height:260px; image-rendering:auto" />
              <div class="hint">QR guardado localmente en <span class="mono">src/renderer/assets/qr/</span></div>
            </div>
            <div class="actions" style="gap:10px; flex-wrap:wrap">
              <button type="button" class="btn btn-accent" id="btnPrintComprobante">Imprimir comprobante</button>
              <a class="btn btn-primary" href="./seguimiento-envio.html?codigo=${qSeg}">Ver trazabilidad</a>
              <a class="btn" href="./geolocalizacion-qr.html?codigo=${qSeg}">Geolocalización + QR</a>
            </div>
          </div>
        `
      });

      queueMicrotask(() => {
        overlay.querySelector("#btnPrintComprobante")?.addEventListener("click", () => {
          printComprobante({ codigo, envio: cot?.ok ? cot.envio : null, imgSrc });
        });
        overlay.querySelector(".btn-primary")?.focus();
      });

      form.reset();
      await applyDefaultsFromConfig();
      scheduleQuotePreview();
      setBusy(false, "Listo.");
    } catch (err) {
      window.GlsAlert.showAlert(alertEl, {
        type: "error",
        message: humanizarErrorFirestore(err?.message || String(err))
      });
      setBusy(false);
    }
  });
})();

