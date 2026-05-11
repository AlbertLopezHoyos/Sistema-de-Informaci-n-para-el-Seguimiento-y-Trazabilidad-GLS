const path = require("path");
const { getDb, doc, setDoc, getDoc } = require("../../src/config/firebase.config");
const { formatCodigoEnvio, getYear } = require("../../src/utils/codigoEnvio");
const { calcularCotizacion } = require("../../src/utils/cotizacionEnvio");
const { generateQrPng } = require("../../src/utils/qrGenerator");
const { areaResponsableDefault } = require("../../src/config/app.config");
const { obtenerPorDocumento } = require("../../src/modules/clientes/cliente.repository");

const REGISTRADO_POR = "operaciones@gls.pe";

function qrAbsPath(codigoEnvio) {
  return path.join(__dirname, "..", "..", "src", "renderer", "assets", "qr", `${codigoEnvio}.png`);
}

function rutaLocalQrRel(codigoEnvio) {
  return path.join("src", "renderer", "assets", "qr", `${codigoEnvio}.png`).replaceAll("\\", "/");
}

function ts(baseUtcMs, addMinutes) {
  return new Date(baseUtcMs + addMinutes * 60_000).toISOString();
}

function snapshotCliente(c) {
  if (!c) return null;
  return {
    clienteId: c.id,
    documento: c.documento,
    nombres: c.nombres,
    telefono: c.telefono || "",
    direccion: c.direccion || "",
    empresa: c.empresa || ""
  };
}

function dims(l, a, h) {
  return { largo: l, ancho: a, alto: h, unidadMedida: "cm" };
}

/**
 * Carga operativa en Firestore: envíos con trayectorias coherentes, historial,
 * qr_envios, archivos QR y ubicaciones puntuales. Idempotente por código fijo
 * ENV-{año}-0001 … 0008 (reemplaza documentos si ya existían).
 * Ejecutar después de 04-seed-clientes-operativos.
 */
module.exports = async function seedEnviosOperativos() {
  console.log("[seed] 06-seed-envios-operativos");
  const db = getDb();
  const year = getYear();
  const y = Number(year);
  const day0 = Date.UTC(y, 2, 10, 13, 30, 0);

  const cotPEN = { moneda: "PEN", tarifaPorKg: 2.6, tarifaPorKm: 1.15, distanciaKm: 980, seguroPorcentaje: 1.2 };

  const planes = [
    {
      n: 1,
      origen: "Lima",
      destino: "Trujillo",
      tipoCarga: "Carga general · palletizado",
      descripcion: "Repuestos automotriz — 3 pallets",
      peso: 14.2,
      dimensiones: dims(120, 100, 95),
      observacion: "Retiro programado almacén Callao.",
      clienteDoc: "20508910234",
      conCotizacion: true,
      estadoActual: "Registrado",
      eventos: [{ estado: "Registrado", observacion: "Registro inicial del envío", min: 0 }]
    },
    {
      n: 2,
      origen: "Chiclayo",
      destino: "Piura",
      tipoCarga: "Documentación y valijas",
      descripcion: "Valijas corporativas selladas",
      peso: 8.5,
      dimensiones: dims(55, 40, 28),
      observacion: "Entrega en sede Piura centro.",
      clienteDoc: null,
      conCotizacion: false,
      estadoActual: "En tránsito",
      eventos: [
        { estado: "Registrado", observacion: "Registro inicial del envío", min: 0 },
        { estado: "En tránsito", observacion: "Salida de Chiclayo — unidad asignada", min: 180 }
      ]
    },
    {
      n: 3,
      origen: "Lima",
      destino: "Arequipa",
      tipoCarga: "Carga refrigerada",
      descripcion: "Insumos alimentarios cadena frío",
      peso: 22.0,
      dimensiones: dims(140, 110, 105),
      observacion: "Control de temperatura obligatorio.",
      clienteDoc: "20100070991",
      conCotizacion: true,
      estadoActual: "En reparto",
      eventos: [
        { estado: "Registrado", observacion: "Registro inicial del envío", min: 0 },
        { estado: "En tránsito", observacion: "En ruta sur — peaje Chala", min: 240 },
        { estado: "En reparto", observacion: "Asignado a unidad urbana Arequipa", min: 500 }
      ],
      ubicaciones: [
        {
          min: 260,
          direccion: "Peaje de Chala, Carretera Panamericana Sur",
          latitud: "-15.86",
          longitud: "-74.82",
          observacion: "Control de ruta"
        },
        {
          min: 420,
          direccion: "Descanso Camaná, costa sur",
          latitud: "-16.62",
          longitud: "-72.71",
          observacion: "Verificación de sellos"
        }
      ]
    },
    {
      n: 4,
      origen: "Callao",
      destino: "Tacna",
      tipoCarga: "Paquetería consolidada",
      descripcion: "E-commerce — 42 bultos consolidados",
      peso: 31.4,
      dimensiones: dims(160, 120, 118),
      observacion: "Entrega con acuse en almacén Tacna.",
      clienteDoc: "20608881234",
      conCotizacion: true,
      estadoActual: "Entregado",
      eventos: [
        { estado: "Registrado", observacion: "Registro inicial del envío", min: 0 },
        { estado: "En tránsito", observacion: "Consolidado en hub Lima Sur", min: 120 },
        { estado: "En reparto", observacion: "En reparto urbano Tacna", min: 360 },
        {
          estado: "Entregado",
          observacion: "Entrega conforme en almacén destino",
          min: 400,
          evidenciaReferencia: "ACUSE-2026-8841",
          evidenciaDetalle: "Recibió almacén central Tacna — sellos conformes"
        }
      ]
    },
    {
      n: 5,
      origen: "Huancayo",
      destino: "Lima",
      tipoCarga: "Carga mixta",
      descripcion: "Textil y ferretería — observación en ruta",
      peso: 19.1,
      dimensiones: dims(100, 90, 88),
      observacion: "Retraso por neblina en la sierra; coordinado con cliente.",
      clienteDoc: null,
      conCotizacion: false,
      estadoActual: "Observado",
      eventos: [
        { estado: "Registrado", observacion: "Registro inicial del envío", min: 0 },
        { estado: "En tránsito", observacion: "Salida Huancayo", min: 90 },
        { estado: "Observado", observacion: "Demora por condición climática en Carretera Central", min: 200 }
      ]
    },
    {
      n: 6,
      origen: "Iquitos",
      destino: "Yurimaguas",
      tipoCarga: "Carga fluvial terrestre",
      descripcion: "Suministros para consolidación fluvial",
      peso: 11.0,
      dimensiones: dims(95, 80, 70),
      observacion: "Cancelado por cambio de modal de cliente.",
      clienteDoc: null,
      conCotizacion: false,
      estadoActual: "Cancelado",
      eventos: [
        { estado: "Registrado", observacion: "Registro inicial del envío", min: 0 },
        { estado: "Cancelado", observacion: "Cancelación solicitada por remitente — reprogramación fluvial", min: 45 }
      ]
    },
    {
      n: 7,
      origen: "Cusco",
      destino: "Puno",
      tipoCarga: "Maquinaria liviana desmontada",
      descripcion: "Componentes en cajas de madera certificada",
      peso: 28.7,
      dimensiones: dims(130, 95, 92),
      observacion: "Ruta altiplano — restricción nocturna.",
      clienteDoc: null,
      conCotizacion: true,
      estadoActual: "En tránsito",
      eventos: [
        { estado: "Registrado", observacion: "Registro inicial del envío", min: 0 },
        { estado: "En tránsito", observacion: "En ruta Juliaca — control documental OK", min: 300 }
      ]
    },
    {
      n: 8,
      origen: "Lima",
      destino: "Moyobamba",
      tipoCarga: "Medicamentos y material clínico",
      descripcion: "Cadena frío 2–8 °C — cajas térmicas",
      peso: 6.2,
      dimensiones: dims(62, 48, 38),
      observacion: "Prioridad sanitaria — contacto 24h.",
      clienteDoc: "10756489321",
      conCotizacion: true,
      estadoActual: "Registrado",
      eventos: [{ estado: "Registrado", observacion: "Registro inicial del envío", min: 0 }]
    }
  ];

  const remitentes = [
    { nombres: "Carlos Mendoza Rivas", documento: "45678912", telefono: "+51 999 112 334", direccion: "Av. Colonial 208, Callao" },
    { nombres: "Lucía Prado Sánchez", documento: "42389156", telefono: "+51 978 221 009", direccion: "Calle Torres Paz 540, Chiclayo" },
    { nombres: "Miguel Ángel Quispe", documento: "40192837", telefono: "+51 984 661 772", direccion: "Jr. Lampa 334, Cercado de Lima" },
    { nombres: "Distribuidora Pacífico Sur E.I.R.L.", documento: "20608881234", telefono: "+51 54 282611", direccion: "Calle Dean Valdivia 148, Arequipa" },
    { nombres: "Textiles Andinos S.A.", documento: "20988776655", telefono: "+51 64 321 900", direccion: "Av. Giráldez 901, Huancayo" },
    { nombres: "Logística Selva Norte", documento: "20455667788", telefono: "+51 65 231 441", direccion: "Malecón Tarapacá 120, Iquitos" },
    { nombres: "Minería Sur Cusco", documento: "20333445566", telefono: "+51 84 507 221", direccion: "Av. de la Cultura 210, Cusco" },
    { nombres: "Farmacia Regional Loreto", documento: "20111222333", telefono: "+51 1 478 0092", direccion: "Av. Abtao 1450, San Miguel, Lima" }
  ];

  const destinatarios = [
    { nombres: "Comercial Norte S.A.C.", documento: "20999111222", telefono: "+51 44 521 800", direccion: "Av. Larco 1410, Trujillo" },
    { nombres: "Retail Piura Centro", documento: "20888777666", telefono: "+51 73 334 112", direccion: "Av. Sánchez Cerro 2200, Piura" },
    { nombres: "Frigoríficos del Sur", documento: "20555444333", telefono: "+51 54 289 400", direccion: "Parque Industrial, Arequipa" },
    { nombres: "Bodega Zofratacna", documento: "20444333222", telefono: "+51 52 582 900", direccion: "Zona Franca Tacna, Lote 12" },
    { nombres: "Almacén Central Lima", documento: "20111999888", telefono: "+51 1 617 2200", direccion: "Av. Argentina 3258, San Martín de Porres" },
    { nombres: "Operaciones Yurimaguas", documento: "20677665544", telefono: "+51 65 351 200", direccion: "Jr. Progreso 88, Yurimaguas" },
    { nombres: "Obras Viales Puno", documento: "20222333444", telefono: "+51 51 367 700", direccion: "Carretera Juliaca s/n, Puno" },
    { nombres: "Red Salud Moyobamba", documento: "20777888999", telefono: "+51 42 941 500", direccion: "Jr. del Comercio 315, Moyobamba" }
  ];

  for (let i = 0; i < planes.length; i++) {
    const p = planes[i];
    const codigoEnvio = formatCodigoEnvio(year, p.n);
    const baseMs = day0 + (p.n - 1) * 86400000;

    let clienteAsociado = null;
    if (p.clienteDoc) {
      const cli = await obtenerPorDocumento(p.clienteDoc);
      clienteAsociado = snapshotCliente(cli);
      if (!clienteAsociado) {
        console.warn(`[seed]   aviso: sin cliente ${p.clienteDoc} en catálogo — ejecute 04 antes. Envío ${codigoEnvio} sin clienteAsociado.`);
      }
    }

    let cotizacionEstimada = null;
    if (p.conCotizacion) {
      cotizacionEstimada = calcularCotizacion({
        pesoKg: p.peso,
        dimensiones: p.dimensiones,
        cotizacion: cotPEN
      });
    }

    const fechaRegistro = ts(baseMs, p.eventos[0].min);
    const envioBase = {
      codigoEnvio,
      remitente: remitentes[i],
      destinatario: destinatarios[i],
      origen: p.origen,
      destino: p.destino,
      tipoCarga: p.tipoCarga,
      descripcion: p.descripcion,
      peso: p.peso,
      dimensiones: p.dimensiones,
      observacion: p.observacion,
      cotizacionEstimada,
      estadoActual: p.estadoActual,
      fechaRegistro
    };
    if (clienteAsociado) Object.assign(envioBase, { clienteAsociado });

    const ultimo = p.eventos[p.eventos.length - 1];
    if (p.estadoActual === "Entregado" && ultimo.evidenciaReferencia) {
      const fe = ts(baseMs, ultimo.min);
      envioBase.evidenciaEntrega = {
        referencia: String(ultimo.evidenciaReferencia).trim(),
        detalle: String(ultimo.evidenciaDetalle || "").trim(),
        fecha: fe,
        registradoPor: REGISTRADO_POR
      };
    }

    await setDoc(doc(db, "envios", codigoEnvio), envioBase, { merge: false });
    console.log(`[seed]   envio ${codigoEnvio} (${p.estadoActual})`);

    for (const ev of p.eventos) {
      const fechaActualizacion = ts(baseMs, ev.min);
      const hid = `${codigoEnvio}__${fechaActualizacion}`;
      await setDoc(
        doc(db, "historial_envios", hid),
        {
          codigoEnvio,
          estado: ev.estado,
          fechaActualizacion,
          observacion: ev.observacion || "",
          responsable: areaResponsableDefault,
          evidenciaReferencia: String(ev.evidenciaReferencia || "").trim(),
          evidenciaDetalle: String(ev.evidenciaDetalle || "").trim(),
          registradoPor: REGISTRADO_POR
        },
        { merge: false }
      );
    }

    if (p.ubicaciones && p.ubicaciones.length) {
      for (const u of p.ubicaciones) {
        const fechaReg = ts(baseMs, u.min);
        const uid = `${codigoEnvio}__${fechaReg}`;
        await setDoc(
          doc(db, "ubicaciones_envios", uid),
          {
            codigoEnvio,
            direccion: u.direccion,
            latitud: String(u.latitud),
            longitud: String(u.longitud),
            observacion: u.observacion || "",
            fechaRegistro: fechaReg
          },
          { merge: false }
        );
      }
      console.log(`[seed]   ubicaciones ${codigoEnvio}: ${p.ubicaciones.length}`);
    }

    const rutaLocal = rutaLocalQrRel(codigoEnvio);
    await generateQrPng({ content: codigoEnvio, outputFilePath: qrAbsPath(codigoEnvio) });
    await setDoc(
      doc(db, "qr_envios", codigoEnvio),
      {
        codigoEnvio,
        contenidoQr: codigoEnvio,
        rutaLocalQr: rutaLocal,
        fechaGeneracion: new Date().toISOString()
      },
      { merge: true }
    );
    console.log(`[seed]   qr ${codigoEnvio}`);
  }

  const counterId = `ENV-${year}`;
  const counterRef = doc(db, "counters", counterId);
  const cs = await getDoc(counterRef);
  const prev = cs.exists() ? Number(cs.data()?.current || 0) : 0;
  const nextCurrent = Math.max(prev, planes.length);
  await setDoc(
    counterRef,
    {
      current: nextCurrent,
      year,
      updatedAt: new Date().toISOString(),
      note: "Sincronizado por seed operativo (06)"
    },
    { merge: true }
  );
  console.log(`[seed]   counters/${counterId} → current: ${nextCurrent} (antes: ${prev})`);
};
