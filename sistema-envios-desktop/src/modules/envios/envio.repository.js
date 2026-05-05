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
  // Activos = no entregado / no cancelado (ajustable)
  const activos = ["Registrado", "En tránsito", "En reparto", "Observado"];
  const q = query(enviosCol(), where("estadoActual", "in", activos), orderBy("fechaRegistro", "desc"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function listEnviosHistorial({ estado = "Todos", limitCount = 800 } = {}) {
  // Nota: Firestore requiere índices compuestos para `where + orderBy` en campos distintos.
  // Por robustez (especialmente en proyectos nuevos), filtramos por estado en cliente si hace falta.
  const baseLimit = Math.min(Math.max(Number(limitCount) || 800, 50), 2000);

  const snap = await getDocs(query(enviosCol(), orderBy("fechaRegistro", "desc"), limit(baseLimit)));
  let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (estado && estado !== "Todos") {
    items = items.filter((e) => (e.estadoActual || "") === estado);
  }

  return items;
}

function subscribeEnviosActivos({ limitCount = 200, onData, onError } = {}) {
  const activos = ["Registrado", "En tránsito", "En reparto", "Observado"];
  const q = query(enviosCol(), where("estadoActual", "in", activos), orderBy("fechaRegistro", "desc"), limit(limitCount));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onData?.(items);
    },
    (err) => onError?.(err)
  );
}

async function findEnvioByCodigo(codigoEnvio) {
  const q = query(enviosCol(), where("codigoEnvio", "==", codigoEnvio), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

async function getHistorialByCodigo(codigoEnvio) {
  const q = query(
    historialCol(),
    where("codigoEnvio", "==", codigoEnvio),
    orderBy("fechaActualizacion", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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

