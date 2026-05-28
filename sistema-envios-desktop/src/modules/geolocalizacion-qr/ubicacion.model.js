const { requiredString, optionalString } = require("../../utils/validaciones");

function requiredCoordinate(v, field) {
  const s = requiredString(v, field);
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error(`Coordenada inválida: ${field}`);
  if (field === "latitud" && (n < -90 || n > 90)) {
    throw new Error("Latitud fuera de rango válido (-90 a 90).");
  }
  if (field === "longitud" && (n < -180 || n > 180)) {
    throw new Error("Longitud fuera de rango válido (-180 a 180).");
  }
  return String(n);
}

function buildUbicacion(input) {
  return {
    codigoEnvio: requiredString(input?.codigoEnvio, "codigoEnvio"),
    direccion: requiredString(input?.direccion, "direccion"),
    latitud: requiredCoordinate(input?.latitud, "latitud"),
    longitud: requiredCoordinate(input?.longitud, "longitud"),
    observacion: optionalString(input?.observacion),
    responsable: optionalString(input?.responsable) || "Área de operaciones",
    registradoPor: optionalString(input?.registradoPor)
  };
}

module.exports = { buildUbicacion };

