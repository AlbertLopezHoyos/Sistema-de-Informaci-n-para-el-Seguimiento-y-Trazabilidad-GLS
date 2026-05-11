const { getDb, collection, query, where, getDocs, doc, getDoc, setDoc } = require("../../config/firebase.config");

function normEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function userDocIdByEmail(email) {
  return `email__${normEmail(email)}`;
}

async function findUserByEmail(email) {
  const e = normEmail(email);
  if (!e) return null;
  const db = getDb();

  // Prefer doc-id lookup (fast path)
  const byIdRef = doc(db, "usuarios_auth", userDocIdByEmail(e));
  const byIdSnap = await getDoc(byIdRef);
  if (byIdSnap.exists()) return { id: byIdSnap.id, ...byIdSnap.data() };

  // Fallback for old data (if any)
  const q = query(collection(db, "usuarios_auth"), where("email", "==", e));
  const snap = await getDocs(q);
  const first = snap.docs?.[0];
  return first ? { id: first.id, ...first.data() } : null;
}

async function createUserAuth({ email, nombres, rol, activo, passwordHash }) {
  const e = normEmail(email);
  const db = getDb();
  const id = userDocIdByEmail(e);
  const ref = doc(db, "usuarios_auth", id);
  const payload = {
    email: e,
    nombres: String(nombres || "").trim(),
    rol: rol || "operaciones",
    activo: activo !== false,
    passwordHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  await setDoc(ref, payload, { merge: false });
  return { id, ...payload };
}

async function countUsuariosAuth() {
  const snap = await getDocs(collection(getDb(), "usuarios_auth"));
  return snap.size;
}

async function listUsuariosAuthDocs() {
  const snap = await getDocs(collection(getDb(), "usuarios_auth"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function setUsuarioActivoByEmail(email, activo) {
  const u = await findUserByEmail(email);
  if (!u?.id) return null;
  const ref = doc(getDb(), "usuarios_auth", u.id);
  await setDoc(
    ref,
    {
      activo: !!activo,
      updatedAt: new Date().toISOString()
    },
    { merge: true }
  );
  const fresh = await getDoc(ref);
  return fresh.exists() ? { id: fresh.id, ...fresh.data() } : null;
}

module.exports = { findUserByEmail, createUserAuth, normEmail, countUsuariosAuth, listUsuariosAuthDocs, setUsuarioActivoByEmail };

