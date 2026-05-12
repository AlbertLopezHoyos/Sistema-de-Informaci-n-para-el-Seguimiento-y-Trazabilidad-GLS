const { contextBridge, ipcRenderer } = require("electron");

function invoke(channel, payload) {
  return ipcRenderer.invoke(channel, payload);
}

function on(channel, handler) {
  ipcRenderer.on(channel, (_evt, data) => handler(data));
  return () => ipcRenderer.removeAllListeners(channel);
}

contextBridge.exposeInMainWorld("glsApi", {
  app: {
    ping: () => invoke("app:ping"),
    getCotizacionDefaults: () => invoke("app:getCotizacionDefaults"),
    savePdfFile: (payload) => invoke("app:savePdfFile", payload || {})
  },
  auth: {
    policy: () => invoke("auth:policy"),
    me: () => invoke("auth:me"),
    login: (payload) => invoke("auth:login", payload),
    register: (payload) => invoke("auth:register", payload),
    logout: () => invoke("auth:logout"),
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
    generarQr: (codigoEnvio) => invoke("geo:generarQr", { codigoEnvio })
  }
});

