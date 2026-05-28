const { estadosPermitidos } = require("../../config/app.config");
const { getDb, runTransaction, doc } = require("../../config/firebase.config");
const { nowIso } = require("../../utils/fechas");
const { buildActualizacionEstado } = require("./trazabilidad.model");
const {
  persistirEvidenciaImagen,
  applyEvidenciaToHistorial,
  evidenciaPatchForEnvio
} = require("../../utils/evidenciaEntrega");
const repo = require("./trazabilidad.repository");

async function buscar(codigoEnvio) {
  const envio = await repo.getEnvioByCodigo(codigoEnvio);
  if (!envio) return { ok: false, error: "Envío no encontrado" };
  const historial = await repo.getHistorialByCodigo(codigoEnvio);
  return { ok: true, envio, historial };
}

async function listarEstados() {
  const estados = await repo.listEstadosEnvio();
  if (estados.length) return { ok: true, estados };
  return { ok: true, estados: estadosPermitidos.map((e) => ({ estado: e })) };
}

async function actualizarEstado(payload) {
  const data = buildActualizacionEstado(payload);
  const obs = String(data.observacion || "").trim();
  if (obs.length < 3) {
    throw new Error("La observación es obligatoria (mínimo 3 caracteres) para registrar el cambio de estado.");
  }
  const esEntrega = String(data.estado || "").trim() === "Entregado";
  if (esEntrega && !(String(data.evidenciaReferencia || "").trim().length >= 4)) {
    throw new Error("Para estado Entregado indique evidencia de entrega (referencia, mín. 4 caracteres).");
  }
  if (esEntrega) {
    const nomRec = String(data.receptorNombre || "").trim();
    const docRec = String(data.receptorDocumento || "").trim();
    if (nomRec.length < 2) {
      throw new Error("Para estado Entregado indique el nombre del receptor (mín. 2 caracteres).");
    }
    if (!/^\d{8}$|^\d{11}$/.test(docRec)) {
      throw new Error("DNI del receptor inválido (8 dígitos) o RUC (11 dígitos).");
    }
  }

  const imgB64 = String(data.evidenciaImagenBase64 || "").trim();
  const evidenciaImagen = imgB64
    ? await persistirEvidenciaImagen(data.codigoEnvio, imgB64, data.evidenciaNombreArchivo)
    : null;

  if (!estadosPermitidos.includes(data.estado)) {
    throw new Error(`Estado no permitido: ${data.estado}`);
  }

  const envio = await repo.getEnvioByCodigo(data.codigoEnvio);
  if (!envio) return { ok: false, error: "Envío no encontrado" };

  const fechaActualizacion = nowIso();
  const db = getDb();

  await runTransaction(db, async (tx) => {
    const envioRef = doc(db, "envios", data.codigoEnvio);
    const historialRef = doc(db, "historial_envios", `${data.codigoEnvio}__${fechaActualizacion}`);

    const histo = applyEvidenciaToHistorial(
      {
        codigoEnvio: data.codigoEnvio,
        estado: data.estado,
        fechaActualizacion,
        observacion: obs,
        responsable: data.responsable,
        evidenciaReferencia: data.evidenciaReferencia || "",
        evidenciaDetalle: data.evidenciaDetalle || "",
        receptorNombre: data.receptorNombre || "",
        receptorDocumento: data.receptorDocumento || "",
        registradoPor: data.registradoPor || ""
      },
      evidenciaImagen
    );

    tx.set(historialRef, histo, { merge: false });

    const envioPatch = { estadoActual: data.estado, fechaUltimaActualizacion: fechaActualizacion };
    if (
      esEntrega &&
      ((data.evidenciaReferencia || "").trim() || (data.evidenciaDetalle || "").trim())
    ) {
      envioPatch.evidenciaEntrega = {
        referencia: (data.evidenciaReferencia || "").trim(),
        detalle: (data.evidenciaDetalle || "").trim(),
        receptorNombre: (data.receptorNombre || "").trim(),
        receptorDocumento: (data.receptorDocumento || "").trim(),
        fecha: fechaActualizacion,
        registradoPor: data.registradoPor || "",
        ...evidenciaPatchForEnvio(evidenciaImagen)
      };
    }
    tx.set(envioRef, envioPatch, { merge: true });
  });

  const result = await buscar(data.codigoEnvio);
  if (evidenciaImagen?.modo === "base64" && evidenciaImagen.avisoFallback) {
    result.avisoEvidencia = "La foto se guardó en el historial (modo local). Active Storage para almacenamiento en la nube.";
  }
  return result;
}

module.exports = { buscar, listarEstados, actualizarEstado };
