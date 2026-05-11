const bcrypt = require("bcryptjs");
const { getDb, doc, setDoc } = require("../../src/config/firebase.config");

function normEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function userAuthIdByEmail(email) {
  return `email__${normEmail(email)}`;
}

module.exports = async function seedUsuarios() {
  console.log("[seed] 03-seed-usuarios");
  const db = getDb();

  const usuariosAuth = [
    { email: "operaciones@gls.pe", password: "Operaciones2026", nombres: "Operaciones", rol: "operaciones", activo: true },
    { email: "admin@gls.pe", password: "admin1234", nombres: "Administrador", rol: "admin", activo: true }
  ];

  for (const u of usuariosAuth) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await setDoc(
      doc(db, "usuarios_auth", userAuthIdByEmail(u.email)),
      {
        email: normEmail(u.email),
        nombres: u.nombres,
        rol: u.rol,
        activo: u.activo,
        passwordHash,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      },
      { merge: true }
    );
  }
};

