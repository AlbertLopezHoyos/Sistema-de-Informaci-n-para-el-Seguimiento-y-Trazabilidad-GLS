const { parseDataUrl, validateFilename } = require("./uploadValidation");
const { isStorageConfigured } = require("../config/firebase.config");
const { uploadEvidenciaEntrega } = require("../modules/storage/evidencia.storage");
const { sanitizeFilename } = require("./sanitize");
const { nowIso } = require("./fechas");

/** Límite al guardar imagen en Firestore (plan sin Storage / fallback). */
const MAX_EVIDENCIA_BASE64_FIRESTORE = 200 * 1024;

function persistirEvidenciaBase64(dataUrl, originalFilename, avisoFallback) {
  const { buffer } = parseDataUrl(dataUrl);
  if (buffer.length > MAX_EVIDENCIA_BASE64_FIRESTORE) {
    throw new Error(
      `La imagen supera ${Math.round(MAX_EVIDENCIA_BASE64_FIRESTORE / 1024)} KB para guardado local. ` +
        "Use referencia textual o active Firebase Storage (plan Blaze)."
    );
  }
  const evidenciaNombreArchivo = sanitizeFilename(validateFilename(originalFilename));
  return {
    modo: "base64",
    evidenciaImagenBase64: dataUrl,
    evidenciaNombreArchivo,
    evidenciaFechaSubida: nowIso(),
    avisoFallback: avisoFallback || null
  };
}

/**
 * Persiste foto de entrega: Storage si está configurado; si no, base64 en Firestore (≤ 200 KB).
 * Si Storage falla, hace fallback automático a base64.
 */
async function persistirEvidenciaImagen(codigoEnvio, dataUrl, originalFilename) {
  const imgB64 = String(dataUrl || "").trim();
  if (!imgB64) return null;

  if (isStorageConfigured()) {
    try {
      const uploaded = await uploadEvidenciaEntrega(codigoEnvio, imgB64, originalFilename);
      return {
        modo: "storage",
        evidenciaImagenUrl: uploaded.evidenciaImagenUrl,
        evidenciaNombreArchivo: uploaded.nombreArchivo,
        evidenciaFechaSubida: uploaded.fechaSubida
      };
    } catch (err) {
      const fallback = persistirEvidenciaBase64(
        imgB64,
        originalFilename,
        err?.message || "Storage no disponible"
      );
      return fallback;
    }
  }

  return persistirEvidenciaBase64(imgB64, originalFilename, null);
}

function applyEvidenciaToHistorial(histo, evidencia) {
  if (!evidencia) return histo;
  if (evidencia.modo === "storage") {
    histo.evidenciaImagenUrl = evidencia.evidenciaImagenUrl;
    histo.evidenciaNombreArchivo = evidencia.evidenciaNombreArchivo;
    histo.evidenciaFechaSubida = evidencia.evidenciaFechaSubida;
  } else if (evidencia.modo === "base64") {
    histo.evidenciaImagenBase64 = evidencia.evidenciaImagenBase64;
    histo.evidenciaNombreArchivo = evidencia.evidenciaNombreArchivo;
    histo.evidenciaFechaSubida = evidencia.evidenciaFechaSubida;
    if (evidencia.avisoFallback) histo.evidenciaAvisoStorage = evidencia.avisoFallback;
  }
  return histo;
}

function evidenciaPatchForEnvio(evidencia) {
  if (!evidencia) return {};
  if (evidencia.modo === "storage") {
    return {
      evidenciaImagenUrl: evidencia.evidenciaImagenUrl,
      evidenciaNombreArchivo: evidencia.evidenciaNombreArchivo,
      evidenciaFechaSubida: evidencia.evidenciaFechaSubida
    };
  }
  if (evidencia.modo === "base64") {
    return {
      evidenciaImagenBase64: evidencia.evidenciaImagenBase64,
      evidenciaNombreArchivo: evidencia.evidenciaNombreArchivo,
      evidenciaFechaSubida: evidencia.evidenciaFechaSubida
    };
  }
  return {};
}

module.exports = {
  MAX_EVIDENCIA_BASE64_FIRESTORE,
  persistirEvidenciaImagen,
  persistirEvidenciaBase64,
  applyEvidenciaToHistorial,
  evidenciaPatchForEnvio
};
