const {
  getDb,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
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
  const q = query(
    collection(getDb(), "ubicaciones_envios"),
    where("codigoEnvio", "==", codigoEnvio),
    orderBy("fechaRegistro", "desc"),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
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

