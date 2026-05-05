const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");

async function ensureDir(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

async function generateQrPng({ content, outputFilePath }) {
  const dir = path.dirname(outputFilePath);
  await ensureDir(dir);
  await QRCode.toFile(outputFilePath, content, {
    type: "png",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 320
  });
  return outputFilePath;
}

module.exports = { generateQrPng };

