const { getDb, collection, addDoc, query, orderBy, limit, getDocs } = require("../../config/firebase.config");

async function insertLog(data) {
  const db = getDb();
  const ref = await addDoc(collection(db, "logs_sistema"), data);
  return { id: ref.id, ...data };
}

async function listarRecientes({ limitCount = 200 } = {}) {
  const db = getDb();
  const q = query(collection(db, "logs_sistema"), orderBy("fecha", "desc"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

module.exports = { insertLog, listarRecientes };
