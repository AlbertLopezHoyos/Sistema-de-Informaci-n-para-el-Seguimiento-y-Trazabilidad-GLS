function nowIso() {
  return new Date().toISOString();
}

function humanDateTime(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString();
  } catch {
    return String(iso);
  }
}

module.exports = { nowIso, humanDateTime };

