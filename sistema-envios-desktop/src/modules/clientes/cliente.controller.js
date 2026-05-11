const clienteService = require("./cliente.service");

const clienteController = {
  crear: (p) => clienteService.crear(p),
  listar: (opts) => clienteService.listar(opts)
};

module.exports = { clienteController };
