const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");

const DEFAULT_LOGO = path.join(__dirname, "..", "renderer", "assets", "img", "logo.png");

async function ensureDir(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

async function compositeLogoOnQr(qrBuffer, logoPath) {
  try {
    const sharp = require("sharp");
    const logo = logoPath || DEFAULT_LOGO;
    if (!fs.existsSync(logo)) return qrBuffer;
    const logoBuf = await sharp(logo)
      .resize(96, 96, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 } })
      .png()
      .toBuffer();
    return sharp(qrBuffer)
      .composite([{ input: logoBuf, gravity: "centre" }])
      .png()
      .toBuffer();
  } catch (_) {
    return qrBuffer;
  }
}

async function generateQrPng({ content, outputFilePath, withLogo = true, width = 768 }) {
  const dir = path.dirname(outputFilePath);
  await ensureDir(dir);
  let buf = await QRCode.toBuffer(content, {
    type: "png",
    errorCorrectionLevel: "H",
    margin: 2,
    width,
    color: { dark: "#1e3a8a", light: "#ffffff" }
  });
  if (withLogo) buf = await compositeLogoOnQr(buf);
  await fs.promises.writeFile(outputFilePath, buf);
  return outputFilePath;
}

/** HTML imprimible para etiqueta QR (renderer / ventana impresión). */
function buildQrLabelHtml({ codigoEnvio, contenidoQr, qrImgSrc }) {
  const safeCode = String(codigoEnvio || "").replace(/</g, "&lt;");
  const safeSub = String(contenidoQr || "").replace(/</g, "&lt;");
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"/><title>QR ${safeCode}</title>
<style>
@page{margin:12mm}
body{font-family:"Segoe UI",Arial,sans-serif;text-align:center;padding:20px 16px;color:#1e3a8a;margin:0}
.brand{font-size:16px;font-weight:800;letter-spacing:.02em;margin:0 0 4px}
.tag{font-size:11px;color:#64748b;margin:0 0 14px}
.code{font-size:24px;font-weight:900;margin:8px 0 14px;letter-spacing:.06em}
.qr-wrap{display:inline-block;padding:10px;border:2px solid #1e5aa8;border-radius:12px;background:#fff}
img{width:320px;height:320px;display:block}
.sub{font-size:10px;color:#64748b;margin-top:14px;word-break:break-all;max-width:360px;margin-left:auto;margin-right:auto}
@media print{body{padding:8px}}
</style></head><body>
<p class="brand">GRUPO LOGÍSTICO SALAZAR S.A.C.</p>
<p class="tag">Etiqueta de seguimiento · Área de Operaciones</p>
<div class="code">${safeCode}</div>
<div class="qr-wrap"><img src="${qrImgSrc || ""}" alt="Código QR del envío"/></div>
<div class="sub">${safeSub}</div>
</body></html>`;
}

module.exports = { generateQrPng, buildQrLabelHtml, compositeLogoOnQr };
