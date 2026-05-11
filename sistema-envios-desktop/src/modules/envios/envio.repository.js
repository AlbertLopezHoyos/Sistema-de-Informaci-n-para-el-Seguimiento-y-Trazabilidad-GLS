const {
  getDb,
  doc,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  orderBy,
  limit,
  onSnapshot
} = require("../../config/firebase.config");

function enviosCol() {
  return collection(getDb(), "envios");
}

function historialCol() {
  return collection(getDb(), "historial_envios");
}

function qrCol() {
  return collection(getDb(), "qr_envios");
}

function countersDocRef(counterId) {
  return doc(getDb(), "counters", counterId);
}

async function listEnviosActivos({ limitCount = 200 } = {}) {
  // Sin `where in` + orderBy (evita índice compuesto). Se lee por fecha y se filtra en memoria.
  const activos = new Set(["Registrado", "En tránsito", "En reparto", "Observado"]);
  const take = Math.min(Math.max(Number(limitCount) * 6, 400), 2000);
  const snap = await getDocs(query(enviosCol(), orderBy("fechaRegistro", "desc"), limit(take)));
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((e) => activos.has(e.estadoActual || ""));
  return rows.slice(0, limitCount);
}

async function listEnviosHistorial({ estado = "Todos", limitCount = 800 } = {}) {
  const baseLimit = Math.min(Math.max(Number(limitCount) || 800, 50), 2000);

  const snap = await getDocs(query(enviosCol(), orderBy("fechaRegistro", "desc"), limit(baseLimit)));
  let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (estado && estado !== "Todos") {
    items = items.filter((e) => (e.estadoActual || "") === estado);
  }

  return items;
}

function subscribeEnviosActivos({ limitCount = 200, onData, onError } = {}) {
  const activos = new Set(["Registrado", "En tránsito", "En reparto", "Observado"]);
  const take = Math.min(Math.max(Number(limitCount) * 6, 400), 2000);
  const q = query(enviosCol(), orderBy("fechaRegistro", "desc"), limit(take));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((e) => activos.has(e.estadoActual || ""))
        .slice(0, limitCount);
      onData?.(items);
    },
    (err) => onError?.(err)
  );
}

async function findEnvioByCodigo(codigoEnvio) {
  const ref = doc(getDb(), "envios", codigoEnvio);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

function sortHistorialPorFechaAsc(rows) {
  return rows.slice().sort((a, b) => {
    const ta = Date.parse(a.fechaActualizacion || "") || 0;
    const tb = Date.parse(b.fechaActualizacion || "") || 0;
    if (ta !== tb) return ta - tb;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });
}

async function getHistorialByCodigo(codigoEnvio) {
  const q = query(historialCol(), where("codigoEnvio", "==", codigoEnvio));
  const snap = await getDocs(q);
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return sortHistorialPorFechaAsc(rows);
}

async function createEnvioDoc(envio) {
  const ref = await addDoc(enviosCol(), envio);
  return ref.id;
}

async function createHistorialEntry(entry) {
  const ref = await addDoc(historialCol(), entry);
  return ref.id;
}

async function upsertQrDoc(qrDocId, data) {
  await setDoc(doc(getDb(), "qr_envios", qrDocId), data, { merge: true });
  return qrDocId;
}

async function getCounter(counterId) {
  const ref = countersDocRef(counterId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { ref, current: 0 };
  return { ref, current: Number(snap.data()?.current || 0) };
}

module.exports = {
  listEnviosActivos,
  listEnviosHistorial,
  subscribeEnviosActivos,
  findEnvioByCodigo,
  getHistorialByCodigo,
  createEnvioDoc,
  createHistorialEntry,
  upsertQrDoc,
  countersDocRef,
  getCounter
};

