const { requiredString, optionalString, validateDocumento, validateTelefono } = require("../../utils/validaciones");

function buildCliente(input) {
  return {
    nombres: requiredString(input?.nombres, "cliente.nombres"),
    documento: validateDocumento(input?.documento, "cliente.documento"),
    telefono: validateTelefono(input?.telefono, "cliente.telefono"),
    direccion: requiredString(input?.direccion, "cliente.direccion"),
    empresa: optionalString(input?.empresa)
  };
}

module.exports = { buildCliente };
