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

  const UI = () => window.GlsEstadoEnvio;

  const params = new URLSearchParams(window.location.search || "");
  const inicial = params.get("codigo") || params.get("c") || "";

  appEl.innerHTML = `
    ${window.GlsMenu.renderMenu("consultaqr")}
    <main class="main">
      ${window.GlsPageChrome.renderTopbar({
        headline: "Consulta de envío",
        tagline: "Por código, archivo QR (PNG) o comprobante PDF exportado desde el sistema.",
        pill: "Consulta"
      })}
      <div class="content">
        <div class="page-head">
          <div>
            <div class="page-title">Consulta por código o QR</div>
            <div class="page-subtitle">Escriba el código, suba la imagen del QR o el PDF del comprobante para ver el estado del envío.</div>
          </div>
        </div>
        <div id="alert"></div>

        <div class="card u-mb-md envio-consulta-card">
          <div class="card-title">Buscar envío</div>
          <div class="card-subtitle">Filtros por código, cliente o estado. También puede subir PDF o imagen QR.</div>
          <div id="consultaBusquedaMount" class="u-mt-sm">
            ${window.GlsEnvioBusquedaRapida?.renderBusquedaPanelHtml?.({
              idPrefix: "consulta",
              codigoInicial: inicial,
              navHtml: '<a href="./geolocalizacion-qr.html">Mapa y QR</a>'
            }) || ""}
          </div>

          <div id="result" class="envio-consulta-result card gls-compact-panel u-mt-md" style="display:none" hidden></div>

          <section id="consultaOtrosRegistros" class="envio-otros-registros u-mt-md" aria-label="Otros registros">
            <div class="envio-otros-registros-title">Otros registros</div>
            <div id="consultaQuickList" class="envio-quick-list-wrap u-mt-sm"></div>
          </section>
        </div>
      </div>
    </main>
  `;

  const alertEl = document.getElementById("alert");
  const resultEl = document.getElementById("result");
  const quickListEl = document.getElementById("consultaQuickList");
  const otrosRegistrosEl = document.getElementById("consultaOtrosRegistros");
  const BX = () => window.GlsEnvioBusquedaRapida;
  const busquedaUi = window.GlsEnvioBusquedaRapida?.wireBusquedaPanel?.(
    document.getElementById("consultaBusquedaMount"),
    { idPrefix: "consulta" }
  );

  function refreshOtrosRegistros(excludeCodigo, patch = {}) {
    BX()?.setSeccionOtrosRegistrosVisible?.(otrosRegistrosEl, true);
    const criterios = busquedaUi?.getCriterios?.() || {};
    void BX()?.refreshRegistrosRapidos?.(quickListEl, {
      excludeCodigo: excludeCodigo || "",
      criterios,
      ...patch
    });
  }

  function showResultPanel(show) {
    if (!resultEl) return;
    resultEl.hidden = !show;
    resultEl.style.display = show ? "block" : "none";
  }

  function marcarBusquedaActiva(activa) {
    busquedaUi?.setBusquedaActiva?.(activa);
  }

  async function limpiarBusqueda() {
    window.GlsAlert.clearAlert(alertEl);
    busquedaUi?.resetCriterios?.();
    showResultPanel(false);
    if (resultEl) resultEl.innerHTML = "";
    marcarBusquedaActiva(false);
    busquedaUi?.setBusy?.(false, "");
    BX()?.limpiarSeccionOtrosRegistros?.(quickListEl, otrosRegistrosEl);
  }

  function buildConsultaDetalleModalHtml(e, historial) {
    const ee = e.evidenciaEntrega;
    const timeline =
      UI()?.timelineVerticalHtml?.(historial, []) ||
      `<div class="muted">Sin eventos en historial.</div>`;
    return `
      <div class="result-grid" style="margin-top:4px">
        <div class="card" style="box-shadow:none">
          <div class="card-title">Estado actual</div>
          <div>${UI()?.badgeHtml?.(e.estadoActual) || escapeHtml(e.estadoActual || "—")}</div>
        </div>
        <div class="card" style="box-shadow:none">
          <div class="card-title">Ruta</div>
          <div>${escapeHtml(e.origen || "")} → ${escapeHtml(e.destino || "")}</div>
        </div>
        <div class="card" style="box-shadow:none">
          <div class="card-title">Partes</div>
          <div class="muted">Remitente</div>
          <div><b>${escapeHtml(e.remitente?.nombres || "")}</b> · ${escapeHtml(e.remitente?.documento || "")}</div>
          <div class="muted u-mt-sm">Destinatario</div>
          <div><b>${escapeHtml(e.destinatario?.nombres || "")}</b> · ${escapeHtml(e.destinatario?.documento || "")}</div>
        </div>
        <div class="card" style="box-shadow:none">
          <div class="card-title">Cliente catálogo</div>
          ${
            e.clienteAsociado
              ? `<div><b>${escapeHtml(e.clienteAsociado.nombres || "")}</b><br/><span class="mono">${escapeHtml(
                  e.clienteAsociado.documento || ""
                )}</span></div>`
              : `<div class="muted">Sin asociación a catálogo.</div>`
          }
        </div>
      </div>
      ${
        ee?.referencia
          ? `<div class="card u-mt-sm" style="box-shadow:none">
            <div class="card-title">Evidencia de entrega</div>
            <div>Referencia: <b>${escapeHtml(ee.referencia || "")}</b></div>
            ${ee.detalle ? `<div class="u-mt-sm">${escapeHtml(ee.detalle)}</div>` : ""}
            <div class="muted u-mt-sm" style="font-size:12px">${escapeHtml(ee.fecha || "")} · ${escapeHtml(
              ee.registradoPor || ""
            )}</div>
          </div>`
          : ""
      }
      <div class="card u-mt-sm" style="box-shadow:none">
        <div class="card-title">Historial de estados</div>
        <div class="timeline">${timeline}</div>
      </div>
    `;
  }

  function buildConsultaResumenHtml(e, historial, geo, leidoDesde) {
    const cod = escapeHtml(e.codigoEnvio || "");
    const segHref = `./seguimiento-envio.html?codigo=${encodeURIComponent(e.codigoEnvio || "")}`;
    const ult = (historial || [])
      .slice()
      .sort((a, b) => Date.parse(b.fechaActualizacion || 0) - Date.parse(a.fechaActualizacion || 0))[0];
    const lastUbic = geo?.ok ? geo.lastUbicacion : null;

    return `
      ${
        leidoDesde
          ? `<div class="qr-quick-banner" style="margin-bottom:12px">
              <h3>Consulta desde ${escapeHtml(leidoDesde.tipo)}</h3>
              <div class="muted" style="font-size:12px">Archivo: ${escapeHtml(leidoDesde.nombre || "")}</div>
              ${
                leidoDesde.raw
                  ? `<div class="mono muted" style="font-size:11px;margin-top:4px;word-break:break-all">QR: ${escapeHtml(
                      leidoDesde.raw.slice(0, 120)
                    )}${leidoDesde.raw.length > 120 ? "…" : ""}</div>`
                  : ""
              }
            </div>`
          : ""
      }
      <div class="result-header">
        <div>
          <div class="card-title">Envío <span class="mono code">${cod}</span></div>
          <div class="card-subtitle">Estado: ${UI()?.badgeHtml?.(e.estadoActual) || `<b>${escapeHtml(e.estadoActual || "")}</b>`}</div>
        </div>
      </div>
      <div class="qr-quick-grid u-mt-sm" style="margin-bottom:12px">
        <div><span class="muted">Último evento</span><br/>${UI()?.badgeHtml?.(ult?.estado) || escapeHtml(ult?.estado || "—")}<br/><span class="mono" style="font-size:11px">${escapeHtml(ult?.fechaActualizacion || "")}</span></div>
        <div><span class="muted">Última ubicación</span><br/>${escapeHtml(lastUbic?.direccion || "Sin registro")}</div>
      </div>
      <div style="overflow:auto; margin-top:10px">
        <table class="table table--compact-summary">
          <tbody>
            <tr><th>Ruta</th><td>${escapeHtml(e.origen || "—")} → ${escapeHtml(e.destino || "—")}</td></tr>
            <tr><th>Remitente</th><td>${escapeHtml(e.remitente?.nombres || "—")}</td></tr>
            <tr><th>Destinatario</th><td>${escapeHtml(e.destinatario?.nombres || "—")}</td></tr>
            <tr><th>Cliente catálogo</th><td>${
              e.clienteAsociado
                ? `${escapeHtml(e.clienteAsociado.nombres || "")} · <span class="mono">${escapeHtml(
                    e.clienteAsociado.documento || ""
                  )}</span>`
                : `<span class="muted">Sin asociación</span>`
            }</td></tr>
          </tbody>
        </table>
      </div>
      <div id="consultaCmpActions" data-gls-cmp-actions="1"></div>
      <div class="actions u-mt-md">
        <button type="button" class="btn btn-primary" id="btnConsultaDetalle">Ver detalle e historial</button>
        <a class="btn" href="${segHref}">Abrir trazabilidad</a>
      </div>
    `;
  }

  function attachComprobanteHandlers(e, historial) {
    const codigo = e.codigoEnvio || "";
    const cmpRoot = document.getElementById("consultaCmpActions");
    if (cmpRoot && window.GlsComprobanteEnvio?.bindComprobanteActions) {
      window.GlsComprobanteEnvio.bindComprobanteActions(cmpRoot, {
        codigo,
        envio: e,
        historial,
        alertEl
      });
    }
  }

  function attachDetalleHandler(e, historial) {
    document.getElementById("btnConsultaDetalle")?.addEventListener?.("click", () => {
      const detalleHtml =
        buildConsultaDetalleModalHtml(e, historial) +
        `<div id="consultaDetalleCmpActions" data-gls-cmp-actions="1"></div>`;
      window.GlsModal.openModal({
        title: `Detalle del envío · ${e.codigoEnvio || ""}`,
        bodyHtml: detalleHtml,
        closeOnOverlayClick: true
      });
      queueMicrotask(() => {
        const detRoot = document.getElementById("consultaDetalleCmpActions");
        if (detRoot && window.GlsComprobanteEnvio?.bindComprobanteActions) {
          window.GlsComprobanteEnvio.bindComprobanteActions(detRoot, {
            codigo: e.codigoEnvio,
            envio: e,
            historial,
            alertEl
          });
        }
      });
    });
  }

  async function buscarPorCodigo(codigoEnvio, leidoDesde = null) {
    window.GlsAlert.clearAlert(alertEl);
    codigoEnvio = (codigoEnvio || "").trim();
    if (!codigoEnvio) {
      window.GlsAlert.showAlert(alertEl, { type: "error", message: "Ingrese un código válido." });
      return;
    }
    busquedaUi?.setModoCodigo?.(codigoEnvio);
    showResultPanel(true);
    resultEl.innerHTML = UI()?.loaderHtml?.("Buscando envío…") || "";
    resultEl.scrollIntoView({ behavior: "smooth", block: "nearest" });

    const [r, geo] = await Promise.all([
      window.glsApi.trazabilidad.buscar(codigoEnvio),
      window.glsApi.geolocalizacionQr.buscar(codigoEnvio).catch(() => ({ ok: false }))
    ]);

    if (!r?.ok) {
      showResultPanel(false);
      resultEl.innerHTML = "";
      refreshOtrosRegistros("");
      marcarBusquedaActiva(false);
      busquedaUi?.setBusy?.(false, "");
      window.GlsAlert.showAlert(alertEl, { type: "error", message: r?.error || "No encontrado." });
      return;
    }

    const e = r.envio;
    const historial = r.historial || [];
    resultEl.innerHTML = buildConsultaResumenHtml(e, historial, geo, leidoDesde);
    attachComprobanteHandlers(e, historial);
    attachDetalleHandler(e, historial);
    refreshOtrosRegistros(codigoEnvio);
    marcarBusquedaActiva(true);
    busquedaUi?.setBusy?.(false, "");
    resultEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    window.GlsAlert.showAlert(alertEl, {
      type: "success",
      message: leidoDesde ? `Envío ${codigoEnvio} cargado desde ${leidoDesde.tipo}.` : `Envío ${codigoEnvio} encontrado.`
    });
  }

  async function buscar() {
    window.GlsAlert.clearAlert(alertEl);
    const BX = window.GlsEnvioBusquedaRapida;
    if (!BX?.resolverBusqueda) {
      window.GlsAlert.showAlert(alertEl, {
        type: "error",
        message: "Módulo de búsqueda no disponible. Recargue la página (F5)."
      });
      return;
    }
    const criterios = busquedaUi?.getCriterios?.() || {};
    busquedaUi?.setBusy?.(true, "Buscando…");
    try {
      const res = await BX.resolverBusqueda(criterios);
      if (res.tipo === "codigo") {
        await buscarPorCodigo(res.codigo);
        return;
      }
      showResultPanel(false);
      resultEl.innerHTML = "";
      await refreshOtrosRegistros("", { enviosLista: res.envios, criterios });
      marcarBusquedaActiva(true);
      busquedaUi?.setBusy?.(false, `${res.envios.length} envío(s) — seleccione uno en la lista.`);
      window.GlsAlert.showAlert(alertEl, {
        type: "warn",
        message: `Se encontraron ${res.envios.length} envíos. Pulse uno en la lista inferior.`
      });
    } catch (e) {
      busquedaUi?.setBusy?.(false, "");
      window.GlsAlert.showAlert(alertEl, { type: "error", message: e?.message || String(e) });
    }
  }

  async function leerArchivoYBuscar(file) {
    if (!file) return;
    window.GlsAlert.clearAlert(alertEl);
    const QD = window.GlsQrDecode;
    busquedaUi?.setBusy?.(true, QD?.isPdfFile?.(file) ? "Leyendo PDF…" : "Leyendo imagen…");
    try {
      const leido = await window.GlsEnvioBusquedaRapida?.leerCodigoDesdeArchivo?.(file);
      const codigo = leido?.codigo;
      const tipo = leido?.tipo;
      if (!codigo) throw new Error("No se detectó un código ENV en el archivo.");
      await buscarPorCodigo(codigo, { tipo, nombre: file.name });
    } catch (e) {
      window.GlsAlert.showAlert(alertEl, {
        type: "error",
        message: e?.message || "No se pudo leer el QR del archivo."
      });
      busquedaUi?.setBusy?.(false, "");
    }
  }

  busquedaUi?.btnQr?.addEventListener("click", () => busquedaUi?.qrFile?.click());
  busquedaUi?.qrFile?.addEventListener("change", () => {
    const f = busquedaUi?.qrFile?.files?.[0];
    if (f) void leerArchivoYBuscar(f);
    if (busquedaUi?.qrFile) busquedaUi.qrFile.value = "";
  });

  busquedaUi?.btnBuscar?.addEventListener("click", () => void buscar());
  busquedaUi?.btnLimpiar?.addEventListener("click", () => void limpiarBusqueda());
  [busquedaUi?.inputCodigo, busquedaUi?.inputCliente, busquedaUi?.selectEstado].forEach((el) => {
    el?.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") void buscar();
    });
  });

  window.GlsAuthGuard?.requireAuthOrRedirect?.().then(() => {
    window.GlsMenu?.mountAuthMenu?.();
    void window.GlsEnvioBusquedaRapida?.mountRegistrosRapidos?.(quickListEl, {
      limit: 40,
      onSelect: (codigo) => {
        void buscarPorCodigo(codigo);
      }
    });
    if (inicial) void buscarPorCodigo(inicial);
  });
})();
