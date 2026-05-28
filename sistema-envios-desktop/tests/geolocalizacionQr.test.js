const { buildUbicacion } = require("../src/modules/geolocalizacion-qr/ubicacion.model");

test("buildUbicacion valida coordenadas numéricas", () => {
  expect(() => buildUbicacion({ codigoEnvio: "X", direccion: "A", latitud: "abc", longitud: "1" })).toThrow();
  const u = buildUbicacion({ codigoEnvio: "ENV-2026-0001", direccion: "Lima", latitud: "-12.1", longitud: "-77.0" });
  expect(u.latitud).toBe("-12.1");
});

test("buildUbicacion rechaza latitud fuera de rango", () => {
  expect(() =>
    buildUbicacion({
      codigoEnvio: "ENV-2026-0001",
      direccion: "X",
      latitud: "95",
      longitud: "-77"
    })
  ).toThrow(/Latitud/);
});

test("buildUbicacion rechaza longitud fuera de rango", () => {
  expect(() =>
    buildUbicacion({
      codigoEnvio: "ENV-2026-0001",
      direccion: "X",
      latitud: "-12",
      longitud: "200"
    })
  ).toThrow(/Longitud/);
});

test("buildUbicacion rechaza dirección vacía", () => {
  expect(() =>
    buildUbicacion({
      codigoEnvio: "ENV-2026-0001",
      direccion: "   ",
      latitud: "-12",
      longitud: "-77"
    })
  ).toThrow();
});

const { generarQrParaEnvio } = require("../src/modules/geolocalizacion-qr/qr.service");

jest.mock("../src/utils/qrGenerator", () => ({
  generateQrPng: jest.fn(async () => undefined)
}));

test("generarQrParaEnvio usa deep link en contenidoQr", async () => {
  const doc = await generarQrParaEnvio("ENV-2026-0003");
  expect(doc.contenidoQr).toContain("seguimiento-envio.html?codigo=");
  expect(doc.contenidoQr).toContain("ENV-2026-0003");
  expect(doc.rutaLocalQr).toMatch(/ENV-2026-0003\.png$/);
});

