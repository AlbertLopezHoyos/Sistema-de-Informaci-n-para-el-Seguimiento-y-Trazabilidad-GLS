const envioService = require("./envio.service");

const envioController = {
  previewCotizacion: (payload) => envioService.previewCotizacion(payload),
  crearEnvio: (payload) => envioService.crearEnvio(payload),
  obtenerPorCodigo: (codigoEnvio) => envioService.obtenerPorCodigo(codigoEnvio),
  listarActivos: (opts) => envioService.listarActivos(opts),
  listarHistorial: (opts) => envioService.listarHistorial(opts)
};

module.exports = { envioController };

