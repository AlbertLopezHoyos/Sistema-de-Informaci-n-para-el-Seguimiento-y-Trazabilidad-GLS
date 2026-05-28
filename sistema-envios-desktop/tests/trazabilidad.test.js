const { buildActualizacionEstado } = require("../src/modules/trazabilidad/trazabilidad.model");
const { actualizarEstado } = require("../src/modules/trazabilidad/trazabilidad.service");

jest.mock("../src/modules/trazabilidad/trazabilidad.repository", () => ({
  getEnvioByCodigo: jest.fn(),
  getHistorialByCodigo: jest.fn(async () => []),
  listEstadosEnvio: jest.fn(async () => [])
}));

jest.mock("../src/utils/evidenciaEntrega", () => ({
  persistirEvidenciaImagen: jest.fn(async () => null),
  applyEvidenciaToHistorial: (h, e) => {
    if (!e) return h;
    return { ...h, ...e };
  },
  evidenciaPatchForEnvio: () => ({})
}));

jest.mock("../src/config/firebase.config", () => ({
  getDb: jest.fn(() => ({})),
  runTransaction: jest.fn(async (_db, fn) => {
    const tx = { set: jest.fn() };
    await fn(tx);
  }),
  doc: jest.fn((_db, coll, id) => ({ path: `${coll}/${id}` }))
}));

test("buildActualizacionEstado requiere codigoEnvio y estado", () => {
  expect(() => buildActualizacionEstado({})).toThrow();
  const ok = buildActualizacionEstado({ codigoEnvio: "ENV-2026-0001", estado: "En tránsito" });
  expect(ok.codigoEnvio).toBe("ENV-2026-0001");
});

test("buildActualizacionEstado acepta evidencia y registradoPor", () => {
  const d = buildActualizacionEstado({
    codigoEnvio: "ENV-2026-0001",
    estado: "Entregado",
    evidenciaReferencia: "REC-001",
    evidenciaDetalle: "Firmado",
    registradoPor: "ops@test.com"
  });
  expect(d.evidenciaReferencia).toBe("REC-001");
  expect(d.registradoPor).toBe("ops@test.com");
});

test("actualizarEstado rechaza Entregado sin evidencia referencia", async () => {
  const repo = require("../src/modules/trazabilidad/trazabilidad.repository");
  repo.getEnvioByCodigo.mockResolvedValueOnce({ codigoEnvio: "ENV-2026-0001" });
  await expect(
    actualizarEstado({ codigoEnvio: "ENV-2026-0001", estado: "Entregado", observacion: "Entrega completada" })
  ).rejects.toThrow(/evidencia/);
});

test("actualizarEstado rechaza sin observación suficiente", async () => {
  const repo = require("../src/modules/trazabilidad/trazabilidad.repository");
  repo.getEnvioByCodigo.mockResolvedValueOnce({ codigoEnvio: "ENV-2026-0001" });
  await expect(
    actualizarEstado({ codigoEnvio: "ENV-2026-0001", estado: "En tránsito", observacion: "ab" })
  ).rejects.toThrow(/observación/i);
});

test("actualizarEstado permite Entregado con referencia >= 4 caracteres", async () => {
  const repo = require("../src/modules/trazabilidad/trazabilidad.repository");
  repo.getEnvioByCodigo.mockResolvedValueOnce({ codigoEnvio: "ENV-2026-0001" });
  const r = await actualizarEstado({
    codigoEnvio: "ENV-2026-0001",
    estado: "Entregado",
    observacion: "Entrega conforme",
    evidenciaReferencia: "GUÍA-9",
    receptorNombre: "Juan Pérez",
    receptorDocumento: "12345678"
  });
  expect(r.ok).toBe(true);
});

test("actualizarEstado rechaza Entregado sin receptor válido", async () => {
  const repo = require("../src/modules/trazabilidad/trazabilidad.repository");
  repo.getEnvioByCodigo.mockResolvedValueOnce({ codigoEnvio: "ENV-2026-0001" });
  await expect(
    actualizarEstado({
      codigoEnvio: "ENV-2026-0001",
      estado: "Entregado",
      observacion: "Entrega conforme",
      evidenciaReferencia: "GUÍA-9",
      receptorNombre: "A",
      receptorDocumento: "123"
    })
  ).rejects.toThrow(/receptor|DNI/i);
});

