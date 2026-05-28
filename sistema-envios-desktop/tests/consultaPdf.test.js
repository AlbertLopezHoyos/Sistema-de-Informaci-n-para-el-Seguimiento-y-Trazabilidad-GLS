jest.mock("pdf-parse", () => ({
  PDFParse: jest.fn().mockImplementation(() => ({
    getText: jest.fn(async () => ({
      text: "Comprobante ENV-2026-0042 seguimiento-envio.html?codigo=ENV-2026-0042"
    })),
    destroy: jest.fn(async () => {})
  }))
}));

const { leerCodigoDesdePdfBuffer } = require("../src/modules/consulta/consulta.service");

test("leerCodigoDesdePdfBuffer extrae ENV desde texto del PDF", async () => {
  const r = await leerCodigoDesdePdfBuffer(Buffer.from("%PDF-1.4 fake"));
  expect(r.ok).toBe(true);
  expect(r.codigo).toBe("ENV-2026-0042");
});
