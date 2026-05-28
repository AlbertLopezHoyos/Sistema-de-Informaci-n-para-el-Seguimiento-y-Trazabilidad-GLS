/**
 * Contenido del QR: deep link relativo para abrir seguimiento en la app Electron.
 * Al escanear, el operador puede pegar/abrir la ruta en la app o usar ?codigo= en consulta.
 */
function buildQrDeepLink(codigoEnvio) {
  const codigo = String(codigoEnvio || "").trim();
  return `seguimiento-envio.html?codigo=${encodeURIComponent(codigo)}`;
}

function parseCodigoFromQrContent(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  try {
    if (s.includes("codigo=")) {
      const q = s.includes("?") ? s.slice(s.indexOf("?")) : `?${s}`;
      const p = new URLSearchParams(q.startsWith("?") ? q : `?${q}`);
      return (p.get("codigo") || p.get("c") || "").trim();
    }
  } catch (_) {}
  const m = s.match(/ENV-\d{4}-\d{4,}/i);
  return m ? m[0].toUpperCase() : s;
}

module.exports = { buildQrDeepLink, parseCodigoFromQrContent };
