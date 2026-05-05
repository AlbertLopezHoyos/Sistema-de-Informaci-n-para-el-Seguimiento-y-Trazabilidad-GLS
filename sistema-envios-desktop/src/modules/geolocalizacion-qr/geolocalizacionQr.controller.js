const ubicacionService = require("./ubicacion.service");
const { generarQrParaEnvio } = require("./qr.service");
const repo = require("./ubicacion.repository");

const geolocalizacionQrController = {
  buscar: (codigoEnvio) => ubicacionService.buscar(codigoEnvio),
  registrarUbicacion: (payload) => ubicacionService.registrarUbicacion(payload),
  generarQr: async (codigoEnvio) => {
    const envio = await repo.getEnvioByCodigo(codigoEnvio);
    if (!envio) return { ok: false, error: "Envío no encontrado" };
    const qrDoc = await generarQrParaEnvio(codigoEnvio);
    await repo.upsertQr(qrDoc);
    return { ok: true, qr: qrDoc };
  }
};

module.exports = { geolocalizacionQrController };

