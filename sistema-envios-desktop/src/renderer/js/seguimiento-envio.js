(() => {
  const appEl = document.getElementById("app");
  function codigoDeepLinkDesdeUrl() {
    try {
      const p = new URLSearchParams(window.location.search);
      return (p.get("codigo") || p.get("c") || "").trim() || "";
    } catch {
      return "";
    }
  }

  const CODIGO_DESDE_URL = codigoDeepLinkDesdeUrl();

  const ICONS = {
    search:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z" stroke="currentColor" stroke-width="1.8"/><path d="M16.5 16.5 21 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    status:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12h6l2-5 3 10 2-5h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    truck:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 7.5c0-.83.67-1.5 1.5-1.5h9c.83 0 1.5.67 1.5 1.5V16H3V7.5Z" stroke="currentColor" stroke-width="1.8"/><path d="M15 10h3.6c.36 0 .7.16.92.45l1.48 1.96c.19.25.3.56.3.88V16H15v-6Z" stroke="currentColor" stroke-width="1.8"/><path d="M7 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM18 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" stroke="currentColor" stroke-width="1.8"/><path d="M3 16h12" stroke="currentColor" stroke-width="1.8"/></svg>'
  };

  appEl.innerHTML = `
    ${window.GlsMenu.renderMenu("seguimiento")}
    <main class="main">
      ${window.GlsPageChrome.renderTopbar()}
      <div class="content">
      <div class="page-head">
        <div>
          <div class="page-title">Seguimiento / Trazabilidad</div>
          <div class="page-subtitle">Lista en tiempo real de envíos activos + detalle e historial por envío.</div>
        </div>
        <div class="actions">
          <a class="btn btn-primary btn-icon" href="./registro-envio.html"><span class="ico">${ICONS.truck}</span>Nuevo envío</a>
        </div>
      </div>

      <div id="alert"></div>
      <div id="qrQuickBanner"></div>
      <div id="segKpiWrap"></div>

      <div class="card u-mb-md envio-consulta-card">
        <div class="card-title">Buscar envío</div>
        <div class="card-subtitle">Filtros por código, cliente o estado. PDF o imagen QR. Parámetro URL: <span class="mono">?codigo=</span></div>
        <div id="segBusquedaMount" class="u-mt-sm">
          ${window.GlsEnvioBusquedaRapida?.renderBusquedaPanelHtml?.({
            idPrefix: "seg",
            codigoInicial: CODIGO_DESDE_URL,
            navHtml:
              '<a href="./consulta-envio.html">Vista consulta</a> · <a href="./geolocalizacion-qr.html">Mapa y QR</a>'
          }) || ""}
        </div>
        <section id="segOtrosRegistros" class="envio-otros-registros u-mt-md" aria-label="Otros registros">
          <div class="envio-otros-registros-title">Otros registros</div>
          <div id="segQuickList" class="envio-quick-list-wrap u-mt-sm"></div>
        </section>
      </div>

      <div class="grid seguimiento-layout">
        <div class="card">
          <div class="card-title">Envíos activos (tiempo real)</div>
          <div class="card-subtitle">Se muestran automáticamente: Registrado, En almacén, En tránsito, En reparto, Observado.</div>

          <div class="field u-mb-sm">
            <label>Filtrar envíos activos</label>
            <input id="filter" placeholder="Código, origen, destino o estado" class="w-100" />
          </div>
          <span class="muted" id="status" style="display:block;margin-bottom:8px"></span>

          <div class="table-scroll" style="max-height:520px">
            <table class="table" style="min-width:0">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Origen → Destino</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody id="listBody">
                <tr><td colspan="3" class="muted">Cargando...</td></tr>
              </tbody>
            </table>
          </div>
          <div class="hint u-mt-sm">
            Tip: haz clic en un envío para ver su detalle y línea de tiempo.
          </div>
        </div>

        <div id="result" class="grid"></div>
      </div>
      </div>
    </main>
  `;

  const alertEl = document.getElementById("alert");
  const resultEl = document.getElementById("result");
  const filterEl = document.getElementById("filter");
  const listBodyEl = document.getElementById("listBody");
  const statusEl = document.getElementById("status");

  const quickListEl = document.getElementById("segQuickList");
  const otrosRegistrosEl = document.getElementById("segOtrosRegistros");
  const busquedaUi = window.GlsEnvioBusquedaRapida?.wireBusquedaPanel?.(document.getElementById("segBusquedaMount"), {
    idPrefix: "seg"
  });
  let codigoBusquedaActiva = "";

  let enviosActivos = [];
  let unsubscribe = null;
  let mapSeg = null;
  let markerSeg = null;
  let lastSeguimientoCtx = null;
  let mapOverlaySeg = null;
  const UI = () => window.GlsEstadoEnvio;

  const NOMINATIM_UA = "GLS-SistemaEnvios-Desktop/1.0 (practicas; operaciones@gls.pe)";

  function destroyMapSeguimiento() {
    try {
      if (mapSeg) {
        mapSeg.off();
        mapSeg.remove();
      }
    } catch (_) {}
    mapSeg = null;
    markerSeg = null;
  }

  async function nominatimSearch(q) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": NOMINATIM_UA, "Accept-Language": "es" }
    });
    if (!res.ok) throw new Error("Búsqueda en mapa no disponible");
    const arr = await res.json();
    if (!Array.isArray(arr) || !arr.length) throw new Error("No se encontró la ubicación. Pruebe otra dirección.");
    return {
      lat: Number(arr[0].lat),
      lon: Number(arr[0].lon),
      label: String(arr[0].display_name || "").trim()
    };
  }

  async function nominatimReverse(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(
      lon
    )}&accept-language=es`;
    const res = await fetch(url, {
      headers: { "User-Agent": NOMINATIM_UA }
    });
    if (!res.ok) return "";
    const data = await res.json();
    return String(data?.display_name || "").trim();
  }

  function setupMapaSeguimiento(lastUbicacion) {
    const L = window.L;
    const mapEl = document.getElementById("mapSeguimiento");
    const latEl = document.getElementById("latSeg");
    const lngEl = document.getElementById("lngSeg");
    const dirEl = document.getElementById("dirSeg");
    const btnGeo = document.getElementById("btnGeoSearchSeg");
    const qEl = document.getElementById("geoQuerySeg");
    if (!L || !mapEl || !latEl || !lngEl || !dirEl) return;

    let lat0 = Number(lastUbicacion?.latitud);
    let lng0 = Number(lastUbicacion?.longitud);
    const tieneUltima =
      lastUbicacion && Number.isFinite(Number(lastUbicacion?.latitud)) && Number.isFinite(Number(lastUbicacion?.longitud));
    if (!tieneUltima) {
      lat0 = -12.0464;
      lng0 = -77.0428;
    }
    if (tieneUltima) {
      latEl.value = String(lastUbicacion.latitud);
      lngEl.value = String(lastUbicacion.longitud);
      if ((lastUbicacion.direccion || "").trim()) dirEl.value = lastUbicacion.direccion.trim();
    } else {
      latEl.value = "";
      lngEl.value = "";
      dirEl.value = "";
    }

    mapSeg = L.map(mapEl).setView([lat0, lng0], tieneUltima ? 14 : 12);
    const tiles =
      (window.GlsMapConfig && window.GlsMapConfig.tilesUrl) || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    const attribution =
      (window.GlsMapConfig && window.GlsMapConfig.attribution) ||
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
    L.tileLayer(tiles, { maxZoom: 19, attribution }).addTo(mapSeg);
    markerSeg = L.marker([lat0, lng0]).addTo(mapSeg);

    function setMarker(ll) {
      const lat = ll.lat;
      const lng = ll.lng;
      latEl.value = String(Number(lat).toFixed(6));
      lngEl.value = String(Number(lng).toFixed(6));
      markerSeg.setLatLng([lat, lng]);
      mapSeg.panTo([lat, lng]);
    }

    mapSeg.on("click", async (ev) => {
      window.GlsAlert.clearAlert(alertEl);
      setMarker(ev.latlng);
      try {
        const label = await nominatimReverse(ev.latlng.lat, ev.latlng.lng);
        dirEl.value = (label || `Ubicación mapa (${latEl.value}, ${lngEl.value})`).slice(0, 500);
      } catch (_) {
        dirEl.value = `Ubicación mapa (${latEl.value}, ${lngEl.value})`;
      }
      if (mapOverlaySeg) updateUbicPreviewSeg(mapOverlaySeg);
    });

    btnGeo?.addEventListener?.("click", async () => {
      window.GlsAlert.clearAlert(alertEl);
      const q = String(qEl?.value || "").trim();
      if (q.length < 3) {
        window.GlsAlert.showAlert(alertEl, { type: "error", message: "Escriba al menos 3 caracteres para buscar." });
        return;
      }
      btnGeo.disabled = true;
      try {
        const hit = await nominatimSearch(q);
        if (!Number.isFinite(hit.lat) || !Number.isFinite(hit.lon)) throw new Error("Coordenadas no válidas");
        setMarker({ lat: hit.lat, lng: hit.lon });
        dirEl.value = (hit.label || `Punto (${hit.lat}, ${hit.lon})`).slice(0, 500);
        window.GlsAlert.showAlert(alertEl, { type: "success", message: "Ubicación encontrada en el mapa." });
      } catch (e) {
        window.GlsAlert.showAlert(alertEl, { type: "error", message: e?.message || String(e) });
      } finally {
        btnGeo.disabled = false;
      }
    });

    setTimeout(() => {
      try {
        mapSeg.invalidateSize();
      } catch (_) {}
    }, 280);
  }

  let puedeMutar = false;

  function marcarBusquedaActiva(activa) {
    busquedaUi?.setBusquedaActiva?.(activa);
  }

  const BX = () => window.GlsEnvioBusquedaRapida;

  function refreshOtrosRegistros(excludeCodigo, patch = {}) {
    BX()?.setSeccionOtrosRegistrosVisible?.(otrosRegistrosEl, true);
    codigoBusquedaActiva = excludeCodigo || "";
    const criterios = busquedaUi?.getCriterios?.() || {};
    void BX()?.refreshRegistrosRapidos?.(quickListEl, {
      excludeCodigo: codigoBusquedaActiva,
      criterios,
      ...patch
    });
  }

  async function limpiarBusqueda() {
    window.GlsAlert.clearAlert(alertEl);
    busquedaUi?.resetCriterios?.();
    destroyMapSeguimiento();
    if (resultEl) resultEl.innerHTML = "";
    const banner = document.getElementById("qrQuickBanner");
    if (banner) banner.innerHTML = "";
    codigoBusquedaActiva = "";
    marcarBusquedaActiva(false);
    busquedaUi?.setBusy?.(false, "");
    BX()?.limpiarSeccionOtrosRegistros?.(quickListEl, otrosRegistrosEl);
  }

  function setBusy(busy, text) {
    statusEl.textContent = text || "";
  }

  async function loadEstados() {
    const r = await window.glsApi.trazabilidad.listarEstados();
    const raw = r?.ok ? (r.estados || []).map((e) => e.estado || e.nombre || e.id).filter(Boolean) : [];
    return UI()?.normalizeEstadosList?.(raw.map((s) => ({ estado: s }))) || raw;
  }

  function badgeForEstado(estado) {
    return UI()?.badgeClass?.(estado) || "badge";
  }

  function historialTimelineHtml(historial, ubicaciones) {
    return UI()?.timelineVerticalHtml?.(historial, ubicaciones) || "";
  }

  function historialTablaRows(historial) {
    return (historial || [])
      .map(
        (h) => `
        <tr>
          <td><span class="mono">${escapeHtml(h.fechaActualizacion || "")}</span></td>
          <td>${UI()?.badgeHtml?.(h.estado) || escapeHtml(h.estado || "")}</td>
          <td>${escapeHtml(h.observacion || "")}</td>
          <td>${escapeHtml((h.evidenciaReferencia || "").trim() || "—")}${
            (h.evidenciaDetalle || "").trim()
              ? `<div class="muted" style="font-size:12px">${escapeHtml((h.evidenciaDetalle || "").trim())}</div>`
              : ""
          }</td>
          <td>${escapeHtml(h.responsable || "")}</td>
          <td class="mono">${escapeHtml((h.registradoPor || "").trim() || "—")}</td>
        </tr>
      `
      )
      .join("");
  }

  function buildSeguimientoDetalleModalHtml(envio, historial, ubicaciones) {
    const timelineItems = historialTimelineHtml(historial, ubicaciones);
    const historialRows = historialTablaRows(historial);
    return `
      <div class="result-grid">
        <div class="card" style="box-shadow:none">
          <div class="card-title">Cliente</div>
          <div class="muted">Remitente</div>
          <div><b>${escapeHtml(envio.remitente?.nombres || "")}</b> · ${escapeHtml(envio.remitente?.documento || "")}</div>
          <div class="muted" style="margin-top:10px">Destinatario</div>
          <div><b>${escapeHtml(envio.destinatario?.nombres || "")}</b> · ${escapeHtml(envio.destinatario?.documento || "")}</div>
          ${
            envio.clienteAsociado
              ? `<div class="divider" style="margin:12px 0"></div>
            <div class="muted">Cliente catálogo</div>
            <div><b>${escapeHtml(envio.clienteAsociado.nombres || "")}</b> · ${escapeHtml(envio.clienteAsociado.documento || "")}</div>
            ${
              envio.clienteAsociado.empresa
                ? `<div class="muted" style="margin-top:6px">Empresa</div><div>${escapeHtml(envio.clienteAsociado.empresa)}</div>`
                : ""
            }
            <div class="muted" style="margin-top:6px">Contacto / dirección</div>
            <div>${escapeHtml(envio.clienteAsociado.telefono || "")} · ${escapeHtml(envio.clienteAsociado.direccion || "")}</div>`
              : ""
          }
        </div>
        <div class="card" style="box-shadow:none">
          <div class="card-title">Carga</div>
          <div>Tipo: <b>${escapeHtml(envio.tipoCarga || "")}</b></div>
          <div>Descripción: <b>${escapeHtml(envio.descripcion || "")}</b></div>
          <div>Peso: <b>${escapeHtml(String(envio.peso ?? ""))}</b> kg</div>
          ${
            envio.dimensiones
              ? `<div style="margin-top:10px">Dimensiones: <b>${escapeHtml(String(envio.dimensiones.largo ?? ""))} × ${escapeHtml(
                  String(envio.dimensiones.ancho ?? "")
                )} × ${escapeHtml(String(envio.dimensiones.alto ?? ""))}</b> <span class="mono">${escapeHtml(
                  envio.dimensiones.unidadMedida || ""
                )}</span></div>`
              : ""
          }
        </div>
        ${
          envio.cotizacionEstimada?.desglose
            ? `<div class="card" style="box-shadow:none">
            <div class="card-title">Cotización estimada</div>
            <div class="muted">Referencia interna al registrar el envío.</div>
            <div style="margin-top:10px">
              Total: <b>${escapeHtml(String(envio.cotizacionEstimada.desglose.totalEstimado))}</b>
              ${escapeHtml(envio.cotizacionEstimada.moneda || "")}
            </div>
            <div class="muted" style="margin-top:6px; font-size:12px">
              Subtotal ${escapeHtml(String(envio.cotizacionEstimada.desglose.subtotal))} · Seguro
              ${escapeHtml(String(envio.cotizacionEstimada.desglose.seguroMonto))}
              (${escapeHtml(String(envio.cotizacionEstimada.desglose.seguroPorcentaje))}%)
            </div>
          </div>`
            : `<div class="card" style="box-shadow:none"><div class="muted">Sin cotización en el registro inicial.</div></div>`
        }
      </div>
      ${
        envio.evidenciaEntrega &&
        ((envio.evidenciaEntrega.referencia || "").trim() || (envio.evidenciaEntrega.detalle || "").trim())
          ? `<div class="card" style="box-shadow:none; margin-top:12px">
            <div class="card-title">Evidencia de entrega (última registrada)</div>
            <div>Referencia: <b>${escapeHtml((envio.evidenciaEntrega.referencia || "").trim() || "—")}</b></div>
            ${
              (envio.evidenciaEntrega.detalle || "").trim()
                ? `<div style="margin-top:6px" class="muted">${escapeHtml((envio.evidenciaEntrega.detalle || "").trim())}</div>`
                : ""
            }
            <div class="muted" style="margin-top:8px; font-size:12px">
              Fecha: <span class="mono">${escapeHtml(envio.evidenciaEntrega.fecha || "")}</span>
              ${
                (envio.evidenciaEntrega.registradoPor || "").trim()
                  ? ` · Registrado por <span class="mono">${escapeHtml(envio.evidenciaEntrega.registradoPor)}</span>`
                  : ""
              }
            </div>
          </div>`
          : ""
      }
      <div class="card" style="margin-top:12px; box-shadow:none">
        <div class="card-title">Línea de tiempo</div>
        <div class="timeline">${timelineItems || `<div class="muted">Sin historial</div>`}</div>
        <div class="divider"></div>
        <div class="card-subtitle muted" style="margin-bottom:8px">Historial en tabla</div>
        <div style="overflow:auto">
          <table class="table" style="min-width:720px">
            <thead>
              <tr><th>Fecha</th><th>Estado</th><th>Observación</th><th>Evidencia</th><th>Responsable</th><th>Usuario</th></tr>
            </thead>
            <tbody>${historialRows || `<tr><td colspan="6" class="muted">Sin historial</td></tr>`}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  function buildSeguimientoActualizarFormHtml(estados, estadoActual) {
    const picker = UI()?.statePickerHtml?.(estados, estadoActual) || "";
    const sugiereUbic = UI()?.sugiereUbicacion?.(estadoActual);
    return `
      <div class="form-row">
        <label class="muted" style="font-size:12px;display:block;margin-bottom:6px">Nuevo estado</label>
        ${picker}
        <div class="field" style="margin-top:12px"><label>Observación</label><textarea id="obs" rows="3" placeholder="Obligatoria (mín. 3 caracteres)..."></textarea></div>
        <div id="wrapEvidenciaSeg" style="display:none">
          <div class="card-subtitle" style="margin:10px 0 8px">Evidencia de entrega (referencia textual)</div>
          <p class="muted" id="evidTextoHintSeg" style="font-size:11px;margin:0 0 10px">
            La foto de entrega solo está disponible con Firebase Storage configurado. Use referencia y detalle en texto.
          </p>
          <div class="form-row grid grid-2">
            <div class="field"><label>Nombre receptor</label><input id="receptorNomSeg" maxlength="120" /></div>
            <div class="field"><label>DNI / RUC</label><input id="receptorDocSeg" maxlength="11" placeholder="8 u 11 dígitos" /></div>
          </div>
          <div class="field"><label>Referencia entrega <span class="muted">*</span></label><input id="evidRefSeg" maxlength="280" placeholder="Ej. GUÍA-2026-0042, acta firmada" /></div>
          <div class="field"><label>Detalle (opcional)</label><textarea id="evidDetSeg" rows="2" placeholder="Notas adicionales de la entrega"></textarea></div>
          <div class="field" id="wrapEvidFotoSeg" style="display:none">
            <label>Foto de entrega (opcional)</label>
            <p class="muted" id="evidFotoHintSeg" style="font-size:11px;margin:0 0 6px"></p>
            <input type="file" id="evidImgSeg" accept="image/jpeg,image/png,image/webp" />
            <div id="evidImgPreviewSeg" class="evid-img-preview is-hidden"></div>
          </div>
        </div>
        <div class="divider" style="margin:16px 0"></div>
        <label class="actions" style="cursor:pointer;gap:8px">
          <input type="checkbox" id="chkUbicSeg" ${sugiereUbic ? "checked" : ""} />
          <span>Registrar ubicación referencial</span>
        </label>
        <div id="wrapMapaSeg" style="margin-top:10px;${sugiereUbic ? "" : "display:none"}">
          <div class="form-row grid grid-2" style="align-items:end">
            <div class="field">
              <label>Buscar dirección</label>
              <input id="geoQuerySeg" placeholder="Av. Javier Prado, Lima" />
            </div>
            <div class="actions" style="align-self:end;flex-wrap:wrap">
              <button type="button" class="btn btn-icon" id="btnGeoSearchSeg"><span class="ico">${ICONS.search}</span>Buscar</button>
              <button type="button" class="btn btn-ghost" id="btnGeoLocateSeg">Mi ubicación</button>
            </div>
          </div>
          <div class="field u-mt-sm"><label>Dirección</label><input id="dirSeg" /></div>
          <div class="form-row grid grid-2">
            <div class="field"><label>Latitud</label><input id="latSeg" /></div>
            <div class="field"><label>Longitud</label><input id="lngSeg" /></div>
          </div>
          <div id="ubicPreviewSeg" class="ubic-preview-box is-hidden"></div>
          <div id="mapSeguimiento" class="map map--seguimiento u-mt-sm"></div>
        </div>
        <div class="actions u-mt-md">
          <button class="btn btn-primary btn-icon" id="btnActualizar"><span class="ico">${ICONS.status}</span>Guardar cambio</button>
          <span class="muted" id="status2"></span>
        </div>
      </div>
    `;
  }

  function updateUbicPreviewSeg(overlay) {
    const box = overlay.querySelector("#ubicPreviewSeg");
    const dir = overlay.querySelector("#dirSeg")?.value?.trim();
    const lat = overlay.querySelector("#latSeg")?.value?.trim();
    const lng = overlay.querySelector("#lngSeg")?.value?.trim();
    if (!box) return;
    if (dir && lat && lng) {
      box.classList.remove("is-hidden");
      box.innerHTML = `<b>Vista previa:</b> ${escapeHtml(dir)} · <span class="mono">${escapeHtml(lat)}, ${escapeHtml(lng)}</span>`;
    } else {
      box.classList.add("is-hidden");
    }
  }

  function readImageFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve("");
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ""));
      r.onerror = () => reject(new Error("No se pudo leer la imagen"));
      r.readAsDataURL(file);
    });
  }

  function attachSeguimientoActualizarHandlers(overlay, { envio, historial, estados, puede, lastUbicacion }) {
    const btnActualizar = overlay.querySelector("#btnActualizar");
    const estadoHidden = overlay.querySelector("#estadoSelHidden");
    const obs = overlay.querySelector("#obs");
    const status2 = overlay.querySelector("#status2");
    const wrapEvid = overlay.querySelector("#wrapEvidenciaSeg");
    const wrapMapa = overlay.querySelector("#wrapMapaSeg");
    const chkUbic = overlay.querySelector("#chkUbicSeg");
    const evidRef = overlay.querySelector("#evidRefSeg");
    const evidDet = overlay.querySelector("#evidDetSeg");
    const receptorNom = overlay.querySelector("#receptorNomSeg");
    const receptorDoc = overlay.querySelector("#receptorDocSeg");
    const evidImg = overlay.querySelector("#evidImgSeg");
    const evidImgPreview = overlay.querySelector("#evidImgPreviewSeg");
    const evidFotoHint = overlay.querySelector("#evidFotoHintSeg");
    let storageEvidencias = false;

    const wrapEvidFoto = overlay.querySelector("#wrapEvidFotoSeg");
    const evidTextoHint = overlay.querySelector("#evidTextoHintSeg");

    function syncEvidenciaFotoUi() {
      if (wrapEvidFoto) {
        wrapEvidFoto.style.display = storageEvidencias ? "" : "none";
        if (!storageEvidencias && evidImg) {
          evidImg.value = "";
          if (evidImgPreview) {
            evidImgPreview.innerHTML = "";
            evidImgPreview.classList.add("is-hidden");
          }
        }
      }
      if (evidTextoHint) {
        evidTextoHint.style.display = storageEvidencias ? "none" : "block";
      }
      if (!evidFotoHint) return;
      if (storageEvidencias) {
        evidFotoHint.textContent =
          "Opcional. Se guarda en Firebase Storage (máx. 5 MB, JPG, PNG o WEBP).";
      }
    }

    void window.glsApi.app
      .getFeatures?.()
      .then((f) => {
        storageEvidencias = Boolean(f?.storageEvidencias);
        syncEvidenciaFotoUi();
      })
      .catch(() => syncEvidenciaFotoUi());

    evidImg?.addEventListener?.("change", () => {
      const file = evidImg.files?.[0];
      if (!file || !evidImgPreview) {
        if (evidImgPreview) {
          evidImgPreview.innerHTML = "";
          evidImgPreview.classList.add("is-hidden");
        }
        return;
      }
      const url = URL.createObjectURL(file);
      evidImgPreview.innerHTML = `<img src="${url}" alt="Vista previa evidencia" /><div class="muted" style="font-size:11px;margin-top:4px">${escapeHtml(file.name)}</div>`;
      evidImgPreview.classList.remove("is-hidden");
    });
    if (!btnActualizar || !estadoHidden || !obs) return;

    function getEstado() {
      return String(estadoHidden.value || "").trim();
    }

    function syncPanels() {
      const st = getEstado();
      wrapEvid.style.display = st === "Entregado" ? "" : "none";
      if (UI()?.sugiereUbicacion?.(st)) chkUbic.checked = true;
      wrapMapa.style.display = chkUbic.checked ? "" : "none";
      mapOverlaySeg = overlay;
      if (chkUbic.checked) {
        setupMapaSeguimiento(lastUbicacion);
        setTimeout(() => mapSeg?.invalidateSize?.(), 320);
      } else {
        destroyMapSeguimiento();
      }
    }

    UI()?.attachStatePicker?.(overlay, () => {
      syncPanels();
      window.GlsAlert.clearAlert(alertEl);
    });
    chkUbic?.addEventListener?.("change", syncPanels);
    syncPanels();

    overlay.querySelector("#dirSeg")?.addEventListener?.("input", () => updateUbicPreviewSeg(overlay));
    overlay.querySelector("#latSeg")?.addEventListener?.("input", () => updateUbicPreviewSeg(overlay));
    overlay.querySelector("#lngSeg")?.addEventListener?.("input", () => updateUbicPreviewSeg(overlay));

    overlay.querySelector("#btnGeoLocateSeg")?.addEventListener?.("click", () => {
      if (!navigator.geolocation) {
        window.GlsAlert.showAlert(alertEl, { type: "error", message: "Geolocalización no disponible en este equipo." });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          overlay.querySelector("#latSeg").value = String(lat.toFixed(6));
          overlay.querySelector("#lngSeg").value = String(lng.toFixed(6));
          try {
            overlay.querySelector("#dirSeg").value = (
              (await nominatimReverse(lat, lng)) || `Ubicación GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`
            ).slice(0, 500);
          } catch (_) {}
          if (mapSeg && markerSeg) {
            markerSeg.setLatLng([lat, lng]);
            mapSeg.panTo([lat, lng]);
          }
          updateUbicPreviewSeg(overlay);
        },
        () => window.GlsAlert.showAlert(alertEl, { type: "error", message: "No se obtuvo la ubicación del dispositivo." })
      );
    });

    btnActualizar.addEventListener("click", async () => {
      window.GlsAlert.clearAlert(alertEl);
      const estado = getEstado();
      const obsTrim = String(obs.value || "").trim();
      if (obsTrim.length < 3) {
        window.GlsAlert.showAlert(alertEl, { type: "error", message: "La observación es obligatoria (mín. 3 caracteres)." });
        obs.focus();
        return;
      }
      if (estado === "Entregado") {
        const refTrim = String(evidRef?.value ?? "").trim();
        const nom = String(receptorNom?.value ?? "").trim();
        const doc = String(receptorDoc?.value ?? "").trim();
        if (refTrim.length < 4) {
          window.GlsAlert.showAlert(alertEl, { type: "error", message: "Referencia de entrega obligatoria (mín. 4 caracteres)." });
          return;
        }
        if (nom.length < 2) {
          window.GlsAlert.showAlert(alertEl, { type: "error", message: "Indique el nombre del receptor." });
          return;
        }
        if (!/^\d{8}$|^\d{11}$/.test(doc)) {
          window.GlsAlert.showAlert(alertEl, { type: "error", message: "DNI (8 dígitos) o RUC (11 dígitos) inválido." });
          return;
        }
      }

      const doSave = async () => {
        btnActualizar.disabled = true;
        if (status2) status2.textContent = "Actualizando...";
        const fileEvid = evidImg?.files?.[0];
        const maxFotoBytes = storageEvidencias ? 5 * 1024 * 1024 : 200 * 1024;
        if (fileEvid && fileEvid.size > maxFotoBytes) {
          const limKb = Math.round(maxFotoBytes / 1024);
          window.GlsAlert.showAlert(alertEl, {
            type: "error",
            message: `La foto supera ${limKb} KB. ${storageEvidencias ? "Use JPG, PNG o WEBP." : "Use solo referencia textual o active Firebase Storage."}`
          });
          btnActualizar.disabled = false;
          if (status2) status2.textContent = "";
          return;
        }
        let imgB64 = "";
        try {
          imgB64 = await readImageFileAsDataUrl(fileEvid);
        } catch (e) {
          window.GlsAlert.showAlert(alertEl, { type: "error", message: e?.message || String(e) });
          btnActualizar.disabled = false;
          if (status2) status2.textContent = "";
          return;
        }
        try {
          const r = await window.glsApi.trazabilidad.actualizarEstado({
            codigoEnvio: envio.codigoEnvio,
            estado,
            observacion: obs.value,
            responsable: "Área de operaciones",
            evidenciaReferencia: evidRef?.value ?? "",
            evidenciaDetalle: evidDet?.value ?? "",
            receptorNombre: receptorNom?.value ?? "",
            receptorDocumento: receptorDoc?.value ?? "",
            evidenciaImagenBase64: imgB64,
            evidenciaNombreArchivo: fileEvid?.name || ""
          });
          if (!r?.ok) throw new Error(r?.error || "No se pudo actualizar");

          const registrarUbic = chkUbic?.checked;
          const latU = String(overlay.querySelector("#latSeg")?.value ?? "").trim();
          const lngU = String(overlay.querySelector("#lngSeg")?.value ?? "").trim();
          let dirU = String(overlay.querySelector("#dirSeg")?.value ?? "").trim();
          const la = latU ? Number(latU) : NaN;
          const lo = lngU ? Number(lngU) : NaN;
          const tieneCoords = registrarUbic && Number.isFinite(la) && Number.isFinite(lo);
          if (tieneCoords && dirU.length < 3) {
            try {
              dirU = (await nominatimReverse(la, lo)).slice(0, 500) || `Punto (${latU}, ${lngU})`;
            } catch (_) {
              dirU = `Punto (${latU}, ${lngU})`;
            }
          }
          if (tieneCoords && dirU.length >= 3) {
            if (status2) status2.textContent = "Guardando ubicación...";
            const geoR = await window.glsApi.geolocalizacionQr.registrarUbicacion({
              codigoEnvio: envio.codigoEnvio,
              direccion: dirU,
              latitud: latU,
              longitud: lngU,
              observacion: `Tras «${estado}»: ${obsTrim}`.slice(0, 900)
            });
            if (!geoR?.ok) {
              window.GlsAlert.showAlert(alertEl, { type: "warn", message: `Estado OK; ubicación no guardada: ${geoR?.error}` });
            } else {
              window.GlsAlert.showAlert(alertEl, { type: "success", message: "Estado y ubicación guardados." });
            }
          } else {
            window.GlsAlert.showAlert(alertEl, { type: "success", message: "Estado actualizado correctamente." });
          }
          if (r.avisoEvidencia) {
            window.GlsToast?.warning?.(r.avisoEvidencia);
          }
          destroyMapSeguimiento();
          window.GlsModal.dismissOverlay(overlay);
          await buscarPorCodigo(envio.codigoEnvio);
        } catch (e) {
          window.GlsAlert.showAlert(alertEl, { type: "error", message: e?.message || String(e) });
          btnActualizar.disabled = false;
          if (status2) status2.textContent = "";
        }
      };

      if (window.GlsModal?.openConfirmModal) {
        window.GlsModal.openConfirmModal({
          title: "Confirmar cambio de estado",
          bodyHtml: `<p>¿Registrar el estado <b>${escapeHtml(estado)}</b> para <span class="mono">${escapeHtml(envio.codigoEnvio)}</span>?</p>`,
          confirmLabel: "Guardar",
          cancelLabel: "Cancelar",
          onConfirm: () => void doSave()
        });
      } else {
        await doSave();
      }
    });
  }

  function renderResult({ envio, historial, estados, puedeMutar: puedeEscribir, lastUbicacion = null, ubicaciones = [], qr = null }) {
    destroyMapSeguimiento();
    const puede = Boolean(puedeEscribir);
    const estadoActual = envio?.estadoActual || "—";
    const cod = escapeHtml(envio.codigoEnvio || "");
    const hrefGeo = `./geolocalizacion-qr.html?codigo=${encodeURIComponent(envio.codigoEnvio || "")}`;
    const hrefHist = `./historial.html`;

    resultEl.innerHTML = `
      <div class="card gls-compact-panel">
        <div class="card-title">Envío seleccionado</div>
        <div class="card-subtitle muted">Resumen en pantalla; el detalle y la edición se abren en ventanas modales.</div>
        <div style="overflow:auto; margin-top:10px">
          <table class="table table--compact-summary">
            <tbody>
              <tr><th>Código</th><td class="mono"><b>${cod}</b></td></tr>
              <tr><th>Estado</th><td>${UI()?.badgeHtml?.(estadoActual) || escapeHtml(estadoActual)}</td></tr>
              <tr><th>Ruta</th><td>${escapeHtml(envio.origen || "—")} → ${escapeHtml(envio.destino || "—")}</td></tr>
              <tr><th>Registro</th><td class="mono">${escapeHtml(envio.fechaRegistro || "—")}</td></tr>
              <tr><th>Remitente</th><td>${escapeHtml(envio.remitente?.nombres || "—")}</td></tr>
              <tr><th>Destinatario</th><td>${escapeHtml(envio.destinatario?.nombres || "—")}</td></tr>
              <tr><th>Carga / peso</th><td>${escapeHtml(envio.tipoCarga || "—")} · <span class="mono">${escapeHtml(
                String(envio.peso ?? "")
              )}</span> kg</td></tr>
            </tbody>
          </table>
        </div>
        <div class="actions" style="margin-top:14px; flex-wrap:wrap; gap:8px">
          <button type="button" class="btn btn-icon" id="btnModalDetalleSeg"><span class="ico">${ICONS.search}</span>Ver detalle e historial</button>
          ${
            puede
              ? `<button type="button" class="btn btn-primary btn-icon" id="btnModalEditarSeg"><span class="ico">${ICONS.status}</span>Actualizar estado / ubicación</button>`
              : `<span class="muted" style="font-size:12px">Solo consulta: use operaciones o admin para editar.</span>`
          }
          <a class="btn" href="${hrefGeo}">Mapa y QR</a>
          <a class="btn" href="${hrefHist}">Historial general</a>
          <div id="segCmpActions" data-gls-cmp-actions="1"></div>
        </div>
      </div>
    `;

    lastSeguimientoCtx = { envio, historial, ubicaciones, lastUbicacion, qr };

    const cmpRoot = document.getElementById("segCmpActions");
    if (cmpRoot && window.GlsComprobanteEnvio?.bindComprobanteActions) {
      window.GlsComprobanteEnvio.bindComprobanteActions(cmpRoot, {
        codigo: envio.codigoEnvio,
        envio,
        historial,
        alertEl
      });
    }

    document.getElementById("btnModalDetalleSeg")?.addEventListener?.("click", () => {
      window.GlsModal.openModal({
        title: `Detalle del envío · ${envio.codigoEnvio || ""}`,
        bodyHtml:
          buildSeguimientoDetalleModalHtml(envio, historial, ubicaciones) +
          `<div id="segDetalleCmpActions" data-gls-cmp-actions="1"></div>`,
        closeOnOverlayClick: true
      });
      queueMicrotask(() => {
        const detRoot = document.getElementById("segDetalleCmpActions");
        window.GlsComprobanteEnvio?.bindComprobanteActions?.(detRoot, {
          codigo: envio.codigoEnvio,
          envio,
          historial,
          alertEl
        });
      });
    });

    if (puede) {
      document.getElementById("btnModalEditarSeg")?.addEventListener?.("click", () => {
        const overlay = window.GlsModal.openModal({
          title: `Actualizar estado · ${envio.codigoEnvio || ""}`,
          bodyHtml: buildSeguimientoActualizarFormHtml(estados, envio.estadoActual),
          closeOnOverlayClick: true,
          onDismiss: () => destroyMapSeguimiento()
        });
        attachSeguimientoActualizarHandlers(overlay, {
          envio,
          historial,
          estados,
          puede,
          lastUbicacion
        });
      });
    }
  }

  async function buscarPorCodigo(codigoEnvio) {
    codigoEnvio = (codigoEnvio || "").trim();
    if (!codigoEnvio) {
      window.GlsAlert.showAlert(alertEl, { type: "error", message: "Ingresa un código ENV-YYYY-0001" });
      return;
    }
    busquedaUi?.setModoCodigo?.(codigoEnvio);
    window.GlsAlert.clearAlert(alertEl);
    destroyMapSeguimiento();
    resultEl.innerHTML = UI()?.loaderHtml?.("Cargando envío…") || "";
    busquedaUi?.setBusy?.(true, "Buscando…");
    resultEl.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
    try {
      const [res, estados, geoRes] = await Promise.all([
        window.glsApi.trazabilidad.buscar(codigoEnvio),
        loadEstados(),
        window.glsApi.geolocalizacionQr.buscar(codigoEnvio).catch(() => ({ ok: false }))
      ]);
      if (!res?.ok) {
        resultEl.innerHTML = "";
        refreshOtrosRegistros("");
        marcarBusquedaActiva(false);
        window.GlsAlert.showAlert(alertEl, { type: "error", message: res?.error || "No encontrado" });
        busquedaUi?.setBusy?.(false, "");
        return;
      }
      renderResult({
        envio: res.envio,
        historial: res.historial,
        estados,
        puedeMutar,
        lastUbicacion: geoRes?.ok ? geoRes.lastUbicacion : null,
        ubicaciones: geoRes?.ok ? geoRes.ubicaciones : [],
        qr: geoRes?.ok ? geoRes.qr : null
      });
      renderQuickBanner(res.envio, res.historial, geoRes?.ok ? geoRes.lastUbicacion : null);
      refreshOtrosRegistros(codigoEnvio);
      marcarBusquedaActiva(true);
      busquedaUi?.setBusy?.(false, "");
      resultEl.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
    } catch (e) {
      resultEl.innerHTML = "";
      refreshOtrosRegistros("");
      marcarBusquedaActiva(false);
      window.GlsAlert.showAlert(alertEl, { type: "error", message: e?.message || String(e) });
      busquedaUi?.setBusy?.(false, "");
    }
  }

  async function buscar() {
    window.GlsAlert.clearAlert(alertEl);
    const busquedaMod = BX();
    if (!busquedaMod?.resolverBusqueda) {
      window.GlsAlert.showAlert(alertEl, {
        type: "error",
        message: "Módulo de búsqueda no disponible. Recargue la página (F5)."
      });
      return;
    }
    const criterios = busquedaUi?.getCriterios?.() || {};
    busquedaUi?.setBusy?.(true, "Buscando…");
    try {
      const res = await busquedaMod.resolverBusqueda(criterios);
      if (res.tipo === "codigo") {
        await buscarPorCodigo(res.codigo);
        return;
      }
      resultEl.innerHTML = "";
      destroyMapSeguimiento();
      await refreshOtrosRegistros("", { enviosLista: res.envios, criterios });
      marcarBusquedaActiva(true);
      busquedaUi?.setBusy?.(false, `${res.envios.length} envío(s) — seleccione uno en la lista.`);
      window.GlsAlert.showAlert(alertEl, {
        type: "warn",
        message: `Se encontraron ${res.envios.length} envíos. Pulse uno en «Otros registros» o en envíos activos.`
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
      const { codigo } = (await window.GlsEnvioBusquedaRapida?.leerCodigoDesdeArchivo?.(file)) || {};
      if (!codigo) throw new Error("No se detectó un código ENV en el archivo.");
      await buscarPorCodigo(codigo);
    } catch (e) {
      window.GlsAlert.showAlert(alertEl, {
        type: "error",
        message: e?.message || "No se pudo leer el QR del archivo."
      });
      busquedaUi?.setBusy?.(false, "");
    }
  }

  function normalize(s) {
    return String(s || "").toLowerCase().trim();
  }

  function renderLista() {
    const q = normalize(filterEl.value);
    const filtered = !q
      ? enviosActivos
      : enviosActivos.filter((e) => {
          const hay = [
            e.codigoEnvio,
            e.origen,
            e.destino,
            e.estadoActual,
            e.clienteAsociado?.nombres,
            e.clienteAsociado?.documento,
            e.clienteAsociado?.empresa
          ]
            .map(normalize)
            .join(" ");
          return hay.includes(q);
        });

    if (!filtered.length) {
      listBodyEl.innerHTML = `<tr><td colspan="3" class="muted">No hay envíos activos que coincidan.</td></tr>`;
      return;
    }

    listBodyEl.innerHTML = filtered
      .map((e) => {
        const estado = e.estadoActual || "—";
        const route = `${escapeHtml(e.origen || "")} → ${escapeHtml(e.destino || "")}`;
        return `
          <tr data-code="${escapeHtml(e.codigoEnvio || "")}" style="cursor:pointer">
            <td class="mono"><b>${escapeHtml(e.codigoEnvio || "")}</b></td>
            <td>${route}</td>
            <td>${UI()?.badgeHtml?.(estado) || escapeHtml(estado)}</td>
          </tr>
        `;
      })
      .join("");
  }

  listBodyEl.addEventListener("click", (ev) => {
    const tr = ev.target?.closest?.("tr[data-code]");
    const code = tr?.dataset?.code;
    if (code) buscarPorCodigo(code);
  });

  filterEl.addEventListener("input", () => renderLista());

  busquedaUi?.btnBuscar?.addEventListener("click", () => void buscar());
  busquedaUi?.btnLimpiar?.addEventListener("click", () => void limpiarBusqueda());
  busquedaUi?.btnQr?.addEventListener("click", () => busquedaUi?.qrFile?.click());
  busquedaUi?.qrFile?.addEventListener("change", () => {
    const f = busquedaUi?.qrFile?.files?.[0];
    if (f) void leerArchivoYBuscar(f);
    if (busquedaUi?.qrFile) busquedaUi.qrFile.value = "";
  });
  [busquedaUi?.inputCodigo, busquedaUi?.inputCliente, busquedaUi?.selectEstado].forEach((el) => {
    el?.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") void buscar();
    });
  });

  function renderQuickBanner(envio, historial, lastUbicacion) {
    const el = document.getElementById("qrQuickBanner");
    if (!el || !CODIGO_DESDE_URL) {
      if (el) el.innerHTML = "";
      return;
    }
    const ult = (historial || []).slice().sort((a, b) => Date.parse(b.fechaActualizacion || 0) - Date.parse(a.fechaActualizacion || 0))[0];
    el.innerHTML = `
      <div class="qr-quick-banner">
        <h3>Vista rápida · acceso por código / QR</h3>
        <div class="qr-quick-grid">
          <div><span class="muted">Código</span><br/><b class="mono">${escapeHtml(envio?.codigoEnvio || "")}</b></div>
          <div><span class="muted">Estado</span><br/>${UI()?.badgeHtml?.(envio?.estadoActual) || "—"}</div>
          <div><span class="muted">Ruta</span><br/>${escapeHtml(envio?.origen || "")} → ${escapeHtml(envio?.destino || "")}</div>
          <div><span class="muted">Último evento</span><br/>${UI()?.badgeHtml?.(ult?.estado) || escapeHtml(ult?.estado || "—")} <span class="mono">${escapeHtml(ult?.fechaActualizacion || "")}</span></div>
          <div><span class="muted">Última ubicación</span><br/>${escapeHtml(lastUbicacion?.direccion || "Sin registro")}</div>
        </div>
      </div>`;
  }

  function refreshSegKpi() {
    const wrap = document.getElementById("segKpiWrap");
    if (wrap && UI()?.kpiStripHtml) wrap.innerHTML = UI().kpiStripHtml(enviosActivos);
  }

  function startRealtime(saltarAutoSeleccionPrimero) {
    setBusy(true, "Conectando...");
    listBodyEl.innerHTML = UI()?.skeletonTableRows?.(3, 4) || "";
    unsubscribe = window.glsApi.envios.subscribeActivos((payload) => {
      if (!payload?.ok) {
        const errMsg = payload?.error || "";
        const transient = /econnreset|unavailable|network|reconect/i.test(String(errMsg));
        if (transient) {
          setBusy(true, "Reconectando con Firestore...");
          return;
        }
        setBusy(false, "Error");
        window.GlsAlert.showAlert(alertEl, {
          type: "error",
          message: window.GlsAlert?.humanizeFirestoreMessage?.(errMsg) || errMsg || "Error cargando envíos activos"
        });
        return;
      }
      enviosActivos = payload.envios || [];
      setBusy(false, `Activos: ${enviosActivos.length}`);
      refreshSegKpi();
      renderLista();

      if (saltarAutoSeleccionPrimero) return;
      // Solo auto-abrir detalle si llegó por deep link (?codigo=), no al cargar la lista
      if (CODIGO_DESDE_URL && !resultEl.innerHTML.trim() && enviosActivos.length) {
        const match = enviosActivos.find((e) => e.codigoEnvio === CODIGO_DESDE_URL);
        if (match) void buscarPorCodigo(match.codigoEnvio);
      }
    }, 200);
  }

  window.addEventListener("beforeunload", () => {
    try { unsubscribe?.(); } catch {}
    destroyMapSeguimiento();
  });

  window.GlsAuthGuard?.requireAuthOrRedirect?.().then((user) => {
    window.GlsMenu?.mountAuthMenu?.();
    if (!user) return;
    const rol = String(user?.rol || "").toLowerCase();
    puedeMutar = rol === "admin" || rol === "operaciones";
    void window.GlsEnvioBusquedaRapida?.mountRegistrosRapidos?.(quickListEl, {
      limit: 40,
      onSelect: (codigo) => {
        void buscarPorCodigo(codigo);
      }
    });

    if (CODIGO_DESDE_URL) {
      busquedaUi?.setModoCodigo?.(CODIGO_DESDE_URL);
      void buscarPorCodigo(CODIGO_DESDE_URL);
    }
    startRealtime(!!CODIGO_DESDE_URL);
  });

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();

