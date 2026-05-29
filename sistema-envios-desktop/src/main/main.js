const path = require("path");
const fs = require("fs").promises;
const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const dotenv = require("dotenv");
const fsSync = require("fs");

/** Carga .env de desarrollo y, en instalador, `gls.env` junto al ejecutable o en userData. */
function loadEnvironment() {
  const candidates = [path.join(__dirname, "..", "..", ".env")];
  try {
    if (app?.isReady?.()) {
      candidates.push(path.join(app.getPath("userData"), "gls.env"));
    }
  } catch (_) {}
  if (process.resourcesPath) {
    candidates.push(path.join(process.resourcesPath, "gls.env"));
  }
  for (const envPath of candidates) {
    try {
      if (fsSync.existsSync(envPath)) dotenv.config({ path: envPath });
    } catch (_) {}
  }
}

loadEnvironment();

const { getMainWindowOptions } = require("./window.config");
const appConfig = require("../config/app.config");

const { envioController } = require("../modules/envios/envio.controller");
const { trazabilidadController } = require("../modules/trazabilidad/trazabilidad.controller");
const { geolocalizacionQrController } = require("../modules/geolocalizacion-qr/geolocalizacionQr.controller");
const { authController } = require("../modules/auth/auth.controller");
const { clienteController } = require("../modules/clientes/cliente.controller");
const envioService = require("../modules/envios/envio.service");
const auditoriaService = require("../modules/auditoria/auditoria.service");
const reportesService = require("../modules/reportes/reportes.service");
const session = require("./session");
const { validatePayload } = require("./ipc-security");
const { formatIpcCatch } = require("../utils/glsErrors");

/** Respuesta IPC uniforme con mensaje humanizado (Firestore, Storage, auth, etc.). */
function ipcError(err, context = "ipc") {
  return { ok: false, error: formatIpcCatch(err, context) };
}
const {
  rowsToCorporateCsv,
  rowsToCorporateWorkbookBuffer,
  enviosToExportRows
} = require("../utils/exportTabular");
const loginRateLimit = require("./login-rate-limit");
const backupService = require("../modules/backup/backup.service");
const { buildQrLabelHtml } = require("../utils/qrGenerator");
const { isStorageConfigured } = require("../config/firebase.config");

let mainWindow = null;
const activeSubs = new Map(); // webContentsId -> unsubscribe()
let currentUser = null; // session in main process

function auditLog(accion, detalles = {}, userOverride = null) {
  const u = userOverride || currentUser;
  void auditoriaService.registrarLog({
    usuario: u?.email || u?.nombres || String(detalles?.email || "sistema"),
    rol: u?.rol || "—",
    accion,
    detalles
  });
}

function requireAuth() {
  if (!currentUser) {
    const err = new Error("Debe iniciar sesión para continuar.");
    err.code = "AUTH_REQUIRED";
    throw err;
  }
  session.assertSessionActive();
}

function getPagePath(pageFileName) {
  return path.join(__dirname, "..", "renderer", "pages", pageFileName);
}

function requireAdmin() {
  if (!currentUser || currentUser.rol !== "admin") {
    return { ok: false, error: "Requiere rol administrador." };
  }
  return null;
}

/** Solo administrador u operaciones pueden mutar datos operativos (no rol consulta). */
function assertPuedeMutarOperaciones() {
  const rol = String(currentUser?.rol || "")
    .trim()
    .toLowerCase();
  if (!currentUser || !rol) {
    throw new Error("No tiene permisos para realizar esta acción.");
  }
  if (rol === "consulta") {
    throw new Error("Su rol (consulta) solo permite visualizar información.");
  }
  if (rol !== "admin" && rol !== "operaciones") {
    throw new Error("No tiene permisos para realizar esta acción.");
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

  ipcMain.handle("app:getFeatures", async () => ({
    ok: true,
    storageEvidencias: isStorageConfigured()
  }));

  /** Comprobante HTML → PDF (mismo render que imprimir). */
  ipcMain.handle("app:exportHtmlToPdf", async (_evt, { html, defaultFilename } = {}) => {
    let pdfWin = null;
    try {
      if (!mainWindow) return { ok: false, error: "Ventana no disponible." };
      if (!html || typeof html !== "string") return { ok: false, error: "Sin contenido HTML." };

      pdfWin = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true
        }
      });

      const htmlB64 = Buffer.from(html, "utf8").toString("base64");
      await pdfWin.loadURL(`data:text/html;charset=utf-8;base64,${htmlB64}`);

      await pdfWin.webContents.executeJavaScript(`
        new Promise((resolve) => {
          const imgs = Array.from(document.images || []);
          if (!imgs.length) { resolve(); return; }
          let pending = imgs.length;
          const done = () => { pending -= 1; if (pending <= 0) resolve(); };
          for (const img of imgs) {
            if (img.complete) done();
            else {
              img.addEventListener("load", done, { once: true });
              img.addEventListener("error", done, { once: true });
            }
          }
          setTimeout(resolve, 4000);
        })
      `);

      const pdfBuffer = await pdfWin.webContents.printToPDF({
        printBackground: true,
        pageSize: "A4",
        marginsType: 1
      });

      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: "Guardar comprobante PDF",
        defaultPath: defaultFilename || "comprobante-envio.pdf",
        filters: [{ name: "PDF", extensions: ["pdf"] }]
      });
      if (canceled || !filePath) return { ok: true, canceled: true };
      await fs.writeFile(filePath, pdfBuffer);
      return { ok: true, filePath };
    } catch (err) {
      return ipcError(err, "ipc");
    } finally {
      if (pdfWin && !pdfWin.isDestroyed()) pdfWin.destroy();
    }
  });

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
      return ipcError(err, "ipc");
    }
  });

  ipcMain.handle("auth:me", async () => {
    if (!currentUser) return { ok: true, user: null };
    const st = session.getSessionStatus();
    if (st.expired) {
      auditLog("sesion_expirada", {});
      currentUser = null;
      session.clearSession();
      return { ok: true, user: null, sessionExpired: true };
    }
    session.touchSession();
    return { ok: true, user: currentUser, session: st };
  });

  ipcMain.handle("auth:touchSession", async () => {
    try {
      requireAuth();
      return { ok: true, session: session.getSessionStatus() };
    } catch (err) {
      return { ok: false, error: err?.message || String(err), sessionExpired: err.code === "SESSION_EXPIRED" };
    }
  });

  ipcMain.handle("auth:logout", async () => {
    if (currentUser) auditLog("logout", {});
    currentUser = null;
    session.clearSession();
    return { ok: true };
  });

  ipcMain.handle("auth:policy", async () => {
    try {
      const n = await authController.countUsers();
      return { ok: true, registroAbierto: n === 0, usuariosRegistrados: n };
    } catch (err) {
      return ipcError(err, "ipc");
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
      session.startSession();
      auditLog("registro_usuario", { email: user?.email }, user);
      return { ok: true, user, session: session.getSessionStatus() };
    } catch (err) {
      return ipcError(err, "ipc");
    }
  });

  ipcMain.handle("auth:login", async (_evt, payload) => {
    try {
      const body = validatePayload("auth:login", payload || {});
      const rl = loginRateLimit.checkLoginAllowed(body.email);
      if (!rl.allowed) {
        void auditoriaService.registrarLog({
          usuario: body.email,
          rol: "—",
          accion: "login_bloqueado_rate_limit",
          detalles: {}
        });
        return { ok: false, error: rl.message };
      }
      const user = await authController.login(body);
      loginRateLimit.clearLoginAttempts(body.email);
      currentUser = user;
      session.startSession();
      auditLog("login", { email: user?.email }, user);
      return { ok: true, user, session: session.getSessionStatus() };
    } catch (err) {
      loginRateLimit.recordLoginFailure(payload?.email);
      void auditoriaService.registrarLog({
        usuario: String(payload?.email || "desconocido").slice(0, 200),
        rol: "—",
        accion: "login_fallido",
        detalles: { motivo: err?.message || String(err) }
      });
      return ipcError(err, "ipc");
    }
  });

  ipcMain.handle("auth:listUsers", async () => {
    const gate = requireAdmin();
    if (gate) return gate;
    try {
      requireAuth();
      const users = await authController.listUsersAdmin();
      return { ok: true, users };
    } catch (err) {
      return ipcError(err, "ipc");
    }
  });

  ipcMain.handle("auth:inviteUser", async (_evt, payload) => {
    const gate = requireAdmin();
    if (gate) return gate;
    try {
      requireAuth();
      const user = await authController.inviteUser(payload);
      return { ok: true, user };
    } catch (err) {
      return ipcError(err, "ipc");
    }
  });

  ipcMain.handle("auth:setActivo", async (_evt, payload) => {
    const gate = requireAdmin();
    if (gate) return gate;
    try {
      requireAuth();
      const user = await authController.setUsuarioActivo(payload || {});
      return { ok: true, user };
    } catch (err) {
      return ipcError(err, "ipc");
    }
  });

  ipcMain.handle("clientes:listar", async (_evt, payload) => {
    try {
      requireAuth();
      const clientes = await clienteController.listar(payload || {});
      return { ok: true, clientes };
    } catch (err) {
      return ipcError(err, "ipc");
    }
  });

  ipcMain.handle("clientes:crear", async (_evt, payload) => {
    try {
      requireAuth();
      assertPuedeMutarOperaciones();
      const doc = String(payload?.documento || "").trim();
      const previo = doc ? await clienteController.obtenerPorDocumento(doc) : null;
      const cliente = await clienteController.crear(payload || {});
      auditLog(previo ? "cliente_modificado" : "cliente_creado", {
        documento: cliente?.documento,
        nombres: cliente?.nombres
      });
      return { ok: true, cliente };
    } catch (err) {
      return ipcError(err, "ipc");
    }
  });

  ipcMain.handle("clientes:obtenerPorDocumento", async (_evt, payload) => {
    try {
      requireAuth();
      const body = validatePayload("clientes:obtenerPorDocumento", payload || {});
      const cliente = await clienteController.obtenerPorDocumento(body?.documento);
      return { ok: true, cliente };
    } catch (err) {
      return ipcError(err, "ipc");
    }
  });

  ipcMain.handle("envios:previewCotizacion", async (_evt, payload) => {
    try {
      requireAuth();
      return envioController.previewCotizacion(payload);
    } catch (err) {
      return ipcError(err, "ipc");
    }
  });

  ipcMain.handle("envios:crear", async (_evt, payload) => {
    try {
      requireAuth();
      assertPuedeMutarOperaciones();
      const body = {
        ...(payload || {}),
        registradoPor: currentUser?.email || currentUser?.nombres || ""
      };
      const result = await envioController.crearEnvio(body);
      if (result?.ok) auditLog("envio_creado", { codigoEnvio: result.codigoEnvio });
      return result;
    } catch (err) {
      return ipcError(err, "ipc");
    }
  });

  ipcMain.handle("envios:obtenerPorCodigo", async (_evt, payload) => {
    try {
      requireAuth();
      const body = validatePayload("envios:obtenerPorCodigo", payload || {});
      return await envioController.obtenerPorCodigo(body.codigoEnvio);
    } catch (err) {
      return ipcError(err, "ipc");
    }
  });

  /** Remitente/destinatario desde envíos históricos (registro de envío). */
  ipcMain.handle("envios:buscarPartePorDocumento", async (_evt, payload) => {
    try {
      requireAuth();
      const body = validatePayload("envios:buscarPartePorDocumento", payload || {});
      return await envioController.buscarPartePorDocumento(body);
    } catch (err) {
      return ipcError(err, "ipc");
    }
  });

  ipcMain.handle("envios:listarActivos", async (_evt, payload) => {
    try {
      requireAuth();
      return await envioController.listarActivos({ limitCount: payload?.limitCount || 200 });
    } catch (err) {
      return ipcError(err, "ipc");
    }
  });

  ipcMain.handle("envios:listarHistorial", async (_evt, payload) => {
    try {
      requireAuth();
      return await envioController.listarHistorial({
        estado: payload?.estado || "Todos",
        limitCount: payload?.limitCount || 800
      });
    } catch (err) {
      return ipcError(err, "ipc");
    }
  });

  ipcMain.on("envios:subscribeActivos", (evt, payload) => {
    try {
      requireAuth();
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
      requireAuth();
      const body = validatePayload("trazabilidad:buscar", payload || {});
      return await trazabilidadController.buscar(body.codigoEnvio);
    } catch (err) {
      return ipcError(err, "ipc");
    }
  });

  ipcMain.handle("trazabilidad:listarEstados", async () => {
    try {
      requireAuth();
      return await trazabilidadController.listarEstados();
    } catch (err) {
      return ipcError(err, "ipc");
    }
  });

  ipcMain.handle("trazabilidad:actualizarEstado", async (_evt, payload) => {
    try {
      requireAuth();
      assertPuedeMutarOperaciones();
      const body = validatePayload("trazabilidad:actualizarEstado", payload || {});
      body.registradoPor = currentUser?.email || currentUser?.nombres || "";
      const result = await trazabilidadController.actualizarEstado(body);
      if (result?.ok) {
        auditLog("estado_actualizado", {
          codigoEnvio: body.codigoEnvio,
          estado: body.estado,
          conImagen: Boolean(body.evidenciaImagenBase64)
        });
      }
      return result;
    } catch (err) {
      return ipcError(err, "ipc");
    }
  });

  ipcMain.handle("geo:buscar", async (_evt, payload) => {
    try {
      requireAuth();
      const body = validatePayload("geo:buscar", payload || {});
      return await geolocalizacionQrController.buscar(body.codigoEnvio);
    } catch (err) {
      return ipcError(err, "ipc");
    }
  });

  ipcMain.handle("geo:registrarUbicacion", async (_evt, payload) => {
    try {
      requireAuth();
      assertPuedeMutarOperaciones();
      const validated = validatePayload("geo:registrarUbicacion", payload || {});
      const body = {
        ...validated,
        responsable: currentUser?.nombres || currentUser?.email || "Área de operaciones",
        registradoPor: currentUser?.email || currentUser?.nombres || ""
      };
      return await geolocalizacionQrController.registrarUbicacion(body);
    } catch (err) {
      return ipcError(err, "ipc");
    }
  });

  ipcMain.handle("consulta:leerCodigoPdf", async (_evt, payload) => {
    try {
      requireAuth();
      const { leerCodigoDesdePdfBuffer } = require("../modules/consulta/consulta.service");
      const b64 = String(payload?.base64 || "").trim();
      if (!b64) return { ok: false, error: "No se recibió el archivo PDF." };
      const buffer = Buffer.from(b64, "base64");
      return await leerCodigoDesdePdfBuffer(buffer);
    } catch (err) {
      return ipcError(err, "ipc");
    }
  });

  ipcMain.handle("geo:generarQr", async (_evt, payload) => {
    try {
      requireAuth();
      assertPuedeMutarOperaciones();
      const body = validatePayload("geo:generarQr", payload || {});
      const result = await geolocalizacionQrController.generarQr(body.codigoEnvio);
      if (result?.ok) auditLog("qr_generado", { codigoEnvio: body.codigoEnvio, regenerado: true });
      return result;
    } catch (err) {
      return ipcError(err, "ipc");
    }
  });

  ipcMain.handle("app:saveExportFile", async (_evt, payload = {}) => {
    try {
      requireAuth();
      if (!mainWindow) return { ok: false, error: "Ventana no disponible." };
      const format = String(payload.format || "csv").toLowerCase();
      const utf8 = payload.utf8Content != null ? String(payload.utf8Content) : "";
      const base64 = String(payload.base64 || "").trim();
      if (!utf8 && !base64) return { ok: false, error: "Sin datos para exportar." };
      const ext =
        format === "xlsx" ? "xlsx" : format === "json" ? "json" : format === "csv" ? "csv" : format;
      const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: "Exportar datos",
        defaultPath: payload.defaultPath || payload.defaultFilename || `export-envios.${ext}`,
        filters: payload.filters || [{ name: ext.toUpperCase(), extensions: [ext] }]
      });
      if (canceled || !filePath) return { ok: true, canceled: true };
      if (utf8) await fs.writeFile(filePath, utf8, "utf8");
      else await fs.writeFile(filePath, Buffer.from(base64, "base64"));
      auditLog("exportacion_archivo", { formato: ext, archivo: path.basename(filePath) });
      return { ok: true, filePath };
    } catch (err) {
      return ipcError(err, "ipc");
    }
  });

  ipcMain.handle("export:buildFromRows", async (_evt, payload = {}) => {
    try {
      requireAuth();
      const rows = Array.isArray(payload?.rows) ? payload.rows : [];
      const format = String(payload.format || "csv").toLowerCase();
      const meta = {
        reportTitle: payload.reportTitle,
        filtersLine: payload.filtersLine,
        sheetName: payload.sheetName,
        total: payload.total != null ? payload.total : rows.length
      };
      if (format === "xlsx") {
        const buf = await rowsToCorporateWorkbookBuffer(rows, meta);
        return { ok: true, base64: Buffer.from(buf).toString("base64"), format: "xlsx", count: rows.length };
      }
      const csv = rowsToCorporateCsv(rows, meta);
      return { ok: true, base64: Buffer.from(csv, "utf8").toString("base64"), format: "csv", count: rows.length };
    } catch (err) {
      return ipcError(err, "ipc");
    }
  });

  ipcMain.handle("export:buildEnvios", async (_evt, payload = {}) => {
    try {
      requireAuth();
      const hist = await envioController.listarHistorial({
        estado: "Todos",
        limitCount: payload?.limitCount || 2000
      });
      if (!hist?.ok) return hist;
      const rows = enviosToExportRows(hist.envios);
      const format = String(payload.format || "csv").toLowerCase();
      const meta = {
        reportTitle: payload.reportTitle || "Historial general de envíos",
        filtersLine: payload.filtersLine || "",
        sheetName: "Envíos",
        total: rows.length
      };
      if (format === "xlsx") {
        const buf = await rowsToCorporateWorkbookBuffer(rows, meta);
        return { ok: true, base64: Buffer.from(buf).toString("base64"), format: "xlsx", count: rows.length };
      }
      const csv = rowsToCorporateCsv(rows, meta);
      return { ok: true, base64: Buffer.from(csv, "utf8").toString("base64"), format: "csv", count: rows.length };
    } catch (err) {
      return ipcError(err, "ipc");
    }
  });

  ipcMain.handle("reportes:consultar", async (_evt, payload) => {
    try {
      requireAuth();
      const body = validatePayload("reportes:consultar", payload || {});
      return await reportesService.consultar(body);
    } catch (err) {
      return ipcError(err, "ipc");
    }
  });

  ipcMain.handle("auditoria:listar", async (_evt, payload) => {
    const gate = requireAdmin();
    if (gate) return gate;
    try {
      requireAuth();
      return await auditoriaService.listarLogs({ limitCount: payload?.limitCount || 200 });
    } catch (err) {
      return ipcError(err, "ipc");
    }
  });

  ipcMain.handle("backup:exportar", async () => {
    const gate = requireAdmin();
    if (gate) return gate;
    try {
      requireAuth();
      const result = await backupService.exportarRespaldo();
      auditLog("backup_exportado", { stats: result.stats });
      return result;
    } catch (err) {
      return ipcError(err, "ipc");
    }
  });

  ipcMain.handle("backup:importar", async (_evt, payload) => {
    const gate = requireAdmin();
    if (gate) return gate;
    try {
      requireAuth();
      if (!payload?.backup) return { ok: false, error: "Respaldo vacío." };
      const result = await backupService.importarRespaldo(payload.backup, { merge: true });
      auditLog("backup_importado", { written: result.written });
      return result;
    } catch (err) {
      return ipcError(err, "ipc");
    }
  });

  ipcMain.handle("geo:qrEtiquetaHtml", async (_evt, payload) => {
    try {
      requireAuth();
      const body = validatePayload("geo:generarQr", payload || {});
      const codigo = body.codigoEnvio;
      const { buildQrDeepLink } = require("../utils/qrDeepLink");
      const contenido = buildQrDeepLink(codigo);
      const imgPath = path.join(__dirname, "..", "renderer", "assets", "qr", `${codigo}.png`);
      const qrImgSrc = `file://${imgPath.replace(/\\/g, "/")}`;
      const html = buildQrLabelHtml({ codigoEnvio: codigo, contenidoQr: contenido, qrImgSrc });
      return { ok: true, html };
    } catch (err) {
      return ipcError(err, "ipc");
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
  loadEnvironment();
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

