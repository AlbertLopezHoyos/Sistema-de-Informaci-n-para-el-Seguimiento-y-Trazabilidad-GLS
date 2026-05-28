const path = require("path");
const { nowIso } = require("../../utils/fechas");
const { generateQrPng } = require("../../utils/qrGenerator");
const { buildQrDeepLink } = require("../../utils/qrDeepLink");

function getQrOutputPaths(codigoEnvio) {
  const fileName = `${codigoEnvio}.png`;
  const absolute = path.join(__dirname, "..", "..", "renderer", "assets", "qr", fileName);
  const rutaLocalQr = path.join("src", "renderer", "assets", "qr", fileName).replaceAll("\\", "/");
  return { absolute, rutaLocalQr };
}

async function generarQrParaEnvio(codigoEnvio) {
  const { absolute, rutaLocalQr } = getQrOutputPaths(codigoEnvio);
  const contenidoQr = buildQrDeepLink(codigoEnvio);
  await generateQrPng({
    content: contenidoQr,
    outputFilePath: absolute,
    width: 768,
    withLogo: true
  });
  return {
    codigoEnvio,
    contenidoQr,
    rutaLocalQr,
    fechaGeneracion: nowIso()
  };
}

module.exports = { generarQrParaEnvio };

