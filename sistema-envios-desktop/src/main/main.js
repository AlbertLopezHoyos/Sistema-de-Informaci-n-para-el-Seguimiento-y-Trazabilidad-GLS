const path = require("path");
const fs = require("fs").promises;
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const dotenv = require("dotenv");

dotenv.config({ path: path.join(__dirname, "..", "..", ".env") });

const { getMainWindowOptions } = require("./window.config");
const appConfig = require("../config/app.config");

const { envioController } = require("../modules/envios/envio.controller");
const { trazabilidadController } = require("../modules/trazabilidad/trazabilidad.controller");
const { geolocalizacionQrController } = require("../modules/geolocalizacion-qr/geolocalizacionQr.controller");
const { authController } = require("../modules/auth/auth.controller");
const { clienteController } = require("../modules/clientes/cliente.controller");
const envioService = require("../modules/envios/envio.service");

let mainWindow = null;
const activeSubs = new Map(); // webContentsId -> unsubscribe()
let currentUser = null; // session in main process

function getPagePath(pageFileName) {
  return path.join(__dirname, "..", "renderer", "pages", pageFileName);
}

function requireAdmin() {
  if (!currentUser || currentUser.rol !== "admin") {
    return { ok: false, error: "Requiere rol administrador." };
  }
  return null;
}

/** Solo administrador u operaciones pueden crear envíos (validación en proceso principal). */
function assertPuedeRegistrarEnvio() {
  const rol = String(currentUser?.rol || "").trim().toLowerCase();
  if (!currentUser || !rol) {
    throw new Error("No tiene permisos para registrar envíos.");
  }
  if (rol !== "admin" && rol !== "operaciones") {
    throw new Error("No tiene permisos para registrar envíos.");
  }
}

async function createMainWindow() {
  mainWindow = new BrowserWindow(getMainWindowOptions());

  mainWindow.once("ready-to-show", () => mainWindow.show());

  const startPage = getPagePath("login.html");
  await mainWindow.loadFile(startPage);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function registerIpcHandlers() {
  ipcMain.handle("app:ping", async () => ({ ok: true, ts: new Date().toISOString() }));

  ipcMain.handle("app:getCotizacionDefaults", async () => ({
    ok: true,
    defaults: appConfig.cotizacionDefaults
  }));

  /** Guardar PDF generado en el renderer (base64) — diálogo nativo de escritorio. */
  ipcMain.handle("app:savePdfFile", async (_evt, { defaultFilename, base64Pdf } = {}) => {
    try {
      if (!mainWindow) return { ok: false, error: "Ventana no disponible." };
      if (!base64Pdf) return { ok: false, error: "Sin datos PDF." };
      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: "Guardar comprobante PDF",
        defaultPath: defaultFilename || "comprobante-registro-envio.pdf",
        filters: [{ name: "PDF", extensions: ["pdf"] }]
      });
      if (canceled || !filePath) return { ok: true, canceled: true };
      await fs.writeFile(filePath, Buffer.from(String(base64Pdf), "base64"));
      return { ok: true, filePath };
    } catch (err) {
      return { ok: false, error: err?.message || String(err) };
    }
  });

  ipcMain.handle("auth:me", async () => ({ ok: true, user: currentUser }));

  ipcMain.handle("auth:logout", async () => {
    currentUser = null;
    return { ok: true };
  });

  ipcMain.handle("auth:policy", async () => {
    try {
      const n = await authController.countUsers();
      return { ok: true, registroAbierto: n === 0, usuariosRegistrados: n };
    } catch (err) {
      return { ok: false, error: err?.message || String(err) };
    }
  });

  ipcMain.handle("auth:register", async (_evt, payload) => {
    try {
      const n = await authController.countUsers();
      if (n > 0) {
        return { ok: false, error: "El registro directo está deshabilitado. Solicite alta a un administrador." };
      }
      const user = await authController.register(payload);
      currentUser = user;
      return { ok: true, user };
    } catch (err) {
      return { ok: false, error: err?.message || String(err) };
    }
  });

  ipcMain.handle("auth:login", async (_evt, payload) => {
    try {
      const user = await authController.login(payload);
      currentUser = user;
      return { ok: true, user };
    } catch (err) {
      return { ok: false, error: err?.message || String(err) };
    }
  });

  ipcMain.handle("auth:listUsers", async () => {
    const gate = requireAdmin();
    if (gate) return gate;
    try {
      const users = await authController.listUsersAdmin();
      return { ok: true, users };
    } catch (err) {
      return { ok: false, error: err?.message || String(err) };
    }
  });

  ipcMain.handle("auth:inviteUser", async (_evt, payload) => {
    const gate = requireAdmin();
    if (gate) return gate;
    try {
      const user = await authController.inviteUser(payload);
      return { ok: true, user };
    } catch (err) {
      return { ok: false, error: err?.message || String(err) };
    }
  });

  ipcMain.handle("auth:setActivo", async (_evt, payload) => {
    const gate = requireAdmin();
    if (gate) return gate;
    try {
      const user = await authController.setUsuarioActivo(payload || {});
      return { ok: true, user };
    } catch (err) {
      return { ok: false, error: err?.message || String(err) };
    }
  });

  ipcMain.handle("clientes:listar", async (_evt, payload) => {
    try {
      const clientes = await clienteController.listar(payload || {});
      return { ok: true, clientes };
    } catch (err) {
      return { ok: false, error: err?.message || String(err) };
    }
  });

  ipcMain.handle("clientes:crear", async (_evt, payload) => {
    try {
      const cliente = await clienteController.crear(payload || {});
      return { ok: true, cliente };
    } catch (err) {
      return { ok: false, error: err?.message || String(err) };
    }
  });

  ipcMain.handle("clientes:obtenerPorDocumento", async (_evt, payload) => {
    try {
      const cliente = await clienteController.obtenerPorDocumento(payload?.documento);
      return { ok: true, cliente };
    } catch (err) {
      return { ok: false, error: err?.message || String(err) };
    }
  });

  ipcMain.handle("envios:previewCotizacion", async (_evt, payload) => {
    try {
      return envioController.previewCotizacion(payload);
    } catch (err) {
      return { ok: false, error: err?.message || String(err) };
    }
  });

  ipcMain.handle("envios:crear", async (_evt, payload) => {
    try {
      assertPuedeRegistrarEnvio();
      const body = {
        ...(payload || {}),
        registradoPor: currentUser?.email || currentUser?.nombres || ""
      };
      return await envioController.crearEnvio(body);
    } catch (err) {
      return { ok: false, error: err?.message || String(err) };
    }
  });

  ipcMain.handle("envios:obtenerPorCodigo", async (_evt, payload) => {
    try {
      return await envioController.obtenerPorCodigo(payload.codigoEnvio);
    } catch (err) {
      return { ok: false, error: err?.message || String(err) };
    }
  });

  ipcMain.handle("envios:listarActivos", async (_evt, payload) => {
    try {
      return await envioController.listarActivos({ limitCount: payload?.limitCount || 200 });
    } catch (err) {
      return { ok: false, error: err?.message || String(err) };
    }
  });

  ipcMain.handle("envios:listarHistorial", async (_evt, payload) => {
    try {
      return await envioController.listarHistorial({
        estado: payload?.estado || "Todos",
        limitCount: payload?.limitCount || 800
      });
    } catch (err) {
      return { ok: false, error: err?.message || String(err) };
    }
  });

  ipcMain.on("envios:subscribeActivos", (evt, payload) => {
    try {
      const wcId = evt.sender.id;
      if (activeSubs.has(wcId)) return;

      const unsubscribe = envioService.suscribirseActivos({
        limitCount: payload?.limitCount || 200,
        onData: (envios) => {
          try {
            evt.sender.send("envios:activos:update", { ok: true, envios });
          } catch {}
        },
        onError: (err) => {
          try {
            evt.sender.send("envios:activos:update", { ok: false, error: err?.message || String(err) });
          } catch {}
        }
      });

      activeSubs.set(wcId, unsubscribe);

      evt.sender.once("destroyed", () => {
        const u = activeSubs.get(wcId);
        if (u) u();
        activeSubs.delete(wcId);
      });
    } catch (err) {
      try {
        evt.sender.send("envios:activos:update", { ok: false, error: err?.message || String(err) });
      } catch {}
    }
  });

  ipcMain.on("envios:unsubscribeActivos", (evt) => {
    const wcId = evt.sender.id;
    const u = activeSubs.get(wcId);
    if (u) u();
    activeSubs.delete(wcId);
  });

  ipcMain.handle("trazabilidad:buscar", async (_evt, payload) => {
    try {
      return await trazabilidadController.buscar(payload.codigoEnvio);
    } catch (err) {
      return { ok: false, error: err?.message || String(err) };
    }
  });

  ipcMain.handle("trazabilidad:listarEstados", async () => {
    try {
      return await trazabilidadController.listarEstados();
    } catch (err) {
      return { ok: false, error: err?.message || String(err) };
    }
  });

  ipcMain.handle("trazabilidad:actualizarEstado", async (_evt, payload) => {
    try {
      const body = {
        ...(payload || {}),
        registradoPor: currentUser?.email || currentUser?.nombres || ""
      };
      return await trazabilidadController.actualizarEstado(body);
    } catch (err) {
      return { ok: false, error: err?.message || String(err) };
    }
  });

  ipcMain.handle("geo:buscar", async (_evt, payload) => {
    try {
      return await geolocalizacionQrController.buscar(payload.codigoEnvio);
    } catch (err) {
      return { ok: false, error: err?.message || String(err) };
    }
  });

  ipcMain.handle("geo:registrarUbicacion", async (_evt, payload) => {
    try {
      return await geolocalizacionQrController.registrarUbicacion(payload);
    } catch (err) {
      return { ok: false, error: err?.message || String(err) };
    }
  });

  ipcMain.handle("geo:generarQr", async (_evt, payload) => {
    try {
      return await geolocalizacionQrController.generarQr(payload.codigoEnvio);
    } catch (err) {
      return { ok: false, error: err?.message || String(err) };
    }
  });

  ipcMain.handle("app:openErrorDialog", async (_evt, payload) => {
    await dialog.showMessageBox({
      type: "error",
      title: "Error",
      message: payload?.message || "Ocurrió un error"
    });
    return { ok: true };
  });
}

app.whenReady().then(async () => {
  registerIpcHandlers();
  await createMainWindow();

  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

