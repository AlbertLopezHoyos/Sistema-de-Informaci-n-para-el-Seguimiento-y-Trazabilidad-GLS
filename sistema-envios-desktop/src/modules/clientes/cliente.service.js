const { buildCliente } = require("./cliente.model");
const repo = require("./cliente.repository");

async function crear(payload) {
  const data = buildCliente(payload);
  return await repo.crearOActualizar(data);
}

async function listar(opts) {
  return await repo.listar(opts || {});
}

async function obtenerPorDocumento(documento) {
  const d = String(documento || "").trim();
  if (!d) throw new Error("Indique un documento para buscar.");
  return await repo.obtenerPorDocumento(d);
}

module.exports = { crear, listar, obtenerPorDocumento };
