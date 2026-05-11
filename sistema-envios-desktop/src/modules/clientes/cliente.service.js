const { buildCliente } = require("./cliente.model");
const repo = require("./cliente.repository");

async function crear(payload) {
  const data = buildCliente(payload);
  return await repo.crearOActualizar(data);
}

async function listar(opts) {
  return await repo.listar(opts || {});
}

module.exports = { crear, listar };
