const {
  getDb,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  setDoc
} = require("../../config/firebase.config");

function envioDocRef(codigoEnvio) {
  return doc(getDb(), "envios", codigoEnvio);
}

async function getEnvioByCodigo(codigoEnvio) {
  const snap = await getDoc(envioDocRef(codigoEnvio));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

async function getHistorialByCodigo(codigoEnvio) {
  const q = query(collection(getDb(), "historial_envios"), where("codigoEnvio", "==", codigoEnvio));
  const snap = await getDocs(q);
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return rows.slice().sort((a, b) => {
    const ta = Date.parse(a.fechaActualizacion || "") || 0;
    const tb = Date.parse(b.fechaActualizacion || "") || 0;
    if (ta !== tb) return ta - tb;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });
}

async function listEstadosEnvio() {
  const snap = await getDocs(collection(getDb(), "estados_envio"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function updateEnvioEstadoActual(codigoEnvio, estado, fechaActualizacion) {
  await setDoc(
    envioDocRef(codigoEnvio),
    { estadoActual: estado, fechaUltimaActualizacion: fechaActualizacion },
    { merge: true }
  );
}

module.exports = {
  envioDocRef,
  getEnvioByCodigo,
  getHistorialByCodigo,
  listEstadosEnvio,
  updateEnvioEstadoActual
};

