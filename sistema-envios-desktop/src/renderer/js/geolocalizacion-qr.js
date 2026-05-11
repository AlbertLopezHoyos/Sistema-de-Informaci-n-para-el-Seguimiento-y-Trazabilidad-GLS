(() => {
  const appEl = document.getElementById("app");
  const ICONS = {
    search:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z" stroke="currentColor" stroke-width="1.8"/><path d="M16.5 16.5 21 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    pin:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z" stroke="currentColor" stroke-width="1.8"/><path d="M12 12.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" stroke="currentColor" stroke-width="1.8"/></svg>',
    qr:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4h7v7H4V4ZM13 4h7v7h-7V4ZM4 13h7v7H4v-7Z" stroke="currentColor" stroke-width="1.8"/><path d="M13 13h3v3h-3v-3ZM17 13h3v7h-7v-3" stroke="currentColor" stroke-width="1.8"/></svg>',
    save:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 21h14V7.5L16.5 5H5v16Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M7 21v-8h10v8" stroke="currentColor" stroke-width="1.8"/><path d="M8 5v5h8V5" stroke="currentColor" stroke-width="1.8"/></svg>'
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
    ${window.GlsMenu.renderMenu("geo")}
    <main class="main">
      ${renderTopbar()}
      <div class="content">
      <div class="page-head">
        <div>
          <div class="page-title">Geolocalización y QR</div>
          <div class="page-subtitle">Registra puntos de control, visualiza en mapa y gestiona el QR del envío.</div>
        </div>
        <div class="actions">
          <a class="btn" href="./seguimiento-envio.html">Ir a seguimiento</a>
        </div>
      </div>

      <div id="alert"></div>

      <div class="card">
        <div class="actions">
          <input id="codigo" placeholder="ENV-2026-0001" style="max-width:260px" />
          <button id="btnBuscar" class="btn btn-primary btn-icon"><span class="ico">${ICONS.search}</span>Buscar</button>
          <span class="muted" id="status"></span>
        </div>
      </div>

      <div id="result" class="grid" style="margin-top:14px"></div>
      </div>
    </main>
  `;

  const alertEl = document.getElementById("alert");
  const resultEl = document.getElementById("result");
  const codigoEl = document.getElementById("codigo");
  const btnBuscar = document.getElementById("btnBuscar");
  const statusEl = document.getElementById("status");

  let map = null;
  let marker = null;

  function setBusy(busy, text) {
    btnBuscar.disabled = busy;
    statusEl.textContent = text || "";
  }

  function render({ envio, lastUbicacion, qr }) {
    const codigo = envio?.codigoEnvio || "";
    const qrImg = codigo ? `../assets/qr/${encodeURIComponent(codigo)}.png?ts=${Date.now()}` : "";

    resultEl.innerHTML = `
      <div class="card">
        <div class="result-header">
          <div>
            <div class="card-title">Envío <span class="mono code">${escapeHtml(codigo)}</span></div>
            <div class="card-subtitle">Origen: <b>${escapeHtml(envio.origen || "")}</b> · Destino: <b>${escapeHtml(
              envio.destino || ""
            )}</b></div>
          </div>
          <div class="badge">Estado: <b>${escapeHtml(envio.estadoActual || "—")}</b></div>
        </div>
        <div class="geo-grid">
          <div class="card" style="box-shadow:none">
            <div class="card-title">Panel de ubicación</div>
            <div class="card-subtitle">Registra dirección y coordenadas del punto de control.</div>
            <div class="form-row">
              <div class="field"><label>Dirección</label><input id="dir" placeholder="Av. Javier Prado, Lima" /></div>
              <div class="form-row grid grid-2">
                <div class="field"><label>Latitud</label><input id="lat" placeholder="-12.0864" /></div>
                <div class="field"><label>Longitud</label><input id="lng" placeholder="-77.0432" /></div>
              </div>
              <div class="field"><label>Observación</label><textarea id="obs" placeholder="Punto de control registrado"></textarea></div>
              <div class="actions">
                <button id="btnGuardarUbic" class="btn btn-primary btn-icon"><span class="ico">${ICONS.save}</span>Guardar ubicación</button>
                <button id="btnGenerarQr" class="btn btn-accent btn-icon"><span class="ico">${ICONS.qr}</span>Generar QR</button>
                <span class="muted" id="status2"></span>
              </div>
              <div class="hint">Tip: puedes hacer click en el mapa para autocompletar latitud/longitud.</div>
            </div>
          </div>

          <div class="card" style="box-shadow:none">
            <div class="card-title">Mapa y QR</div>
            <div class="card-subtitle">OpenStreetMap + vista previa del código QR.</div>
            <div id="map" class="map" style="height:310px"></div>
            <div class="divider"></div>
            <div class="qr-preview">
              <img src="${qrImg}" alt="QR" />
              <div>
                <div class="muted">Contenido</div>
                <div class="mono">${escapeHtml(qr?.contenidoQr || codigo || "")}</div>
                <div class="muted" style="margin-top:10px">Ruta local</div>
                <div class="mono">${escapeHtml(qr?.rutaLocalQr || "src/renderer/assets/qr/" + codigo + ".png")}</div>
                <div class="hint" style="margin-top:10px">
                  <a href="./consulta-envio.html?codigo=${encodeURIComponent(codigo)}">Consulta por código (enlace compartible)</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="grid grid-2">
        <div class="card">
          <div class="card-title">Última ubicación</div>
          ${
            lastUbicacion
              ? `
            <div>Dirección: <b>${escapeHtml(lastUbicacion.direccion || "")}</b></div>
            <div>Lat/Lng: <span class="mono">${escapeHtml(lastUbicacion.latitud || "")}, ${escapeHtml(
                  lastUbicacion.longitud || ""
                )}</span></div>
            <div class="muted">Fecha: <span class="mono">${escapeHtml(lastUbicacion.fechaRegistro || "")}</span></div>
          `
              : `<div class="muted">No hay ubicaciones registradas.</div>`
          }
        </div>
        <div class="card">
          <div class="card-title">Sugerencias operativas</div>
          <div class="card-subtitle">Buenas prácticas para el área de operaciones.</div>
          <ul style="margin:0; padding-left:18px; color:var(--muted)">
            <li>Registrar ubicación en puntos de control (salida, peajes, ingreso, reparto).</li>
            <li>Usar observaciones cortas y claras para auditoría.</li>
            <li>Regenerar QR solo si se requiere reimpresión.</li>
          </ul>
        </div>
      </div>
    `;

    const dirEl = document.getElementById("dir");
    const latEl = document.getElementById("lat");
    const lngEl = document.getElementById("lng");
    const obsEl = document.getElementById("obs");
    const status2 = document.getElementById("status2");
    const btnGuardarUbic = document.getElementById("btnGuardarUbic");
    const btnGenerarQr = document.getElementById("btnGenerarQr");

    if (lastUbicacion) {
      dirEl.value = lastUbicacion.direccion || "";
      latEl.value = lastUbicacion.latitud || "";
      lngEl.value = lastUbicacion.longitud || "";
      obsEl.value = "";
    }

    initMap({
      lat: Number(lastUbicacion?.latitud || -12.0464),
      lng: Number(lastUbicacion?.longitud || -77.0428)
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
        const refreshed = await window.glsApi.geolocalizacionQr.buscar(codigo);
        if (refreshed?.ok) render(refreshed);
      } catch (e) {
        window.GlsAlert.showAlert(alertEl, { type: "error", message: e?.message || String(e) });
        btnGuardarUbic.disabled = false;
        btnGenerarQr.disabled = false;
        status2.textContent = "";
      }
    });

    function initMap(center) {
      const mapEl = document.getElementById("map");
      if (!mapEl) return;

      if (map) {
        map.off();
        map.remove();
        map = null;
        marker = null;
      }

      map = window.L.map(mapEl).setView([center.lat, center.lng], 12);
      const tiles =
        (window.GlsMapConfig && window.GlsMapConfig.tilesUrl) || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
      const attribution =
        (window.GlsMapConfig && window.GlsMapConfig.attribution) ||
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
      window.L.tileLayer(tiles, { maxZoom: 19, attribution }).addTo(map);

      marker = window.L.marker([center.lat, center.lng]).addTo(map);

      map.on("click", (ev) => {
        const { lat, lng } = ev.latlng;
        latEl.value = String(lat.toFixed(6));
        lngEl.value = String(lng.toFixed(6));
        if (marker) marker.setLatLng([lat, lng]);
      });

      if (Number.isFinite(center.lat) && Number.isFinite(center.lng)) {
        marker.setLatLng([center.lat, center.lng]);
      }
    }
  }

  async function buscar() {
    const codigoEnvio = (codigoEl.value || "").trim();
    if (!codigoEnvio) {
      window.GlsAlert.showAlert(alertEl, { type: "error", message: "Ingresa un código ENV-YYYY-0001" });
      return;
    }
    window.GlsAlert.clearAlert(alertEl);
    resultEl.innerHTML = "";
    setBusy(true, "Buscando...");
    try {
      const res = await window.glsApi.geolocalizacionQr.buscar(codigoEnvio);
      if (!res?.ok) {
        window.GlsAlert.showAlert(alertEl, { type: "error", message: res?.error || "No encontrado" });
        setBusy(false);
        return;
      }
      render(res);
      setBusy(false, "Listo.");
    } catch (e) {
      window.GlsAlert.showAlert(alertEl, { type: "error", message: e?.message || String(e) });
      setBusy(false);
    }
  }

  btnBuscar.addEventListener("click", buscar);
  codigoEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") buscar();
  });

  function codigoDesdeUrlGeo() {
    try {
      const p = new URLSearchParams(window.location.search);
      return (p.get("codigo") || p.get("c") || "").trim();
    } catch {
      return "";
    }
  }

  window.GlsAuthGuard?.requireAuthOrRedirect?.().then((user) => {
    window.GlsMenu?.mountAuthMenu?.();
    if (!user) return;
    const pre = codigoDesdeUrlGeo();
    if (pre) {
      codigoEl.value = pre;
      buscar();
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

