jest.mock("../src/config/firebase.config", () => ({
  getDb: jest.fn(),
  collection: jest.fn(),
  getDocs: jest.fn(),
  writeBatch: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn()
}));

const { validateBackupStructure, COLLECTIONS } = require("../src/modules/backup/backup.service");

test("validateBackupStructure exige meta y arrays por colección", () => {
  const ok = {
    meta: { exportedAt: "2026-01-01T00:00:00.000Z" },
    data: Object.fromEntries(COLLECTIONS.map((c) => [c, []]))
  };
  expect(validateBackupStructure(ok)).toBe(true);
  expect(() => validateBackupStructure({})).toThrow(/inválido/i);
  expect(() =>
    validateBackupStructure({
      meta: { exportedAt: "x" },
      data: { envios: "no-array" }
    })
  ).toThrow(/envios/);
});
