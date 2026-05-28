const { formatCodigoEnvio } = require("../src/utils/codigoEnvio");
const { buildEnvioDraft } = require("../src/modules/envios/envio.model");

test("registro: generación de código único respeta formato ENV-AAAA-NNNN", () => {
  expect(formatCodigoEnvio("2026", 1)).toMatch(/^ENV-2026-\d{4}$/);
});

test("registro: borrador con remitente y destinatario válidos", () => {
  const d = buildEnvioDraft({
    origen: "Lima",
    destino: "Arequipa",
    tipoCarga: "Paquete",
    descripcion: "Docs",
    peso: 2,
    dimensiones: { largo: 20, ancho: 15, alto: 10, unidadMedida: "cm" },
    remitente: { nombres: "A", documento: "12345678", telefono: "999888777", direccion: "X" },
    destinatario: { nombres: "B", documento: "87654321", telefono: "988777666", direccion: "Y" }
  });
  expect(d.remitente.documento).toBe("12345678");
  expect(d.destino).toBe("Arequipa");
});
