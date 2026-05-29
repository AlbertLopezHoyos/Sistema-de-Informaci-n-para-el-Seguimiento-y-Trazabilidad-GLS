/**
 * Verificación de consistencia: exports de controllers, IPC main ↔ preload.
 * Ejecutar: node scripts/verify-consistency.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
let failed = 0;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failed += 1;
}

function ok(msg) {
  console.log(`OK: ${msg}`);
}

const NAMED_CONTROLLERS = [
  { file: "src/modules/envios/envio.controller.js", exportName: "envioController", methods: ["previewCotizacion", "crearEnvio", "obtenerPorCodigo", "buscarPartePorDocumento", "listarActivos", "listarHistorial"] },
  { file: "src/modules/trazabilidad/trazabilidad.controller.js", exportName: "trazabilidadController", methods: ["buscar", "listarEstados", "actualizarEstado"] },
  { file: "src/modules/geolocalizacion-qr/geolocalizacionQr.controller.js", exportName: "geolocalizacionQrController", methods: ["buscar", "registrarUbicacion", "generarQr"] },
  { file: "src/modules/auth/auth.controller.js", exportName: "authController", methods: ["register", "login", "countUsers", "listUsersAdmin", "inviteUser", "setUsuarioActivo"] },
  { file: "src/modules/clientes/cliente.controller.js", exportName: "clienteController", methods: ["crear", "listar", "obtenerPorDocumento"] }
];

function readFile(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function walkJs(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walkJs(p, out);
    else if (name.endsWith(".js")) out.push(p);
  }
  return out;
}

function checkControllerImports() {
  const srcFiles = walkJs(path.join(ROOT, "src"));

  for (const { file, exportName } of NAMED_CONTROLLERS) {
    const base = path.basename(file);
    const wrongPattern = new RegExp(
      `const\\s+${exportName}\\s*=\\s*require\\([^)]*${base.replace(".", "\\.")}`,
      "m"
    );
    for (const abs of srcFiles) {
      const rel = path.relative(ROOT, abs).split(path.sep).join("/");
      if (rel === file) continue;
      const content = fs.readFileSync(abs, "utf8");
      if (wrongPattern.test(content)) {
        fail(`${rel} importa ${exportName} sin destructuring (use { ${exportName} })`);
      }
    }

    const mod = require(path.join(ROOT, file));
    const obj = mod[exportName];
    if (!obj) {
      fail(`${file} no exporta { ${exportName} }`);
      continue;
    }
    for (const m of NAMED_CONTROLLERS.find((c) => c.exportName === exportName).methods) {
      if (typeof obj[m] !== "function") fail(`${exportName}.${m} no es función`);
    }
  }
  ok("Controllers: exports e imports");
}

function checkIpcPreload() {
  const main = readFile("src/main/main.js");
  const preload = readFile("src/main/preload.js");

  const ipcHandles = [...main.matchAll(/ipcMain\.handle\("([^"]+)"/g)].map((m) => m[1]);
  const preloadInvokes = [...preload.matchAll(/invoke\("([^"]+)"/g)].map((m) => m[1]);

  const ipcSet = new Set(ipcHandles);
  for (const ch of preloadInvokes) {
    if (!ipcSet.has(ch)) {
      fail(`Preload invoca "${ch}" pero no hay ipcMain.handle en main.js`);
    }
  }
  ok(`IPC: ${ipcHandles.length} handlers, ${preloadInvokes.length} invoke en preload`);
}

function checkServices() {
  const reportes = require(path.join(ROOT, "src/modules/reportes/reportes.service.js"));
  if (typeof reportes.consultar !== "function") fail("reportes.consultar no existe");

  const aud = require(path.join(ROOT, "src/modules/auditoria/auditoria.service.js"));
  if (typeof aud.registrarLog !== "function" || typeof aud.listarLogs !== "function") {
    fail("auditoria.service métodos faltantes");
  }

  const backup = require(path.join(ROOT, "src/modules/backup/backup.service.js"));
  if (typeof backup.exportarRespaldo !== "function" || typeof backup.validateBackupStructure !== "function") {
    fail("backup.service métodos faltantes");
  }
  ok("Services: reportes, auditoria, backup");
}

function main() {
  console.log("Verificando consistencia sistema-envios-desktop...\n");
  try {
    checkControllerImports();
    checkIpcPreload();
    checkServices();
  } catch (e) {
    fail(e.stack || e.message || String(e));
  }
  console.log(failed ? `\n${failed} problema(s) encontrado(s).` : "\nTodo consistente.");
  process.exit(failed ? 1 : 0);
}

main();
