const { parseDataUrl, validateFilename, MAX_EVIDENCIA_BYTES } = require("../src/utils/uploadValidation");

test("parseDataUrl acepta PNG válido", () => {
  const tiny = Buffer.from("x").toString("base64");
  const r = parseDataUrl(`data:image/png;base64,${tiny}`);
  expect(r.mime).toBe("image/png");
  expect(r.buffer.length).toBe(1);
});

test("parseDataUrl rechaza mime no permitido", () => {
  const tiny = Buffer.from("x").toString("base64");
  expect(() => parseDataUrl(`data:image/gif;base64,${tiny}`)).toThrow(/no permitido/i);
});

test("parseDataUrl rechama archivos mayores a 5MB", () => {
  const big = Buffer.alloc(MAX_EVIDENCIA_BYTES + 1).toString("base64");
  expect(() => parseDataUrl(`data:image/jpeg;base64,${big}`)).toThrow(/máximo/i);
});

test("validateFilename acepta extensiones permitidas", () => {
  expect(validateFilename("foto.JPG")).toBe("foto.jpg");
  expect(() => validateFilename("doc.pdf")).toThrow(/extensión/i);
});
