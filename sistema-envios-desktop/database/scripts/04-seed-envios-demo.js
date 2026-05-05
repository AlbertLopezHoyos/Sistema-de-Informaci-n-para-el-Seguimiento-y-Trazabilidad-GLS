const path = require("path");
const { getDb, doc, setDoc } = require("../../src/config/firebase.config");
const { generateQrPng } = require("../../src/utils/qrGenerator");

function qrPaths(codigoEnvio) {
  const fileName = `${codigoEnvio}.png`;
  const absolute = path.join(__dirname, "..", "..", "src", "renderer", "assets", "qr", fileName);
  const rutaLocalQr = path.join("src", "renderer", "assets", "qr", fileName).replaceAll("\\", "/");
  return { absolute, rutaLocalQr };
}

module.exports = async function seedEnviosDemo() {
  console.log("[seed] 04-seed-envios-demo");
  const db = getDb();
  const year = String(new Date().getFullYear());

  const demos = [
    {
      codigoEnvio: `ENV-${year}-9001`,
      remitente: {
        nombres: "Juan Pérez",
        documento: "45678912",
        telefono: "999888777",
        direccion: "Los Olivos, Lima"
      },
      destinatario: {
        nombres: "María López",
        documento: "76543210",
        telefono: "988777666",
        direccion: "Trujillo, La Libertad"
      },
      origen: "Lima",
      destino: "Trujillo",
      tipoCarga: "Paquete",
      descripcion: "Caja mediana",
      peso: 12.5,
      dimensiones: { largo: 60, ancho: 40, alto: 35, unidadMedida: "cm" },
      estadoActual: "Registrado",
      fechaRegistro: new Date().toISOString(),
      observacion: "Envío demo",
      demo: true
    },
    {
      codigoEnvio: `ENV-${year}-9002`,
      remitente: {
        nombres: "Empresa ABC SAC",
        documento: "20123456789",
        telefono: "01 555 1111",
        direccion: "San Isidro, Lima"
      },
      destinatario: {
        nombres: "Tienda XYZ",
        documento: "10444555666",
        telefono: "044 222333",
        direccion: "Chiclayo, Lambayeque"
      },
      origen: "Lima",
      destino: "Chiclayo",
      tipoCarga: "Documentos",
      descripcion: "Sobre manila",
      peso: 1.2,
      dimensiones: { largo: 32, ancho: 24, alto: 2, unidadMedida: "cm" },
      estadoActual: "En tránsito",
      fechaRegistro: new Date().toISOString(),
      observacion: "Envío demo",
      demo: true
    }
  ];

  for (const envio of demos) {
    await setDoc(doc(db, "envios", envio.codigoEnvio), envio, { merge: true });

    const h1Date = envio.fechaRegistro;
    await setDoc(
      doc(db, "historial_envios", `${envio.codigoEnvio}__${h1Date}`),
      {
        codigoEnvio: envio.codigoEnvio,
        estado: "Registrado",
        fechaActualizacion: h1Date,
        observacion: "Registro inicial (demo)",
        responsable: "Área de operaciones",
        demo: true
      },
      { merge: true }
    );

    if (envio.estadoActual !== "Registrado") {
      const h2Date = new Date(Date.now() + 60_000).toISOString();
      await setDoc(
        doc(db, "historial_envios", `${envio.codigoEnvio}__${h2Date}`),
        {
          codigoEnvio: envio.codigoEnvio,
          estado: envio.estadoActual,
          fechaActualizacion: h2Date,
          observacion: "Actualización de estado (demo)",
          responsable: "Área de operaciones",
          demo: true
        },
        { merge: true }
      );
    }

    const { absolute, rutaLocalQr } = qrPaths(envio.codigoEnvio);
    await generateQrPng({ content: envio.codigoEnvio, outputFilePath: absolute });
    await setDoc(
      doc(db, "qr_envios", envio.codigoEnvio),
      {
        codigoEnvio: envio.codigoEnvio,
        contenidoQr: envio.codigoEnvio,
        rutaLocalQr,
        fechaGeneracion: new Date().toISOString(),
        demo: true
      },
      { merge: true }
    );
  }
};

