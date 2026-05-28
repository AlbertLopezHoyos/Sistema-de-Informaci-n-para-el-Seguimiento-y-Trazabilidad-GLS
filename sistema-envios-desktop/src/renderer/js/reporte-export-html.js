/**
 * Reporte corporativo GLS — HTML para exportar PDF (mismo motor que comprobante).
 */
(function () {
  "use strict";

  const LOGO_SRC = "../assets/img/logo.png";
  const PDF_TABLE_MAX_ROWS = 200;
  /** Mismos colores que reportes.js (Chart.js) */
  const CHART_COLORS = ["#2563eb", "#ca8a04", "#f57c00", "#ea580c", "#16a34a", "#dc2626", "#64748b"];

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function loadImageAsDataUrl(src) {
    return new Promise((resolve) => {
      if (!src) {
        resolve("");
        return;
      }
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const c = document.createElement("canvas");
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          const ctx = c.getContext("2d");
          if (!ctx) {
            resolve("");
            return;
          }
          ctx.drawImage(img, 0, 0);
          resolve(c.toDataURL("image/png"));
        } catch {
          resolve("");
        }
      };
      img.onerror = () => resolve("");
      try {
        img.src = new URL(src, window.location.href).href;
      } catch {
        img.src = src;
      }
    });
  }

  function buildEstadoLegendHtml(porEstado, total) {
    const esc = escapeHtml;
    const items = porEstado || [];
    if (!items.length) return `<p class="chart-legend-empty">Sin datos por estado.</p>`;
    const sum = total || items.reduce((a, x) => a + (x.total || 0), 0);
    return `<ul class="chart-legend">${items
      .map((x, i) => {
        const n = x.total || 0;
        const pct = sum ? Math.round((n / sum) * 100) : 0;
        const color = CHART_COLORS[i % CHART_COLORS.length];
        return `<li>
          <span class="swatch" style="background:${color}"></span>
          <span class="lbl">${esc(x.estado)}</span>
          <span class="nums"><b>${esc(String(n))}</b> <span class="pct">(${esc(String(pct))}%)</span></span>
        </li>`;
      })
      .join("")}</ul>`;
  }

  function buildMesLegendHtml(porMes) {
    const esc = escapeHtml;
    const items = porMes || [];
    if (!items.length) return `<p class="chart-legend-empty">Sin datos por mes.</p>`;
    return `<ul class="chart-legend">${items
      .map((x, i) => {
        const color = CHART_COLORS[i % CHART_COLORS.length];
        return `<li>
          <span class="swatch" style="background:${color}"></span>
          <span class="lbl mono">${esc(x.mes)}</span>
          <span class="nums"><b>${esc(String(x.total))}</b> <span class="pct">envíos</span></span>
        </li>`;
      })
      .join("")}</ul>`;
  }

  function chartPanelHtml(title, imgSrc, legendHtml) {
    const esc = escapeHtml;
    if (!imgSrc && !legendHtml) return "";
    return `<div class="rep-pdf-chart">
      <div class="rep-pdf-chart-title">${esc(title)}</div>
      <div class="rep-pdf-chart-body">
        ${imgSrc ? `<div class="rep-pdf-chart-img-wrap"><img src="${esc(imgSrc)}" alt="${esc(title)}" /></div>` : ""}
        <div class="rep-pdf-chart-data">
          <div class="rep-pdf-chart-data-title">Leyenda</div>
          ${legendHtml || ""}
        </div>
      </div>
    </div>`;
  }

  function filtrosTexto(filtros) {
    const f = filtros || {};
    const parts = [];
    parts.push(`Estado: ${f.estado || "Todos"}`);
    if (f.desde) parts.push(`Desde: ${f.desde}`);
    if (f.hasta) parts.push(`Hasta: ${f.hasta}`);
    if ((f.cliente || "").trim()) parts.push(`Cliente: ${f.cliente.trim()}`);
    return parts.join(" · ");
  }

  function buildReporteHtmlDocument({
    filtros,
    resumen,
    envios,
    chartEstadosImg,
    chartMesImg,
    logoSrc
  }) {
    const esc = escapeHtml;
    const kpis = resumen?.kpis || {};
    const total = resumen?.total ?? (envios || []).length;
    const rows = (envios || []).slice(0, PDF_TABLE_MAX_ROWS);
    const rest = Math.max(0, (envios || []).length - PDF_TABLE_MAX_ROWS);

    const kpiHtml = `
      <div class="rep-pdf-kpis">
        <div class="rep-pdf-kpi"><div class="lbl">Tiempo prom. entrega</div><div class="val">${
          kpis.tiempoPromedioEntregaDias != null ? `${esc(String(kpis.tiempoPromedioEntregaDias))} d` : "—"
        }</div></div>
        <div class="rep-pdf-kpi"><div class="lbl">% Entregados</div><div class="val">${esc(String(kpis.porcentajeEntregados ?? 0))}%</div></div>
        <div class="rep-pdf-kpi"><div class="lbl">% Observados</div><div class="val">${esc(String(kpis.porcentajeObservados ?? 0))}%</div></div>
        <div class="rep-pdf-kpi"><div class="lbl">Eficiencia</div><div class="val">${esc(String(kpis.eficienciaOperativa ?? 0))}%</div></div>
        <div class="rep-pdf-kpi"><div class="lbl">Top cliente</div><div class="val sm">${esc(
          kpis.topClientes?.[0]?.nombre || "—"
        )}</div></div>
      </div>`;

    const estadoLegend = buildEstadoLegendHtml(resumen?.porEstado, total);
    const mesLegend = buildMesLegendHtml(resumen?.porMes);
    const chartPanels = [
      chartPanelHtml("Por estado", chartEstadosImg, estadoLegend),
      chartPanelHtml("Envíos por mes", chartMesImg, mesLegend)
    ].filter(Boolean);
    const chartRow = chartPanels.length
      ? `<div class="rep-pdf-charts">${chartPanels.join("")}</div>`
      : "";

    const porEstado = (resumen?.porEstado || [])
      .map((x) => `<tr><td>${esc(x.estado)}</td><td class="num">${esc(String(x.total))}</td></tr>`)
      .join("");

    const tblRows = rows
      .map(
        (e) => `<tr>
        <td class="mono"><b>${esc(e.codigoEnvio || "")}</b></td>
        <td>${esc(e.estadoActual || "")}</td>
        <td>${esc(e.origen || "")}</td>
        <td>${esc(e.destino || "")}</td>
        <td class="mono">${esc(e.fechaRegistro || "")}</td>
      </tr>`
      )
      .join("");

    const logo = logoSrc || LOGO_SRC;

    return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Reporte de envíos GLS</title>
<style>
  :root { --p:#7a2828; --a:#f57c00; --border:#e2e8f0; --muted:#64748b; }
  *{box-sizing:border-box}
  body{font-family:'Segoe UI',system-ui,sans-serif;margin:0;padding:0;background:#fff;color:#0f172a;font-size:13px}
  .wrap{max-width:100%;width:100%;margin:0 auto;padding:20px 24px 32px}
  .top{border-bottom:4px solid var(--a);padding-bottom:14px;margin-bottom:18px}
  .header-row{display:flex;align-items:center;gap:16px}
  .logo{width:72px;height:72px;object-fit:contain;flex-shrink:0}
  .brand{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted);font-weight:700}
  .empresa{font-size:18px;font-weight:800;color:var(--p);margin:4px 0}
  .doc-title{font-size:14px;color:var(--a);font-weight:800}
  .meta{color:var(--muted);font-size:12px;line-height:1.55;margin:12px 0 16px}
  .meta strong{color:#334155}
  .rep-pdf-kpis{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:16px}
  .rep-pdf-kpi{border:1px solid var(--border);border-radius:8px;padding:10px;background:#fafafa}
  .rep-pdf-kpi .lbl{font-size:10px;color:var(--muted);margin-bottom:4px}
  .rep-pdf-kpi .val{font-size:16px;font-weight:800;color:var(--p)}
  .rep-pdf-kpi .val.sm{font-size:11px;font-weight:700;line-height:1.3}
  .rep-pdf-charts{display:flex;flex-direction:column;gap:22px;margin-bottom:22px;width:100%}
  .rep-pdf-chart{border:1px solid var(--border);border-radius:12px;padding:16px 18px;width:100%;page-break-inside:avoid}
  .rep-pdf-chart-title{font-size:13px;font-weight:800;color:var(--p);text-transform:uppercase;margin-bottom:12px;text-align:left;letter-spacing:.04em}
  .rep-pdf-chart-body{display:flex;align-items:stretch;gap:18px;width:100%}
  .rep-pdf-chart-img-wrap{flex:1 1 58%;min-width:0;text-align:center;background:#fafafa;border-radius:8px;padding:14px;display:flex;align-items:center;justify-content:center}
  .rep-pdf-chart-img-wrap img{width:100%;max-width:100%;height:auto;min-height:220px;max-height:300px;object-fit:contain;display:block}
  .rep-pdf-chart-data{flex:0 0 36%;min-width:200px;max-width:42%;border-left:2px solid var(--border);padding-left:16px;display:flex;flex-direction:column;justify-content:center}
  .rep-pdf-chart-data-title{font-size:10px;font-weight:800;color:var(--p);text-transform:uppercase;margin-bottom:12px;letter-spacing:.05em}
  .chart-legend{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
  .chart-legend li{display:flex;align-items:center;gap:10px;font-size:12px;line-height:1.45;padding:8px 10px;background:#f8fafc;border-radius:8px;border:1px solid var(--border)}
  .chart-legend .swatch{width:14px;height:14px;border-radius:4px;flex-shrink:0;border:1px solid rgba(0,0,0,.1)}
  .chart-legend .lbl{flex:1;min-width:0;font-weight:600}
  .chart-legend .nums{white-space:nowrap;font-size:12px}
  .chart-legend .nums b{font-size:13px;color:var(--p)}
  .chart-legend .pct{color:var(--muted);font-weight:600;font-size:11px}
  .chart-legend-empty{font-size:11px;color:var(--muted);margin:0}
  .section{border:1px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:14px}
  .section-title{font-size:11px;font-weight:800;color:var(--p);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px}
  table{width:100%;border-collapse:collapse}
  th,td{padding:7px 8px;border-bottom:1px solid var(--border);text-align:left;vertical-align:top}
  th{font-size:10px;text-transform:uppercase;color:var(--p);background:#f8fafc}
  td.num{text-align:right;font-weight:700}
  .mono{font-family:ui-monospace,Menlo,monospace}
  .note{font-size:11px;color:var(--muted);margin-top:8px}
  .footer{margin-top:20px;padding-top:12px;border-top:1px solid var(--border);font-size:10px;color:var(--muted);text-align:center}
  @media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<div class="wrap">
  <header class="top">
    <div class="header-row">
      <img class="logo" src="${esc(logo)}" alt="GLS" crossorigin="anonymous" />
      <div>
        <div class="brand">Grupo Logístico Salazar</div>
        <div class="empresa">GRUPO LOGÍSTICO SALAZAR S.A.C.</div>
        <div class="doc-title">Reporte de envíos</div>
      </div>
    </div>
  </header>
  <p class="meta">
    <strong>Generado:</strong> ${esc(new Date().toLocaleString("es-PE"))}<br/>
    <strong>Filtros:</strong> ${esc(filtrosTexto(filtros))}<br/>
    <strong>Total:</strong> ${esc(String(total))} envíos · Entregados: ${esc(String(resumen?.entregados ?? 0))} · Observados: ${esc(
      String(resumen?.observados ?? 0)
    )}
  </p>
  ${kpiHtml}
  ${chartRow}
  ${
    porEstado
      ? `<div class="section"><div class="section-title">Resumen por estado</div>
    <table><thead><tr><th>Estado</th><th>Cantidad</th></tr></thead><tbody>${porEstado}</tbody></table></div>`
      : ""
  }
  <div class="section">
    <div class="section-title">Detalle de envíos (${esc(String(rows.length))}${rest ? ` de ${esc(String(total))}` : ""})</div>
    <table>
      <thead><tr><th>Código</th><th>Estado</th><th>Origen</th><th>Destino</th><th>Registro</th></tr></thead>
      <tbody>${tblRows || `<tr><td colspan="5">Sin registros.</td></tr>`}</tbody>
    </table>
    ${rest ? `<p class="note">Se muestran ${PDF_TABLE_MAX_ROWS} de ${total} envíos. Use Exportar Excel para el listado completo.</p>` : ""}
  </div>
  <footer class="footer">Sistema de Información para el Seguimiento y Trazabilidad de Envíos — GLS</footer>
</div>
</body></html>`;
  }

  async function buildReporteHtmlDocumentAsync(opts) {
    const logoSrc = (await loadImageAsDataUrl(LOGO_SRC)) || LOGO_SRC;
    return buildReporteHtmlDocument({ ...opts, logoSrc });
  }

  window.GlsReporteExport = {
    buildReporteHtmlDocument,
    buildReporteHtmlDocumentAsync,
    buildEstadoLegendHtml,
    buildMesLegendHtml,
    filtrosTexto,
    CHART_COLORS,
    PDF_TABLE_MAX_ROWS
  };
})();
