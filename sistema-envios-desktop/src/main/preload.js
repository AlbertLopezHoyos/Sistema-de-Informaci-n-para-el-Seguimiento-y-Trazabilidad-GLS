/**
 * Puente seguro renderer ↔ main (contextIsolation).
 * Todas las llamadas pasan por invoke(channel, payload).
 */
const { contextBridge, ipcRenderer } = require("electron");

function invoke(channel, payload) {
  return ipcRenderer.invoke(channel, payload);
}

/** Suscripción IPC: elimina solo el listener registrado (evita removeAllListeners). */
function on(channel, handler) {
  const wrapped = (_evt, data) => handler(data);
  ipcRenderer.on(channel, wrapped);
  return () => ipcRenderer.removeListener(channel, wrapped);
}

contextBridge.exposeInMainWorld("glsApi", {
  app: {
    ping: () => invoke("app:ping"),
    getFeatures: () => invoke("app:getFeatures"),
    getCotizacionDefaults: () => invoke("app:getCotizacionDefaults"),
    savePdfFile: (payload) => invoke("app:savePdfFile", payload || {}),
    exportHtmlToPdf: (payload) => invoke("app:exportHtmlToPdf", payload || {}),
    saveExportFile: (payload) => invoke("app:saveExportFile", payload || {})
  },
  auth: {
    policy: () => invoke("auth:policy"),
    me: () => invoke("auth:me"),
    login: (payload) => invoke("auth:login", payload),
    register: (payload) => invoke("auth:register", payload),
    logout: () => invoke("auth:logout"),
    touchSession: () => invoke("auth:touchSession"),
    listUsers: () => invoke("auth:listUsers"),
    inviteUser: (payload) => invoke("auth:inviteUser", payload),
    setActivo: (payload) => invoke("auth:setActivo", payload)
  },
  clientes: {
    listar: (opts) => invoke("clientes:listar", opts || {}),
    crear: (payload) => invoke("clientes:crear", payload),
    obtenerPorDocumento: (documento) => invoke("clientes:obtenerPorDocumento", { documento })
  },
  envios: {
     previewCotizacion: (data) => invoke("envios:previewCotizacion", data),
     crear: (data) => invoke("envios:crear", data),
     obtenerPorCodigo: (codigoEnvio) => invoke("envios:obtenerPorCodigo", { codigoEnvio }),
     listarActivos: (limitCount = 200) => invoke("envios:listarActivos", { limitCount }),
     listarHistorial: ({ estado = "Todos", limitCount = 800 } = {}) =>
       invoke("envios:listarHistorial", { estado, limitCount }),
     subscribeActivos: (callback, limitCount = 200) => {
       const unsubscribeLocal = on("envios:activos:update", callback);
       ipcRenderer.send("envios:subscribeActivos", { limitCount });
      return () => {
        ipcRenderer.send("envios:unsubscribeActivos");
        unsubscribeLocal();
      };
    }
  },
  trazabilidad: {
    buscar: (codigoEnvio) => invoke("trazabilidad:buscar", { codigoEnvio }),
    actualizarEstado: (payload) => invoke("trazabilidad:actualizarEstado", payload),
    listarEstados: () => invoke("trazabilidad:listarEstados")
  },
  geolocalizacionQr: {
    buscar: (codigoEnvio) => invoke("geo:buscar", { codigoEnvio }),
    registrarUbicacion: (payload) => invoke("geo:registrarUbicacion", payload),
    generarQr: (codigoEnvio) => invoke("geo:generarQr", { codigoEnvio }),
    qrEtiquetaHtml: (codigoEnvio) => invoke("geo:qrEtiquetaHtml", { codigoEnvio })
  },
  consulta: {
    leerCodigoPdf: (payload) => invoke("consulta:leerCodigoPdf", payload)
  },
  export: {
    buildEnvios: (payload) => invoke("export:buildEnvios", payload || {}),
    buildFromRows: (payload) => invoke("export:buildFromRows", payload || {})
  },
  reportes: {
    consultar: (payload) => invoke("reportes:consultar", payload || {})
  },
  auditoria: {
    listar: (payload) => invoke("auditoria:listar", payload || {})
  },
  backup: {
    exportar: () => invoke("backup:exportar"),
    importar: (backup) => invoke("backup:importar", { backup })
  }
});

