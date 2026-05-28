const { humanizeError, formatIpcCatch } = require("../src/utils/glsErrors");

test("humanizeError: índice Firestore", () => {
  const msg = humanizeError("FAILED_PRECONDITION: requires an index", "firestore");
  expect(msg).toMatch(/índice/i);
});

test("humanizeError: sesión", () => {
  expect(humanizeError("SESSION_EXPIRED", "auth")).toMatch(/sesión/i);
});

test("formatIpcCatch devuelve string", () => {
  const s = formatIpcCatch(new Error("permission denied"), "storage");
  expect(typeof s).toBe("string");
  expect(s.length).toBeGreaterThan(3);
});
