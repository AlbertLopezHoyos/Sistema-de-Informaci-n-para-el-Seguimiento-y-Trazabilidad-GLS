const { getDb, doc, setDoc } = require("../../src/config/firebase.config");

module.exports = async function createCollections() {
  console.log("[seed] 01-create-collections");
  const db = getDb();

  // Firestore crea colecciones automáticamente; aquí solo dejamos “anclas” mínimas.
  await setDoc(doc(db, "meta", "seed"), { lastSeedAt: new Date().toISOString() }, { merge: true });
};

