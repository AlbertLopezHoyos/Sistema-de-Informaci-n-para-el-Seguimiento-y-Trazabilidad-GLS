const { buildLogSistema } = require("../src/modules/auditoria/auditoria.model");

test("buildLogSistema estructura mínima", () => {
  const row = buildLogSistema({
    usuario: "ops@test.com",
    rol: "operaciones",
    accion: "login",
    fecha: "2026-05-24T12:00:00.000Z",
    detalles: { ip: "local" }
  });
  expect(row.accion).toBe("login");
  expect(row.detalles.ip).toBe("local");
});
