const { ESTADOS_ACTIVOS } = require("../src/modules/envios/envio.repository");

describe("envio.repository ESTADOS_ACTIVOS", () => {
  test("incluye En almacén para seguimiento en tiempo real", () => {
    expect(ESTADOS_ACTIVOS.has("En almacén")).toBe(true);
    expect(ESTADOS_ACTIVOS.has("Registrado")).toBe(true);
    expect(ESTADOS_ACTIVOS.has("En tránsito")).toBe(true);
    expect(ESTADOS_ACTIVOS.has("En reparto")).toBe(true);
    expect(ESTADOS_ACTIVOS.has("Observado")).toBe(true);
  });

  test("no incluye estados finales en activos", () => {
    expect(ESTADOS_ACTIVOS.has("Entregado")).toBe(false);
    expect(ESTADOS_ACTIVOS.has("Cancelado")).toBe(false);
  });
});
