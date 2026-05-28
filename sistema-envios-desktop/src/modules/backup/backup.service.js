const { getDb, collection, getDocs, writeBatch, doc, setDoc } = require("../../config/firebase.config");
const { nowIso } = require("../../utils/fechas");

const COLLECTIONS = [
  "envios",
  "historial_envios",
  "clientes",
  "logs_sistema",
  "qr_envios",
  "ubicaciones_envios",
  "estados_envio"
];

async function fetchCollection(name) {
  const snap = await getDocs(collection(getDb(), name));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function exportarRespaldo() {
  const payload = {
    meta: {
      app: "sistema-envios-desktop",
      version: "1.1.0",
      exportedAt: nowIso(),
      collections: COLLECTIONS
    },
    data: {}
  };
  for (const name of COLLECTIONS) {
    payload.data[name] = await fetchCollection(name);
  }
  return { ok: true, backup: payload, stats: Object.fromEntries(
    COLLECTIONS.map((c) => [c, payload.data[c].length])
  ) };
}

function validateBackupStructure(backup) {
  if (!backup?.meta?.exportedAt) throw new Error("Respaldo inválido: falta meta.exportedAt");
  if (!backup?.data || typeof backup.data !== "object") throw new Error("Respaldo inválido: falta data");
  for (const name of COLLECTIONS) {
    if (!Array.isArray(backup.data[name])) {
      throw new Error(`Respaldo inválido: data.${name} debe ser un array`);
    }
  }
  return true;
}

async function importarRespaldo(backup, { merge = true } = {}) {
  validateBackupStructure(backup);
  const db = getDb();
  let written = 0;
  for (const name of COLLECTIONS) {
    const rows = backup.data[name] || [];
    const batchSize = 400;
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = writeBatch(db);
      const chunk = rows.slice(i, i + batchSize);
      for (const row of chunk) {
        const { id, ...data } = row;
        if (!id) continue;
        batch.set(doc(db, name, id), data, { merge });
        written += 1;
      }
      await batch.commit();
    }
  }
  return { ok: true, written, importedAt: nowIso() };
}

module.exports = { exportarRespaldo, importarRespaldo, validateBackupStructure, COLLECTIONS };
