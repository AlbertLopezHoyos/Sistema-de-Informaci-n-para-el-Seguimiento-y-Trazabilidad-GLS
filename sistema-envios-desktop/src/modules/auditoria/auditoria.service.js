const { nowIso } = require("../../utils/fechas");
const { buildLogSistema } = require("./auditoria.model");
const repo = require("./auditoria.repository");

/**
 * Registra evento en logs_sistema. No lanza error al fallar (no bloquea operación principal).
 */
async function registrarLog({ usuario, rol, accion, detalles }) {
  try {
    const row = buildLogSistema({
      usuario: String(usuario || "sistema").slice(0, 200),
      rol: String(rol || "—").slice(0, 40),
      accion: String(accion || "evento").slice(0, 80),
      fecha: nowIso(),
      detalles: detalles || {}
    });
    return await repo.insertLog(row);
  } catch (err) {
    console.error("[auditoria] No se pudo registrar log:", err?.message || err);
    return null;
  }
}

async function listarLogs(opts) {
  const logs = await repo.listarRecientes(opts);
  return { ok: true, logs };
}

module.exports = { registrarLog, listarLogs };
