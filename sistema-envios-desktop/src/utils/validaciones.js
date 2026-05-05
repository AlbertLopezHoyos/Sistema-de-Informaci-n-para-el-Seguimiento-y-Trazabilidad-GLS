function requiredString(v, field) {
  if (typeof v !== "string" || !v.trim()) {
    throw new Error(`Campo requerido: ${field}`);
  }
  return v.trim();
}

function optionalString(v) {
  if (v === undefined || v === null) return "";
  return String(v).trim();
}

function requiredNumber(v, field) {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error(`Número inválido: ${field}`);
  return n;
}

function requiredPositiveNumber(v, field) {
  const n = requiredNumber(v, field);
  if (n <= 0) throw new Error(`Debe ser mayor a 0: ${field}`);
  return n;
}

function optionalPositiveNumber(v, field) {
  if (v === undefined || v === null || v === "") return undefined;
  return requiredPositiveNumber(v, field);
}

function optionalNonNegativeNumber(v, field) {
  if (v === undefined || v === null || v === "") return undefined;
  const n = requiredNumber(v, field);
  if (n < 0) throw new Error(`No puede ser negativo: ${field}`);
  return n;
}

function validateTelefono(v, field) {
  const s = requiredString(v, field);
  if (!/^[0-9+\-\s]{6,20}$/.test(s)) throw new Error(`Teléfono inválido: ${field}`);
  return s;
}

function validateDocumento(v, field) {
  const s = requiredString(v, field);
  if (!/^[0-9A-Za-z\-]{6,20}$/.test(s)) throw new Error(`Documento inválido: ${field}`);
  return s;
}

module.exports = {
  requiredString,
  optionalString,
  requiredNumber,
  requiredPositiveNumber,
  optionalPositiveNumber,
  optionalNonNegativeNumber,
  validateTelefono,
  validateDocumento
};

