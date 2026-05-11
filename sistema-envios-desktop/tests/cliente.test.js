const { buildCliente } = require("../src/modules/clientes/cliente.model");

test("buildCliente valida campos requeridos", () => {
  expect(() => buildCliente({})).toThrow();
  const ok = buildCliente({
    nombres: "Cliente Demo",
    documento: "12345678",
    telefono: "987654321",
    direccion: "Av. Test 123",
    empresa: "Empresa SAC"
  });
  expect(ok.nombres).toBe("Cliente Demo");
  expect(ok.empresa).toBe("Empresa SAC");
});
