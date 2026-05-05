const { buildUbicacion } = require("../src/modules/geolocalizacion-qr/ubicacion.model");

test("buildUbicacion valida coordenadas numéricas", () => {
  expect(() => buildUbicacion({ codigoEnvio: "X", direccion: "A", latitud: "abc", longitud: "1" })).toThrow();
  const u = buildUbicacion({ codigoEnvio: "ENV-2026-0001", direccion: "Lima", latitud: "-12.1", longitud: "-77.0" });
  expect(u.latitud).toBe("-12.1");
});

