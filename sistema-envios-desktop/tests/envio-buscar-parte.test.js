const {
  buscarParteEnEnviosPorDocumento
} = require("../src/modules/envios/envio.repository");

jest.mock("../src/config/firebase.config", () => {
  const docs = [
    {
      id: "ENV-2026-0001",
      data: () => ({
        codigoEnvio: "ENV-2026-0001",
        fechaRegistro: "2026-01-10T10:00:00.000Z",
        remitente: {
          nombres: "Juan Pérez",
          documento: "12345678",
          telefono: "999888777",
          direccion: "Lima"
        },
        destinatario: {
          nombres: "María López",
          documento: "87654321",
          telefono: "988777666",
          direccion: "Trujillo"
        }
      })
    }
  ];
  return {
    getDb: () => ({}),
    collection: () => ({}),
    query: (...args) => args,
    orderBy: (...args) => args,
    limit: (...args) => args,
    getDocs: async () => ({
      docs
    })
  };
});

test("buscarParteEnEnviosPorDocumento encuentra remitente en envíos", async () => {
  const r = await buscarParteEnEnviosPorDocumento({ documento: "12345678", rol: "remitente" });
  expect(r.found).toBe(true);
  expect(r.parte.nombres).toBe("Juan Pérez");
  expect(r.parte.ultimoCodigoEnvio).toBe("ENV-2026-0001");
});

test("buscarParteEnEnviosPorDocumento encuentra destinatario", async () => {
  const r = await buscarParteEnEnviosPorDocumento({ documento: "87654321", rol: "destinatario" });
  expect(r.found).toBe(true);
  expect(r.parte.nombres).toBe("María López");
});

test("buscarParteEnEnviosPorDocumento no encuentra si nunca participó", async () => {
  const r = await buscarParteEnEnviosPorDocumento({ documento: "11111111", rol: "remitente" });
  expect(r.found).toBe(false);
});
