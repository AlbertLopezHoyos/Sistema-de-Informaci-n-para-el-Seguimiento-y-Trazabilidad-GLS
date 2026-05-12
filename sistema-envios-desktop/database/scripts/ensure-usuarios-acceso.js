/**
 * Crea o actualiza (merge) usuarios de acceso en Firestore (colección usuarios_auth).
 * Útil tras un reset o si nunca corriste el seed de usuarios.
 *
 * Uso (desde la carpeta sistema-envios-desktop):
 *   npm run seed:users
 *
 * Variables opcionales en .env:
 *   ADMIN_SEED_EMAIL, ADMIN_SEED_PASSWORD
 *   OPERACIONES_SEED_EMAIL, OPERACIONES_SEED_PASSWORD
 */
const path = require("path");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");

dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const { getDb, doc, setDoc } = require("../../src/config/firebase.config");

function normEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function userAuthIdByEmail(email) {
  return `email__${normEmail(email)}`;
}

const defaults = [
  {
    key: "admin",
    email: process.env.ADMIN_SEED_EMAIL || "admin@gls.pe",
    password: process.env.ADMIN_SEED_PASSWORD || "admin1234",
    nombres: "Administrador",
    rol: "admin",
    activo: true
  },
  {
    key: "operaciones",
    email: process.env.OPERACIONES_SEED_EMAIL || "operaciones@gls.pe",
    password: process.env.OPERACIONES_SEED_PASSWORD || "Operaciones2026",
    nombres: "Operaciones",
    rol: "operaciones",
    activo: true
  }
];

async function upsertUser(u) {
  const e = normEmail(u.email);
  const passwordHash = await bcrypt.hash(u.password, 10);
  const id = userAuthIdByEmail(e);
  await setDoc(
    doc(getDb(), "usuarios_auth", id),
    {
      email: e,
      nombres: u.nombres,
      rol: u.rol,
      activo: u.activo,
      passwordHash,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    },
    { merge: true }
  );
  return { id, email: e, rol: u.rol };
}

async function main() {
  console.log("[seed:users] Asegurando usuarios admin y operaciones en Firestore...");
  const out = [];
  for (const u of defaults) {
    const r = await upsertUser(u);
    out.push({ ...r, password: u.password, nombres: u.nombres });
  }
  console.log("[seed:users] Listo. Credenciales de acceso (guárdalas solo en entorno de prueba):\n");
  for (const row of out) {
    console.log(`  · ${row.rol.toUpperCase()}: ${row.email}  /  contraseña: ${row.password}`);
  }
  console.log("\n  Inicia sesión en la app con el admin para ver Usuarios (admin) y políticas de administrador.");
}

main().catch((err) => {
  console.error("[seed:users] Error:", err?.message || err);
  process.exitCode = 1;
});
