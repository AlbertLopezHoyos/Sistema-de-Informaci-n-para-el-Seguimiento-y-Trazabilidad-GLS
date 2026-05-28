/**
 * Exportación CSV / Excel corporativa GLS (Node — IPC main).
 */
const COMPANY = "GRUPO LOGÍSTICO SALAZAR S.A.C.";
const SYSTEM = "Sistema de Información para el Seguimiento y Trazabilidad de Envíos";

const EXPORT_COLUMNS = [
  { key: "Codigo", header: "Código envío", width: 18 },
  { key: "Estado", header: "Estado", width: 16 },
  { key: "Origen", header: "Origen", width: 18 },
  { key: "Destino", header: "Destino", width: 18 },
  { key: "FechaRegistro", header: "Fecha registro", width: 20 },
  { key: "Remitente", header: "Remitente", width: 22 },
  { key: "RemitenteDoc", header: "Doc. remitente", width: 14 },
  { key: "Destinatario", header: "Destinatario", width: 22 },
  { key: "DestinatarioDoc", header: "Doc. destinatario", width: 14 },
  { key: "Cliente", header: "Cliente", width: 22 },
  { key: "ClienteDoc", header: "Doc. cliente", width: 14 },
  { key: "TipoCarga", header: "Tipo carga", width: 14 },
  { key: "PesoKg", header: "Peso (kg)", width: 10 }
];

const BRAND = {
  primary: "FF7A2828",
  accent: "FFF57C00",
  headerBg: "FF7A2828",
  headerFont: "FFFFFFFF",
  titleFont: "FF7A2828",
  mutedFont: "FF64748B",
  altRow: "FFF8FAFC",
  border: "FFE2E8F0"
};

function escapeCsvCell(v) {
  const s = String(v ?? "");
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function normalizeMeta(meta = {}) {
  return {
    reportTitle: meta.reportTitle || "Listado de envíos",
    filtersLine: meta.filtersLine || "",
    generatedAt: meta.generatedAt || new Date().toLocaleString("es-PE"),
    sheetName: (meta.sheetName || "Envíos").slice(0, 31),
    total: meta.total != null ? meta.total : null
  };
}

function enviosToExportRows(envios) {
  return (envios || []).map((e) => ({
    Codigo: e.codigoEnvio || "",
    Estado: e.estadoActual || "",
    Origen: e.origen || "",
    Destino: e.destino || "",
    FechaRegistro: e.fechaRegistro || "",
    Remitente: e.remitente?.nombres || "",
    RemitenteDoc: e.remitente?.documento || "",
    Destinatario: e.destinatario?.nombres || "",
    DestinatarioDoc: e.destinatario?.documento || "",
    Cliente: e.clienteAsociado?.nombres || "",
    ClienteDoc: e.clienteAsociado?.documento || "",
    TipoCarga: e.tipoCarga || "",
    PesoKg: e.peso ?? ""
  }));
}

function rowsToCorporateCsv(rows, meta = {}) {
  const m = normalizeMeta(meta);
  const total = m.total != null ? m.total : rows.length;
  const lines = [];

  lines.push(escapeCsvCell(COMPANY));
  lines.push(escapeCsvCell(m.reportTitle));
  lines.push(escapeCsvCell(SYSTEM));
  lines.push(escapeCsvCell(`Generado: ${m.generatedAt}`));
  if (m.filtersLine) lines.push(escapeCsvCell(m.filtersLine));
  lines.push(escapeCsvCell(`Total registros: ${total}`));
  lines.push("");

  const headerLine = EXPORT_COLUMNS.map((c) => escapeCsvCell(c.header)).join(",");
  lines.push(headerLine);
  for (const row of rows) {
    lines.push(EXPORT_COLUMNS.map((c) => escapeCsvCell(row[c.key])).join(","));
  }

  return `\uFEFF${lines.join("\r\n")}`;
}

function thinBorder() {
  const side = { style: "thin", color: { argb: BRAND.border } };
  return { top: side, left: side, bottom: side, right: side };
}

async function rowsToCorporateWorkbookBuffer(rows, meta = {}) {
  const ExcelJS = require("exceljs");
  const m = normalizeMeta(meta);
  const total = m.total != null ? m.total : rows.length;
  const colCount = EXPORT_COLUMNS.length;

  const wb = new ExcelJS.Workbook();
  wb.creator = "GLS Envíos — Salazar";
  wb.created = new Date();

  const ws = wb.addWorksheet(m.sheetName);

  let r = 1;
  ws.mergeCells(r, 1, r, colCount);
  const c1 = ws.getCell(r, 1);
  c1.value = COMPANY;
  c1.font = { name: "Segoe UI", size: 14, bold: true, color: { argb: BRAND.titleFont } };
  c1.alignment = { vertical: "middle", horizontal: "left" };
  r += 1;

  ws.mergeCells(r, 1, r, colCount);
  const c2 = ws.getCell(r, 1);
  c2.value = m.reportTitle;
  c2.font = { name: "Segoe UI", size: 12, bold: true, color: { argb: BRAND.accent } };
  r += 1;

  ws.mergeCells(r, 1, r, colCount);
  ws.getCell(r, 1).value = SYSTEM;
  ws.getCell(r, 1).font = { name: "Segoe UI", size: 10, color: { argb: BRAND.mutedFont } };
  r += 1;

  ws.mergeCells(r, 1, r, colCount);
  ws.getCell(r, 1).value = `Generado: ${m.generatedAt}  ·  Total: ${total} registro(s)`;
  ws.getCell(r, 1).font = { name: "Segoe UI", size: 10, italic: true, color: { argb: BRAND.mutedFont } };
  r += 1;

  if (m.filtersLine) {
    ws.mergeCells(r, 1, r, colCount);
    ws.getCell(r, 1).value = m.filtersLine;
    ws.getCell(r, 1).font = { name: "Segoe UI", size: 10, color: { argb: BRAND.mutedFont } };
    r += 1;
  }

  r += 1;

  const headerRowNum = r;
  const headerRow = ws.getRow(r);
  headerRow.height = 22;
  EXPORT_COLUMNS.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.headerBg } };
    cell.font = { name: "Segoe UI", size: 11, bold: true, color: { argb: BRAND.headerFont } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = thinBorder();
  });
  r += 1;

  rows.forEach((data, idx) => {
    const dataRow = ws.getRow(r);
    EXPORT_COLUMNS.forEach((col, i) => {
      const cell = dataRow.getCell(i + 1);
      cell.value = data[col.key] ?? "";
      cell.font = { name: "Segoe UI", size: 10 };
      cell.alignment = { vertical: "top", wrapText: true };
      cell.border = thinBorder();
      if (idx % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND.altRow } };
      }
    });
    r += 1;
  });

  EXPORT_COLUMNS.forEach((col, i) => {
    ws.getColumn(i + 1).width = col.width;
  });

  ws.views = [{ state: "frozen", ySplit: headerRowNum, activeCell: `A${headerRowNum + 1}` }];
  ws.autoFilter = {
    from: { row: headerRowNum, column: 1 },
    to: { row: headerRowNum, column: colCount }
  };

  return wb.xlsx.writeBuffer();
}

/** @deprecated Use rowsToCorporateCsv */
function rowsToCsv(rows) {
  return rowsToCorporateCsv(rows);
}

/** @deprecated Use rowsToCorporateWorkbookBuffer */
async function rowsToWorkbookBuffer(rows, sheetName = "Datos") {
  return rowsToCorporateWorkbookBuffer(rows, { sheetName });
}

module.exports = {
  EXPORT_COLUMNS,
  COMPANY,
  escapeCsvCell,
  enviosToExportRows,
  rowsToCorporateCsv,
  rowsToCorporateWorkbookBuffer,
  rowsToCsv,
  rowsToWorkbookBuffer
};
