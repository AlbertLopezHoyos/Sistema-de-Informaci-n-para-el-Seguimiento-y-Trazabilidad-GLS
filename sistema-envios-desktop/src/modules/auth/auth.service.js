const bcrypt = require("bcryptjs");
const { requiredString, optionalString } = require("../../utils/validaciones");
const {
  findUserByEmail,
  createUserAuth,
  normEmail,
  countUsuariosAuth,
  listUsuariosAuthDocs,
  setUsuarioActivoByEmail
} = require("./auth.repository");

function sanitizeUser(u) {
  if (!u) return null;
  // never send passwordHash to renderer
  // eslint-disable-next-line no-unused-vars
  const { passwordHash, ...safe } = u;
  return safe;
}

async function register({ email, password, nombres, rol }) {
  const e = normEmail(requiredString(email, "email"));
  const p = requiredString(password, "password");
  const n = requiredString(nombres, "nombres");
  const rRaw = optionalString(rol) || "operaciones";
  const permitidos = ["admin", "operaciones", "consulta"];
  const r = permitidos.includes(rRaw) ? rRaw : "operaciones";

  if (p.length < 6) throw new Error("La contraseña debe tener al menos 6 caracteres");

  const exists = await findUserByEmail(e);
  if (exists) throw new Error("Ya existe una cuenta con este correo");

  const passwordHash = await bcrypt.hash(p, 10);
  const created = await createUserAuth({ email: e, nombres: n, rol: r, activo: true, passwordHash });
  return sanitizeUser(created);
}

async function login({ email, password }) {
  const e = normEmail(requiredString(email, "email"));
  const p = requiredString(password, "password");

  const user = await findUserByEmail(e);
  if (!user) throw new Error("Credenciales inválidas");
  if (user.activo === false) throw new Error("Usuario inactivo");

  const ok = await bcrypt.compare(p, user.passwordHash || "");
  if (!ok) throw new Error("Credenciales inválidas");

  return sanitizeUser(user);
}

async function countUsers() {
  return await countUsuariosAuth();
}

async function listUsersAdmin() {
  const rows = await listUsuariosAuthDocs();
  return rows.map(sanitizeUser);
}

async function inviteUser(payload) {
  return await register(payload);
}

async function setUsuarioActivo({ email, activo }) {
  const e = normEmail(requiredString(email, "email"));
  const row = await setUsuarioActivoByEmail(e, activo);
  if (!row) throw new Error("Usuario no encontrado");
  return sanitizeUser(row);
}

module.exports = { register, login, countUsers, listUsersAdmin, inviteUser, setUsuarioActivo };

