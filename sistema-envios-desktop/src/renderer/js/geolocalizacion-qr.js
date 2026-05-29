(() => {
  const appEl = document.getElementById("app");

  function codigoDesdeUrlGeo() {
    try {
      const p = new URLSearchParams(window.location.search);
      return (p.get("codigo") || p.get("c") || "").trim();
    } catch {
      return "";
    }
  }

  const CODIGO_DESDE_URL = codigoDesdeUrlGeo();

  const ICONS = {
    search:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z" stroke="currentColor" stroke-width="1.8"/><path d="M16.5 16.5 21 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    pin:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z" stroke="currentColor" stroke-width="1.8"/><path d="M12 12.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" stroke="currentColor" stroke-width="1.8"/></svg>',
    qr:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4h7v7H4V4ZM13 4h7v7h-7V4ZM4 13h7v7H4v-7Z" stroke="currentColor" stroke-width="1.8"/><path d="M13 13h3v3h-3v-3ZM17 13h3v7h-7v-3" stroke="currentColor" stroke-width="1.8"/></svg>',
    save:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 21h14V7.5L16.5 5H5v16Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M7 21v-8h10v8" stroke="currentColor" stroke-width="1.8"/><path d="M8 5v5h8V5" stroke="currentColor" stroke-width="1.8"/></svg>',
  };
  appEl.innerHTML = `
    ${window.GlsMenu.renderMenu("geo")}
    <main class="main">
      ${window.GlsPageChrome.renderTopbar()}
      <div class="content">
      <div class="page-head">
        <div>
          <div class="page-title">Geolocalización y QR</div>
          <div class="page-subtitle">Registra puntos de control, visualiza en mapa y gestiona el QR del envío.</div>
        </div>
      </div>

      <div id="alert"></div>

      <div class="card envio-consulta-card">
        <div class="card-title">Buscar envío</div>
        <div class="card-subtitle">Filtros por código, cliente o estado. PDF o imagen QR. Parámetro URL: <span class="mono">?codigo=</span></div>
        <div id="geoBusquedaMount" class="u-mt-sm">
          ${window.GlsEnvioBusquedaRapida?.renderBusquedaPanelHtml?.({
            idPrefix: "geo",
            codigoInicial: CODIGO_DESDE_URL,
            navHtml:
              '<a href="./consulta-envio.html">Vista consulta</a> · <a href="./seguimiento-envio.html">Seguimiento</a>'
          }) || ""}
        </div>

        <div id="result" class="envio-consulta-result grid u-mt-md" hidden></div>

        <section id="geoOtrosRegistros" class="envio-otros-registros u-mt-md" aria-label="Otros registros">
          <div class="envio-otros-registros-title">Otros registros</div>
          <div id="geoQuickList" class="envio-quick-list-wrap u-mt-sm"></div>
        </section>
      </div>
      </div>
    </main>
  `;

  const alertEl = document.getElementById("alert");
  const resultEl = document.getElementById("result");
  const quickListEl = document.getElementById("geoQuickList");
  const otrosRegistrosEl = document.getElementById("geoOtrosRegistros");
  const BX = () => window.GlsEnvioBusquedaRapida;
  const busquedaUi = window.GlsEnvioBusquedaRapida?.wireBusquedaPanel?.(document.getElementById("geoBusquedaMount"), {
    idPrefix: "geo"
  });
  let codigoConsultado = "";

  function refreshOtrosRegistros(excludeCodigo, patch = {}) {
    BX()?.setSeccionOtrosRegistrosVisible?.(otrosRegistrosEl, true);
    codigoConsultado = excludeCodigo || "";
    const criterios = busquedaUi?.getCriterios?.() || {};
    void BX()?.refreshRegistrosRapidos?.(quickListEl, {
      excludeCodigo: codigoConsultado,
      criterios,
      ...patch
    });
  }

  function showResultPanel(show) {
    if (!resultEl) return;
    resultEl.hidden = !show;
    resultEl.style.display = show ? "" : "none";
  }

  function marcarBusquedaActiva(activa) {
    busquedaUi?.setBusquedaActiva?.(activa);
  }

  async function limpiarBusqueda() {
    window.GlsAlert.clearAlert(alertEl);
    busquedaUi?.resetCriterios?.();
    destroyMapGeo();
    showResultPanel(false);
    if (resultEl) resultEl.innerHTML = "";
    codigoConsultado = "";
    marcarBusquedaActiva(false);
    busquedaUi?.setBusy?.(false, "");
    BX()?.limpiarSeccionOtrosRegistros?.(quickListEl, otrosRegistrosEl);
  }

  let map = null;
  let marker = null;
  let polylineLayer = null;
  let puedeMutar = false;
  const UI = () => window.GlsEstadoEnvio;

  async function buscarPorCodigo(codigoEnvio) {
    const codigo = (codigoEnvio || "").trim();
    if (!codigo) {
      window.GlsAlert.showAlert(alertEl, { type: "error", message: "Ingresa un código ENV-YYYY-0001" });
      return;
    }
    busquedaUi?.setModoCodigo?.(codigo);
    window.GlsAlert.clearAlert(alertEl);
    destroyMapGeo();
    showResultPanel(true);
    resultEl.innerHTML = UI()?.loaderHtml?.("Buscando envío…") || "";
    resultEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    busquedaUi?.setBusy?.(true, "Buscando…");
    try {
      const [tra, geoRes] = await Promise.all([
        window.glsApi.trazabilidad.buscar(codigo),
        window.glsApi.geolocalizacionQr.buscar(codigo).catch(() => ({ ok: false }))
      ]);
      if (!tra?.ok) {
        showResultPanel(false);
        resultEl.innerHTML = "";
        refreshOtrosRegistros("");
        marcarBusquedaActiva(false);
        window.GlsAlert.showAlert(alertEl, { type: "error", message: tra?.error || "No encontrado" });
        busquedaUi?.setBusy?.(false, "");
        return;
      }
      const res = geoRes?.ok
        ? geoRes
        : {
            ok: true,
            envio: tra.envio,
            ubicaciones: [],
            lastUbicacion: null,
            qr: null
          };
      render(res);
      refreshOtrosRegistros(codigo);
      marcarBusquedaActiva(true);
      busquedaUi?.setBusy?.(false, "");
      resultEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (e) {
      showResultPanel(false);
      resultEl.innerHTML = "";
      refreshOtrosRegistros("");
      marcarBusquedaActiva(false);
      window.GlsAlert.showAlert(alertEl, { type: "error", message: e?.message || String(e) });
      busquedaUi?.setBusy?.(false, "");
    }
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
      destroyMapGeo();
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

  async function leerArchivoQrYBuscar(file) {
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

  function destroyMapGeo() {
    try {
      if (map) {
        map.off();
        map.remove();
      }
    } catch (_) {}
    map = null;
    marker = null;
    polylineLayer = null;
  }

  function addTiles(L, mapInstance) {
    const tiles =
      (window.GlsMapConfig && window.GlsMapConfig.tilesUrl) || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
    const attribution =
      (window.GlsMapConfig && window.GlsMapConfig.attribution) ||
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
    L.tileLayer(tiles, { maxZoom: 19, attribution }).addTo(mapInstance);
  }

  function popupUbicacionHtml(u) {
    return `<div class="geo-popup">
      <div class="mono" style="font-size:11px">${escapeHtml(u.fechaRegistro || "")}</div>
      <div><b>${escapeHtml(u.direccion || "Punto")}</b></div>
      <div class="muted">${escapeHtml(u.responsable || "")}${(u.registradoPor || "").trim() ? ` · ${escapeHtml(u.registradoPor)}` : ""}</div>
      ${u.observacion ? `<div style="margin-top:4px">${escapeHtml(u.observacion)}</div>` : ""}
    </div>`;
  }

  function initMapGeo(mapEl, center, onMapClick) {
    destroyMapGeo();
    if (!mapEl || !window.L) return;
    const L = window.L;
    map = L.map(mapEl).setView([center.lat, center.lng], 12);
    addTiles(L, map);
    marker = L.marker([center.lat, center.lng]).addTo(map);
    if (typeof onMapClick === "function") {
      map.on("click", (ev) => {
        const { lat, lng } = ev.latlng;
        onMapClick(lat, lng);
      });
    }
    if (Number.isFinite(center.lat) && Number.isFinite(center.lng)) {
      marker.setLatLng([center.lat, center.lng]);
    }
    setTimeout(() => {
      try {
        map?.invalidateSize?.();
      } catch (_) {}
    }, 140);
  }

  function renderMapaRuta(mapEl, ubicaciones) {
    destroyMapGeo();
    if (!mapEl || !window.L) return;
    const L = window.L;
    const pts = (ubicaciones || [])
      .map((u) => {
        const lat = Number(u.latitud);
        const lng = Number(u.longitud);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return { lat, lng, u };
      })
      .filter(Boolean)
      .sort((a, b) => Date.parse(a.u.fechaRegistro || "") - Date.parse(b.u.fechaRegistro || ""));

    const fallback = { lat: -12.0464, lng: -77.0428 };
    const last = pts.length ? pts[pts.length - 1] : fallback;
    map = L.map(mapEl).setView([last.lat, last.lng], pts.length > 1 ? 11 : 12);
    addTiles(L, map);

    if (pts.length >= 2) {
      polylineLayer = L.polyline(
        pts.map((p) => [p.lat, p.lng]),
        { color: "#1e5aa8", weight: 4, opacity: 0.85 }
      ).addTo(map);
    }

    pts.forEach((p, i) => {
      const m = L.marker([p.lat, p.lng]).addTo(map);
      m.bindPopup(popupUbicacionHtml(p.u));
      if (i === pts.length - 1) marker = m;
    });

    if (!pts.length) {
      marker = L.marker([fallback.lat, fallback.lng]).addTo(map);
    } else if (pts.length === 1) {
      marker.bindPopup(popupUbicacionHtml(pts[0].u));
    }

    if (polylineLayer) {
      try {
        map.fitBounds(polylineLayer.getBounds(), { padding: [28, 28] });
      } catch (_) {}
    }

    setTimeout(() => {
      try {
        map?.invalidateSize?.();
      } catch (_) {}
    }, 160);
  }

  function ubicacionesRowsHtml(ubicaciones) {
    const list = ubicaciones || [];
    if (!list.length) return `<tr><td colspan="6" class="muted">Sin ubicaciones referenciales.</td></tr>`;
    return list
      .slice()
      .reverse()
      .map(
        (u) => `
        <tr>
          <td class="mono">${escapeHtml(u.fechaRegistro || "")}</td>
          <td>${escapeHtml(u.direccion || "")}</td>
          <td class="mono">${escapeHtml(String(u.latitud ?? ""))}, ${escapeHtml(String(u.longitud ?? ""))}</td>
          <td>${escapeHtml(u.observacion || "")}</td>
          <td>${escapeHtml(u.responsable || "")}</td>
          <td class="mono">${escapeHtml((u.registradoPor || "").trim() || "—")}</td>
        </tr>`
      )
      .join("");
  }

  function bindQrImgError(imgEl) {
    imgEl?.addEventListener?.("error", () => {
      const d = document.createElement("div");
      d.className = "muted";
      d.style.padding = "10px 0";
      d.textContent =
        "No se pudo cargar la imagen del QR (archivo local). Pulse Generar QR o revise la carpeta assets/qr.";
      imgEl.replaceWith(d);
    });
  }

  function openModalHistorialUbicaciones(res) {
    const ubicaciones = res?.ubicaciones || [];
    const timeline = UI()?.ubicacionesTimelineHtml?.(ubicaciones) || "";
    window.GlsModal.openModal({
      title: `Historial de ubicaciones · ${res?.envio?.codigoEnvio || ""}`,
      bodyHtml: `
        <div class="card-subtitle muted" style="margin-bottom:10px">Orden cronológico (más antiguo arriba en la línea de tiempo).</div>
        <div class="u-mb-md">${timeline}</div>
        <div class="divider"></div>
        <div class="card-title" style="margin:12px 0 8px">Tabla de puntos</div>
        <div style="overflow:auto">
          <table class="table" style="min-width:880px">
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>Dirección</th>
                <th>Lat / Lng</th>
                <th>Observación</th>
                <th>Responsable</th>
                <th>Usuario</th>
              </tr>
            </thead>
            <tbody>${ubicacionesRowsHtml(ubicaciones)}</tbody>
          </table>
        </div>
      `,
      closeOnOverlayClick: true
    });
  }

  function openModalMapaQr(res) {
    const { envio, ubicaciones = [], qr } = res || {};
    const codigo = envio?.codigoEnvio || "";
    const qrImg = codigo ? `../assets/qr/${encodeURIComponent(codigo)}.png?ts=${Date.now()}` : "";
    const qrVisual = qr
      ? `<img class="qr-preview-img qr-preview-img--lg" src="${qrImg}" alt="Código QR del envío" data-gls-qr-img="1" />`
      : `<div class="muted" style="padding:10px 0">No hay registro en <span class="mono">qr_envios</span>. ${
          puedeMutar ? "Use <b>Generar QR</b> para crear el código con enlace a seguimiento." : ""
        }</div>`;

    const overlay = window.GlsModal.openModal({
      title: `Mapa y QR · ${codigo}`,
      bodyHtml: `
        <div class="geo-modal-stack">
          <div class="card-title" style="margin-bottom:6px">Mapa · recorrido</div>
          <div class="muted" style="font-size:12px;margin-bottom:8px">Marcadores, línea de ruta y popups con fecha, usuario y observación.</div>
          <div id="glsgeo-map-view" class="map map--geo-modal"></div>
          <div class="divider"></div>
          <div class="card-title" style="margin-bottom:6px">Código QR</div>
          <div class="qr-preview qr-preview--modal">
            ${qrVisual}
            <div>
              <div class="muted">Contenido (deep link)</div>
              <div class="mono" id="glsgeo-qr-content">${escapeHtml(qr?.contenidoQr || `seguimiento-envio.html?codigo=${codigo}`)}</div>
              <div class="actions u-mt-sm" style="flex-wrap:wrap;gap:6px">
                <button type="button" class="btn btn--sm" id="glsgeo-btn-dl-qr" ${qr ? "" : "disabled"}>Descargar PNG</button>
                <button type="button" class="btn btn--sm" id="glsgeo-btn-copy-cod">Copiar código</button>
                ${puedeMutar ? `<button type="button" class="btn btn--sm btn-accent" id="glsgeo-btn-regen-qr">Regenerar QR</button>` : ""}
                <button type="button" class="btn btn--sm btn-ghost" id="glsgeo-btn-print-qr">Imprimir</button>
              </div>
              <div class="hint u-mt-sm">
                <a href="./seguimiento-envio.html?codigo=${encodeURIComponent(codigo)}">Abrir seguimiento / trazabilidad</a>
              </div>
            </div>
          </div>
        </div>
      `,
      closeOnOverlayClick: true,
      onDismiss: destroyMapGeo
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const mapEl = document.getElementById("glsgeo-map-view");
        renderMapaRuta(mapEl, ubicaciones);
      });
    });

    const imgQr = document.querySelector(".modal-overlay [data-gls-qr-img]");
    bindQrImgError(imgQr);

    document.getElementById("glsgeo-btn-dl-qr")?.addEventListener?.("click", () => {
      if (!imgQr?.src) return;
      const a = document.createElement("a");
      a.href = imgQr.src;
      a.download = `${codigo || "qr"}.png`;
      a.click();
    });
    document.getElementById("glsgeo-btn-copy-cod")?.addEventListener?.("click", async () => {
      try {
        await navigator.clipboard.writeText(codigo);
        window.GlsAlert.showAlert(alertEl, { type: "success", message: "Código copiado al portapapeles." });
      } catch {
        window.GlsAlert.showAlert(alertEl, { type: "error", message: "No se pudo copiar el código." });
      }
    });
    document.getElementById("glsgeo-btn-print-qr")?.addEventListener?.("click", async () => {
      try {
        const r = await window.glsApi.geolocalizacionQr?.qrEtiquetaHtml?.(codigo);
        if (r?.ok && r.html) {
          const w = window.open("", "_blank", "width=520,height=720");
          if (!w) return;
          w.document.write(r.html);
          w.document.close();
          w.focus();
          w.print();
          return;
        }
      } catch {
        /* fallback básico */
      }
      const w = window.open("", "_blank", "width=480,height=640");
      if (!w) return;
      w.document.write(`<html><head><title>QR ${codigo}</title></head><body style="font-family:sans-serif;text-align:center">
        <h2>${escapeHtml(codigo)}</h2>
        ${imgQr ? `<img src="${imgQr.src}" style="max-width:320px"/>` : "<p>Sin imagen QR</p>"}
        <p style="font-size:12px">${escapeHtml(qr?.contenidoQr || "")}</p>
      </body></html>`);
      w.document.close();
      w.focus();
      w.print();
    });
    document.getElementById("glsgeo-btn-regen-qr")?.addEventListener?.("click", async () => {
      window.GlsAlert.clearAlert(alertEl);
      try {
        const r = await window.glsApi.geolocalizacionQr.generarQr(codigo);
        if (!r?.ok) {
          window.GlsAlert.showAlert(alertEl, { type: "error", message: r?.error || "No se pudo regenerar QR" });
          return;
        }
        window.GlsAlert.showAlert(alertEl, { type: "success", message: "QR regenerado." });
        const refreshed = await window.glsApi.geolocalizacionQr.buscar(codigo);
        if (refreshed?.ok) {
          window.GlsModal.dismissOverlay(overlay);
          render(refreshed);
          openModalMapaQr(refreshed);
        }
      } catch (e) {
        window.GlsAlert.showAlert(alertEl, { type: "error", message: e?.message || String(e) });
      }
    });
  }

  function openModalRegistrarUbicacion(res) {
    const { envio, lastUbicacion } = res || {};
    const codigo = envio?.codigoEnvio || "";

    const overlay = window.GlsModal.openModal({
      title: `Registrar ubicación · ${codigo}`,
      closeOnOverlayClick: false,
      onDismiss: destroyMapGeo,
      bodyHtml: `
        <div class="card-subtitle muted" style="margin-bottom:12px">
          Clic en el mapa autocompleta coordenadas. Use <b>Mi ubicación</b> si el navegador lo permite.
        </div>
        <div class="form-row">
          <div class="field"><label>Dirección</label><input id="glsgeo-dir" placeholder="Av. Javier Prado, Lima" /></div>
          <div class="form-row grid grid-2">
            <div class="field"><label>Latitud</label><input id="glsgeo-lat" placeholder="-12.0864" /></div>
            <div class="field"><label>Longitud</label><input id="glsgeo-lng" placeholder="-77.0432" /></div>
          </div>
          <div class="field"><label>Observación (opcional)</label><textarea id="glsgeo-obs" placeholder="Punto de control registrado"></textarea></div>
          <div class="actions u-gap-actions" style="flex-wrap:wrap;margin-top:8px">
            <button type="button" class="btn btn-ghost btn--sm" id="glsgeo-btn-locate">Usar ubicación actual</button>
          </div>
          <div id="glsgeo-map-ubic" class="map map--geo-modal" style="margin-top:10px"></div>
          <div class="actions" style="margin-top:12px; flex-wrap:wrap">
            <button type="button" id="glsgeo-btn-guardar" class="btn btn-primary btn-icon"><span class="ico">${ICONS.save}</span>Guardar ubicación</button>
            <button type="button" id="glsgeo-btn-qr" class="btn btn-accent btn-icon"><span class="ico">${ICONS.qr}</span>Generar QR</button>
            <span class="muted" id="glsgeo-status2"></span>
          </div>
        </div>
      `
    });

    const dirEl = document.getElementById("glsgeo-dir");
    const latEl = document.getElementById("glsgeo-lat");
    const lngEl = document.getElementById("glsgeo-lng");
    const obsEl = document.getElementById("glsgeo-obs");
    const status2 = document.getElementById("glsgeo-status2");
    const btnGuardarUbic = document.getElementById("glsgeo-btn-guardar");
    const btnGenerarQr = document.getElementById("glsgeo-btn-qr");

    if (lastUbicacion) {
      dirEl.value = lastUbicacion.direccion || "";
      latEl.value = lastUbicacion.latitud || "";
      lngEl.value = lastUbicacion.longitud || "";
      obsEl.value = "";
    }

    const la0 = Number(lastUbicacion?.latitud || -12.0464);
    const lo0 = Number(lastUbicacion?.longitud || -77.0428);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const mapEl = document.getElementById("glsgeo-map-ubic");
        initMapGeo(mapEl, { lat: la0, lng: lo0 }, (lat, lng) => {
          latEl.value = String(lat.toFixed(6));
          lngEl.value = String(lng.toFixed(6));
          if (marker) marker.setLatLng([lat, lng]);
        });
      });
    });

    document.getElementById("glsgeo-btn-locate")?.addEventListener?.("click", () => {
      if (!navigator.geolocation) {
        window.GlsAlert.showAlert(alertEl, { type: "error", message: "Geolocalización no disponible en este entorno." });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          latEl.value = String(lat.toFixed(6));
          lngEl.value = String(lng.toFixed(6));
          if (marker && map) marker.setLatLng([lat, lng]);
          map?.setView?.([lat, lng], 14);
          if (!dirEl.value.trim()) dirEl.value = `Ubicación GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        },
        () => window.GlsAlert.showAlert(alertEl, { type: "error", message: "No se pudo obtener la ubicación actual." }),
        { enableHighAccuracy: true, timeout: 12000 }
      );
    });

    btnGuardarUbic.addEventListener("click", async () => {
      window.GlsAlert.clearAlert(alertEl);
      btnGuardarUbic.disabled = true;
      btnGenerarQr.disabled = true;
      status2.textContent = "Guardando...";
      try {
        const r = await window.glsApi.geolocalizacionQr.registrarUbicacion({
          codigoEnvio: codigo,
          direccion: dirEl.value,
          latitud: latEl.value,
          longitud: lngEl.value,
          observacion: obsEl.value
        });
        if (!r?.ok) {
          window.GlsAlert.showAlert(alertEl, { type: "error", message: r?.error || "No se pudo guardar ubicación" });
          btnGuardarUbic.disabled = false;
          btnGenerarQr.disabled = false;
          status2.textContent = "";
          return;
        }
        status2.textContent = "Listo.";
        window.GlsAlert.showAlert(alertEl, { type: "success", message: "Ubicación referencial guardada." });
        window.GlsModal.dismissOverlay(overlay);
        render(r);
      } catch (e) {
        window.GlsAlert.showAlert(alertEl, { type: "error", message: e?.message || String(e) });
        btnGuardarUbic.disabled = false;
        btnGenerarQr.disabled = false;
        status2.textContent = "";
      }
    });

    btnGenerarQr.addEventListener("click", async () => {
      window.GlsAlert.clearAlert(alertEl);
      btnGuardarUbic.disabled = true;
      btnGenerarQr.disabled = true;
      status2.textContent = "Generando QR...";
      try {
        const r = await window.glsApi.geolocalizacionQr.generarQr(codigo);
        if (!r?.ok) {
          window.GlsAlert.showAlert(alertEl, { type: "error", message: r?.error || "No se pudo generar QR" });
          btnGuardarUbic.disabled = false;
          btnGenerarQr.disabled = false;
          status2.textContent = "";
          return;
        }
        status2.textContent = "Listo.";
        window.GlsAlert.showAlert(alertEl, { type: "success", message: "QR generado o actualizado." });
        const refreshed = await window.glsApi.geolocalizacionQr.buscar(codigo);
        if (refreshed?.ok) {
          window.GlsModal.dismissOverlay(overlay);
          render(refreshed);
        }
      } catch (e) {
        window.GlsAlert.showAlert(alertEl, { type: "error", message: e?.message || String(e) });
        btnGuardarUbic.disabled = false;
        btnGenerarQr.disabled = false;
        status2.textContent = "";
      }
    });
  }

  function openModalSugerenciasGeo() {
    window.GlsModal.openModal({
      title: "Sugerencias operativas",
      bodyHtml: `
        <div class="card-subtitle muted" style="margin-bottom:10px">Buenas prácticas para el área de operaciones.</div>
        <ul style="margin:0; padding-left:18px; color:var(--muted)">
          <li>Registrar ubicación en puntos de control (salida, peajes, ingreso, reparto).</li>
          <li>Usar observaciones cortas y claras para auditoría.</li>
          <li>Regenerar QR solo si se requiere reimpresión.</li>
        </ul>
      `,
      closeOnOverlayClick: true
    });
  }

  function render(res) {
    showResultPanel(true);
    destroyMapGeo();
    const { envio = {}, lastUbicacion, qr, ubicaciones = [] } = res || {};
    const codigo = envio?.codigoEnvio || "";
    const nUbic = (ubicaciones || []).length;
    const ultimaLinea = lastUbicacion
      ? `${escapeHtml(lastUbicacion.direccion || "—")} · <span class="mono">${escapeHtml(
          String(lastUbicacion.latitud || "")
        )}, ${escapeHtml(String(lastUbicacion.longitud || ""))}</span> · <span class="mono">${escapeHtml(
          lastUbicacion.fechaRegistro || ""
        )}</span>`
      : `<span class="muted">Sin ubicaciones registradas.</span>`;

    resultEl.innerHTML = `
      <div class="card gls-compact-panel">
        <div class="result-header">
          <div>
            <div class="card-title">Envío <span class="mono code">${escapeHtml(codigo)}</span></div>
            <div class="card-subtitle">${escapeHtml(envio.origen || "")} → ${escapeHtml(envio.destino || "")}</div>
          </div>
          <div>${UI()?.badgeHtml?.(envio.estadoActual) || `<span class="badge">Estado: <b>${escapeHtml(envio.estadoActual || "—")}</b></span>`}</div>
        </div>
        <div class="card-subtitle muted">Resumen en pantalla; mapa, formulario e historial se abren en modales.</div>
        <div style="overflow:auto; margin-top:10px">
          <table class="table table--compact-summary">
            <tbody>
              <tr><th>Registro</th><td class="mono">${escapeHtml(envio.fechaRegistro || "—")}</td></tr>
              <tr><th>Remitente</th><td>${escapeHtml(envio.remitente?.nombres || "—")}</td></tr>
              <tr><th>Destinatario</th><td>${escapeHtml(envio.destinatario?.nombres || "—")}</td></tr>
              <tr><th>Carga / peso</th><td>${escapeHtml(envio.tipoCarga || "—")} · <span class="mono">${escapeHtml(
                String(envio.peso ?? "")
              )}</span> kg</td></tr>
              <tr><th>Última ubicación</th><td>${ultimaLinea}</td></tr>
              <tr><th>QR</th><td>${qr ? "Registrado" : "<span class=\"muted\">Sin registro en qr_envios</span>"} · ${
                nUbic ? `<span class="mono">${nUbic}</span> puntos en historial` : "Sin puntos aún"
              }</td></tr>
            </tbody>
          </table>
        </div>
        <div class="actions" style="margin-top:14px; flex-wrap:wrap; gap:8px">
          ${
            puedeMutar
              ? `<button type="button" class="btn btn-primary btn-icon" id="btnGeoModalUbic"><span class="ico">${ICONS.pin}</span>Registrar ubicación / QR</button>`
              : `<span class="muted" style="font-size:12px">Solo lectura: su rol no registra ubicaciones ni genera QR.</span>`
          }
          <button type="button" class="btn btn-icon" id="btnGeoModalMapa"><span class="ico">${ICONS.qr}</span>Mapa y QR</button>
          <button type="button" class="btn btn-icon" id="btnGeoModalHist"><span class="ico">${ICONS.search}</span>Historial ubicaciones</button>
        </div>
        <div style="margin-top:8px">
          <button type="button" class="btn btn-ghost" id="btnGeoModalTips" style="font-size:12px;padding:6px 10px">Ver sugerencias operativas</button>
        </div>
      </div>
    `;

    document.getElementById("btnGeoModalMapa")?.addEventListener?.("click", () => openModalMapaQr(res));
    document.getElementById("btnGeoModalHist")?.addEventListener?.("click", () => openModalHistorialUbicaciones(res));
    document.getElementById("btnGeoModalTips")?.addEventListener?.("click", () => openModalSugerenciasGeo());
    if (puedeMutar) {
      document.getElementById("btnGeoModalUbic")?.addEventListener?.("click", () => openModalRegistrarUbicacion(res));
    }
  }

  busquedaUi?.btnBuscar?.addEventListener("click", () => void buscar());
  busquedaUi?.btnLimpiar?.addEventListener("click", () => void limpiarBusqueda());
  busquedaUi?.btnQr?.addEventListener("click", () => busquedaUi?.qrFile?.click());
  busquedaUi?.qrFile?.addEventListener("change", () => {
    const f = busquedaUi?.qrFile?.files?.[0];
    if (f) void leerArchivoQrYBuscar(f);
    if (busquedaUi?.qrFile) busquedaUi.qrFile.value = "";
  });
  [busquedaUi?.inputCodigo, busquedaUi?.inputCliente, busquedaUi?.selectEstado].forEach((el) => {
    el?.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") void buscar();
    });
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
    const pre = CODIGO_DESDE_URL;
    if (pre) {
      busquedaUi?.setModoCodigo?.(pre);
      void buscarPorCodigo(pre);
    }
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

