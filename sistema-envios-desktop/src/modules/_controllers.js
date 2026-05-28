/**
 * Punto único de importación de controllers (evita destructuring incorrecto).
 * Uso: const { envioController } = require("./_controllers");
 */
const { envioController } = require("./envios/envio.controller");
const { trazabilidadController } = require("./trazabilidad/trazabilidad.controller");
const { geolocalizacionQrController } = require("./geolocalizacion-qr/geolocalizacionQr.controller");
const { authController } = require("./auth/auth.controller");
const { clienteController } = require("./clientes/cliente.controller");

module.exports = {
  envioController,
  trazabilidadController,
  geolocalizacionQrController,
  authController,
  clienteController
};
