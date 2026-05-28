jest.mock("../src/modules/auth/auth.repository", () => ({
  findUserByEmail: jest.fn(),
  createUserAuth: jest.fn(),
  normEmail: (e) => String(e || "").trim().toLowerCase(),
  countUsuariosAuth: jest.fn(),
  listUsuariosAuthDocs: jest.fn(),
  setUsuarioActivoByEmail: jest.fn()
}));

jest.mock("bcryptjs", () => ({
  hash: jest.fn(async () => "hashed"),
  compare: jest.fn(async () => true)
}));

const authService = require("../src/modules/auth/auth.service");

test("login rechaza usuario inactivo", async () => {
  const repo = require("../src/modules/auth/auth.repository");
  repo.findUserByEmail.mockResolvedValueOnce({
    email: "x@test.com",
    activo: false,
    passwordHash: "h"
  });
  await expect(authService.login({ email: "x@test.com", password: "secret1" })).rejects.toThrow(/inactivo/i);
});

test("login rechaza credenciales inválidas (sin usuario)", async () => {
  const repo = require("../src/modules/auth/auth.repository");
  repo.findUserByEmail.mockResolvedValueOnce(null);
  await expect(authService.login({ email: "no@test.com", password: "secret1" })).rejects.toThrow(/inválid/i);
});
