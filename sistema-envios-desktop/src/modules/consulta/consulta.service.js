const { PDFParse } = require("pdf-parse");
const { parseCodigoFromQrContent } = require("../../utils/qrDeepLink");

const MAX_BYTES = 12 * 1024 * 1024;

async function extraerTextoPdf(buffer) {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return String(result?.text || "");
  } finally {
    await parser.destroy();
  }
}

async function leerCodigoDesdePdfBuffer(buffer) {
  if (!buffer || buffer.length < 10) {
    return { ok: false, error: "Archivo PDF vacío o inválido." };
  }
  if (buffer.length > MAX_BYTES) {
    return { ok: false, error: "El PDF supera el tamaño máximo permitido (12 MB)." };
  }
  let text = "";
  try {
    text = await extraerTextoPdf(buffer);
  } catch (e) {
    return { ok: false, error: `No se pudo leer el PDF: ${e?.message || e}` };
  }

  const codigo = parseCodigoFromQrContent(text);
  if (!/^ENV-\d{4}-\d{4,}$/i.test(codigo)) {
    return {
      ok: false,
      error:
        "No se encontró un código ENV-AAAA-NNNN en el PDF. Use el comprobante exportado desde el sistema o suba la imagen PNG del QR."
    };
  }

  return {
    ok: true,
    codigo,
    via: "pdf-texto",
    raw: text.slice(0, 240)
  };
}

module.exports = { leerCodigoDesdePdfBuffer, extraerTextoPdf };
