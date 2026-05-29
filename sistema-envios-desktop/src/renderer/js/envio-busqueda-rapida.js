/**
 * Búsqueda unificada (consulta / geolocalización): filtros, QR/PDF y lista de envíos.
 */
(function () {
  "use strict";

  const LIMIT_LISTA_DEFAULT = 40;
  const LIMIT_LISTA_TODOS = 2000;
  /** Mismo criterio que ipc-security.validateCodigoEnvio */
  const CODIGO_ENVIO_RE = /^ENV-\d{4}-\d{4,}$/i;

  const ESTADOS_FILTRO = [
    "Todos",
    "Registrado",
    "En almacén",
    "En tránsito",
    "En reparto",
    "Entregado",
    "Observado",
    "Cancelado"
  ];

  const ICON_PDF_QR =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 4h8l4 4v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M16 4v4h4" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9 13h2.2v4H9v-4Zm3.4 0H15l-1.2 2.1L15 17h-2.6l-1.2-2.1 1.2-1.9Z" fill="currentColor"/></svg>';

  function formatFechaRegistro(iso) {
    if (!iso) return "—";
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) return String(iso).slice(0, 16);
    return new Date(t).toLocaleString("es-PE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function estadoOptionsHtml() {
    return ESTADOS_FILTRO.map((e) => `<option value="${escapeHtml(e)}">${escapeHtml(e)}</option>`).join("");
  }

  /**
   * @param {{ idPrefix: string, codigoInicial?: string, navHtml?: string }} cfg
   */
  function renderBusquedaPanelHtml(cfg = {}) {
    const p = cfg.idPrefix || "gls";
    const codigoVal = escapeHtml(cfg.codigoInicial || "");
    const navHtml = cfg.navHtml || "";
    return `
      <div class="envio-busqueda-panel" data-busqueda-prefix="${escapeHtml(p)}">
        <div class="form-row envio-busqueda-filtros">
          <div class="field envio-busqueda-field-modo">
            <label for="${p}ModoBuscar">Buscar por</label>
            <select id="${p}ModoBuscar" class="gls-control">
              <option value="codigo">Código de envío</option>
              <option value="cliente">Cliente</option>
              <option value="estado">Estado</option>
            </select>
          </div>
          <div class="envio-busqueda-valor-slot">
            <div class="field envio-busqueda-field-valor envio-busqueda-valor--codigo" id="${p}WrapCodigo">
              <label for="${p}InputCodigo">Código</label>
              <input id="${p}InputCodigo" class="gls-control envio-busqueda-input-codigo" type="text" placeholder="ENV-2026-0001" value="${codigoVal}" autocomplete="off" spellcheck="false" />
            </div>
            <div class="field envio-busqueda-field-valor envio-busqueda-valor--cliente" id="${p}WrapCliente" hidden>
              <label for="${p}InputCliente">Cliente</label>
              <input id="${p}InputCliente" class="gls-control envio-busqueda-input-cliente" type="text" placeholder="Nombre, RUC o DNI" autocomplete="off" spellcheck="false" />
            </div>
            <div class="field envio-busqueda-field-valor envio-busqueda-valor--estado" id="${p}WrapEstado" hidden>
              <label for="${p}SelectEstado">Estado</label>
              <select id="${p}SelectEstado" class="gls-control">${estadoOptionsHtml()}</select>
            </div>
          </div>
          <div class="envio-busqueda-actions">
            <button type="button" class="btn btn-primary envio-busqueda-btn-buscar" id="${p}BtnBuscar">Buscar</button>
            <button type="button" class="btn envio-busqueda-btn-limpiar" id="${p}BtnLimpiar" hidden>Limpiar</button>
            <input type="file" id="${p}QrFile" class="envio-busqueda-file" accept="image/png,image/jpeg,image/webp,application/pdf,.pdf" hidden />
            <button type="button" class="envio-qr-pdf-btn envio-busqueda-btn-qr" id="${p}BtnQr" title="Subir PDF o imagen del QR" aria-label="Subir PDF o imagen del QR">
              <span class="ico">${ICON_PDF_QR}</span>
            </button>
          </div>
        </div>
        ${navHtml ? `<div class="envio-busqueda-nav muted">${navHtml}</div>` : ""}
        <div class="muted envio-busqueda-status" id="${p}Status"></div>
      </div>`;
  }

  /**
   * @param {HTMLElement} mountEl
   * @param {{ idPrefix: string }} cfg
   */
  function wireBusquedaPanel(mountEl, cfg = {}) {
    const p = cfg.idPrefix || "gls";
    const panel = mountEl?.querySelector?.(`[data-busqueda-prefix="${p}"]`) || mountEl;
    if (!panel) return null;

    const modoEl = panel.querySelector(`#${p}ModoBuscar`);
    const wrapCodigo = panel.querySelector(`#${p}WrapCodigo`);
    const wrapCliente = panel.querySelector(`#${p}WrapCliente`);
    const wrapEstado = panel.querySelector(`#${p}WrapEstado`);
    const inputCodigo = panel.querySelector(`#${p}InputCodigo`);
    const inputCliente = panel.querySelector(`#${p}InputCliente`);
    const selectEstado = panel.querySelector(`#${p}SelectEstado`);
    const btnBuscar = panel.querySelector(`#${p}BtnBuscar`);
    const btnLimpiar = panel.querySelector(`#${p}BtnLimpiar`);
    const btnQr = panel.querySelector(`#${p}BtnQr`);
    const qrFile = panel.querySelector(`#${p}QrFile`);
    const statusEl = panel.querySelector(`#${p}Status`);

    function ensureCamposEditables() {
      [inputCodigo, inputCliente, selectEstado].forEach((el) => {
        if (!el) return;
        el.disabled = false;
        el.readOnly = false;
        el.removeAttribute("aria-disabled");
      });
    }

    function syncCampos(focusActivo = false) {
      const modo = modoEl?.value || "codigo";
      if (wrapCodigo) wrapCodigo.hidden = modo !== "codigo";
      if (wrapCliente) wrapCliente.hidden = modo !== "cliente";
      if (wrapEstado) wrapEstado.hidden = modo !== "estado";
      ensureCamposEditables();
      if (focusActivo) {
        const activo =
          modo === "cliente" ? inputCliente : modo === "estado" ? selectEstado : inputCodigo;
        activo?.focus?.();
      }
    }

    modoEl?.addEventListener("change", () => syncCampos(true));
    syncCampos(false);

    function getCriterios() {
      const modo = modoEl?.value || "codigo";
      return {
        modo,
        codigo: (inputCodigo?.value || "").trim(),
        cliente: (inputCliente?.value || "").trim(),
        estado: selectEstado?.value || "Todos"
      };
    }

    function setModoCodigo(codigo) {
      if (modoEl) modoEl.value = "codigo";
      syncCampos();
      if (inputCodigo && codigo != null) inputCodigo.value = codigo;
    }

    function resetCriterios() {
      if (modoEl) modoEl.value = "codigo";
      if (inputCodigo) inputCodigo.value = "";
      if (inputCliente) inputCliente.value = "";
      if (selectEstado) selectEstado.value = "Todos";
      syncCampos();
    }

    function setBusquedaActiva(activa) {
      if (btnLimpiar) btnLimpiar.hidden = !activa;
    }

    function setBusy(busy, text) {
      if (btnBuscar) btnBuscar.disabled = busy;
      if (btnQr) btnQr.disabled = busy;
      if (btnLimpiar) btnLimpiar.disabled = busy;
      if (statusEl) statusEl.textContent = text || "";
    }

    return {
      panel,
      modoEl,
      inputCodigo,
      inputCliente,
      selectEstado,
      btnBuscar,
      btnLimpiar,
      btnQr,
      qrFile,
      statusEl,
      getCriterios,
      setModoCodigo,
      resetCriterios,
      setBusquedaActiva,
      setBusy,
      syncCampos
    };
  }

  function envioMatchesCriterios(e, criterios) {
    const modo = criterios?.modo || "codigo";
    if (modo === "estado") {
      const est = criterios.estado || "Todos";
      return est === "Todos" || (e.estadoActual || "") === est;
    }
    if (modo === "cliente") {
      const q = (criterios.cliente || "").trim().toLowerCase();
      if (!q) return false;
      const blob = [
        e.clienteAsociado?.nombres,
        e.clienteAsociado?.documento,
        e.clienteAsociado?.empresa,
        e.remitente?.nombres,
        e.remitente?.documento
      ]
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    }
    const q = (criterios.codigo || "").trim().toLowerCase();
    if (!q) return false;
    return (e.codigoEnvio || "").toLowerCase().includes(q);
  }

  /**
   * @returns {Promise<{ tipo: 'codigo', codigo: string } | { tipo: 'lista', envios: object[] }>}
   */
  async function resolverBusqueda(criterios) {
    const modo = criterios?.modo || "codigo";

    if (modo === "cliente" && !(criterios.cliente || "").trim()) {
      throw new Error("Ingrese nombre o documento del cliente.");
    }

    if (modo === "codigo") {
      const codigo = (criterios.codigo || "").trim();
      if (!codigo) throw new Error("Ingrese el código de envío.");
      if (CODIGO_ENVIO_RE.test(codigo)) {
        return { tipo: "codigo", codigo: codigo.toUpperCase() };
      }
    }

    const estadoApi = modo === "estado" && criterios.estado !== "Todos" ? criterios.estado : "Todos";
    const res = await window.glsApi.envios.listarHistorial({ estado: estadoApi, limitCount: 150 });
    if (!res?.ok) throw new Error(res?.error || "No se pudo cargar el listado.");
    let envios = res.envios || [];

    if (modo === "codigo") {
      const q = (criterios.codigo || "").trim().toLowerCase();
      envios = envios.filter((e) => (e.codigoEnvio || "").toLowerCase().includes(q));
    } else {
      envios = envios.filter((e) => envioMatchesCriterios(e, criterios));
    }

    if (!envios.length) {
      if (modo === "cliente") throw new Error("No hay envíos para ese cliente.");
      if (modo === "estado") throw new Error("No hay envíos con ese estado.");
      throw new Error("No se encontraron envíos con ese código.");
    }

    if (envios.length === 1) {
      return { tipo: "codigo", codigo: envios[0].codigoEnvio };
    }

    return { tipo: "lista", envios };
  }

  async function leerCodigoDesdeArchivo(file) {
    const QD = window.GlsQrDecode;
    if (!QD?.resolveCodigoFromImageFile) {
      throw new Error("Lector QR no disponible. Recargue la página.");
    }
    if (!file) throw new Error("Seleccione un archivo.");

    if (QD.isPdfFile(file)) {
      const base64 = await QD.fileToBase64(file);
      const r = await window.glsApi.consulta.leerCodigoPdf({ base64 });
      if (!r?.ok) throw new Error(r?.error || "No se pudo leer el PDF.");
      return { codigo: r.codigo, tipo: "PDF" };
    }
    if (QD.isImageFile(file)) {
      const res = await QD.resolveCodigoFromImageFile(file);
      return { codigo: res.codigo, tipo: "imagen QR" };
    }
    throw new Error("Formato no soportado. Use PNG, JPG o PDF.");
  }

  function bindQuickListDelegation(container) {
    if (!container || container.dataset.glsQuickBound) return;
    container.dataset.glsQuickBound = "1";
    container.addEventListener("click", (ev) => {
      const btn = ev.target.closest(".envio-quick-item[data-codigo]");
      if (!btn) return;
      const codigo = btn.getAttribute("data-codigo");
      const envios = container.__glsQuickEnvios || [];
      const envio = envios.find((x) => x.codigoEnvio === codigo);
      container.__glsQuickOpts?.onSelect?.(codigo, envio);
    });
  }

  function renderEnviosEnLista(container, envios, opts, merged) {
    const UI = () => window.GlsEstadoEnvio;
    const listEl = container.querySelector(".envio-quick-list");
    const headEl = container.querySelector(".envio-quick-list-head");
    const colsEl = container.querySelector(".envio-quick-list-cols");
    const excludeCodigo = (merged.excludeCodigo || "").trim();

    if (excludeCodigo) {
      envios = envios.filter((e) => (e.codigoEnvio || "") !== excludeCodigo);
    }

    container.__glsQuickEnvios = envios;

    if (!envios.length) {
      headEl.textContent = excludeCodigo ? "No hay más registros para mostrar." : "Sin coincidencias.";
      if (colsEl) colsEl.hidden = true;
      listEl.innerHTML = "";
      return;
    }

      headEl.textContent = excludeCodigo
        ? `Otros registros (${envios.length}) — pulse una fila`
        : merged.sinFiltro
          ? `Todos los registros (${envios.length}) — pulse una fila`
          : merged.enviosLista
            ? `Resultados (${envios.length}) — pulse una fila`
            : `Registros recientes (${envios.length}) — pulse una fila`;
    if (colsEl) colsEl.hidden = false;

    listEl.innerHTML = envios
      .map((e) => {
        const codigo = escapeHtml(e.codigoEnvio || "");
        const badge = UI()?.badgeHtml?.(e.estadoActual) || escapeHtml(e.estadoActual || "—");
        const rem = escapeHtml(e.remitente?.nombres || "—");
        const dest = escapeHtml(e.destinatario?.nombres || "—");
        const remDoc = escapeHtml(e.remitente?.documento || "");
        const destDoc = escapeHtml(e.destinatario?.documento || "");
        const searchBlob = [
          e.codigoEnvio,
          e.estadoActual,
          e.origen,
          e.destino,
          e.remitente?.nombres,
          e.remitente?.documento,
          e.destinatario?.nombres,
          e.destinatario?.documento,
          e.clienteAsociado?.nombres,
          e.clienteAsociado?.documento,
          e.fechaRegistro
        ]
          .join(" ")
          .toLowerCase();
        return `<li>
          <button type="button" class="envio-quick-item" data-codigo="${codigo}" data-search="${escapeHtml(searchBlob)}">
            <span class="envio-quick-col envio-quick-code mono"><b>${codigo}</b></span>
            <span class="envio-quick-col envio-quick-meta">${badge}</span>
            <span class="envio-quick-col envio-quick-route">${escapeHtml(e.origen || "—")} → ${escapeHtml(e.destino || "—")}</span>
            <span class="envio-quick-col envio-quick-fecha mono">${escapeHtml(formatFechaRegistro(e.fechaRegistro))}</span>
            <span class="envio-quick-col envio-quick-partes">
              <span class="muted">Rem.</span> ${rem}${remDoc ? ` <span class="mono">(${remDoc})</span>` : ""}
              <br/>
              <span class="muted">Dest.</span> ${dest}${destDoc ? ` <span class="mono">(${destDoc})</span>` : ""}
            </span>
          </button>
        </li>`;
      })
      .join("");
  }

  /**
   * @param {HTMLElement} container
   * @param {{ onSelect, limit?, excludeCodigo?, criterios?, enviosLista? }} opts
   */
  async function mountRegistrosRapidos(container, opts = {}) {
    if (!container) return;
    if (opts.sinFiltro) {
      container.__glsQuickOpts = {
        onSelect: container.__glsQuickOpts?.onSelect,
        limit: opts.limit ?? LIMIT_LISTA_TODOS,
        ...opts
      };
    } else {
      container.__glsQuickOpts = { ...container.__glsQuickOpts, ...opts };
    }
    const merged = container.__glsQuickOpts;
    bindQuickListDelegation(container);

    const sinFiltro = merged.sinFiltro === true;
    const limit = sinFiltro ? merged.limit ?? LIMIT_LISTA_TODOS : merged.limit ?? LIMIT_LISTA_DEFAULT;

    container.innerHTML = `
      <div class="envio-quick-list-head muted">Cargando registros…</div>
      <div class="envio-quick-list-cols" hidden>
        <span>Código</span><span>Estado</span><span>Ruta</span><span>Registro</span><span>Remitente / Destinatario</span>
      </div>
      <ul class="envio-quick-list"></ul>`;

    try {
      let envios;
      if (Array.isArray(merged.enviosLista)) {
        envios = merged.enviosLista;
      } else {
        const c = sinFiltro ? null : merged.criterios || { modo: "codigo", estado: "Todos" };
        const estadoApi =
          !sinFiltro && c?.modo === "estado" && c.estado !== "Todos" ? c.estado : "Todos";
        const res = await window.glsApi.envios.listarHistorial({
          estado: estadoApi,
          limitCount: sinFiltro ? limit : Math.min(limit * 3, 150)
        });
        envios = res?.ok ? res.envios || [] : [];
        if (!sinFiltro && c) {
          if (c.modo === "cliente" || c.modo === "estado") {
            envios = envios.filter((e) => envioMatchesCriterios(e, c));
          } else if (c.modo === "codigo" && (c.codigo || "").trim()) {
            const q = c.codigo.trim().toLowerCase();
            envios = envios.filter((e) => (e.codigoEnvio || "").toLowerCase().includes(q));
          }
        }
      }

      if (!sinFiltro) envios = envios.slice(0, limit);
      renderEnviosEnLista(container, envios, opts, merged);
    } catch (e) {
      container.__glsQuickEnvios = [];
      const headEl = container.querySelector(".envio-quick-list-head");
      const listEl = container.querySelector(".envio-quick-list");
      const colsEl = container.querySelector(".envio-quick-list-cols");
      if (headEl) headEl.textContent = "No se pudieron cargar los registros.";
      if (colsEl) colsEl.hidden = true;
      if (listEl) listEl.innerHTML = "";
      console.warn("[GLS] mountRegistrosRapidos:", e);
    }
  }

  function filtrarLista(container, filtro) {
    const q = (filtro || "").trim().toLowerCase();
    container?.querySelectorAll(".envio-quick-item")?.forEach((btn) => {
      const blob = (btn.getAttribute("data-search") || btn.getAttribute("data-codigo") || "").toLowerCase();
      const show = !q || blob.includes(q);
      btn.closest("li").style.display = show ? "" : "none";
    });
  }

  async function refreshRegistrosRapidos(container, patch = {}) {
    if (!container) return;
    if (patch.resetLista) {
      const onSelect = container.__glsQuickOpts?.onSelect;
      const { resetLista, ...rest } = patch;
      return mountRegistrosRapidos(container, {
        onSelect,
        excludeCodigo: "",
        sinFiltro: true,
        limit: LIMIT_LISTA_TODOS,
        ...rest
      });
    }
    return mountRegistrosRapidos(container, patch);
  }

  async function cargarTodosLosRegistros(container) {
    return refreshRegistrosRapidos(container, { resetLista: true });
  }

  /** Muestra u oculta el bloque «Otros registros» (consulta / geo / seguimiento). */
  function setSeccionOtrosRegistrosVisible(otrosRegistrosEl, visible) {
    if (otrosRegistrosEl) otrosRegistrosEl.hidden = !visible;
  }

  /** Tras Limpiar: ocultar sección y vaciar lista (comportamiento unificado). */
  function limpiarSeccionOtrosRegistros(quickListEl, otrosRegistrosEl) {
    setSeccionOtrosRegistrosVisible(otrosRegistrosEl, false);
    if (quickListEl) {
      quickListEl.innerHTML = "";
      quickListEl.__glsQuickEnvios = [];
    }
  }

  function moduloDisponible() {
    return Boolean(window.glsApi?.envios?.listarHistorial);
  }

  window.GlsEnvioBusquedaRapida = {
    ESTADOS_FILTRO,
    CODIGO_ENVIO_RE,
    moduloDisponible,
    ICON_PDF_QR,
    renderBusquedaPanelHtml,
    wireBusquedaPanel,
    getCriteriosFromPanel: (ui) => ui?.getCriterios?.() || {},
    resolverBusqueda,
    envioMatchesCriterios,
    leerCodigoDesdeArchivo,
    mountRegistrosRapidos,
    refreshRegistrosRapidos,
    cargarTodosLosRegistros,
    setSeccionOtrosRegistrosVisible,
    limpiarSeccionOtrosRegistros,
    filtrarLista,
    LIMIT_LISTA_DEFAULT,
    LIMIT_LISTA_TODOS
  };
})();
