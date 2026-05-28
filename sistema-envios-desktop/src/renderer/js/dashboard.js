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
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 4h7v7H4V4ZM13 4h7v7h-7V4ZM4 13h7v7H4v-7Z" stroke="currentColor" stroke-width="1.8"/><path d="M13 13h3v3h-3v-3ZM17 13h3v7h-7v-3" stroke="currentColor" stroke-width="1.8"/></svg>',
    refresh:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12a8 8 0 0 1 14-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M18 2v5h-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M20 12a8 8 0 0 1-14 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M6 22v-5h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    chevron:
      '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="m9 6 6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    ban:
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" stroke="currentColor" stroke-width="1.8"/><path d="M5 5l14 14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>'
  };

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function historialUrlPorEstado(estado) {
    if (!estado || estado === "Todos") return "./historial.html";
    return `./historial.html?estado=${encodeURIComponent(estado)}`;
  }

  function prefersReducedMotion() {
    return Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
  }

  /** Animación breve del contador KPI (accesible si no hay animaciones). */
  function animateCount(el, target, duration = 420) {
    if (!el) return;
    const n = Math.max(0, Math.floor(Number(target) || 0));
    if (prefersReducedMotion()) {
      el.textContent = String(n);
      return;
    }
    const start = performance.now();
    const from = 0;
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 2;
      el.textContent = String(Math.round(from + (n - from) * eased));
      if (t < 1) requestAnimationFrame(frame);
      else el.textContent = String(n);
    }
    requestAnimationFrame(frame);
  }

  function renderActividadReciente(envios) {
    const el = document.getElementById("dashRecentList");
    if (!el) return;
    const sorted = [...(envios || [])].sort((a, b) => {
      const ta = Date.parse(a.fechaRegistro || "") || 0;
      const tb = Date.parse(b.fechaRegistro || "") || 0;
      return tb - ta;
    });
    const top = sorted.slice(0, 6);
    if (!top.length) {
      el.innerHTML = `<li class="dash-recent-empty muted">Sin envíos aún. Use <b>Nuevo envío</b> para registrar el primero.</li>`;
      return;
    }
    el.innerHTML = top
      .map((e) => {
        const codigo = e.codigoEnvio || "";
        const href = `./seguimiento-envio.html?codigo=${encodeURIComponent(codigo)}`;
        const est = e.estadoActual || "—";
        const badge =
          window.GlsEstadoEnvio?.badgeHtml?.(est) ||
          `<span class="badge info">${escapeHtml(est)}</span>`;
        return `<li>
          <a class="dash-recent-item" href="${href}">
            <div class="dash-recent-text">
              <span class="dash-recent-main">
                <span class="mono dash-recent-code">${escapeHtml(codigo)}</span>
                ${badge}
              </span>
              <span class="muted dash-recent-meta">${escapeHtml(e.origen || "—")} → ${escapeHtml(e.destino || "—")}</span>
            </div>
            <span class="dash-recent-ico" aria-hidden="true">${ICONS.chevron}</span>
          </a>
        </li>`;
      })
      .join("");
  }

  let chartEstadosDash = null;
  let chartMesDash = null;
  let chartEntObs = null;
  let chartSemanaDash = null;

  function topClientesFromEnvios(envios, limit = 6) {
    const map = new Map();
    for (const e of envios || []) {
      const nombre =
        e.clienteAsociado?.nombres?.trim() ||
        e.remitente?.nombres?.trim() ||
        e.destinatario?.nombres?.trim() ||
        "Sin nombre";
      const key = nombre.toLowerCase();
      map.set(key, { nombre, total: (map.get(key)?.total || 0) + 1 });
    }
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, limit);
  }

  function tendenciaSemanal(envios) {
    const map = new Map();
    for (const e of envios || []) {
      const t = Date.parse(e.fechaRegistro || "");
      if (!Number.isFinite(t)) continue;
      const d = new Date(t);
      const onejan = new Date(d.getFullYear(), 0, 1);
      const week = Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7);
      const key = `${d.getFullYear()}-S${String(week).padStart(2, "0")}`;
      map.set(key, (map.get(key) || 0) + 1);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }

  function renderTopClientes(envios) {
    const el = document.getElementById("dashTopClientes");
    if (!el) return;
    const top = topClientesFromEnvios(envios);
    if (!top.length) {
      el.innerHTML = `<li class="muted">Sin datos de clientes.</li>`;
      return;
    }
    el.innerHTML = top
      .map((c) => `<li><span>${escapeHtml(c.nombre)}</span><span class="mono"><b>${c.total}</b></span></li>`)
      .join("");
  }

  function renderOpsSummary(envios) {
    const el = document.getElementById("dashOpsGrid");
    if (!el) return;
    const total = envios.length;
    const ent = envios.filter((e) => e.estadoActual === "Entregado").length;
    const obs = envios.filter((e) => e.estadoActual === "Observado").length;
    const activos = envios.filter((e) => !["Entregado", "Cancelado"].includes(e.estadoActual || "")).length;
    const pctEnt = total ? Math.round((ent / total) * 100) : 0;
    const pctObs = total ? Math.round((obs / total) * 100) : 0;
    el.innerHTML = `
      <div class="dash-ops-item"><div class="num">${pctEnt}%</div><div class="label">Entregados</div></div>
      <div class="dash-ops-item"><div class="num">${pctObs}%</div><div class="label">Observados</div></div>
      <div class="dash-ops-item"><div class="num">${activos}</div><div class="label">En curso</div></div>
      <div class="dash-ops-item"><div class="num">${total ? Math.round((ent / total) * 100) : 0}%</div><div class="label">Eficiencia</div></div>
    `;
  }

  function renderChartSemanal(envios) {
    const Chart = window.Chart;
    const c = document.getElementById("dashChartSemana");
    if (!Chart || !c) return;
    const rows = tendenciaSemanal(envios).slice(-8);
    if (chartSemanaDash) chartSemanaDash.destroy();
    chartSemanaDash = new Chart(c, {
      type: "line",
      data: {
        labels: rows.map((x) => x[0]),
        datasets: [
          {
            label: "Envíos / semana",
            data: rows.map((x) => x[1]),
            borderColor: "#2563eb",
            backgroundColor: "rgba(37,99,235,.12)",
            fill: true,
            tension: 0.35
          }
        ]
      },
      options: { scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }, maintainAspectRatio: false }
    });
  }

  function renderDashboardCharts(envios) {
    const Chart = window.Chart;
    if (!Chart) return;
    const porEstado = {};
    const porMes = new Map();
    let ent = 0;
    let obs = 0;
    for (const e of envios || []) {
      const st = String(e.estadoActual || "—").trim();
      porEstado[st] = (porEstado[st] || 0) + 1;
      if (st === "Entregado") ent += 1;
      if (st === "Observado") obs += 1;
      const m = (e.fechaRegistro || "").slice(0, 7);
      if (m.length === 7) porMes.set(m, (porMes.get(m) || 0) + 1);
    }
    const estLabels = Object.keys(porEstado);
    const estData = estLabels.map((k) => porEstado[k]);
    const mesSorted = [...porMes.entries()].sort((a, b) => a[0].localeCompare(b[0]));

    const palette = ["#2563eb", "#ca8a04", "#f57c00", "#ea580c", "#16a34a", "#dc2626", "#64748b"];

    const c1 = document.getElementById("dashChartEstados");
    if (c1) {
      if (chartEstadosDash) chartEstadosDash.destroy();
      chartEstadosDash = new Chart(c1, {
        type: "doughnut",
        data: { labels: estLabels, datasets: [{ data: estData, backgroundColor: palette }] },
        options: { plugins: { legend: { position: "bottom" } }, maintainAspectRatio: false }
      });
    }
    const c2 = document.getElementById("dashChartMes");
    if (c2) {
      if (chartMesDash) chartMesDash.destroy();
      chartMesDash = new Chart(c2, {
        type: "line",
        data: {
          labels: mesSorted.map((x) => x[0]),
          datasets: [{ label: "Envíos", data: mesSorted.map((x) => x[1]), borderColor: "#2563eb", backgroundColor: "rgba(37,99,235,.15)", fill: true, tension: 0.3 }]
        },
        options: { scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }, maintainAspectRatio: false }
      });
    }
    const c3 = document.getElementById("dashChartEntObs");
    if (c3) {
      if (chartEntObs) chartEntObs.destroy();
      const otros = Math.max(0, (envios || []).length - ent - obs);
      chartEntObs = new Chart(c3, {
        type: "bar",
        data: {
          labels: ["Entregados", "Observados", "Otros"],
          datasets: [{ data: [ent, obs, otros], backgroundColor: ["#16a34a", "#dc2626", "#94a3b8"] }]
        },
        options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }, maintainAspectRatio: false }
      });
    }
  }

  async function cargarPanel() {
    const alertEl = document.getElementById("alert");
    const btn = document.getElementById("btnDashRefresh");
    const hint = document.getElementById("dashUpdatedHint");
    window.GlsAlert.clearAlert(alertEl);
    if (btn) btn.disabled = true;
    try {
      const ping = await window.glsApi.app.ping();
      if (!ping?.ok) throw new Error("IPC de la aplicación no disponible");

      const hist = await window.glsApi.envios.listarHistorial({ estado: "Todos", limitCount: 2000 });
      if (!hist?.ok) throw new Error(hist?.error || "No se pudo cargar datos");

      const envios = hist.envios || [];
      const count = (estado) => envios.filter((e) => (e.estadoActual || "") === estado).length;

      animateCount(document.getElementById("kpiTotal"), envios.length);
      animateCount(document.getElementById("kpiRegistrado"), count("Registrado"));
      animateCount(document.getElementById("kpiTransito"), count("En tránsito"));
      animateCount(document.getElementById("kpiReparto"), count("En reparto"));
      animateCount(document.getElementById("kpiEntregados"), count("Entregado"));
      animateCount(document.getElementById("kpiObservados"), count("Observado"));
      animateCount(document.getElementById("kpiCancelados"), count("Cancelado"));
      renderActividadReciente(envios);
      renderDashboardCharts(envios);
      renderTopClientes(envios);
      renderOpsSummary(envios);
      renderChartSemanal(envios);

      if (hint) hint.textContent = `Actualizado ${new Date().toLocaleString("es-PE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
    } catch (e) {
      window.GlsAlert.showAlert(alertEl, { type: "error", message: `Error cargando panel: ${e?.message || e}` });
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  appEl.innerHTML = `
    ${window.GlsMenu.renderMenu("dashboard")}
    <main class="main">
      ${window.GlsPageChrome.renderTopbar()}
      <div class="content">
      <div class="page-head">
        <div>
          <div class="page-title">Dashboard</div>
          <div class="page-subtitle">Indicadores en vivo desde Firestore. Pulse un KPI para ver el listado filtrado en historial.</div>
          <div class="muted dash-updated-hint" id="dashUpdatedHint"></div>
        </div>
        <div class="actions">
          <button type="button" class="btn btn-icon" id="btnDashRefresh" title="Actualizar indicadores">
            <span class="ico">${ICONS.refresh}</span>Actualizar
          </button>
          <a class="btn btn-primary btn-icon" href="./registro-envio.html"><span class="ico">${ICONS.box}</span>Registrar envío</a>
          <a class="btn btn-icon" href="./seguimiento-envio.html"><span class="ico">${ICONS.truck}</span>Buscar envío</a>
        </div>
      </div>
      <div id="alert"></div>
        <div class="grid grid-4 u-mt-sm">
        <a class="card kpi kpi-accent kpi-dash-link" href="${historialUrlPorEstado("Todos")}" title="Ver todos en historial">
          <div>
            <div class="num" id="kpiTotal">—</div>
            <div class="label">Total de envíos</div>
          </div>
          <div class="ico" aria-hidden="true">${ICONS.box}</div>
        </a>
        <a class="card kpi kpi-dash-link" href="${historialUrlPorEstado("Registrado")}" title="Filtrar: Registrado">
          <div>
            <div class="num" id="kpiRegistrado">—</div>
            <div class="label">Registrados</div>
          </div>
          <div class="ico" aria-hidden="true">${ICONS.box}</div>
        </a>
        <a class="card kpi kpi-warn kpi-dash-link" href="${historialUrlPorEstado("En tránsito")}" title="Filtrar: En tránsito">
          <div>
            <div class="num" id="kpiTransito">—</div>
            <div class="label">En tránsito</div>
          </div>
          <div class="ico" aria-hidden="true">${ICONS.truck}</div>
        </a>
        <a class="card kpi kpi-warn kpi-dash-link" href="${historialUrlPorEstado("En reparto")}" title="Filtrar: En reparto">
          <div>
            <div class="num" id="kpiReparto">—</div>
            <div class="label">En reparto</div>
          </div>
          <div class="ico" aria-hidden="true">${ICONS.truck}</div>
        </a>
      </div>
      <div class="grid grid-3 u-mt-sm">
        <a class="card kpi kpi-ok kpi-dash-link" href="${historialUrlPorEstado("Entregado")}" title="Filtrar: Entregado">
          <div>
            <div class="num" id="kpiEntregados">—</div>
            <div class="label">Entregados</div>
          </div>
          <div class="ico" aria-hidden="true">${ICONS.qr}</div>
        </a>
        <a class="card kpi kpi-danger kpi-dash-link" href="${historialUrlPorEstado("Observado")}" title="Filtrar: Observado">
          <div>
            <div class="num" id="kpiObservados">—</div>
            <div class="label">Observados</div>
          </div>
          <div class="ico" aria-hidden="true">${ICONS.mapPin}</div>
        </a>
        <a class="card kpi kpi-danger kpi-dash-link" href="${historialUrlPorEstado("Cancelado")}" title="Filtrar: Cancelado">
          <div>
            <div class="num" id="kpiCancelados">—</div>
            <div class="label">Cancelados</div>
          </div>
          <div class="ico" aria-hidden="true">${ICONS.ban}</div>
        </a>
      </div>
      <div class="grid grid-3 u-mt-sm dash-charts-grid">
        <div class="card dash-chart-card">
          <div class="card-title">Estados de envíos</div>
          <canvas id="dashChartEstados" class="dash-chart-canvas"></canvas>
        </div>
        <div class="card dash-chart-card">
          <div class="card-title">Envíos por mes</div>
          <canvas id="dashChartMes" class="dash-chart-canvas"></canvas>
        </div>
        <div class="card dash-chart-card">
          <div class="card-title">Entregados vs observados</div>
          <canvas id="dashChartEntObs" class="dash-chart-canvas"></canvas>
        </div>
      </div>
      <div class="grid grid-2 u-mt-sm">
        <div class="card">
          <div class="card-title">Top clientes</div>
          <div class="card-subtitle">Por volumen de envíos registrados.</div>
          <ul class="dash-top-list" id="dashTopClientes"><li class="muted">Cargando…</li></ul>
        </div>
        <div class="card dash-chart-card">
          <div class="card-title">Tendencia semanal</div>
          <canvas id="dashChartSemana" class="dash-chart-canvas"></canvas>
        </div>
      </div>
      <div class="card u-mt-sm dash-ops-card">
        <div class="card-title">Resumen operativo</div>
        <div class="dash-ops-grid" id="dashOpsGrid"></div>
      </div>
      <div class="grid u-mt-sm">
        <div class="card dash-quick-card">
            <div class="card-title">Accesos rápidos</div>
            <div class="card-subtitle">Registro, trazabilidad, mapa y historial.</div>
            <div class="actions">
              <a class="btn btn-primary btn-icon" href="./registro-envio.html"><span class="ico">${ICONS.box}</span>Registro de envíos</a>
              <a class="btn btn-icon" href="./seguimiento-envio.html"><span class="ico">${ICONS.truck}</span>Seguimiento / trazabilidad</a>
              <a class="btn btn-icon" href="./geolocalizacion-qr.html"><span class="ico">${ICONS.mapPin}</span>Geolocalización + QR</a>
              <a class="btn btn-icon" href="./historial.html"><span class="ico">${ICONS.box}</span>Historial general</a>
              <a class="btn btn-icon" href="./reportes.html"><span class="ico">${ICONS.qr}</span>Reportes</a>
            </div>
          </div>
      </div>
      <div class="card dash-recent-card u-mt-sm">
        <div class="card-title">Últimos envíos registrados · actividad reciente</div>
        <div class="card-subtitle">Orden por fecha de registro. Clic para abrir trazabilidad con el código cargado.</div>
        <ul class="dash-recent-list" id="dashRecentList">
          <li class="dash-recent-empty muted">Cargando…</li>
        </ul>
      </div>
      </div>
    </main>
  `;

  window.GlsAuthGuard?.requireAuthOrRedirect?.().then(() => window.GlsMenu?.mountAuthMenu?.());

  const alertEl = document.getElementById("alert");
  window.GlsAlert.clearAlert(alertEl);

  document.getElementById("btnDashRefresh")?.addEventListener("click", () => {
    void cargarPanel();
  });

  void cargarPanel();
})();

