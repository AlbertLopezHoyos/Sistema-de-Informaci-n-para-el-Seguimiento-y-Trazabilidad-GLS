const { getDb, doc, setDoc } = require("../../src/config/firebase.config");

module.exports = async function seedUsuarios() {
  console.log("[seed] 03-seed-usuarios");
  const db = getDb();

  const usuarios = [
    { id: "ops-01", nombres: "Operaciones", rol: "operaciones", activo: true },
    { id: "admin-01", nombres: "Administrador", rol: "admin", activo: true }
  ];

  for (const u of usuarios) {
    await setDoc(
      doc(db, "usuarios", u.id),
      { ...u, demo: true, updatedAt: new Date().toISOString() },
      { merge: true }
    );
  }
};

