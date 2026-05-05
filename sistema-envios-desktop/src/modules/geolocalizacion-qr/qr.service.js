const path = require("path");
const { nowIso } = require("../../utils/fechas");
const { generateQrPng } = require("../../utils/qrGenerator");

function getQrOutputPaths(codigoEnvio) {
  const fileName = `${codigoEnvio}.png`;
  const absolute = path.join(__dirname, "..", "..", "renderer", "assets", "qr", fileName);
  const rutaLocalQr = path.join("src", "renderer", "assets", "qr", fileName).replaceAll("\\", "/");
  return { absolute, rutaLocalQr };
}

async function generarQrParaEnvio(codigoEnvio) {
  const { absolute, rutaLocalQr } = getQrOutputPaths(codigoEnvio);
  await generateQrPng({ content: codigoEnvio, outputFilePath: absolute });
  return {
    codigoEnvio,
    contenidoQr: codigoEnvio,
    rutaLocalQr,
    fechaGeneracion: nowIso()
  };
}

module.exports = { generarQrParaEnvio };

