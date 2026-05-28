const { buildQrDeepLink, parseCodigoFromQrContent } = require("../src/utils/qrDeepLink");

test("buildQrDeepLink genera enlace a seguimiento", () => {
  expect(buildQrDeepLink("ENV-2026-0001")).toBe("seguimiento-envio.html?codigo=ENV-2026-0001");
});

test("parseCodigoFromQrContent extrae codigo desde deep link", () => {
  expect(parseCodigoFromQrContent("seguimiento-envio.html?codigo=ENV-2026-0009")).toBe("ENV-2026-0009");
});

test("parseCodigoFromQrContent acepta solo codigo plano", () => {
  expect(parseCodigoFromQrContent("ENV-2026-0010")).toBe("ENV-2026-0010");
});
