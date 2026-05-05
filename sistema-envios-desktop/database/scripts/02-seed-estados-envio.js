const { getDb, doc, setDoc } = require("../../src/config/firebase.config");

const ESTADOS = ["Registrado", "En tránsito", "En reparto", "Entregado", "Observado", "Cancelado"];

module.exports = async function seedEstados() {
  console.log("[seed] 02-seed-estados-envio");
  const db = getDb();

  for (const estado of ESTADOS) {
    await setDoc(
      doc(db, "estados_envio", estado),
      { estado, activo: true, demo: true, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  }
};

