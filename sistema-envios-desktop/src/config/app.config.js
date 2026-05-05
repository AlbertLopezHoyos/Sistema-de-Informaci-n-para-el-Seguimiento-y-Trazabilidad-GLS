function numEnv(key, fallback) {
  const raw = process.env[key];
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

module.exports = {
  appName: process.env.APP_NAME || "Sistema de Envíos - GLS",
  env: process.env.APP_ENV || "development",
  areaResponsableDefault: "Área de operaciones",
  /** Valores sugeridos para el formulario de cotización (editables por el usuario). */
  cotizacionDefaults: {
    moneda: process.env.COT_MONEDA_DEFAULT || "PEN",
    distanciaKm: (() => {
      const raw = process.env.COT_DISTANCIA_KM;
      if (raw === undefined || raw === "") return undefined;
      const n = Number(raw);
      return Number.isFinite(n) ? n : undefined;
    })(),
    tarifaPorKg: numEnv("COT_TARIFA_KG", 2.5),
    tarifaPorM3: numEnv("COT_TARIFA_M3", 180),
    tarifaPorKm: numEnv("COT_TARIFA_KM", 1.2),
    seguroPorcentaje: numEnv("COT_SEGURO_PCT", 0)
  },
  estadosPermitidos: [
    "Registrado",
    "En tránsito",
    "En reparto",
    "Entregado",
    "Observado",
    "Cancelado"
  ]
};

