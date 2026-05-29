const {
  getDb,
  doc,
  collection,
  query,
  where,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  orderBy,
  limit,
  onSnapshot
} = require("../../config/firebase.config");

function enviosCol() {
  return collection(getDb(), "envios");
}

function historialCol() {
  return collection(getDb(), "historial_envios");
}

function qrCol() {
  return collection(getDb(), "qr_envios");
}

function countersDocRef(counterId) {
  return doc(getDb(), "counters", counterId);
}

/** Estados que aparecen en Seguimiento (tiempo real), alineado con UI y app.config. */
const ESTADOS_ACTIVOS = new Set([
  "Registrado",
  "En almacén",
  "En tránsito",
  "En reparto",
  "Observado"
]);

async function listEnviosActivos({ limitCount = 200 } = {}) {
  // Sin `where in` + orderBy (evita índice compuesto). Se lee por fecha y se filtra en memoria.
  const activos = ESTADOS_ACTIVOS;
  const take = Math.min(Math.max(Number(limitCount) * 6, 400), 2000);
  const snap = await getDocs(query(enviosCol(), orderBy("fechaRegistro", "desc"), limit(take)));
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((e) => activos.has(e.estadoActual || ""));
  return rows.slice(0, limitCount);
}

async function listEnviosHistorial({ estado = "Todos", limitCount = 800 } = {}) {
  const baseLimit = Math.min(Math.max(Number(limitCount) || 800, 50), 2000);

  const snap = await getDocs(query(enviosCol(), orderBy("fechaRegistro", "desc"), limit(baseLimit)));
  let items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  if (estado && estado !== "Todos") {
    items = items.filter((e) => (e.estadoActual || "") === estado);
  }

  return items;
}

function isTransientFirestoreError(err) {
  const msg = String(err?.message || err || "").toLowerCase();
  const code = String(err?.code || "");
  return (
    code === "unavailable" ||
    code === "deadline-exceeded" ||
    /econnreset|unavailable|network|socket|aborted|internal|stream.*error/i.test(msg)
  );
}

function subscribeEnviosActivos({ limitCount = 200, onData, onError } = {}) {
  const activos = ESTADOS_ACTIVOS;
  const take = Math.min(Math.max(Number(limitCount) * 6, 400), 2000);
  const q = query(enviosCol(), orderBy("fechaRegistro", "desc"), limit(take));

  let unsub = null;
  let cancelled = false;
  let retryCount = 0;
  const maxRetries = 10;

  function mapSnap(snap) {
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((e) => activos.has(e.estadoActual || ""))
      .slice(0, limitCount);
  }

  function attach() {
    unsub = onSnapshot(
      q,
      (snap) => {
        retryCount = 0;
        onData?.(mapSnap(snap));
      },
      (err) => {
        if (cancelled) return;
        if (isTransientFirestoreError(err) && retryCount < maxRetries) {
          retryCount += 1;
          const delayMs = Math.min(15000, 800 * retryCount);
          console.warn(
            `[GLS] Firestore Listen reconectando (${retryCount}/${maxRetries}) en ${delayMs}ms:`,
            err?.message || err
          );
          try {
            unsub?.();
          } catch {}
          unsub = null;
          setTimeout(() => {
            if (!cancelled) attach();
          }, delayMs);
          return;
        }
        onError?.(err);
      }
    );
  }

  attach();

  return () => {
    cancelled = true;
    try {
      unsub?.();
    } catch {}
    unsub = null;
  };
}

function normalizeDocumentoBusqueda(documento) {
  return String(documento || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

/**
 * Busca remitente o destinatario por documento en envíos ya registrados (más reciente primero).
 * @param {{ documento: string, rol: 'remitente'|'destinatario', limitScan?: number }} opts
 */
async function buscarParteEnEnviosPorDocumento({ documento, rol = "remitente", limitScan = 2000 } = {}) {
  const docNorm = normalizeDocumentoBusqueda(documento);
  if (!docNorm || docNorm.length < 6) {
    return { found: false, error: "Documento inválido para búsqueda." };
  }
  if (rol !== "remitente" && rol !== "destinatario") {
    return { found: false, error: "Rol inválido." };
  }

  const take = Math.min(Math.max(Number(limitScan) || 2000, 100), 2000);
  const snap = await getDocs(query(enviosCol(), orderBy("fechaRegistro", "desc"), limit(take)));

  for (const d of snap.docs) {
    const data = d.data();
    const party = rol === "destinatario" ? data.destinatario : data.remitente;
    if (!party) continue;
    const partyDoc = normalizeDocumentoBusqueda(party.documento);
    if (partyDoc !== docNorm) continue;

    return {
      found: true,
      parte: {
        nombres: String(party.nombres || "").trim(),
        documento: String(party.documento || "").trim(),
        telefono: String(party.telefono || "").trim(),
        direccion: String(party.direccion || "").trim(),
        rol,
        ultimoCodigoEnvio: data.codigoEnvio || d.id,
        ultimaFechaRegistro: data.fechaRegistro || ""
      }
    };
  }

  return { found: false };
}

async function findEnvioByCodigo(codigoEnvio) {
  const ref = doc(getDb(), "envios", codigoEnvio);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

function sortHistorialPorFechaAsc(rows) {
  return rows.slice().sort((a, b) => {
    const ta = Date.parse(a.fechaActualizacion || "") || 0;
    const tb = Date.parse(b.fechaActualizacion || "") || 0;
    if (ta !== tb) return ta - tb;
    return String(a.id || "").localeCompare(String(b.id || ""));
  });
}

async function getHistorialByCodigo(codigoEnvio) {
  const q = query(historialCol(), where("codigoEnvio", "==", codigoEnvio));
  const snap = await getDocs(q);
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return sortHistorialPorFechaAsc(rows);
}

async function createEnvioDoc(envio) {
  const ref = await addDoc(enviosCol(), envio);
  return ref.id;
}

async function createHistorialEntry(entry) {
  const ref = await addDoc(historialCol(), entry);
  return ref.id;
}

async function upsertQrDoc(qrDocId, data) {
  await setDoc(doc(getDb(), "qr_envios", qrDocId), data, { merge: true });
  return qrDocId;
}

async function getCounter(counterId) {
  const ref = countersDocRef(counterId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { ref, current: 0 };
  return { ref, current: Number(snap.data()?.current || 0) };
}

module.exports = {
  ESTADOS_ACTIVOS,
  listEnviosActivos,
  listEnviosHistorial,
  subscribeEnviosActivos,
  buscarParteEnEnviosPorDocumento,
  findEnvioByCodigo,
  getHistorialByCodigo,
  createEnvioDoc,
  createHistorialEntry,
  upsertQrDoc,
  countersDocRef,
  getCounter
};

