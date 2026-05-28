const {
  rowsToCorporateCsv,
  rowsToCorporateWorkbookBuffer,
  enviosToExportRows,
  COMPANY
} = require("../src/utils/exportTabular");

test("enviosToExportRows mapea columnas", () => {
  const rows = enviosToExportRows([
    { codigoEnvio: "ENV-2026-0001", estadoActual: "Registrado", origen: "Lima", destino: "Arequipa" }
  ]);
  expect(rows[0].Codigo).toBe("ENV-2026-0001");
  expect(rows[0].Estado).toBe("Registrado");
});

test("rowsToCorporateCsv incluye cabecera corporativa y columnas en español", () => {
  const csv = rowsToCorporateCsv(
    [{ Codigo: "ENV-2026-0001", Estado: "OK", Origen: "Lima", Destino: "AQP" }],
    { reportTitle: "Reporte de prueba", filtersLine: "Filtros: Estado: Todos" }
  );
  expect(csv.charCodeAt(0)).toBe(0xfeff);
  expect(csv).toContain(COMPANY);
  expect(csv).toContain("Reporte de prueba");
  expect(csv).toContain("Código envío");
  expect(csv).toContain("ENV-2026-0001");
  expect(csv).toContain("Filtros: Estado: Todos");
});

test(
  "rowsToCorporateWorkbookBuffer genera xlsx con datos",
  async () => {
  const buf = await rowsToCorporateWorkbookBuffer(
    [{ Codigo: "ENV-2026-0002", Estado: "Entregado" }],
    { reportTitle: "Excel test", sheetName: "Prueba" }
  );
  expect(Buffer.isBuffer(buf)).toBe(true);
  expect(buf.length).toBeGreaterThan(100);
  expect(buf[0]).toBe(0x50);
  expect(buf[1]).toBe(0x4b);
  },
  20000
);
