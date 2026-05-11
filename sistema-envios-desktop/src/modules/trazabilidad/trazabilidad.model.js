const { requiredString, optionalString } = require("../../utils/validaciones");

function buildActualizacionEstado(input) {
  return {
    codigoEnvio: requiredString(input?.codigoEnvio, "codigoEnvio"),
    estado: requiredString(input?.estado, "estado"),
    observacion: optionalString(input?.observacion),
    responsable: optionalString(input?.responsable) || "Área de operaciones",
    evidenciaReferencia: optionalString(input?.evidenciaReferencia),
    evidenciaDetalle: optionalString(input?.evidenciaDetalle),
    registradoPor: optionalString(input?.registradoPor)
  };
}

module.exports = { buildActualizacionEstado };

