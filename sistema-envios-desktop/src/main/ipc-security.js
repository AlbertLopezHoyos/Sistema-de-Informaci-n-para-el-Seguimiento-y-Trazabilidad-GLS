const { optionalString, requiredString } = require("../utils/validaciones");

const PUBLIC_CHANNELS = new Set([
  "app:ping",
  "auth:login",
  "auth:register",
  "auth:policy"
]);

function isPublicChannel(channel) {
  return PUBLIC_CHANNELS.has(channel);
}

function validateCodigoEnvio(v) {
  const s = requiredString(v, "codigoEnvio").toUpperCase();
  if (!/^ENV-\d{4}-\d{4,}$/.test(s)) {
    throw new Error("Código de envío inválido (formato ENV-AAAA-NNNN).");
  }
  return s;
}

function validatePayload(channel, payload) {
  if (!payload || typeof payload !== "object") return payload || {};
  const p = { ...payload };

  const CODIGO_CHANNELS = new Set([
    "trazabilidad:buscar",
    "trazabilidad:actualizarEstado",
    "geo:buscar",
    "geo:generarQr",
    "geo:qrEtiquetaHtml",
    "envios:obtenerPorCodigo"
  ]);
  if (CODIGO_CHANNELS.has(channel) && p.codigoEnvio !== undefined) {
    p.codigoEnvio = validateCodigoEnvio(p.codigoEnvio);
  }
  if (channel === "clientes:obtenerPorDocumento" && p.documento !== undefined) {
    p.documento = requiredString(p.documento, "documento").slice(0, 20);
  }
  if (channel === "auth:login") {
    const { validateEmail } = require("../utils/validaciones");
    p.email = validateEmail(p.email, "email");
    p.password = requiredString(p.password, "password");
  }
  if (channel === "reportes:consultar") {
    p.estado = optionalString(p.estado) || "Todos";
    p.cliente = optionalString(p.cliente)?.slice(0, 120);
    p.desde = optionalString(p.desde)?.slice(0, 32);
    p.hasta = optionalString(p.hasta)?.slice(0, 32);
    const lim = Number(p.limitCount);
    p.limitCount = Number.isFinite(lim) ? Math.min(Math.max(lim, 1), 5000) : 2000;
  }
  if (channel === "envios:listarHistorial" || channel === "envios:listarActivos") {
    const lim = Number(p.limitCount);
    p.limitCount = Number.isFinite(lim) ? Math.min(Math.max(lim, 1), 2000) : 800;
  }
  if (channel === "clientes:listar") {
    const lim = Number(p.limitCount);
    p.limitCount = Number.isFinite(lim) ? Math.min(Math.max(lim, 1), 500) : 500;
  }
  if (channel === "geo:registrarUbicacion") {
    if (p.codigoEnvio !== undefined) p.codigoEnvio = validateCodigoEnvio(p.codigoEnvio);
    p.direccion = requiredString(p.direccion, "direccion").slice(0, 500);
    const lat = Number(String(p.latitud ?? "").replace(",", "."));
    const lng = Number(String(p.longitud ?? "").replace(",", "."));
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) throw new Error("Latitud inválida (-90 a 90).");
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) throw new Error("Longitud inválida (-180 a 180).");
    p.latitud = String(lat);
    p.longitud = String(lng);
    p.observacion = optionalString(p.observacion).slice(0, 500);
  }
  if (channel === "auditoria:listar") {
    const lim = Number(p.limitCount);
    p.limitCount = Number.isFinite(lim) ? Math.min(Math.max(lim, 1), 500) : 200;
  }
  return p;
}

module.exports = { isPublicChannel, validatePayload, validateCodigoEnvio, PUBLIC_CHANNELS };
