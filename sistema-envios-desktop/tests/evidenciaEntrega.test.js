jest.mock("../src/config/firebase.config", () => ({
  isStorageConfigured: jest.fn(() => false)
}));

jest.mock("../src/modules/storage/evidencia.storage", () => ({
  uploadEvidenciaEntrega: jest.fn()
}));

const { persistirEvidenciaBase64, MAX_EVIDENCIA_BASE64_FIRESTORE } = require("../src/utils/evidenciaEntrega");

test("persistirEvidenciaBase64 acepta imagen pequeña", () => {
  const tiny = Buffer.from("x").toString("base64");
  const r = persistirEvidenciaBase64(`data:image/png;base64,${tiny}`, "foto.png");
  expect(r.modo).toBe("base64");
  expect(r.evidenciaNombreArchivo).toBe("foto.png");
});

test("persistirEvidenciaBase64 rechaza imagen mayor a 200KB sin Storage", () => {
  const big = Buffer.alloc(MAX_EVIDENCIA_BASE64_FIRESTORE + 10).toString("base64");
  expect(() => persistirEvidenciaBase64(`data:image/jpeg;base64,${big}`, "f.jpg")).toThrow(/200 KB|Storage/i);
});
