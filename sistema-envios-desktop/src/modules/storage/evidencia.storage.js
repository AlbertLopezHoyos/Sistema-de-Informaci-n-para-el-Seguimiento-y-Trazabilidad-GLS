/**
 * Subida de evidencias de entrega a Firebase Storage.
 * El renderer envía data URL por IPC; aquí se valida MIME/tamaño y se persiste solo la URL en Firestore.
 */
const path = require("path");
const { ref, uploadBytes, getDownloadURL } = require("firebase/storage");
const { getFirebaseStorage } = require("../../config/firebase.config");
const { nowIso } = require("../../utils/fechas");
const { parseDataUrl, validateFilename } = require("../../utils/uploadValidation");
const { sanitizeFilename } = require("../../utils/sanitize");
const { humanizeError } = require("../../utils/glsErrors");

async function uploadEvidenciaEntrega(codigoEnvio, dataUrl, originalFilename) {
  const codigo = String(codigoEnvio || "").trim();
  if (!/^ENV-\d{4}-\d{4,}$/i.test(codigo)) {
    throw new Error("Código de envío inválido para subir evidencia.");
  }
  const { mime, buffer } = parseDataUrl(dataUrl);
  const nombre = sanitizeFilename(validateFilename(originalFilename));
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const storagePath = `uploads/evidencias/${codigo}/${Date.now()}_${nombre.replace(/\.[^.]+$/, "")}.${ext}`;

  let storage;
  try {
    storage = getFirebaseStorage();
  } catch (e) {
    throw new Error(humanizeError(e?.message, "storage"));
  }
  const storageRef = ref(storage, storagePath);
  try {
    await uploadBytes(storageRef, buffer, { contentType: mime });
  } catch (e) {
    throw new Error(humanizeError(e?.message, "storage"));
  }
  const url = await getDownloadURL(storageRef);

  return {
    evidenciaImagenUrl: url,
    nombreArchivo: path.basename(storagePath),
    fechaSubida: nowIso(),
    storagePath
  };
}

module.exports = { uploadEvidenciaEntrega };
