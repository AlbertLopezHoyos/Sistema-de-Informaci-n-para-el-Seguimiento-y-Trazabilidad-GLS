# Manual técnico — Sistema de envíos (desktop)

## 1. Arquitectura

- **Electron**: proceso principal (`src/main/main.js`) crea ventanas, registra manejadores IPC y mantiene la sesión del usuario (`currentUser`).
- **Preload** (`src/main/preload.js`): expone `window.glsApi` con `contextBridge` (sin `nodeIntegration` en renderer).
- **Renderer**: HTML estático en `src/renderer/pages/`, lógica en `src/renderer/js/`, estilos en `src/renderer/assets/css/`.
- **Firebase Firestore**: acceso solo desde el proceso principal mediante `src/config/firebase.config.js`.

No se usa Express ni rutas HTTP: toda la lógica sensible y el SDK de Firebase corren en Node (main).

## 2. IPC (canales principales)

| Canal | Descripción |
| --- | --- |
| `auth:login`, `auth:logout`, `auth:me`, `auth:policy` | Sesión y política de registro. |
| `auth:listUsers`, `auth:inviteUser`, `auth:setActivo` | Solo **admin**. |
| `clientes:listar`, `clientes:crear`, `clientes:obtenerPorDocumento` | Catálogo; **crear** requiere admin u operaciones. |
| `envios:crear`, `envios:listarHistorial`, `envios:subscribeActivos`, … | Envíos; **crear** requiere admin u operaciones. |
| `trazabilidad:buscar`, `trazabilidad:listarEstados` | Lectura para todos los autenticados. |
| `trazabilidad:actualizarEstado` | Admin u operaciones; observación mín. 3 caracteres; **Entregado** exige evidencia (referencia ≥ 4). |
| `geo:buscar` | Lectura. |
| `geo:registrarUbicacion`, `geo:generarQr` | Admin u operaciones. |
| `app:savePdfFile`, `app:saveExportFile` | Guardar PDF/CSV/Excel/JSON (diálogo nativo). |
| `backup:exportar`, `backup:importar` | Respaldo JSON completo (solo **admin**). |
| `reportes:consultar` | KPIs y agregados para reportes. |
| `auditoria:listar` | Logs en `logs_sistema` (admin). |
| `geo:qrEtiquetaHtml` | HTML imprimible de etiqueta QR. |

### Evidencias (Firebase Storage)

El renderer envía `evidenciaImagenBase64` por IPC. `src/utils/evidenciaEntrega.js` decide:

- Con `FIREBASE_STORAGE_BUCKET` configurado: sube a `uploads/evidencias/{codigoEnvio}/` (máx. 5 MB).
- Sin Storage (plan Spark): referencia textual obligatoria en entrega; foto opcional ≤ 200 KB en `evidenciaImagenBase64`.
- Si Storage falla: fallback automático a base64 (≤ 200 KB).

Campos unificados en historial: `evidenciaImagenUrl` o `evidenciaImagenBase64`, `evidenciaNombreArchivo`, `evidenciaFechaSubida`.

### Seguridad

- `src/main/login-rate-limit.js`: límite de intentos fallidos de login.
- `src/main/ipc-security.js`: validación de payloads IPC.
- `src/utils/sanitize.js`: sanitización de strings en main/renderer.

## 3. Roles y permisos

- **admin**: gestión de usuarios, todas las operaciones de datos.
- **operaciones**: registro de envíos, clientes, trazabilidad, geolocalización y QR.
- **consulta**: solo lectura; IPC de mutación responde error claro; en UI se ocultan o deshabilitan acciones de escritura donde aplica.

Usuario con `activo: false` no puede iniciar sesión.

## 4. Colecciones Firestore (resumen)

- `envios` — documento ID = `codigoEnvio` (`ENV-AAAA-NNNN`).
- `historial_envios` — eventos de estado por envío.
- `ubicaciones_envios` — puntos de control referenciales (lat/lng, dirección, fecha, responsable).
- `qr_envios` — metadatos del QR; PNG en `src/renderer/assets/qr/`.
- `clientes` — catálogo por documento.
- `usuarios_auth` — cuentas locales (hash bcrypt), rol y estado activo.
- `estados_envio` — catálogo opcional de estados (fallback en código si está vacío).

Detalle: `database/firestore-structure.md` y `docs/modelo-datos-firestore.md`.

## 5. Carpetas relevantes

```
src/main/          main.js, preload.js, window.config.js
src/modules/       auth, clientes, envios, trazabilidad, geolocalizacion-qr
src/renderer/      pages, js, assets, components
database/scripts/  seeds y utilidades (ver database/scripts/README.md)
tests/             pruebas Jest (modelos y servicios)
```

## 6. Instalación y ejecución

```bash
npm install
npm run db:ping    # verifica .env y conexión Firestore
npm start          # Electron
npm test           # Jest
```

Variables en `.env` (ver `.env.example`): claves Firebase mínimas para Firestore.

## 7. Scripts npm

| Script | Uso |
| --- | --- |
| `npm start` / `npm run dev` | Aplicación Electron. |
| `npm test` | Pruebas unitarias. |
| `npm run db:ping` | Comprueba credenciales Firebase. |
| `npm run seed:init` | Estados y datos base (ver README de scripts). |
| `npm run seed:users` | Usuarios de acceso de prueba. |
| `npm run seed:reset` | Limpieza + preparación para volver a sembrar. |
