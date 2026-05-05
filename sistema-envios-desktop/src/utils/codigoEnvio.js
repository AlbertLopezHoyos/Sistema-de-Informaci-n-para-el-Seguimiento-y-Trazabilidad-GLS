function getYear(date = new Date()) {
  return String(date.getFullYear());
}

function pad4(n) {
  return String(n).padStart(4, "0");
}

function formatCodigoEnvio(year, consecutiveNumber) {
  return `ENV-${year}-${pad4(consecutiveNumber)}`;
}

module.exports = { getYear, pad4, formatCodigoEnvio };

