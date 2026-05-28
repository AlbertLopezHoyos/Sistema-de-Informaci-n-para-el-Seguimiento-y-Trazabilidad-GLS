const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const { getDb, collection, getDocs, deleteDoc, doc } = require("../../src/config/firebase.config");

async function deleteAllDocs(collectionName) {
  const db = getDb();
  const snap = await getDocs(collection(db, collectionName));
  let n = 0;
  for (const d of snap.docs) {
    await deleteDoc(doc(db, collectionName, d.id));
    n += 1;
  }
  return n;
}

async function reset() {
  console.log("[reset] Iniciando...");
  const collections = [
    "envios",
    "historial_envios",
    "qr_envios",
    "ubicaciones_envios",
    "clientes",
    "estados_envio",
    "usuarios_auth",
    "usuarios",
    "counters",
    "meta",
    "logs_sistema"
  ];

  for (const c of collections) {
    const n = await deleteAllDocs(c);
    console.log(`[reset] - ${c}: ${n}`);
  }
  console.log("[reset] Completado.");
}

reset().catch((err) => {
  console.error("[reset] Error:", err);
  process.exitCode = 1;
});

