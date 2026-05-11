const { estadosPermitidos } = require("../../config/app.config");
const { getDb, runTransaction, doc } = require("../../config/firebase.config");
const { nowIso } = require("../../utils/fechas");
const { buildActualizacionEstado } = require("./trazabilidad.model");
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
  const esEntrega = String(data.estado || "").trim() === "Entregado";
  if (esEntrega && !(String(data.evidenciaReferencia || "").trim().length >= 4)) {
    throw new Error("Para estado Entregado indique evidencia de entrega (referencia, mín. 4 caracteres).");
  }
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

    const histo = {
      codigoEnvio: data.codigoEnvio,
      estado: data.estado,
      fechaActualizacion,
      observacion: data.observacion || "",
      responsable: data.responsable,
      evidenciaReferencia: data.evidenciaReferencia || "",
      evidenciaDetalle: data.evidenciaDetalle || "",
      registradoPor: data.registradoPor || ""
    };

    tx.set(historialRef, histo, { merge: false });

    const envioPatch = { estadoActual: data.estado, fechaUltimaActualizacion: fechaActualizacion };
    if (
      esEntrega &&
      ((data.evidenciaReferencia || "").trim() || (data.evidenciaDetalle || "").trim())
    ) {
      envioPatch.evidenciaEntrega = {
        referencia: (data.evidenciaReferencia || "").trim(),
        detalle: (data.evidenciaDetalle || "").trim(),
        fecha: fechaActualizacion,
        registradoPor: data.registradoPor || ""
      };
    }
    tx.set(envioRef, envioPatch, { merge: true });
  });

  return await buscar(data.codigoEnvio);
}

module.exports = { buscar, listarEstados, actualizarEstado };

