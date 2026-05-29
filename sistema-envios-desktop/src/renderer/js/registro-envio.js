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
    if (/no tiene permisos para registrar envíos/i.test(m)) {
      return "No tiene permisos para registrar envíos.";
    }
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
    return validateSoloTabCliente(fd) || validateSoloTabEnvio(fd);
  }

  /** Solo remitente y destinatario (tab Cliente); mismas reglas que las primeras filas de validateRegistroForm. */
  function validateSoloTabCliente(fd) {
    const checks = [
      validateRequiredText(fd.get("r_nombres"), "Remitente · nombres completos"),
      validateDocumentoUi(fd.get("r_documento"), "Remitente · documento"),
      validateTelefonoUi(fd.get("r_telefono"), "Remitente · teléfono"),
      validateRequiredText(fd.get("r_direccion"), "Remitente · dirección"),
      validateRequiredText(fd.get("d_nombres"), "Destinatario · nombres completos"),
      validateDocumentoUi(fd.get("d_documento"), "Destinatario · documento"),
      validateTelefonoUi(fd.get("d_telefono"), "Destinatario · teléfono"),
      validateRequiredText(fd.get("d_direccion"), "Destinatario · dirección")
    ];
    return checks.find(Boolean) || null;
  }

  /** Solo datos del envío y dimensiones (tab Datos del envío). */
  function validateSoloTabEnvio(fd) {
    const checks = [
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

  const MSG_PERMISO_REGISTRO = "No tiene permisos para registrar envíos.";
  const MSG_BUSCAR_REMITENTE_OK = "Remitente cargado desde un envío anterior.";
  const MSG_BUSCAR_REMITENTE_NO =
    "No hay envíos previos con ese documento como remitente. Complete los datos manualmente.";
  const MSG_BUSCAR_DESTINATARIO_OK = "Destinatario cargado desde un envío anterior.";
  const MSG_BUSCAR_DESTINATARIO_NO =
    "No hay envíos previos con ese documento como destinatario. Complete los datos manualmente.";
  const MSG_TABS_BLOQUEADOS =
    "Complete remitente y destinatario en el tab Cliente para continuar.";

  /** Roles autorizados para crear envíos (alineado con main: assertPuedeMutarOperaciones). */
  function puedeRegistrarEnvios(user) {
    const rol = String(user?.rol || "").trim().toLowerCase();
    if (!user || !rol) return false;
    return rol === "admin" || rol === "operaciones";
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

  appEl.innerHTML = `
    ${window.GlsMenu.renderMenu("registro")}
    <main class="main">
      ${window.GlsPageChrome.renderTopbar()}
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
      <div id="bannerPermisoRegistro" class="alert alert-error registro-permiso-banner" style="display:none" role="status"></div>

      <form id="formEnvio" class="registro-form-wrap" autocomplete="off">
        <div class="form-section registro-tabs-shell">
          <div class="registro-tablist" role="tablist" aria-label="Secciones del registro">
            <button type="button" class="registro-tab is-active" role="tab" id="tabBtnCliente" aria-selected="true" aria-controls="tabPanelCliente">Cliente</button>
            <button type="button" class="registro-tab" role="tab" id="tabBtnEnvio" aria-selected="false" aria-controls="tabPanelEnvio" disabled aria-disabled="true">Datos del envío</button>
            <button type="button" class="registro-tab" role="tab" id="tabBtnCotizacion" aria-selected="false" aria-controls="tabPanelCotizacion" disabled aria-disabled="true">Cotización estimada</button>
            <button type="button" class="registro-tab" role="tab" id="tabBtnObservaciones" aria-selected="false" aria-controls="tabPanelObservaciones" disabled aria-disabled="true">Observaciones</button>
          </div>
          <p class="hint registro-tabs-hint" id="registroTabsHint"></p>

          <div class="registro-tabpanel is-active" role="tabpanel" id="tabPanelCliente" aria-labelledby="tabBtnCliente">
            <section class="form-section" style="box-shadow:none; border:none; padding:0; margin:0">
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
              <div class="hint">El catálogo de empresas es opcional. Para autocompletar personas use la búsqueda por DNI en remitente o destinatario (solo si ya participaron en un envío anterior).</div>
            </section>

            <div class="grid grid-2" style="margin-top:12px">
              <section class="form-section" style="box-shadow:none; border:none; padding:0; margin:0">
                <div class="section-head">
                  <h3 class="title">Datos del remitente</h3>
                  <span class="section-chip"><span class="ico">${ICONS.user}</span> Remitente</span>
                </div>
                <div class="form-row grid grid-2 registro-buscar-parte" style="align-items:end; margin-bottom:10px">
                  <div class="field">
                    <label>Buscar remitente por DNI / RUC (envíos anteriores)</label>
                    <input type="text" id="inpBuscarDocRemitente" placeholder="Ej. 45678912" maxlength="20" autocomplete="off" />
                  </div>
                  <div class="actions" style="align-self:end">
                    <button type="button" class="btn btn-accent btn--sm" id="btnBuscarRemitenteEnvio">Buscar y cargar</button>
                  </div>
                </div>
                <p class="hint" id="hintBuscarRemitente" style="margin-top:-4px;margin-bottom:8px"></p>
                <div class="form-row grid grid-2">
                  <div class="field"><label>Nombres completos</label><input name="r_nombres" placeholder="Juan Pérez" required /></div>
                  <div class="field"><label>Documento</label><input name="r_documento" placeholder="45678912" required /></div>
                </div>
                <div class="form-row grid grid-2" style="margin-top:10px">
                  <div class="field"><label>Teléfono</label><input name="r_telefono" placeholder="999888777" required /></div>
                  <div class="field"><label>Dirección</label><input name="r_direccion" placeholder="Los Olivos, Lima" required /></div>
                </div>
              </section>

              <section class="form-section" style="box-shadow:none; border:none; padding:0; margin:0">
                <div class="section-head">
                  <h3 class="title">Datos del destinatario</h3>
                  <span class="section-chip"><span class="ico">${ICONS.user}</span> Destinatario</span>
                </div>
                <div class="form-row grid grid-2 registro-buscar-parte" style="align-items:end; margin-bottom:10px">
                  <div class="field">
                    <label>Buscar destinatario por DNI / RUC (envíos anteriores)</label>
                    <input type="text" id="inpBuscarDocDestinatario" placeholder="Ej. 76543210" maxlength="20" autocomplete="off" />
                  </div>
                  <div class="actions" style="align-self:end">
                    <button type="button" class="btn btn-accent btn--sm" id="btnBuscarDestinatarioEnvio">Buscar y cargar</button>
                  </div>
                </div>
                <p class="hint" id="hintBuscarDestinatario" style="margin-top:-4px;margin-bottom:8px"></p>
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
          </div>

          <div class="registro-tabpanel" role="tabpanel" id="tabPanelEnvio" aria-labelledby="tabBtnEnvio" hidden>
            <section class="form-section" style="box-shadow:none; border:none; padding:0; margin:0">
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
          </div>

          <div class="registro-tabpanel" role="tabpanel" id="tabPanelCotizacion" aria-labelledby="tabBtnCotizacion" hidden>
            <section class="form-section" style="box-shadow:none; border:none; padding:0; margin:0">
              <div class="section-head">
                <h3 class="title">Cotización estimada</h3>
                <span class="section-chip">Opcional</span>
              </div>
              <div class="card-subtitle" style="margin-top:-6px">
                Si completa tarifas o distancia, verá un monto referencial (no es comprobante fiscal). Puede registrar el envío sin cotización; en ese caso no se guardará total estimado.
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
          </div>

          <div class="registro-tabpanel" role="tabpanel" id="tabPanelObservaciones" aria-labelledby="tabBtnObservaciones" hidden>
            <section class="form-section" style="box-shadow:none; border:none; padding:0; margin:0">
              <div class="section-head">
                <h3 class="title">Observaciones</h3>
                <span class="section-chip"><span class="ico">${ICONS.note}</span> Opcional</span>
              </div>
              <div class="form-row">
                <div class="field"><label>Observación</label><textarea name="observacion" placeholder="Sin observaciones"></textarea></div>
                <p class="muted" style="margin-top:8px;font-size:12px">Al guardar se asigna el estado <b>Registrado</b>, se registra el historial y se genera el código QR.</p>
              </div>
            </section>
          </div>
        </div>

        <section class="form-section">
          <div class="form-footer registro-tab-footer">
            <div class="actions">
              <button type="button" class="btn" id="btnTabAnterior" hidden>Anterior</button>
              <button type="button" class="btn btn-accent" id="btnTabSiguiente">Siguiente</button>
              <button class="btn btn-primary btn-icon" type="button" id="btnGuardar" hidden disabled aria-hidden="true"><span class="ico">${ICONS.send}</span>Registrar envío</button>
              <button class="btn" type="button" id="btnLimpiarFormulario">Limpiar formulario</button>
            </div>
            <span class="muted" id="status"></span>
          </div>
          <p class="hint" id="hintGuardarEnvio" style="margin-top:10px"></p>
        </section>
      </form>
      </div>
    </main>
  `;

  const alertEl = document.getElementById("alert");
  const form = document.getElementById("formEnvio");
  const statusEl = document.getElementById("status");
  const hintGuardarEnvio = document.getElementById("hintGuardarEnvio");
  const btnGuardar = document.getElementById("btnGuardar");
  const btnTabAnterior = document.getElementById("btnTabAnterior");
  const btnTabSiguiente = document.getElementById("btnTabSiguiente");
  const bannerPermiso = document.getElementById("bannerPermisoRegistro");
  const btnLimpiarFormulario = document.getElementById("btnLimpiarFormulario");
  const inpBuscarDocRemitente = document.getElementById("inpBuscarDocRemitente");
  const inpBuscarDocDestinatario = document.getElementById("inpBuscarDocDestinatario");
  const btnBuscarRemitenteEnvio = document.getElementById("btnBuscarRemitenteEnvio");
  const btnBuscarDestinatarioEnvio = document.getElementById("btnBuscarDestinatarioEnvio");
  const hintBuscarRemitente = document.getElementById("hintBuscarRemitente");
  const hintBuscarDestinatario = document.getElementById("hintBuscarDestinatario");
  const cotPreviewEl = document.getElementById("cot_preview");
  const selClienteCatalogo = document.getElementById("selClienteCatalogo");
  /** @type {Map<string, { nombres?: string, documento?: string, telefono?: string, direccion?: string }>} */
  const catalogoClientesPorDocumento = new Map();

  const tabKeys = ["cliente", "envio", "cotizacion", "observaciones"];
  const tabBtns = {
    cliente: document.getElementById("tabBtnCliente"),
    envio: document.getElementById("tabBtnEnvio"),
    cotizacion: document.getElementById("tabBtnCotizacion"),
    observaciones: document.getElementById("tabBtnObservaciones")
  };
  const tabPanels = {
    cliente: document.getElementById("tabPanelCliente"),
    envio: document.getElementById("tabPanelEnvio"),
    cotizacion: document.getElementById("tabPanelCotizacion"),
    observaciones: document.getElementById("tabPanelObservaciones")
  };
  const tabsHint = document.getElementById("registroTabsHint");
  let tabActiva = "cliente";

  function clienteTabCompleto() {
    return !validateSoloTabCliente(new FormData(form));
  }

  function selectTab(id, opts = {}) {
    const silent = opts.silent === true;
    if (id !== "cliente" && !clienteTabCompleto()) {
      if (!silent) {
        window.GlsAlert.showAlert(alertEl, { type: "info", message: MSG_TABS_BLOQUEADOS });
      }
      id = "cliente";
    }
    if (!tabKeys.includes(id)) id = "cliente";
    tabActiva = id;
    for (const k of tabKeys) {
      const btn = tabBtns[k];
      const pan = tabPanels[k];
      const sel = k === id;
      if (btn) {
        btn.setAttribute("aria-selected", sel ? "true" : "false");
        btn.classList.toggle("is-active", sel);
      }
      if (pan) {
        pan.toggleAttribute("hidden", !sel);
        pan.classList.toggle("is-active", sel);
      }
    }
    refreshNavTabFormulario();
  }

  function tabIndice(id) {
    return tabKeys.indexOf(id);
  }

  function validarTabActualParaAvanzar() {
    const fd = new FormData(form);
    if (tabActiva === "cliente") return validateSoloTabCliente(fd);
    if (tabActiva === "envio") return validateSoloTabEnvio(fd);
    return null;
  }

  function avanzarTab() {
    window.GlsAlert.clearAlert(alertEl);
    const err = validarTabActualParaAvanzar();
    if (err) {
      window.GlsAlert.showAlert(alertEl, { type: "error", message: err });
      focusTabForValidationError(err);
      return;
    }
    const idx = tabIndice(tabActiva);
    if (idx < 0 || idx >= tabKeys.length - 1) return;
    selectTab(tabKeys[idx + 1]);
  }

  function retrocederTab() {
    const idx = tabIndice(tabActiva);
    if (idx <= 0) return;
    selectTab(tabKeys[idx - 1]);
  }

  function updateClienteTabGate() {
    const ok = clienteTabCompleto();
    for (const k of ["envio", "cotizacion", "observaciones"]) {
      const b = tabBtns[k];
      if (!b) continue;
      b.disabled = !ok;
      b.setAttribute("aria-disabled", ok ? "false" : "true");
      b.classList.toggle("is-disabled", !ok);
    }
    if (tabsHint) tabsHint.textContent = ok ? "" : MSG_TABS_BLOQUEADOS;
    if (!ok && tabActiva !== "cliente") selectTab("cliente", { silent: true });
    refreshNavTabFormulario();
  }

  function focusTabForValidationError(msg) {
    const m = String(msg || "");
    if (/Remitente|Destinatario/i.test(m)) selectTab("cliente", { silent: true });
    else selectTab("envio", { silent: true });
  }

  for (const k of tabKeys) {
    tabBtns[k]?.addEventListener("click", () => selectTab(k));
  }

  let sessionUser = null;
  let puedeRegistrar = false;
  let registroSubmitEnCurso = false;
  /** Última cotización calculada en vista previa (resumen antes de guardar). */
  let lastPreviewCotizacion = null;

  /** Pestañas donde puede mostrarse «Registrar envío». */
  function tabPermiteRegistrarEnvio(tab = tabActiva) {
    return tab === "cotizacion" || tab === "observaciones";
  }

  /** Cliente + Datos del envío (campos obligatorios) sin errores. */
  function formularioObligatoriosCompletos(fd) {
    return !validateRegistroForm(fd);
  }

  /** Visible solo en Cotización u Observaciones y con todos los obligatorios listos. */
  function puedeMostrarBotonRegistrar(tab = tabActiva, fd = new FormData(form)) {
    return Boolean(tabPermiteRegistrarEnvio(tab) && formularioObligatoriosCompletos(fd) && puedeRegistrar);
  }

  function refreshNavTabFormulario() {
    const fd = new FormData(form);
    const mostrarRegistrar = puedeMostrarBotonRegistrar(tabActiva, fd);
    const idx = tabIndice(tabActiva);
    const enCotizacionOUltimo = tabPermiteRegistrarEnvio(tabActiva);

    if (btnTabAnterior) {
      btnTabAnterior.hidden = idx <= 0;
      btnTabAnterior.disabled = registroSubmitEnCurso;
    }
    if (btnTabSiguiente) {
      const mostrarSiguiente = tabActiva === "cliente" || tabActiva === "envio";
      btnTabSiguiente.hidden = !mostrarSiguiente;
      btnTabSiguiente.disabled = registroSubmitEnCurso || !mostrarSiguiente;
    }
    if (btnGuardar) {
      btnGuardar.hidden = !mostrarRegistrar;
      btnGuardar.style.display = mostrarRegistrar ? "" : "none";
      btnGuardar.setAttribute("aria-hidden", mostrarRegistrar ? "false" : "true");
      btnGuardar.disabled = registroSubmitEnCurso || !mostrarRegistrar;
    }
    if (hintGuardarEnvio) {
      if (!puedeRegistrar) {
        hintGuardarEnvio.textContent = "";
      } else if (mostrarRegistrar) {
        hintGuardarEnvio.textContent = "";
      } else if (enCotizacionOUltimo) {
        hintGuardarEnvio.textContent =
          "Complete todos los datos obligatorios de Cliente y Datos del envío para habilitar «Registrar envío».";
      } else {
        hintGuardarEnvio.textContent = "Complete cada pestaña y use «Siguiente» para continuar.";
      }
    }
  }

  /** @deprecated use refreshNavTabFormulario */
  function refreshEstadoGuardarBoton() {
    refreshNavTabFormulario();
  }

  function aplicarParteEnFormulario(prefijo, parte) {
    if (!parte) return;
    const setVal = (name, val) => {
      const el = form.querySelector(`[name="${name}"]`);
      if (el && val != null && String(val).trim() !== "") el.value = String(val).trim();
    };
    setVal(`${prefijo}nombres`, parte.nombres);
    setVal(`${prefijo}documento`, parte.documento);
    setVal(`${prefijo}telefono`, parte.telefono);
    setVal(`${prefijo}direccion`, parte.direccion);
    window.GlsAlert.clearAlert(alertEl);
    updateClienteTabGate();
  }

  function aplicarRemitenteDesdeObjetoCliente(c) {
    if (!c) {
      updateClienteTabGate();
      return;
    }
    aplicarParteEnFormulario("r_", c);
  }

  function aplicarRemitenteDesdeCliente(docKey) {
    const k = String(docKey || "").trim();
    if (!k) return;
    const c = catalogoClientesPorDocumento.get(k);
    aplicarRemitenteDesdeObjetoCliente(c);
  }

  async function buscarParteEnEnviosHistoricos(rol) {
    const esDest = rol === "destinatario";
    const inp = esDest ? inpBuscarDocDestinatario : inpBuscarDocRemitente;
    const hint = esDest ? hintBuscarDestinatario : hintBuscarRemitente;
    const btn = esDest ? btnBuscarDestinatarioEnvio : btnBuscarRemitenteEnvio;
    const prefijo = esDest ? "d_" : "r_";
    const msgOk = esDest ? MSG_BUSCAR_DESTINATARIO_OK : MSG_BUSCAR_REMITENTE_OK;
    const msgNo = esDest ? MSG_BUSCAR_DESTINATARIO_NO : MSG_BUSCAR_REMITENTE_NO;

    window.GlsAlert.clearAlert(alertEl);
    const doc = String(inp?.value || "").trim();
    if (!doc) {
      window.GlsAlert.showAlert(alertEl, {
        type: "error",
        message: `Ingrese el documento del ${esDest ? "destinatario" : "remitente"} para buscar.`
      });
      return;
    }
    if (hint) hint.textContent = "Buscando en envíos anteriores…";
    if (btn) btn.disabled = true;
    try {
      const r = await window.glsApi.envios.buscarPartePorDocumento({ documento: doc, rol });
      if (r?.ok && r.parte) {
        aplicarParteEnFormulario(prefijo, r.parte);
        if (inp && r.parte.documento) inp.value = r.parte.documento;
        if (!esDest && selClienteCatalogo && r.parte.documento) {
          const v = String(r.parte.documento).trim();
          if ([...selClienteCatalogo.options].some((o) => o.value === v)) {
            selClienteCatalogo.value = v;
          }
        }
        if (hint) {
          const ref = r.parte.ultimoCodigoEnvio
            ? `Último envío: ${r.parte.ultimoCodigoEnvio}`
            : "";
          hint.textContent = ref;
        }
        window.GlsAlert.showAlert(alertEl, { type: "success", message: msgOk });
      } else {
        if (hint) hint.textContent = "";
        window.GlsAlert.showAlert(alertEl, { type: "info", message: r?.error || msgNo });
      }
    } catch (err) {
      if (hint) hint.textContent = "";
      window.GlsAlert.showAlert(alertEl, {
        type: "error",
        message: humanizarErrorFirestore(err?.message || String(err))
      });
    } finally {
      if (btn) btn.disabled = registroSubmitEnCurso;
    }
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
        updateClienteTabGate();
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
      updateClienteTabGate();
    } catch (e) {
      window.GlsAlert.showAlert(alertEl, {
        type: "info",
        message: `Catálogo de clientes no disponible: ${e?.message || String(e)}`
      });
      updateClienteTabGate();
    }
  }

  selClienteCatalogo?.addEventListener("change", () => {
    aplicarRemitenteDesdeCliente(selClienteCatalogo.value);
    scheduleQuotePreview();
    updateClienteTabGate();
  });

  function setBusy(busy, text) {
    registroSubmitEnCurso = busy;
    btnLimpiarFormulario.disabled = busy;
    if (btnBuscarRemitenteEnvio) btnBuscarRemitenteEnvio.disabled = busy;
    if (btnBuscarDestinatarioEnvio) btnBuscarDestinatarioEnvio.disabled = busy;
    if (btnTabAnterior) btnTabAnterior.disabled = busy || tabIndice(tabActiva) <= 0;
    if (btnTabSiguiente) btnTabSiguiente.disabled = busy || !(tabActiva === "cliente" || tabActiva === "envio");
    statusEl.textContent = text || "";
    refreshNavTabFormulario();
  }

  /** True si el usuario escribió algo en el formulario (para confirmar limpieza). */
  function formularioTieneDatos() {
    const fd = new FormData(form);
    const keys = [
      "r_nombres",
      "r_documento",
      "r_telefono",
      "r_direccion",
      "d_nombres",
      "d_documento",
      "d_telefono",
      "d_direccion",
      "origen",
      "destino",
      "tipoCarga",
      "descripcion",
      "peso",
      "dim_largo",
      "dim_ancho",
      "dim_alto",
      "observacion",
      "cot_distanciaKm",
      "cot_seguroPct",
      "cot_tarifaKg",
      "cot_tarifaM3",
      "cot_tarifaKm"
    ];
    for (const k of keys) {
      if (String(fd.get(k) || "").trim()) return true;
    }
    if (String(fd.get("cliente_documento_catalogo") || "").trim()) return true;
    if (String(inpBuscarDocRemitente?.value || "").trim()) return true;
    if (String(inpBuscarDocDestinatario?.value || "").trim()) return true;
    return false;
  }

  /** Limpia el formulario y la vista previa de cotización (no toca Firestore). */
  async function limpiarFormularioCompleto() {
    form.reset();
    if (selClienteCatalogo) selClienteCatalogo.value = "";
    if (inpBuscarDocRemitente) inpBuscarDocRemitente.value = "";
    if (inpBuscarDocDestinatario) inpBuscarDocDestinatario.value = "";
    if (hintBuscarRemitente) hintBuscarRemitente.textContent = "";
    if (hintBuscarDestinatario) hintBuscarDestinatario.textContent = "";
    lastPreviewCotizacion = null;
    cotPreviewEl.className = "muted";
    cotPreviewEl.textContent =
      "Ingresa peso, dimensiones y al menos una tarifa (o distancia + tarifa/km) para calcular.";
    window.GlsAlert.clearAlert(alertEl);
    statusEl.textContent = "";
    await applyDefaultsFromConfig();
    scheduleQuotePreview();
    selectTab("cliente", { silent: true });
    updateClienteTabGate();
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
      lastPreviewCotizacion = null;
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
      lastPreviewCotizacion = null;
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
      lastPreviewCotizacion = null;
      cotPreviewEl.className = "muted";
      cotPreviewEl.textContent = humanizarErrorFirestore(err?.message || String(err));
      return;
    }

    if (!apiRes?.ok) {
      lastPreviewCotizacion = null;
      cotPreviewEl.className = "muted";
      cotPreviewEl.textContent = apiRes?.error || "No se pudo calcular la vista previa.";
      return;
    }

    if (!apiRes.cotizacionEstimada) {
      lastPreviewCotizacion = null;
      cotPreviewEl.className = "muted";
      cotPreviewEl.textContent = "Completa peso y dimensiones válidas para ver la vista previa.";
      return;
    }

    const est = apiRes.cotizacionEstimada;
    lastPreviewCotizacion = est;
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

  /** Resumen legible para el modal de confirmación antes de persistir en Firestore. */
  function buildResumenConfirmacionHtml(fd, cotEst) {
    const dim = `${escapeHtml(fd.get("dim_largo") || "")} × ${escapeHtml(fd.get("dim_ancho") || "")} × ${escapeHtml(
      fd.get("dim_alto") || ""
    )} ${escapeHtml(fd.get("dim_unidad") || "")}`;
    const totalLine =
      cotEst?.desglose?.totalEstimado != null
        ? `<p style="margin-top:10px"><b>Total estimado (cotización):</b> ${escapeHtml(
            String(cotEst.desglose.totalEstimado)
          )} ${escapeHtml(cotEst.moneda || "")}</p>`
        : `<p class="muted" style="margin-top:10px">Sin total estimado (cotización vacía o incompleta).</p>`;
    return `
      <p><b>¿Confirma que desea registrar este envío?</b></p>
      <div class="card" style="box-shadow:none; margin-top:8px">
        <div class="card-title">Resumen</div>
        <p><b>Remitente:</b> ${escapeHtml(fd.get("r_nombres") || "")} · doc. ${escapeHtml(fd.get("r_documento") || "")}</p>
        <p><b>Destinatario:</b> ${escapeHtml(fd.get("d_nombres") || "")} · doc. ${escapeHtml(fd.get("d_documento") || "")}</p>
        <p><b>Origen:</b> ${escapeHtml(fd.get("origen") || "")} → <b>Destino:</b> ${escapeHtml(fd.get("destino") || "")}</p>
        <p><b>Tipo de carga:</b> ${escapeHtml(fd.get("tipoCarga") || "")}</p>
        <p><b>Descripción:</b> ${escapeHtml(fd.get("descripcion") || "")}</p>
        <p><b>Peso:</b> ${escapeHtml(fd.get("peso") || "")} kg</p>
        <p><b>Dimensiones:</b> ${dim}</p>
        ${totalLine}
      </div>
    `;
  }

  /**
   * Persistencia del envío (tras confirmación). Mantiene el flujo previo: crear → obtener → modal éxito.
   */
  async function ejecutarRegistroEnvio() {
    if (registroSubmitEnCurso) return;
    const fd = new FormData(form);
    try {
      setBusy(true, "Guardando en Firestore...");
      const res = await window.glsApi.envios.crear(payloadFromForm(fd));

      if (!res?.ok) {
        window.GlsAlert.showAlert(alertEl, {
          type: "error",
          message: humanizarErrorFirestore(res?.error || "No se pudo crear el envío")
        });
        setBusy(false, "");
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
            <div>${window.GlsEstadoEnvio?.badgeHtml?.("Registrado") || '<span class="badge ok">Estado inicial: <b>Registrado</b></span>'}</div>
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
              <button type="button" class="btn btn-accent" id="btnExportPdfComprobante">Exportar PDF</button>
              <a class="btn btn-primary" href="./seguimiento-envio.html?codigo=${qSeg}">Ver trazabilidad</a>
              <a class="btn" href="./geolocalizacion-qr.html?codigo=${qSeg}">Geolocalización + QR</a>
            </div>
          </div>
        `
      });

      queueMicrotask(() => {
        const envioDoc = cot?.ok ? cot.envio : null;
        overlay.querySelector("#btnPrintComprobante")?.addEventListener("click", () => {
          void window.GlsComprobanteEnvio?.printComprobante?.({
            codigo,
            envio: envioDoc,
            imgSrc,
            historial: envioDoc ? [{ estado: "Registrado", fechaActualizacion: envioDoc.fechaRegistro }] : [],
            alertEl
          });
        });
        overlay.querySelector("#btnExportPdfComprobante")?.addEventListener("click", () => {
          void window.GlsComprobanteEnvioPdf?.exportComprobantePdf?.({
            codigo,
            envio: envioDoc,
            imgSrc,
            historial: envioDoc ? [{ estado: "Registrado", fechaActualizacion: envioDoc.fechaRegistro }] : [],
            alertEl
          });
        });
        overlay.querySelector(".btn-primary")?.focus();
      });

      form.reset();
      if (selClienteCatalogo) selClienteCatalogo.value = "";
      if (inpBuscarDocRemitente) inpBuscarDocRemitente.value = "";
      if (inpBuscarDocDestinatario) inpBuscarDocDestinatario.value = "";
      if (hintBuscarRemitente) hintBuscarRemitente.textContent = "";
      if (hintBuscarDestinatario) hintBuscarDestinatario.textContent = "";
      lastPreviewCotizacion = null;
      await applyDefaultsFromConfig();
      scheduleQuotePreview();
      selectTab("cliente", { silent: true });
      updateClienteTabGate();
      setBusy(false, "Listo.");
    } catch (err) {
      window.GlsAlert.showAlert(alertEl, {
        type: "error",
        message: humanizarErrorFirestore(err?.message || String(err))
      });
      setBusy(false, "");
    }
  }

  btnLimpiarFormulario.addEventListener("click", async () => {
    if (!formularioTieneDatos()) {
      await limpiarFormularioCompleto();
      return;
    }
    if (!window.confirm("¿Desea limpiar el formulario? Se perderán los datos ingresados.")) return;
    await limpiarFormularioCompleto();
  });

  btnBuscarRemitenteEnvio?.addEventListener("click", () => void buscarParteEnEnviosHistoricos("remitente"));
  btnBuscarDestinatarioEnvio?.addEventListener("click", () => void buscarParteEnEnviosHistoricos("destinatario"));

  inpBuscarDocRemitente?.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      void buscarParteEnEnviosHistoricos("remitente");
    }
  });
  inpBuscarDocDestinatario?.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter") {
      ev.preventDefault();
      void buscarParteEnEnviosHistoricos("destinatario");
    }
  });

  function onFormFieldActivity() {
    scheduleQuotePreview();
    updateClienteTabGate();
  }
  form.addEventListener("input", onFormFieldActivity);
  form.addEventListener("change", onFormFieldActivity);

  btnTabSiguiente?.addEventListener("click", () => avanzarTab());
  btnTabAnterior?.addEventListener("click", () => retrocederTab());

  form.addEventListener("keydown", (ev) => {
    if (ev.key !== "Enter" || ev.target?.tagName === "TEXTAREA") return;
    if (tabPermiteRegistrarEnvio(tabActiva)) {
      ev.preventDefault();
      if (puedeMostrarBotonRegistrar()) void solicitarRegistroEnvio();
      return;
    }
    ev.preventDefault();
    avanzarTab();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
  });

  async function solicitarRegistroEnvio() {
    if (registroSubmitEnCurso) return;
    window.GlsAlert.clearAlert(alertEl);

    if (!tabPermiteRegistrarEnvio(tabActiva)) {
      return;
    }

    if (!puedeRegistrar) {
      window.GlsAlert.showAlert(alertEl, { type: "error", message: MSG_PERMISO_REGISTRO });
      return;
    }

    const fd0 = new FormData(form);
    if (!formularioObligatoriosCompletos(fd0)) {
      const verr = validateRegistroForm(fd0);
      window.GlsAlert.showAlert(alertEl, {
        type: "error",
        message: verr || "Complete todos los datos obligatorios antes de registrar."
      });
      focusTabForValidationError(verr);
      refreshNavTabFormulario();
      return;
    }

    const prevPayload = payloadFromForm(fd0);
    let cotEst = null;
    try {
      const prevRes = await window.glsApi.envios.previewCotizacion(prevPayload);
      if (prevRes?.ok && prevRes.cotizacionEstimada) cotEst = prevRes.cotizacionEstimada;
    } catch {
      cotEst = lastPreviewCotizacion;
    }
    if (!cotEst) cotEst = lastPreviewCotizacion;

    window.GlsModal.openConfirmModal({
      title: "Confirmar registro de envío",
      bodyHtml: buildResumenConfirmacionHtml(fd0, cotEst),
      confirmLabel: "Sí, registrar",
      cancelLabel: "Cancelar",
      onConfirm: () => {
        void ejecutarRegistroEnvio();
      }
    });
  }

  btnGuardar?.addEventListener("click", () => {
    void solicitarRegistroEnvio();
  });

  /** Tras login: permisos, menú y carga inicial del catálogo (auth-guard se mantiene en HTML). */
  async function initRegistroPage(user) {
    sessionUser = user;
    window.GlsMenu?.mountAuthMenu?.();
    puedeRegistrar = puedeRegistrarEnvios(user);
    if (bannerPermiso) {
      if (!puedeRegistrar) {
        bannerPermiso.style.display = "block";
        bannerPermiso.textContent = MSG_PERMISO_REGISTRO;
      } else {
        bannerPermiso.style.display = "none";
        bannerPermiso.textContent = "";
      }
    }
    await cargarCatalogoClientes();
    await applyDefaultsFromConfig();
    scheduleQuotePreview();
    selectTab("cliente", { silent: true });
    updateClienteTabGate();
    refreshNavTabFormulario();
  }

  window.GlsAuthGuard?.requireAuthOrRedirect?.().then((u) => {
    if (u) void initRegistroPage(u);
  });
})();

