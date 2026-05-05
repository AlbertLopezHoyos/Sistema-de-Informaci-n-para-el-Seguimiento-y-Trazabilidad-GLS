const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const { getDb, collection, query, where, getDocs, writeBatch, doc, deleteDoc } = require("../../src/config/firebase.config");

async function deleteWhereDemo(collectionName) {
  const db = getDb();
  const q = query(collection(db, collectionName), where("demo", "==", true));
  const snap = await getDocs(q);
  if (snap.empty) return 0;

  let deleted = 0;
  let batch = writeBatch(db);
  let ops = 0;

  for (const d of snap.docs) {
    batch.delete(d.ref);
    ops++;
    deleted++;
    if (ops >= 450) {
      await batch.commit();
      batch = writeBatch(db);
      ops = 0;
    }
  }
  if (ops) await batch.commit();
  return deleted;
}

async function clear() {
  console.log("[seed] 05-clear-demo-data");
  const collections = ["usuarios", "clientes", "envios", "estados_envio", "historial_envios", "ubicaciones_envios", "qr_envios"];
  for (const c of collections) {
    const n = await deleteWhereDemo(c);
    console.log(`[seed] - ${c}: ${n} docs eliminados`);
  }

  // meta seed
  try {
    await deleteDoc(doc(getDb(), "meta", "seed"));
  } catch {}
}

clear().catch((err) => {
  console.error("[seed] Error:", err);
  process.exitCode = 1;
});

