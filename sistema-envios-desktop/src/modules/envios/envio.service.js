const path = require("path");

const { getDb, runTransaction, doc } = require("../../config/firebase.config");
const { areaResponsableDefault } = require("../../config/app.config");
const { nowIso } = require("../../utils/fechas");
const { getYear, formatCodigoEnvio } = require("../../utils/codigoEnvio");
const { generateQrPng } = require("../../utils/qrGenerator");
const { buildQrDeepLink } = require("../../utils/qrDeepLink");
const { buildEnvioDraft, buildDimensiones, buildCotizacionInput } = require("./envio.model");
const { requiredNumber } = require("../../utils/validaciones");
const { calcularCotizacion } = require("../../utils/cotizacionEnvio");
const {
  findEnvioByCodigo,
  getHistorialByCodigo,
  countersDocRef,
  listEnviosActivos,
  listEnviosHistorial,
  subscribeEnviosActivos,
  buscarParteEnEnviosPorDocumento
} = require("./envio.repository");

const clienteRepo = require("../clientes/cliente.repository");

function getQrOutputPaths(codigoEnvio) {
  const fileName = `${codigoEnvio}.png`;
  const absolute = path.join(__dirname, "..", "..", "renderer", "assets", "qr", fileName);
  const rutaLocalQr = path.join("src", "renderer", "assets", "qr", fileName).replaceAll("\\", "/");
  return { absolute, rutaLocalQr };
}

async function generarCodigoEnvioConsecutivo() {
  const year = getYear();
  const counterId = `ENV-${year}`;
  const counterRef = countersDocRef(counterId);

  const result = await runTransaction(getDb(), async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists() ? Number(snap.data()?.current || 0) : 0;
    const next = current + 1;
    tx.set(counterRef, { current: next, year, updatedAt: nowIso() }, { merge: true });
    return { year, next };
  });

  return formatCodigoEnvio(result.year, result.next);
}

function previewCotizacion(payload) {
  try {
    const peso = requiredNumber(payload?.peso, "peso");
    const dimensiones = buildDimensiones(payload?.dimensiones || payload);
    const cotizacion = buildCotizacionInput(payload);
    if (!cotizacion) {
      return { ok: true, cotizacionEstimada: null };
    }
    const cotizacionEstimada = calcularCotizacion({
      pesoKg: peso,
      dimensiones,
      cotizacion
    });
    return { ok: true, cotizacionEstimada };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

async function crearEnvio(payload) {
  const registradoPor = String(payload?.registradoPor || "").trim();
  const { registradoPor: _rp, ...payloadSinMeta } = payload || {};
  const draft = buildEnvioDraft(payloadSinMeta);
  const docCli = draft.clienteDocumentoAsociado;
  let clienteAsociado = null;
  if (docCli) {
    const c = await clienteRepo.obtenerPorDocumento(docCli);
    if (c) {
      clienteAsociado = {
        clienteId: c.id,
        documento: c.documento,
        nombres: c.nombres,
        telefono: c.telefono,
        direccion: c.direccion,
        empresa: c.empresa || ""
      };
    }
  }
  const { clienteDocumentoAsociado, ...draftRest } = draft;
  const fechaRegistro = nowIso();

  let cotizacionEstimada = null;
  if (draft.cotizacion) {
    cotizacionEstimada = calcularCotizacion({
      pesoKg: draft.peso,
      dimensiones: draft.dimensiones,
      cotizacion: draft.cotizacion
    });
  }

  const envioSinCodigo = {
    ...draftRest,
    ...(clienteAsociado ? { clienteAsociado } : {}),
    cotizacionEstimada,
    estadoActual: "Registrado",
    observacion: draft.observacion || "Sin observaciones"
  };

  const db = getDb();
  const year = getYear(new Date(fechaRegistro));
  const counterId = `ENV-${year}`;
  const counterRef = countersDocRef(counterId);

  let codigoEnvio;
  const created = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef);
    const current = snap.exists() ? Number(snap.data()?.current || 0) : 0;
    const next = current + 1;
    tx.set(counterRef, { current: next, year, updatedAt: fechaRegistro }, { merge: true });
    codigoEnvio = formatCodigoEnvio(year, next);

    const envio = {
      codigoEnvio,
      ...envioSinCodigo,
      fechaRegistro
    };

    const envioRef = doc(db, "envios", codigoEnvio);
    tx.set(envioRef, envio, { merge: false });

    const historialRef = doc(db, "historial_envios", `${codigoEnvio}__${fechaRegistro}`);
    tx.set(
      historialRef,
      {
        codigoEnvio,
        estado: "Registrado",
        fechaActualizacion: fechaRegistro,
        observacion: "Registro inicial del envío",
        responsable: areaResponsableDefault,
        evidenciaReferencia: "",
        evidenciaDetalle: "",
        registradoPor: registradoPor || ""
      },
      { merge: false }
    );

    return { envioId: envioRef.id, historialId: historialRef.id };
  });

  const { absolute, rutaLocalQr } = getQrOutputPaths(codigoEnvio);
  const contenidoQr = buildQrDeepLink(codigoEnvio);
  try {
    await generateQrPng({ content: contenidoQr, outputFilePath: absolute });
  } catch (err) {
    throw new Error(
      `El envío ${codigoEnvio} se guardó correctamente, pero falló la generación del QR en disco: ${err?.message || String(
        err
      )}. Use Geolocalización + QR para regenerarlo.`
    );
  }

  await runTransaction(db, async (tx) => {
    const qrRef = doc(db, "qr_envios", codigoEnvio);
    tx.set(
      qrRef,
      {
        codigoEnvio,
        contenidoQr,
        rutaLocalQr,
        fechaGeneracion: nowIso()
      },
      { merge: true }
    );
  });

  return { ok: true, codigoEnvio, created, rutaLocalQr };
}

async function obtenerPorCodigo(codigoEnvio) {
  const envio = await findEnvioByCodigo(codigoEnvio);
  if (!envio) return { ok: false, error: "Envío no encontrado" };
  const historial = await getHistorialByCodigo(codigoEnvio);
  return { ok: true, envio, historial };
}

async function listarActivos(opts) {
  const envios = await listEnviosActivos(opts);
  return { ok: true, envios };
}

async function listarHistorial(opts) {
  const envios = await listEnviosHistorial(opts);
  return { ok: true, envios };
}

/** Remitente o destinatario que ya participó en algún envío (datos del último envío encontrado). */
async function buscarPartePorDocumento({ documento, rol, limitScan } = {}) {
  const r = await buscarParteEnEnviosPorDocumento({ documento, rol, limitScan });
  if (r?.error) return { ok: false, error: r.error };
  if (!r?.found || !r.parte) {
    const etiqueta = rol === "destinatario" ? "destinatario" : "remitente";
    return {
      ok: false,
      error: `No hay envíos anteriores con ese documento como ${etiqueta}. Complete los datos manualmente.`
    };
  }
  return { ok: true, parte: r.parte };
}

function suscribirseActivos({ limitCount, onData, onError }) {
  return subscribeEnviosActivos({ limitCount, onData, onError });
}

module.exports = {
  previewCotizacion,
  crearEnvio,
  obtenerPorCodigo,
  generarCodigoEnvioConsecutivo,
  listarActivos,
  listarHistorial,
  buscarPartePorDocumento,
  suscribirseActivos
};

