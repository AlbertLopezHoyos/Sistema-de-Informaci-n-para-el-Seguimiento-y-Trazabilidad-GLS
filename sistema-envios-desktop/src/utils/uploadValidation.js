const MAX_EVIDENCIA_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function parseDataUrl(dataUrl) {
  const s = String(dataUrl || "").trim();
  const m = s.match(/^data:([^;]+);base64,(.+)$/i);
  if (!m) throw new Error("Formato de imagen inválido (se esperaba data URL base64).");
  const mime = m[1].toLowerCase();
  if (!ALLOWED_MIMES.has(mime)) {
    throw new Error("Formato no permitido. Use JPG, PNG o WEBP.");
  }
  const buffer = Buffer.from(m[2], "base64");
  if (!buffer.length) throw new Error("Imagen vacía.");
  if (buffer.length > MAX_EVIDENCIA_BYTES) {
    throw new Error(`La imagen supera el máximo de ${MAX_EVIDENCIA_BYTES / (1024 * 1024)} MB.`);
  }
  return { mime, buffer };
}

function validateFilename(name) {
  const n = String(name || "").trim().toLowerCase();
  const ext = n.includes(".") ? n.slice(n.lastIndexOf(".")) : "";
  if (ext && !ALLOWED_EXT.has(ext)) {
    throw new Error("Extensión de archivo no permitida (JPG, PNG, WEBP).");
  }
  return n || "evidencia.jpg";
}

module.exports = {
  MAX_EVIDENCIA_BYTES,
  ALLOWED_MIMES,
  parseDataUrl,
  validateFilename
};
