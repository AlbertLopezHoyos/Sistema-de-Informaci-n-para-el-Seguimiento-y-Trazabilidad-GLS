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
    getCotizacionDefaults: () => invoke("app:getCotizacionDefaults")
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

