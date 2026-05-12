(function () {
  "use strict";

  function showAlert(alertEl, payload) {
    if (alertEl && window.GlsAlert?.showAlert) window.GlsAlert.showAlert(alertEl, payload);
  }

  function loadImageAsDataUrl(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          const c = document.createElement("canvas");
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          const ctx = c.getContext("2d");
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0);
          resolve(c.toDataURL("image/png"));
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error("No se pudo cargar el QR"));
      try {
        img.src = new URL(src, window.location.href).href;
      } catch {
        img.src = src;
      }
    });
  }

  async function exportComprobantePdf({ codigo, envio, imgSrc, alertEl }) {
    const JsPDF = window.jspdf?.jsPDF;
    if (!JsPDF) {
      showAlert(alertEl, {
        type: "info",
        message: "No se cargó la librería jsPDF. Incluya jspdf.umd.min.js antes de este script en la página HTML."
      });
      return;
    }
    const e = envio || {};
    const dim = e.dimensiones || {};
    const doc = new JsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 48;
    let y = margin;
    const primary = [26, 54, 93];
    const accent = [192, 86, 33];
    const muted = [100, 116, 139];
    const lineH = 16;

    function addLine(text, opts = {}) {
      const size = opts.size || 11;
      const col = opts.color || [15, 23, 42];
      doc.setFontSize(size);
      doc.setTextColor(...col);
      const lines = doc.splitTextToSize(text, pageW - margin * 2);
      for (const ln of lines) {
        if (y > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          y = margin;
        }
        doc.text(ln, margin, y);
        y += lineH * (size / 11) * 0.85;
      }
    }

    doc.setFillColor(...primary);
    doc.rect(0, 0, pageW, 52, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.text("Grupo Logístico Salazar S.A.C.", margin, 28);
    doc.setFontSize(13);
    doc.text("Comprobante de Registro de Envío", margin, 44);
    doc.setTextColor(0, 0, 0);
    y = 68;

    addLine(`Código: ${codigo}`, { size: 14, color: primary });
    addLine(`Estado: ${e.estadoActual || "Registrado"}`, { size: 11 });
    if (e.fechaRegistro) addLine(`Fecha de registro: ${e.fechaRegistro}`, { size: 10, color: muted });

    y += 8;
    addLine("Datos del remitente", { size: 12, color: accent });
    addLine(`Nombres: ${e.remitente?.nombres || "-"}`, { size: 10 });
    addLine(`Documento: ${e.remitente?.documento || "-"}`, { size: 10 });
    addLine(`Teléfono: ${e.remitente?.telefono || "-"}`, { size: 10 });
    addLine(`Dirección: ${e.remitente?.direccion || "-"}`, { size: 10 });

    y += 6;
    addLine("Datos del destinatario", { size: 12, color: accent });
    addLine(`Nombres: ${e.destinatario?.nombres || "-"}`, { size: 10 });
    addLine(`Documento: ${e.destinatario?.documento || "-"}`, { size: 10 });
    addLine(`Teléfono: ${e.destinatario?.telefono || "-"}`, { size: 10 });
    addLine(`Dirección: ${e.destinatario?.direccion || "-"}`, { size: 10 });

    y += 6;
    addLine("Datos del envío", { size: 12, color: accent });
    addLine(`Origen: ${e.origen || "-"}`, { size: 10 });
    addLine(`Destino: ${e.destino || "-"}`, { size: 10 });
    addLine(`Tipo de carga: ${e.tipoCarga || "-"}`, { size: 10 });
    addLine(`Descripción: ${e.descripcion || "-"}`, { size: 10 });
    addLine(`Peso: ${e.peso ?? "-"} kg`, { size: 10 });
    addLine(
      `Dimensiones: ${dim.largo ?? "-"} x ${dim.ancho ?? "-"} x ${dim.alto ?? "-"} ${String(dim.unidadMedida || "").trim()}`.trim(),
      { size: 10 }
    );

    if (e.clienteAsociado?.nombres || e.clienteAsociado?.documento) {
      y += 6;
      addLine("Cliente catálogo", { size: 12, color: accent });
      addLine(`${e.clienteAsociado.nombres || ""} | ${e.clienteAsociado.documento || ""}`, { size: 10 });
    }

    const ce = e.cotizacionEstimada;
    const d = ce?.desglose;
    y += 6;
    addLine("Cotización estimada", { size: 12, color: accent });
    if (ce && d) {
      addLine(`Total estimado: ${d.totalEstimado} ${ce.moneda || ""}`, { size: 11, color: primary });
      addLine(`Subtotal: ${d.subtotal} | Seguro: ${d.seguroMonto} (${d.seguroPorcentaje}%)`, { size: 10, color: muted });
    } else {
      addLine("Sin cotización calculada al registrar.", { size: 10, color: muted });
    }

    if (imgSrc) {
      try {
        const dataUrl = await loadImageAsDataUrl(imgSrc);
        if (dataUrl) {
          y += 12;
          if (y > 650) {
            doc.addPage();
            y = margin;
          }
          addLine("Código QR", { size: 12, color: accent });
          doc.addImage(dataUrl, "PNG", margin, y, 120, 120);
          y += 130;
        }
      } catch {
        addLine("(QR no incluido en el PDF)", { size: 9, color: muted });
      }
    }

    y = Math.max(y, doc.internal.pageSize.getHeight() - 72);
    if (y > doc.internal.pageSize.getHeight() - 48) {
      doc.addPage();
      y = margin;
    }
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    const foot =
      "Documento generado por el Sistema de Información para el Seguimiento y Trazabilidad de Envíos.";
    doc.text(foot, margin, doc.internal.pageSize.getHeight() - 32, { maxWidth: pageW - margin * 2 });

    const dataUri = doc.output("datauristring");
    const base64Pdf = dataUri.split(",")[1];
    const saveRes = await window.glsApi.app.savePdfFile({
      defaultFilename: `comprobante-${codigo}.pdf`,
      base64Pdf
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

  window.GlsComprobanteEnvioPdf = { loadImageAsDataUrl, exportComprobantePdf };
})();
