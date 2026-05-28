const { requiredString, optionalString } = require("../../utils/validaciones");

function buildLogSistema(input) {
  const detalles = input?.detalles;
  return {
    usuario: requiredString(input?.usuario ?? "sistema", "usuario"),
    rol: optionalString(input?.rol) || "—",
    accion: requiredString(input?.accion, "accion"),
    fecha: requiredString(input?.fecha, "fecha"),
    detalles:
      detalles && typeof detalles === "object" && !Array.isArray(detalles)
        ? detalles
        : { mensaje: optionalString(detalles) || "" }
  };
}

module.exports = { buildLogSistema };
