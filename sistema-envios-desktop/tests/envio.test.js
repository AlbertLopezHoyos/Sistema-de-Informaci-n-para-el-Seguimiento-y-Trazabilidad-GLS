const { formatCodigoEnvio } = require("../src/utils/codigoEnvio");
const { buildEnvioDraft, buildCotizacionInput } = require("../src/modules/envios/envio.model");
const { calcularCotizacion } = require("../src/utils/cotizacionEnvio");

test("formatCodigoEnvio genera ENV-YYYY-0001", () => {
  expect(formatCodigoEnvio("2026", 1)).toBe("ENV-2026-0001");
  expect(formatCodigoEnvio("2026", 25)).toBe("ENV-2026-0025");
});

test("buildEnvioDraft valida campos mínimos", () => {
  const draft = buildEnvioDraft({
    origen: "Lima",
    destino: "Trujillo",
    tipoCarga: "Paquete",
    descripcion: "Caja",
    peso: 1.2,
    dimensiones: { largo: 10, ancho: 10, alto: 10, unidadMedida: "cm" },
    remitente: { nombres: "A", documento: "12345678", telefono: "999888777", direccion: "X" },
    destinatario: { nombres: "B", documento: "87654321", telefono: "988777666", direccion: "Y" }
  });
  expect(draft.origen).toBe("Lima");
  expect(draft.destinatario.nombres).toBe("B");
  expect(draft.dimensiones.unidadMedida).toBe("cm");
});

test("buildCotizacionInput devuelve null si no hay tarifas ni seguro", () => {
  expect(buildCotizacionInput({ cotizacion: { moneda: "PEN" } })).toBeNull();
});

test("calcularCotizacion combina peso y tarifa por kg", () => {
  const cot = calcularCotizacion({
    pesoKg: 10,
    dimensiones: { largo: 10, ancho: 10, alto: 10, unidadMedida: "cm" },
    cotizacion: { moneda: "PEN", tarifaPorKg: 2, seguroPorcentaje: 0 }
  });
  expect(cot.desglose.totalEstimado).toBeGreaterThan(0);
  expect(cot.moneda).toBe("PEN");
});

