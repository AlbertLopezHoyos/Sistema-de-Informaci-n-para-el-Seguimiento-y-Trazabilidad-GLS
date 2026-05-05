const trazabilidadService = require("./trazabilidad.service");

const trazabilidadController = {
  buscar: (codigoEnvio) => trazabilidadService.buscar(codigoEnvio),
  listarEstados: () => trazabilidadService.listarEstados(),
  actualizarEstado: (payload) => trazabilidadService.actualizarEstado(payload)
};

module.exports = { trazabilidadController };

