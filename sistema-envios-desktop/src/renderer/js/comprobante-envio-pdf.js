(function () {
  "use strict";

  function showAlert(alertEl, payload) {
    if (alertEl && window.GlsAlert?.showAlert) window.GlsAlert.showAlert(alertEl, payload);
  }

  /** Exporta PDF con el mismo HTML que imprimir (logo, QR, secciones). */
  async function exportComprobantePdf({ codigo, envio, imgSrc, historial, alertEl }) {
    const build = window.GlsComprobanteEnvio?.buildComprobanteHtmlDocumentAsync;
    if (!build) {
      showAlert(alertEl, {
        type: "info",
        message: "No se cargó comprobante-envio-shared.js."
      });
      return;
    }
    if (!window.glsApi?.app?.exportHtmlToPdf) {
      showAlert(alertEl, {
        type: "info",
        message: "Exportación PDF no disponible (actualice la aplicación)."
      });
      return;
    }

    let html;
    try {
      html = await build({ codigo, envio, imgSrc, historial });
    } catch (e) {
      showAlert(alertEl, { type: "error", message: e?.message || "No se pudo generar el comprobante." });
      return;
    }

    const saveRes = await window.glsApi.app.exportHtmlToPdf({
      html,
      defaultFilename: `comprobante-${codigo || "envio"}.pdf`
    });
    if (saveRes?.canceled) return;
    if (!saveRes?.ok) {
      showAlert(alertEl, { type: "error", message: saveRes?.error || "No se pudo guardar el PDF." });
      return;
    }
    showAlert(alertEl, {
      type: "success",
      message: `PDF guardado: ${saveRes.filePath || "archivo generado"}`
    });
  }

  /** @deprecated Use exportComprobantePdf — mismo formato HTML unificado. */
  async function exportSeguimientoPdf(opts) {
    return exportComprobantePdf(opts);
  }

  /** Reexporta utilidad de imágenes por compatibilidad con código legado. */
  const loadImageAsDataUrl =
    window.GlsComprobanteEnvio?.loadImageAsDataUrl?.bind(window.GlsComprobanteEnvio) ||
    (() => Promise.resolve(""));

  window.GlsComprobanteEnvioPdf = { loadImageAsDataUrl, exportComprobantePdf, exportSeguimientoPdf };
})();
