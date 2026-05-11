const {
  getDb,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  limit
} = require("../../config/firebase.config");

async function getEnvioByCodigo(codigoEnvio) {
  const snap = await getDoc(doc(getDb(), "envios", codigoEnvio));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

async function addUbicacion(entry) {
  const db = getDb();
  const ref = doc(db, "ubicaciones_envios", `${entry.codigoEnvio}__${entry.fechaRegistro}`);
  await setDoc(ref, entry, { merge: false });
  return ref.id;
}

async function getLastUbicacion(codigoEnvio) {
  const q = query(collection(getDb(), "ubicaciones_envios"), where("codigoEnvio", "==", codigoEnvio), limit(80));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => {
    const ta = Date.parse(a.fechaRegistro || "") || 0;
    const tb = Date.parse(b.fechaRegistro || "") || 0;
    return tb - ta;
  });
  return rows[0];
}

async function upsertQr(data) {
  const db = getDb();
  const ref = doc(db, "qr_envios", data.codigoEnvio);
  await setDoc(ref, data, { merge: true });
  return ref.id;
}

async function getQrByCodigo(codigoEnvio) {
  const snap = await getDoc(doc(getDb(), "qr_envios", codigoEnvio));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

module.exports = { getEnvioByCodigo, addUbicacion, getLastUbicacion, upsertQr, getQrByCodigo };

