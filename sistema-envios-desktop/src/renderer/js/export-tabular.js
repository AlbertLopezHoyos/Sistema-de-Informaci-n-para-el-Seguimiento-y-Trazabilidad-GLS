/**
 * Exportación CSV / Excel (renderer → IPC main).
 */
(() => {
  function enviosToRows(envios) {
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

  async function saveBuilt(built, defaultFilename) {
    if (!built?.ok) throw new Error(built?.error || "No se pudo generar exportación");
    const ext = built.format === "xlsx" ? "xlsx" : "csv";
    return window.glsApi.app.saveExportFile({
      base64: built.base64,
      format: built.format,
      defaultFilename: defaultFilename || `export.${ext}`
    });
  }

  async function exportEnviosList(envios, format, defaultFilename, meta = {}) {
    const rows = enviosToRows(envios);
    const built = await window.glsApi.export.buildFromRows({
      rows,
      format,
      reportTitle: meta.reportTitle,
      filtersLine: meta.filtersLine,
      sheetName: meta.sheetName,
      total: meta.total != null ? meta.total : rows.length
    });
    return saveBuilt(built, defaultFilename);
  }

  async function exportAllEnvios(format, meta = {}) {
    const built = await window.glsApi.export.buildEnvios({
      format,
      limitCount: meta.limitCount || 2000,
      reportTitle: meta.reportTitle,
      filtersLine: meta.filtersLine
    });
    return saveBuilt(built, `historial-envios.${format === "xlsx" ? "xlsx" : "csv"}`);
  }

  window.GlsExportTabular = { enviosToRows, exportEnviosList, exportAllEnvios };
})();
