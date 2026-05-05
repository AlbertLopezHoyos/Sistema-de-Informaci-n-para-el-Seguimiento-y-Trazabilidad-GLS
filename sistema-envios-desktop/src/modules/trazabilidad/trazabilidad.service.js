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

    tx.set(
      historialRef,
      {
        codigoEnvio: data.codigoEnvio,
        estado: data.estado,
        fechaActualizacion,
        observacion: data.observacion || "",
        responsable: data.responsable
      },
      { merge: false }
    );

    tx.set(
      envioRef,
      { estadoActual: data.estado, fechaUltimaActualizacion: fechaActualizacion },
      { merge: true }
    );
  });

  return await buscar(data.codigoEnvio);
}

module.exports = { buscar, listarEstados, actualizarEstado };

