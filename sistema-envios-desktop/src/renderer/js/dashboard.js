(() => {
  const appEl = document.getElementById("app");
  const ICONS = {
    truck:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 7.5c0-.83.67-1.5 1.5-1.5h9c.83 0 1.5.67 1.5 1.5V16H3V7.5Z" stroke="currentColor" stroke-width="1.8"/><path d="M15 10h3.6c.36 0 .7.16.92.45l1.48 1.96c.19.25.3.56.3.88V16H15v-6Z" stroke="currentColor" stroke-width="1.8"/><path d="M7 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM18 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" stroke="currentColor" stroke-width="1.8"/><path d="M3 16h12" stroke="currentColor" stroke-width="1.8"/></svg>',
    box:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z" stroke="currentColor" stroke-width="1.8"/><path d="M12 3v18" stroke="currentColor" stroke-width="1.8" opacity=".55"/><path d="M4 7.5l8 4.5 8-4.5" stroke="currentColor" stroke-width="1.8"/></svg>',
    mapPin:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z" stroke="currentColor" stroke-width="1.8"/><path d="M12 12.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" stroke="currentColor" stroke-width="1.8"/></svg>',
    qr:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4h7v7H4V4ZM13 4h7v7h-7V4ZM4 13h7v7H4v-7Z" stroke="currentColor" stroke-width="1.8"/><path d="M13 13h3v3h-3v-3ZM17 13h3v7h-7v-3" stroke="currentColor" stroke-width="1.8"/></svg>'
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
    ${window.GlsMenu.renderMenu("dashboard")}
    <main class="main">
      ${renderTopbar()}
      <div class="content">
      <div class="page-head">
        <div>
          <div class="page-title">Dashboard</div>
          <div class="page-subtitle">Resumen operativo de envíos y accesos rápidos a módulos.</div>
        </div>
        <div class="actions">
          <a class="btn btn-primary btn-icon" href="./registro-envio.html"><span class="ico">${ICONS.box}</span>Registrar envío</a>
          <a class="btn btn-icon" href="./seguimiento-envio.html"><span class="ico">${ICONS.truck}</span>Buscar envío</a>
        </div>
      </div>
      <div id="alert"></div>
        <div class="grid grid-3">
        <div class="card kpi kpi-accent">
          <div>
            <div class="num" id="kpiTotal">—</div>
            <div class="label">Total de envíos (muestra)</div>
          </div>
          <div class="ico" aria-hidden="true">${ICONS.box}</div>
        </div>
        <div class="card kpi kpi-warn">
          <div>
            <div class="num" id="kpiTransito">—</div>
            <div class="label">En tránsito</div>
          </div>
          <div class="ico" aria-hidden="true">${ICONS.truck}</div>
        </div>
        <div class="card kpi kpi-ok">
          <div>
            <div class="num" id="kpiEntregados">—</div>
            <div class="label">Entregados</div>
          </div>
          <div class="ico" aria-hidden="true">${ICONS.qr}</div>
        </div>
      </div>
      <div class="grid" style="margin-top:14px">
        <div class="grid grid-2">
          <div class="card kpi kpi-danger">
            <div>
              <div class="num" id="kpiObservados">—</div>
              <div class="label">Observados</div>
            </div>
            <div class="ico" aria-hidden="true">${ICONS.mapPin}</div>
          </div>
          <div class="card">
            <div class="card-title">Acciones rápidas</div>
            <div class="card-subtitle">Navega con el menú lateral. Recomendado: cargar estados iniciales con seed.</div>
            <div class="actions">
              <a class="btn btn-primary btn-icon" href="./registro-envio.html"><span class="ico">${ICONS.box}</span>Nuevo envío</a>
              <a class="btn btn-icon" href="./historial.html"><span class="ico">${ICONS.box}</span>Historial general</a>
              <a class="btn btn-icon" href="./seguimiento-envio.html"><span class="ico">${ICONS.truck}</span>Trazabilidad</a>
              <a class="btn btn-icon" href="./geolocalizacion-qr.html"><span class="ico">${ICONS.mapPin}</span>Geolocalización + QR</a>
            </div>
          </div>
        </div>
      </div>
      <div class="grid" style="margin-top:14px">
        <div class="card">
          <div class="card-title">Estado del sistema</div>
          <div class="card-subtitle">Aplicación local (Electron) conectada a Firestore (Spark). QR se genera localmente en PNG.</div>
          <div class="actions">
            <div class="badge ok">Electron: OK</div>
            <div class="badge info">Firestore: conectado</div>
            <div class="badge">QR: PNG local</div>
          </div>
        </div>
      </div>
      </div>
    </main>
  `;

  const alertEl = document.getElementById("alert");
  window.GlsAlert.clearAlert(alertEl);

  (async () => {
    try {
      const ping = await window.glsApi.app.ping();
      if (!ping?.ok) throw new Error("No se pudo iniciar IPC de la aplicación");

      const hist = await window.glsApi.envios.listarHistorial({ estado: "Todos", limitCount: 2000 });
      if (!hist?.ok) throw new Error(hist?.error || "No se pudo cargar KPIs");

      const envios = hist.envios || [];
      const count = (estado) => envios.filter((e) => (e.estadoActual || "") === estado).length;

      document.getElementById("kpiTotal").textContent = String(envios.length);
      document.getElementById("kpiTransito").textContent = String(count("En tránsito"));
      document.getElementById("kpiEntregados").textContent = String(count("Entregado"));
      document.getElementById("kpiObservados").textContent = String(count("Observado"));
    } catch (e) {
      window.GlsAlert.showAlert(alertEl, { type: "error", message: `Error inicializando app: ${e?.message || e}` });
    }
  })();
})();

