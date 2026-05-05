function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

function dimensionesAMetros(d) {
  const u = String(d?.unidadMedida || "cm").toLowerCase();
  const largo = Number(d?.largo);
  const ancho = Number(d?.ancho);
  const alto = Number(d?.alto);
  if (!Number.isFinite(largo) || !Number.isFinite(ancho) || !Number.isFinite(alto)) {
    throw new Error("Dimensiones inválidas para cotización");
  }

  if (u === "m") return { largoM: largo, anchoM: ancho, altoM: alto };
  if (u === "cm") return { largoM: largo / 100, anchoM: ancho / 100, altoM: alto / 100 };
  if (u === "pulgadas") return { largoM: largo * 0.0254, anchoM: ancho * 0.0254, altoM: alto * 0.0254 };
  throw new Error("Unidad de dimensión inválida");
}

/**
 * Cotización simple para operaciones internas (no fiscal).
 * Combina peso real vs peso volumétrico (aprox.) y suma componentes opcionales por tarifas ingresadas.
 */
function calcularCotizacion({ pesoKg, dimensiones, cotizacion }) {
  const pesoReal = Number(pesoKg);
  if (!Number.isFinite(pesoReal)) throw new Error("Peso inválido para cotización");

  const { largoM, anchoM, altoM } = dimensionesAMetros(dimensiones);
  const volumenM3 = largoM * anchoM * altoM;
  // Factor típico transporte terrestre (orden de magnitud para cotización interna)
  const pesoVolumetricoKg = volumenM3 * 250;
  const pesoCobradoKg = Math.max(pesoReal, pesoVolumetricoKg);

  const moneda = cotizacion?.moneda || "PEN";

  const tarifaPorKg = cotizacion?.tarifaPorKg;
  const tarifaPorM3 = cotizacion?.tarifaPorM3;
  const tarifaPorKm = cotizacion?.tarifaPorKm;
  const distanciaKm = cotizacion?.distanciaKm;
  const seguroPct = cotizacion?.seguroPorcentaje ?? 0;

  const costoPorPeso = typeof tarifaPorKg === "number" ? pesoCobradoKg * tarifaPorKg : 0;
  const costoPorVolumen = typeof tarifaPorM3 === "number" ? volumenM3 * tarifaPorM3 : 0;
  const costoPorDistancia =
    typeof tarifaPorKm === "number" && typeof distanciaKm === "number" ? distanciaKm * tarifaPorKm : 0;

  const subtotal = costoPorPeso + costoPorVolumen + costoPorDistancia;
  const seguroMonto = subtotal > 0 && seguroPct > 0 ? subtotal * (seguroPct / 100) : 0;
  const totalEstimado = subtotal + seguroMonto;

  return {
    moneda,
    volumenM3: round2(volumenM3),
    pesoVolumetricoKg: round2(pesoVolumetricoKg),
    pesoCobradoKg: round2(pesoCobradoKg),
    desglose: {
      costoPorPeso: round2(costoPorPeso),
      costoPorVolumen: round2(costoPorVolumen),
      costoPorDistancia: round2(costoPorDistancia),
      subtotal: round2(subtotal),
      seguroPorcentaje: seguroPct,
      seguroMonto: round2(seguroMonto),
      totalEstimado: round2(totalEstimado)
    },
    nota:
      "Estimación operativa interna. Ajustar tarifas según política comercial / tabla vigente de la empresa."
  };
}

module.exports = { calcularCotizacion, dimensionesAMetros, round2 };
