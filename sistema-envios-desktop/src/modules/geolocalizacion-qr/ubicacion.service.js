const { nowIso } = require("../../utils/fechas");
const { buildUbicacion } = require("./ubicacion.model");
const repo = require("./ubicacion.repository");

async function buscar(codigoEnvio) {
  const envio = await repo.getEnvioByCodigo(codigoEnvio);
  if (!envio) return { ok: false, error: "Envío no encontrado" };
  const lastUbicacion = await repo.getLastUbicacion(codigoEnvio);
  const qr = await repo.getQrByCodigo(codigoEnvio);
  const ubicaciones = await repo.listUbicacionesByCodigo(codigoEnvio);
  return { ok: true, envio, lastUbicacion, qr, ubicaciones };
}

async function registrarUbicacion(payload) {
  const data = buildUbicacion(payload);
  const envio = await repo.getEnvioByCodigo(data.codigoEnvio);
  if (!envio) return { ok: false, error: "Envío no encontrado" };

  const entry = {
    ...data,
    fechaRegistro: nowIso(),
    observacion: data.observacion || "",
    responsable: data.responsable || "Área de operaciones",
    registradoPor: data.registradoPor || ""
  };
  await repo.addUbicacion(entry);
  return await buscar(data.codigoEnvio);
}

module.exports = { buscar, registrarUbicacion };

