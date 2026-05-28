/**
 * Comprobante corporativo GLS — HTML (imprimir) y utilidades compartidas.
 * Mismo diseño en registro, consulta, seguimiento e historial.
 */
(function () {
  "use strict";

  const LOGO_SRC = "../assets/img/logo.png";

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function qrImgSrc(codigo) {
    const c = String(codigo || "").trim();
    return c ? `../assets/qr/${encodeURIComponent(c)}.png` : "";
  }

  function logoImgSrc() {
    return LOGO_SRC;
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

  async function resolveComprobanteAssets({ codigo, imgSrc }) {
    const qrPath = imgSrc || qrImgSrc(codigo);
    const [logoData, qrData] = await Promise.all([
      loadImageAsDataUrl(LOGO_SRC),
      qrPath ? loadImageAsDataUrl(qrPath) : Promise.resolve("")
    ]);
    return {
      logoSrc: logoData || LOGO_SRC,
      imgSrc: qrData || qrPath || ""
    };
  }

  async function buildComprobanteHtmlDocumentAsync(opts) {
    const assets = await resolveComprobanteAssets(opts);
    return buildComprobanteHtmlDocument({
      ...opts,
      logoSrc: assets.logoSrc,
      imgSrc: assets.imgSrc
    });
  }

  function buildHistorialResumenHtml(historial) {
    const esc = escapeHtml;
    const rows = [...(historial || [])]
      .sort((a, b) => Date.parse(b.fechaActualizacion || 0) - Date.parse(a.fechaActualizacion || 0))
      .slice(0, 8);
    if (!rows.length) {
      return `<p class="cmp-muted">Sin eventos en historial.</p>`;
    }
    const tr = rows
      .map(
        (h) => `<tr>
        <td class="mono">${esc(h.fechaActualizacion || "—")}</td>
        <td><b>${esc(h.estado || "—")}</b></td>
        <td>${esc((h.observacion || "").slice(0, 120))}${(h.observacion || "").length > 120 ? "…" : ""}</td>
      </tr>`
      )
      .join("");
    return `<table class="cmp-table cmp-table--hist">
      <tr><td>Fecha</td><td>Estado</td><td>Observación</td></tr>
      ${tr}
    </table>`;
  }

  function buildComprobanteHtmlDocument({ codigo, envio, imgSrc, historial, logoSrc }) {
    const esc = escapeHtml;
    const e = envio || {};
    const ce = e.cotizacionEstimada;
    const d = ce?.desglose;
    const dim = e.dimensiones || {};
    const dimTxt = `${esc(String(dim.largo ?? "—"))} × ${esc(String(dim.ancho ?? "—"))} × ${esc(String(dim.alto ?? "—"))} ${esc(dim.unidadMedida || "")}`.trim();
    const estado = e.estadoActual || "Registrado";
    const ultAct = e.fechaUltimaActualizacion || e.fechaRegistro || "";

    const cotBlock =
      ce && d
        ? `<div class="cmp-section">
          <div class="cmp-section-title">Cotización estimada</div>
          <table class="cmp-table">
            <tr><td>Total estimado</td><td><strong>${esc(String(d.totalEstimado))} ${esc(ce.moneda || "")}</strong></td></tr>
            <tr><td>Subtotal</td><td>${esc(String(d.subtotal))} ${esc(ce.moneda || "")}</td></tr>
            <tr><td>Seguro</td><td>${esc(String(d.seguroMonto))} (${esc(String(d.seguroPorcentaje))}%)</td></tr>
          </table>
        </div>`
        : `<div class="cmp-section">
          <div class="cmp-section-title">Cotización estimada</div>
          <p class="cmp-muted">Sin cotización calculada al registrar.</p>
        </div>`;

    const cliBlock =
      e.clienteAsociado && (e.clienteAsociado.nombres || e.clienteAsociado.documento)
        ? `<div class="cmp-section">
          <div class="cmp-section-title">Cliente catálogo</div>
          <p>${esc(e.clienteAsociado.nombres || "")} · <span class="mono">${esc(e.clienteAsociado.documento || "")}</span></p>
        </div>`
        : "";

    const ee = e.evidenciaEntrega;
    const evidBlock =
      ee && ((ee.referencia || "").trim() || (ee.detalle || "").trim())
        ? `<div class="cmp-section">
          <div class="cmp-section-title">Evidencia de entrega</div>
          <table class="cmp-table">
            <tr><td>Referencia</td><td><b>${esc((ee.referencia || "").trim() || "—")}</b></td></tr>
            ${(ee.detalle || "").trim() ? `<tr><td>Detalle</td><td>${esc(ee.detalle)}</td></tr>` : ""}
            <tr><td>Fecha</td><td class="mono">${esc(ee.fecha || "")}</td></tr>
          </table>
        </div>`
        : "";

    const histBlock =
      historial && historial.length
        ? `<div class="cmp-section">
          <div class="cmp-section-title">Historial de estados (resumen)</div>
          ${buildHistorialResumenHtml(historial)}
        </div>`
        : "";

    const qrBlock = imgSrc
      ? `<div class="cmp-section cmp-qr"><div class="cmp-section-title">Código QR</div><img src="${esc(imgSrc)}" alt="QR" crossorigin="anonymous" /></div>`
      : `<div class="cmp-section"><div class="cmp-muted">QR no disponible.</div></div>`;

    const logo = logoSrc || LOGO_SRC;
    const logoBlock = `<img class="cmp-logo" src="${esc(logo)}" alt="Grupo Logístico Salazar" crossorigin="anonymous" />`;

    return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Comprobante ${esc(codigo)}</title>
<style>
  :root { --cmp-primary:#7a2828; --cmp-accent:#f57c00; --cmp-border:#e2e8f0; --cmp-muted:#64748b; }
  *{box-sizing:border-box}
  body{font-family:'Segoe UI',system-ui,sans-serif;margin:0;padding:0;background:#f8fafc;color:#0f172a}
  .cmp-wrap{max-width:720px;margin:0 auto;padding:28px 24px 40px;background:#fff;min-height:100vh}
  .cmp-top{border-bottom:4px solid var(--cmp-accent);padding-bottom:16px;margin-bottom:20px}
  .cmp-header-row{display:flex;align-items:center;gap:18px}
  .cmp-logo{width:80px;height:80px;object-fit:contain;flex-shrink:0}
  .cmp-header-text{flex:1;min-width:0}
  .cmp-brand{font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--cmp-muted);font-weight:700}
  .cmp-empresa{font-size:20px;font-weight:800;color:var(--cmp-primary);margin:6px 0 2px}
  .cmp-doc-title{font-size:15px;color:var(--cmp-accent);font-weight:800}
  .cmp-code{font-size:22px;font-weight:900;color:var(--cmp-primary);letter-spacing:.04em;margin:18px 0 4px}
  .cmp-meta{font-size:13px;color:var(--cmp-muted);line-height:1.5}
  .cmp-estado{display:inline-block;margin-top:6px;padding:4px 10px;border-radius:6px;background:#dbeafe;color:#1e40af;font-weight:700;font-size:13px}
  .cmp-section{border:1px solid var(--cmp-border);border-radius:12px;padding:14px 16px;margin-top:14px;background:#fff}
  .cmp-section-title{font-size:12px;font-weight:800;color:var(--cmp-primary);text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px;border-bottom:1px solid var(--cmp-border);padding-bottom:6px}
  .cmp-table{width:100%;border-collapse:collapse;font-size:13px}
  .cmp-table td{padding:8px 0;border-bottom:1px solid var(--cmp-border);vertical-align:top}
  .cmp-table td:first-child{width:38%;color:var(--cmp-muted);font-weight:600}
  .cmp-table--hist tr:first-child td{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--cmp-primary)}
  .cmp-muted{color:var(--cmp-muted);font-size:13px}
  .cmp-qr{text-align:center}
  .cmp-qr img{width:200px;height:200px}
  .mono{font-family:ui-monospace,Menlo,monospace}
  .cmp-footer{margin-top:28px;padding-top:14px;border-top:1px solid var(--cmp-border);font-size:11px;color:var(--cmp-muted);text-align:center;line-height:1.5}
  @media print{body{background:#fff}.cmp-wrap{max-width:none;padding:0}}
</style></head><body>
  <div class="cmp-wrap">
    <header class="cmp-top">
      <div class="cmp-header-row">
        ${logoBlock}
        <div class="cmp-header-text">
          <div class="cmp-brand">Grupo Logístico Salazar</div>
          <div class="cmp-empresa">GRUPO LOGÍSTICO SALAZAR S.A.C.</div>
          <div class="cmp-doc-title">Comprobante de Registro de Envío</div>
        </div>
      </div>
    </header>
    <div class="cmp-code mono">${esc(codigo)}</div>
    <p class="cmp-meta">
      <span class="cmp-estado">Estado actual: ${esc(estado)}</span><br/>
      ${e.fechaRegistro ? `<strong>Fecha de registro:</strong> <span class="mono">${esc(e.fechaRegistro)}</span><br/>` : ""}
      ${ultAct ? `<strong>Última actualización:</strong> <span class="mono">${esc(ultAct)}</span>` : ""}
    </p>

    <div class="cmp-section">
      <div class="cmp-section-title">Datos del remitente</div>
      <table class="cmp-table">
        <tr><td>Nombres</td><td>${esc(e.remitente?.nombres || "—")}</td></tr>
        <tr><td>Documento</td><td class="mono">${esc(e.remitente?.documento || "—")}</td></tr>
        <tr><td>Teléfono</td><td>${esc(e.remitente?.telefono || "—")}</td></tr>
        <tr><td>Dirección</td><td>${esc(e.remitente?.direccion || "—")}</td></tr>
      </table>
    </div>

    <div class="cmp-section">
      <div class="cmp-section-title">Datos del destinatario</div>
      <table class="cmp-table">
        <tr><td>Nombres</td><td>${esc(e.destinatario?.nombres || "—")}</td></tr>
        <tr><td>Documento</td><td class="mono">${esc(e.destinatario?.documento || "—")}</td></tr>
        <tr><td>Teléfono</td><td>${esc(e.destinatario?.telefono || "—")}</td></tr>
        <tr><td>Dirección</td><td>${esc(e.destinatario?.direccion || "—")}</td></tr>
      </table>
    </div>

    <div class="cmp-section">
      <div class="cmp-section-title">Datos del envío</div>
      <table class="cmp-table">
        <tr><td>Origen</td><td>${esc(e.origen || "—")}</td></tr>
        <tr><td>Destino</td><td>${esc(e.destino || "—")}</td></tr>
        <tr><td>Tipo de carga</td><td>${esc(e.tipoCarga || "—")}</td></tr>
        <tr><td>Descripción</td><td>${esc(e.descripcion || "—")}</td></tr>
        <tr><td>Peso</td><td><strong>${esc(String(e.peso ?? "—"))}</strong> kg</td></tr>
        <tr><td>Dimensiones</td><td>${dimTxt}</td></tr>
      </table>
    </div>
    ${cliBlock}
    ${cotBlock}
    ${evidBlock}
    ${histBlock}
    ${qrBlock}
    <footer class="cmp-footer">Documento generado por el Sistema de Información para el Seguimiento y Trazabilidad de Envíos — GLS.</footer>
  </div>
</body></html>`;
  }

  async function printComprobante({ codigo, envio, imgSrc, historial, alertEl }) {
    let html;
    try {
      html = await buildComprobanteHtmlDocumentAsync({ codigo, envio, imgSrc, historial });
    } catch (e) {
      if (alertEl && window.GlsAlert?.showAlert) {
        window.GlsAlert.showAlert(alertEl, {
          type: "error",
          message: e?.message || "No se pudo preparar el comprobante."
        });
      }
      return;
    }
    const w = window.open("", "_blank");
    if (!w) {
      if (alertEl && window.GlsAlert?.showAlert) {
        window.GlsAlert.showAlert(alertEl, {
          type: "info",
          message: "Permite ventanas emergentes para imprimir el comprobante."
        });
      }
      return;
    }
    w.document.write(html);
    w.document.close();
    const doPrint = () => {
      try {
        w.focus();
        w.print();
      } finally {
        setTimeout(() => w.close(), 300);
      }
    };
    if (w.document.readyState === "complete") doPrint();
    else w.onload = doPrint;
  }

  function renderComprobanteActionsHtml(extraButtonsHtml = "") {
    return `<div class="actions cmp-export-actions" style="gap:10px;flex-wrap:wrap;margin-top:12px">
      <button type="button" class="btn btn-accent" data-gls-cmp-print>Imprimir comprobante</button>
      <button type="button" class="btn btn-accent" data-gls-cmp-export>Exportar PDF</button>
      ${extraButtonsHtml || ""}
    </div>`;
  }

  function bindComprobanteActions(root, { codigo, envio, historial, alertEl, extraButtonsHtml }) {
    if (!root) return;
    root.innerHTML = renderComprobanteActionsHtml(extraButtonsHtml);
    const imgSrc = qrImgSrc(codigo);
    root.querySelector("[data-gls-cmp-print]")?.addEventListener("click", () => {
      void printComprobante({ codigo, envio, imgSrc, historial, alertEl });
    });
    root.querySelector("[data-gls-cmp-export]")?.addEventListener("click", () => {
      if (!window.GlsComprobanteEnvioPdf?.exportComprobantePdf) {
        if (alertEl && window.GlsAlert?.showAlert) {
          window.GlsAlert.showAlert(alertEl, {
            type: "info",
            message: "No se cargó el módulo de PDF (comprobante-envio-pdf.js)."
          });
        }
        return;
      }
      void window.GlsComprobanteEnvioPdf.exportComprobantePdf({
        codigo,
        envio,
        historial,
        imgSrc,
        alertEl
      });
    });
  }

  window.GlsComprobanteEnvio = {
    escapeHtml,
    qrImgSrc,
    logoImgSrc,
    loadImageAsDataUrl,
    resolveComprobanteAssets,
    buildComprobanteHtmlDocument,
    buildComprobanteHtmlDocumentAsync,
    buildHistorialResumenHtml,
    printComprobante,
    renderComprobanteActionsHtml,
    bindComprobanteActions
  };
})();
