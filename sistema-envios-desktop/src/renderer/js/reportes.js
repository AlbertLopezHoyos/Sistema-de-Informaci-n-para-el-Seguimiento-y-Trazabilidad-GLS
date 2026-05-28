(() => {
  const appEl = document.getElementById("app");
  let lastEnvios = [];
  let lastResumen = null;
  let lastFiltros = {};
  let chartEstados = null;
  let chartMes = null;

  const ESTADOS = [
    "Todos",
    "Registrado",
    "En almacén",
    "En tránsito",
    "En reparto",
    "Entregado",
    "Observado",
    "Cancelado"
  ];

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  appEl.innerHTML = `
    ${window.GlsMenu.renderMenu("reportes")}
    <main class="main">
      ${window.GlsPageChrome.renderTopbar({ headline: "Reportes", tagline: "Filtros y exportación corporativa", pill: "Reportes" })}
      <div class="content">
        <div id="alert"></div>
        <div class="rep-kpi-grid u-mb-md" id="repKpiGrid" style="display:none"></div>
        <div class="card">
          <div class="card-title">Filtros</div>
          <div class="form-row grid grid-4">
            <div class="field"><label>Estado</label>
              <select id="repEstado">${ESTADOS.map((e) => `<option>${escapeHtml(e)}</option>`).join("")}</select>
            </div>
            <div class="field"><label>Desde</label><input type="date" id="repDesde" /></div>
            <div class="field"><label>Hasta</label><input type="date" id="repHasta" /></div>
            <div class="field"><label>Cliente (texto)</label><input id="repCliente" placeholder="Nombre, documento, empresa" /></div>
          </div>
          <div class="actions u-mt-sm" style="flex-wrap:wrap">
            <button type="button" class="btn btn-primary" id="btnRepBuscar">Generar reporte</button>
            <button type="button" class="btn" id="btnRepCsv">Exportar CSV</button>
            <button type="button" class="btn" id="btnRepXlsx">Exportar Excel</button>
            <button type="button" class="btn btn-accent" id="btnRepPdf">Exportar PDF</button>
          </div>
        </div>
        <div class="rep-charts-stack u-mt-md">
          <div class="card dash-chart-card rep-chart-card-full">
            <div class="card-title">Por estado</div>
            <div class="rep-chart-row">
              <div class="rep-chart-wrap rep-chart-wrap--tall">
                <canvas id="repChartEstados" class="dash-chart-canvas" aria-label="Distribución por estado"></canvas>
              </div>
              <aside class="rep-chart-legend-panel" id="repLegendEstados" aria-label="Leyenda por estado"></aside>
            </div>
          </div>
          <div class="card dash-chart-card rep-chart-card-full">
            <div class="card-title">Envíos por mes</div>
            <div class="rep-chart-row">
              <div class="rep-chart-wrap rep-chart-wrap--tall">
                <canvas id="repChartMes" class="dash-chart-canvas" aria-label="Envíos por mes"></canvas>
              </div>
              <aside class="rep-chart-legend-panel" id="repLegendMes" aria-label="Leyenda por mes"></aside>
            </div>
          </div>
        </div>
        <div class="card u-mt-md">
          <div class="card-title">Resumen · <span id="repTotal" class="mono">0</span> envíos</div>
          <div class="muted u-mb-sm" id="repResumenLine"></div>
          <div class="table-scroll" style="max-height:400px">
            <table class="table">
              <thead><tr><th>Código</th><th>Estado</th><th>Origen</th><th>Destino</th><th>Registro</th></tr></thead>
              <tbody id="repTbl"><tr><td colspan="5" class="muted">Use filtros y pulse Generar reporte.</td></tr></tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  `;

  const alertEl = document.getElementById("alert");

  const CHART_BASE_OPTS = { responsive: true, maintainAspectRatio: false };
  const CHART_COLORS = ["#2563eb", "#ca8a04", "#f57c00", "#ea580c", "#16a34a", "#dc2626", "#64748b"];

  const pluginLinePointValues = {
    id: "glsLinePointValues",
    afterDatasetsDraw(chart) {
      if (chart.config.type !== "line") return;
      const { ctx } = chart;
      chart.data.datasets.forEach((dataset, di) => {
        chart.getDatasetMeta(di).data.forEach((point, i) => {
          const val = dataset.data[i];
          if (val == null) return;
          ctx.save();
          ctx.fillStyle = "#1e40af";
          ctx.font = "bold 10px Segoe UI, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(String(val), point.x, point.y - 10);
          ctx.restore();
        });
      });
    }
  };

  function renderScreenLegends(resumen) {
    const ex = window.GlsReporteExport;
    const total = resumen?.total ?? 0;
    const elEst = document.getElementById("repLegendEstados");
    const elMes = document.getElementById("repLegendMes");
    if (!ex) return;
    if (elEst) {
      elEst.innerHTML = `<div class="rep-chart-legend-title">Leyenda</div>${ex.buildEstadoLegendHtml(
        resumen?.porEstado,
        total
      )}`;
    }
    if (elMes) {
      elMes.innerHTML = `<div class="rep-chart-legend-title">Leyenda</div>${ex.buildMesLegendHtml(resumen?.porMes)}`;
    }
  }

  function renderCharts(resumen) {
    const Chart = window.Chart;
    if (!Chart) return;
    const colors = CHART_COLORS;
    const est = resumen?.porEstado || [];
    const mes = resumen?.porMes || [];
    const estLabels = est.length ? est.map((x) => x.estado) : ["Sin datos"];
    const estData = est.length ? est.map((x) => x.total) : [1];
    const estColors = est.length ? colors.slice(0, est.length) : ["#e2e8f0"];
    const mesLabels = mes.length ? mes.map((x) => x.mes) : ["—"];
    const mesData = mes.length ? mes.map((x) => x.total) : [0];

    const cEst = document.getElementById("repChartEstados");
    const cMes = document.getElementById("repChartMes");
    if (!cEst || !cMes) return;

    if (chartEstados) chartEstados.destroy();
    chartEstados = new Chart(cEst, {
      type: "doughnut",
      data: {
        labels: estLabels,
        datasets: [{ data: estData, backgroundColor: estColors, borderWidth: 1 }]
      },
      options: {
        ...CHART_BASE_OPTS,
        cutout: "58%",
        layout: { padding: { right: 8 } },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(ctx) {
                const v = ctx.parsed || 0;
                const sum = (ctx.dataset.data || []).reduce((a, b) => a + Number(b || 0), 0);
                const pct = sum ? Math.round((v / sum) * 100) : 0;
                return `${ctx.label}: ${v} (${pct}%)`;
              }
            }
          }
        }
      }
    });

    if (chartMes) chartMes.destroy();
    chartMes = new Chart(cMes, {
      type: "line",
      data: {
        labels: mesLabels,
        datasets: [
          {
            label: "Envíos",
            data: mesData,
            borderColor: "#2563eb",
            backgroundColor: "rgba(37,99,235,.12)",
            pointBackgroundColor: "#2563eb",
            pointRadius: mes.length > 1 ? 4 : 5,
            pointHoverRadius: 6,
            fill: true,
            tension: 0.3
          }
        ]
      },
      plugins: [pluginLinePointValues],
      options: {
        ...CHART_BASE_OPTS,
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(ctx) {
                return `${ctx.label}: ${ctx.parsed.y} envíos`;
              }
            }
          }
        }
      }
    });

    renderScreenLegends(resumen);
    requestAnimationFrame(() => {
      chartEstados?.resize();
      chartMes?.resize();
    });
  }

  function renderTable(envios) {
    const tb = document.getElementById("repTbl");
    if (!envios.length) {
      tb.innerHTML = `<tr><td colspan="5" class="muted">Sin resultados.</td></tr>`;
      return;
    }
    tb.innerHTML = envios
      .map(
        (e) => `<tr>
        <td class="mono"><b>${escapeHtml(e.codigoEnvio || "")}</b></td>
        <td>${window.GlsEstadoEnvio?.badgeHtml?.(e.estadoActual) || escapeHtml(e.estadoActual || "")}</td>
        <td>${escapeHtml(e.origen || "")}</td>
        <td>${escapeHtml(e.destino || "")}</td>
        <td class="mono">${escapeHtml(e.fechaRegistro || "")}</td>
      </tr>`
      )
      .join("");
  }

  async function generar() {
    window.GlsAlert.clearAlert(alertEl);
    const r = await window.glsApi.reportes.consultar({
      estado: document.getElementById("repEstado").value,
      desde: document.getElementById("repDesde").value,
      hasta: document.getElementById("repHasta").value,
      cliente: document.getElementById("repCliente").value,
      limitCount: 3000
    });
    if (!r?.ok) {
      window.GlsAlert.showAlert(alertEl, { type: "error", message: r?.error || "Error en reporte" });
      return;
    }
    lastEnvios = r.envios || [];
    lastResumen = r.resumen || null;
    lastFiltros = {
      estado: document.getElementById("repEstado").value,
      desde: document.getElementById("repDesde").value,
      hasta: document.getElementById("repHasta").value,
      cliente: document.getElementById("repCliente").value
    };
    document.getElementById("repTotal").textContent = String(r.resumen?.total ?? lastEnvios.length);
    const kpis = r.resumen?.kpis || {};
    document.getElementById("repResumenLine").textContent = `Entregados: ${r.resumen?.entregados ?? 0} · Observados: ${
      r.resumen?.observados ?? 0
    } · Eficiencia: ${kpis.eficienciaOperativa ?? 0}%`;
    const kpiEl = document.getElementById("repKpiGrid");
    if (kpiEl) {
      kpiEl.style.display = "grid";
      kpiEl.innerHTML = `
        <div class="rep-kpi"><div class="muted">Tiempo prom. entrega</div><div class="val">${
          kpis.tiempoPromedioEntregaDias != null ? `${kpis.tiempoPromedioEntregaDias} d` : "—"
        }</div></div>
        <div class="rep-kpi"><div class="muted">% Entregados</div><div class="val">${kpis.porcentajeEntregados ?? 0}%</div></div>
        <div class="rep-kpi"><div class="muted">% Observados</div><div class="val">${kpis.porcentajeObservados ?? 0}%</div></div>
        <div class="rep-kpi"><div class="muted">Eficiencia operativa</div><div class="val">${kpis.eficienciaOperativa ?? 0}%</div></div>
        <div class="rep-kpi"><div class="muted">Top cliente</div><div class="val" style="font-size:14px">${
          escapeHtml(kpis.topClientes?.[0]?.nombre || "—")
        }</div></div>
      `;
    }
    renderCharts(r.resumen);
    renderTable(lastEnvios);
  }

  function chartToDataUrl(chart, exportWidth = 720) {
    try {
      const canvas = chart?.canvas;
      if (!canvas?.width) return "";
      const srcW = canvas.width;
      const srcH = canvas.height;
      const w = exportWidth;
      const h = Math.max(280, Math.round((srcH / srcW) * w));
      const off = document.createElement("canvas");
      off.width = w;
      off.height = h;
      const ctx = off.getContext("2d");
      if (!ctx) return canvas.toDataURL("image/png", 1);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(canvas, 0, 0, w, h);
      return off.toDataURL("image/png", 1);
    } catch {
      return "";
    }
  }

  async function exportPdf() {
    if (!lastEnvios.length) {
      window.GlsAlert.showAlert(alertEl, { type: "warn", message: "Genere el reporte antes de exportar PDF." });
      return;
    }
    const build = window.GlsReporteExport?.buildReporteHtmlDocumentAsync;
    if (!build) {
      window.GlsAlert.showAlert(alertEl, {
        type: "error",
        message: "No se cargó el módulo de exportación (reporte-export-html.js)."
      });
      return;
    }
    if (!window.glsApi?.app?.exportHtmlToPdf) {
      window.GlsAlert.showAlert(alertEl, {
        type: "error",
        message: "Exportación PDF no disponible. Reinicie la aplicación."
      });
      return;
    }

    let html;
    try {
      html = await build({
        filtros: lastFiltros,
        resumen: lastResumen,
        envios: lastEnvios,
        chartEstadosImg: chartToDataUrl(chartEstados),
        chartMesImg: chartToDataUrl(chartMes)
      });
    } catch (e) {
      window.GlsAlert.showAlert(alertEl, { type: "error", message: e?.message || "No se pudo generar el reporte." });
      return;
    }

    const saveRes = await window.glsApi.app.exportHtmlToPdf({
      html,
      defaultFilename: `reporte-envios-${new Date().toISOString().slice(0, 10)}.pdf`
    });
    if (saveRes?.canceled) return;
    if (!saveRes?.ok) {
      window.GlsAlert.showAlert(alertEl, { type: "error", message: saveRes?.error || "No se pudo guardar el PDF." });
      return;
    }
    window.GlsAlert.showAlert(alertEl, {
      type: "success",
      message: `PDF guardado: ${saveRes.filePath || "archivo generado"}`
    });
  }

  document.getElementById("btnRepBuscar")?.addEventListener("click", () => void generar());
  function reporteExportMeta() {
    const filtersLine = window.GlsReporteExport?.filtrosTexto
      ? `Filtros: ${window.GlsReporteExport.filtrosTexto(lastFiltros)}`
      : "";
    return {
      reportTitle: "Reporte de envíos",
      filtersLine,
      sheetName: "Reporte",
      total: lastEnvios.length
    };
  }

  document.getElementById("btnRepCsv")?.addEventListener("click", async () => {
    try {
      if (!lastEnvios.length) await generar();
      const r = await window.GlsExportTabular.exportEnviosList(
        lastEnvios,
        "csv",
        `reporte-envios-${new Date().toISOString().slice(0, 10)}.csv`,
        reporteExportMeta()
      );
      if (r?.ok && !r.canceled) window.GlsAlert.showAlert(alertEl, { type: "success", message: "CSV guardado." });
    } catch (e) {
      window.GlsAlert.showAlert(alertEl, { type: "error", message: e?.message || String(e) });
    }
  });
  document.getElementById("btnRepXlsx")?.addEventListener("click", async () => {
    try {
      if (!lastEnvios.length) await generar();
      const r = await window.GlsExportTabular.exportEnviosList(
        lastEnvios,
        "xlsx",
        `reporte-envios-${new Date().toISOString().slice(0, 10)}.xlsx`,
        reporteExportMeta()
      );
      if (r?.ok && !r.canceled) window.GlsAlert.showAlert(alertEl, { type: "success", message: "Excel guardado." });
    } catch (e) {
      window.GlsAlert.showAlert(alertEl, { type: "error", message: e?.message || String(e) });
    }
  });
  document.getElementById("btnRepPdf")?.addEventListener("click", async () => {
    try {
      if (!lastEnvios.length) await generar();
      await exportPdf();
    } catch (e) {
      window.GlsAlert.showAlert(alertEl, { type: "error", message: e?.message || String(e) });
    }
  });

  window.GlsAuthGuard?.requireAuthOrRedirect?.().then(() => window.GlsMenu?.mountAuthMenu?.());
})();
