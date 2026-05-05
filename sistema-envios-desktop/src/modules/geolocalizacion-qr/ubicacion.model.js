const { requiredString, optionalString } = require("../../utils/validaciones");

function requiredCoordinate(v, field) {
  const s = requiredString(v, field);
  const n = Number(s);
  if (!Number.isFinite(n)) throw new Error(`Coordenada inválida: ${field}`);
  return String(n);
}

function buildUbicacion(input) {
  return {
    codigoEnvio: requiredString(input?.codigoEnvio, "codigoEnvio"),
    direccion: requiredString(input?.direccion, "direccion"),
    latitud: requiredCoordinate(input?.latitud, "latitud"),
    longitud: requiredCoordinate(input?.longitud, "longitud"),
    observacion: optionalString(input?.observacion)
  };
}

module.exports = { buildUbicacion };

