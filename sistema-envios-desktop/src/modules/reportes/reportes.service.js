const { envioController } = require("../_controllers");

function parseDayStart(isoDate) {
  if (!isoDate) return null;
  const t = Date.parse(`${isoDate}T00:00:00`);
  return Number.isFinite(t) ? t : null;
}

function parseDayEnd(isoDate) {
  if (!isoDate) return null;
  const t = Date.parse(`${isoDate}T23:59:59.999`);
  return Number.isFinite(t) ? t : null;
}

function normalize(s) {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

function filtrarEnvios(envios, { estado, desde, hasta, cliente }) {
  const q = normalize(cliente);
  const desdeT = parseDayStart(desde);
  const hastaT = parseDayEnd(hasta);

  return (envios || []).filter((e) => {
    if (estado && estado !== "Todos" && String(e.estadoActual || "") !== estado) return false;
    const t = Date.parse(e.fechaRegistro || "");
    if (desdeT !== null && (!Number.isFinite(t) || t < desdeT)) return false;
    if (hastaT !== null && (!Number.isFinite(t) || t > hastaT)) return false;
    if (!q) return true;
    const blob = [
      e.codigoEnvio,
      e.origen,
      e.destino,
      e.remitente?.nombres,
      e.remitente?.documento,
      e.destinatario?.nombres,
      e.destinatario?.documento,
      e.clienteAsociado?.nombres,
      e.clienteAsociado?.documento,
      e.clienteAsociado?.empresa
    ]
      .map(normalize)
      .join(" ");
    return blob.includes(q);
  });
}

function agruparPorMes(envios) {
  const map = new Map();
  for (const e of envios || []) {
    const iso = e.fechaRegistro || "";
    const m = iso.slice(0, 7);
    if (!m || m.length < 7) continue;
    map.set(m, (map.get(m) || 0) + 1);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([mes, total]) => ({ mes, total }));
}

function contarPorEstado(envios) {
  const map = new Map();
  for (const e of envios || []) {
    const st = String(e.estadoActual || "—").trim();
    map.set(st, (map.get(st) || 0) + 1);
  }
  return [...map.entries()].map(([estado, total]) => ({ estado, total }));
}

function topClientes(envios, limit = 8) {
  const map = new Map();
  for (const e of envios || []) {
    const nombre =
      e.clienteAsociado?.nombres?.trim() ||
      e.remitente?.nombres?.trim() ||
      e.destinatario?.nombres?.trim() ||
      "Sin nombre";
    const doc = e.clienteAsociado?.documento || e.remitente?.documento || "";
    const key = `${nombre}|${doc}`;
    const prev = map.get(key) || { nombre, documento: doc, total: 0 };
    prev.total += 1;
    map.set(key, prev);
  }
  return [...map.values()].sort((a, b) => b.total - a.total).slice(0, limit);
}

function tendenciaSemanal(envios) {
  const map = new Map();
  for (const e of envios || []) {
    const t = Date.parse(e.fechaRegistro || "");
    if (!Number.isFinite(t)) continue;
    const d = new Date(t);
    const onejan = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7);
    const key = `${d.getFullYear()}-S${String(week).padStart(2, "0")}`;
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([semana, total]) => ({ semana, total }));
}

function computeKpisAvanzados(envios) {
  const list = envios || [];
  const total = list.length;
  const entregados = list.filter((e) => e.estadoActual === "Entregado").length;
  const observados = list.filter((e) => e.estadoActual === "Observado").length;
  let sumDias = 0;
  let nEnt = 0;
  for (const e of list) {
    if (e.estadoActual !== "Entregado") continue;
    const t0 = Date.parse(e.fechaRegistro || "");
    const t1 = Date.parse(e.fechaUltimaActualizacion || e.fechaRegistro || "");
    if (Number.isFinite(t0) && Number.isFinite(t1) && t1 >= t0) {
      sumDias += (t1 - t0) / 86400000;
      nEnt += 1;
    }
  }
  return {
    porcentajeEntregados: total ? Math.round((entregados / total) * 100) : 0,
    porcentajeObservados: total ? Math.round((observados / total) * 100) : 0,
    eficienciaOperativa: total ? Math.round((entregados / total) * 100) : 0,
    tiempoPromedioEntregaDias: nEnt ? Math.round((sumDias / nEnt) * 10) / 10 : null,
    topClientes: topClientes(list),
    tendenciaSemanal: tendenciaSemanal(list)
  };
}

async function consultar(filtros = {}) {
  const limitCount = filtros.limitCount || 2000;
  const hist = await envioController.listarHistorial({
    estado: "Todos",
    limitCount
  });
  if (!hist?.ok) return hist;
  const filtrados = filtrarEnvios(hist.envios, filtros);
  return {
    ok: true,
    envios: filtrados,
    resumen: {
      total: filtrados.length,
      porEstado: contarPorEstado(filtrados),
      porMes: agruparPorMes(filtrados),
      entregados: filtrados.filter((e) => e.estadoActual === "Entregado").length,
      observados: filtrados.filter((e) => e.estadoActual === "Observado").length,
      kpis: computeKpisAvanzados(filtrados)
    }
  };
}

module.exports = {
  consultar,
  filtrarEnvios,
  contarPorEstado,
  agruparPorMes,
  computeKpisAvanzados,
  topClientes,
  tendenciaSemanal
};
