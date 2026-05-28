jest.mock("../src/modules/_controllers", () => ({
  envioController: {
    listarHistorial: jest.fn(async () => ({
      ok: true,
      envios: [
        {
          codigoEnvio: "ENV-2026-0001",
          estadoActual: "Entregado",
          fechaRegistro: "2026-01-10T10:00:00.000Z",
          fechaUltimaActualizacion: "2026-01-12T15:00:00.000Z",
          origen: "Lima",
          destino: "Trujillo",
          remitente: { nombres: "Juan", documento: "12345678" },
          destinatario: { nombres: "María", documento: "87654321" }
        },
        {
          codigoEnvio: "ENV-2026-0002",
          estadoActual: "Observado",
          fechaRegistro: "2026-01-11T10:00:00.000Z",
          origen: "Arequipa",
          destino: "Cusco"
        }
      ]
    }))
  }
}));

const { consultar, computeKpisAvanzados } = require("../src/modules/reportes/reportes.service");

test("consultar devuelve envíos filtrados y KPIs", async () => {
  const r = await consultar({ estado: "Entregado", limitCount: 100 });
  expect(r.ok).toBe(true);
  expect(r.envios).toHaveLength(1);
  expect(r.envios[0].codigoEnvio).toBe("ENV-2026-0001");
  expect(r.resumen.kpis.porcentajeEntregados).toBe(100);
});

test("computeKpisAvanzados calcula eficiencia", () => {
  const kpis = computeKpisAvanzados([
    { estadoActual: "Entregado", fechaRegistro: "2026-01-01", fechaUltimaActualizacion: "2026-01-03" },
    { estadoActual: "Registrado", fechaRegistro: "2026-01-02" }
  ]);
  expect(kpis.eficienciaOperativa).toBe(50);
  expect(kpis.tiempoPromedioEntregaDias).toBe(2);
});
