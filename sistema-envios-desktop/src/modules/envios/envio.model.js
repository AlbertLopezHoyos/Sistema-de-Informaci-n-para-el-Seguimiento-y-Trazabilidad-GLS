const {
  requiredString,
  optionalString,
  requiredNumber,
  requiredPositiveNumber,
  optionalPositiveNumber,
  optionalNonNegativeNumber,
  validateDocumento,
  validateTelefono
} = require("../../utils/validaciones");

function buildDimensiones(input) {
  const unidadRaw = optionalString(input?.unidadMedida) || "cm";
  const unidad = unidadRaw.toLowerCase();
  const permitidas = ["cm", "m", "pulgadas"];
  if (!permitidas.includes(unidad)) {
    throw new Error("Unidad de medida inválida (use cm, m o pulgadas)");
  }

  return {
    largo: requiredPositiveNumber(input?.largo, "dimensiones.largo"),
    ancho: requiredPositiveNumber(input?.ancho, "dimensiones.ancho"),
    alto: requiredPositiveNumber(input?.alto, "dimensiones.alto"),
    unidadMedida: unidad
  };
}

function buildCotizacionInput(input) {
  const c = input?.cotizacion || {};

  const moneda = optionalString(c.moneda || input?.cot_moneda) || "PEN";
  const distanciaKm = optionalPositiveNumber(c.distanciaKm ?? input?.cot_distanciaKm, "cotizacion.distanciaKm");
  const tarifaPorKg = optionalPositiveNumber(c.tarifaPorKg ?? input?.cot_tarifaKg, "cotizacion.tarifaPorKg");
  const tarifaPorM3 = optionalPositiveNumber(c.tarifaPorM3 ?? input?.cot_tarifaM3, "cotizacion.tarifaPorM3");
  const tarifaPorKm = optionalPositiveNumber(c.tarifaPorKm ?? input?.cot_tarifaKm, "cotizacion.tarifaPorKm");
  const seguroPorcentaje = optionalNonNegativeNumber(c.seguroPorcentaje ?? input?.cot_seguroPct, "cotizacion.seguroPorcentaje");

  const hasAny =
    distanciaKm !== undefined ||
    tarifaPorKg !== undefined ||
    tarifaPorM3 !== undefined ||
    tarifaPorKm !== undefined ||
    (seguroPorcentaje !== undefined && seguroPorcentaje > 0);

  if (!hasAny) return null;

  if (seguroPorcentaje !== undefined && seguroPorcentaje > 100) {
    throw new Error("Seguro inválido: debe estar entre 0 y 100");
  }

  return {
    moneda,
    distanciaKm,
    tarifaPorKg,
    tarifaPorM3,
    tarifaPorKm,
    seguroPorcentaje: seguroPorcentaje ?? 0
  };
}

function buildEnvioDraft(input) {
  const remitente = input?.remitente || {};
  const destinatario = input?.destinatario || {};
  const dimensiones = buildDimensiones(input?.dimensiones || input);
  const cotizacion = buildCotizacionInput(input);

  return {
    remitente: {
      nombres: requiredString(remitente.nombres, "remitente.nombres"),
      documento: validateDocumento(remitente.documento, "remitente.documento"),
      telefono: validateTelefono(remitente.telefono, "remitente.telefono"),
      direccion: requiredString(remitente.direccion, "remitente.direccion")
    },
    destinatario: {
      nombres: requiredString(destinatario.nombres, "destinatario.nombres"),
      documento: validateDocumento(destinatario.documento, "destinatario.documento"),
      telefono: validateTelefono(destinatario.telefono, "destinatario.telefono"),
      direccion: requiredString(destinatario.direccion, "destinatario.direccion")
    },
    origen: requiredString(input?.origen, "origen"),
    destino: requiredString(input?.destino, "destino"),
    tipoCarga: requiredString(input?.tipoCarga, "tipoCarga"),
    descripcion: requiredString(input?.descripcion, "descripcion"),
    peso: requiredNumber(input?.peso, "peso"),
    dimensiones,
    cotizacion,
    observacion: optionalString(input?.observacion)
  };
}

module.exports = { buildEnvioDraft, buildDimensiones, buildCotizacionInput };

