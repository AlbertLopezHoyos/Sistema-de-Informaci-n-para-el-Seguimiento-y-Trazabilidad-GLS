const { requiredString, optionalString } = require("../../utils/validaciones");

function buildActualizacionEstado(input) {
  return {
    codigoEnvio: requiredString(input?.codigoEnvio, "codigoEnvio"),
    estado: requiredString(input?.estado, "estado"),
    observacion: optionalString(input?.observacion),
    responsable: optionalString(input?.responsable) || "Área de operaciones"
  };
}

module.exports = { buildActualizacionEstado };

