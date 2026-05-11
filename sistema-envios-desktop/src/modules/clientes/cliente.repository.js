const { getDb, collection, query, orderBy, limit, getDocs, doc, getDoc, setDoc } = require("../../config/firebase.config");
const { nowIso } = require("../../utils/fechas");

function docIdCliente(documento) {
  const d = String(documento || "").trim();
  return `cli_${d.replace(/[^a-zA-Z0-9]/g, "_")}`;
}

async function obtenerPorDocumento(documento) {
  const id = docIdCliente(documento);
  const snap = await getDoc(doc(getDb(), "clientes", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

async function crearOActualizar(data) {
  const id = docIdCliente(data.documento);
  const ref = doc(getDb(), "clientes", id);
  const existing = await getDoc(ref);
  const fechaAlta = existing.exists() ? existing.data()?.fechaAlta || nowIso() : nowIso();
  await setDoc(
    ref,
    {
      ...data,
      fechaActualizacion: nowIso(),
      fechaAlta
    },
    { merge: true }
  );
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

async function listar({ limitCount = 500 } = {}) {
  const db = getDb();
  const q = query(collection(db, "clientes"), orderBy("nombres", "asc"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

module.exports = { obtenerPorDocumento, crearOActualizar, listar, docIdCliente };
