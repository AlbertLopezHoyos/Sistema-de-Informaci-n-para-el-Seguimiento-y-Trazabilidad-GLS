const { buildActualizacionEstado } = require("../src/modules/trazabilidad/trazabilidad.model");

test("buildActualizacionEstado requiere codigoEnvio y estado", () => {
  expect(() => buildActualizacionEstado({})).toThrow();
  const ok = buildActualizacionEstado({ codigoEnvio: "ENV-2026-0001", estado: "En tránsito" });
  expect(ok.codigoEnvio).toBe("ENV-2026-0001");
});

