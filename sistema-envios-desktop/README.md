# Sistema de Envíos (Desktop)

**Nombre del sistema:** “Sistema de Información para el Seguimiento y Trazabilidad de Envíos en el Área de Operaciones en la Empresa GRUPO LOGÍSTICO SALAZAR S.A.C.”

Este proyecto es una **aplicación de escritorio** (NO web) construida con:

- Electron + Node.js (main process)
- Firebase Firestore
- HTML/CSS/JS para ventanas internas (renderer)
- Leaflet + OpenStreetMap (mapa)
- `qrcode` + `sharp` (QR con logo GLS, alta resolución)
- Firebase Storage (evidencias de entrega)
- `chart.js`, `jspdf`, `xlsx` (dashboard, reportes, exportaciones)
- `dotenv` (variables de entorno)

## Requisitos

- Node.js LTS (recomendado 18+ o 20+)
- Cuenta/proyecto en Firebase con Firestore habilitado

## Instalación

Desde `sistema-envios-desktop/`:

```bash
npm install
```

## Configurar Firebase (Firestore)

1. En Firebase Console crea un proyecto y habilita **Firestore Database**.
2. Obtén la configuración del SDK web (Project settings → Your apps → Web app).
3. Crea tu archivo `.env` (NO se commitea) basado en `.env.example`.

Variables mínimas:

- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_APP_ID`
- `FIREBASE_STORAGE_BUCKET` (evidencias de entrega en Storage)

## Ejecutar en modo escritorio (Electron)

```bash
npm start
```

Se abrirá la ventana principal con menú lateral:

- Dashboard
- Registro de envío
- Seguimiento / Trazabilidad
- Geolocalización + QR
- Reportes y exportación (CSV, Excel, PDF)
- Respaldo / restauración JSON (admin)

La aplicación no incluye servidor web ni Express: la UI del renderer invoca al proceso principal por **IPC** (`preload` → `ipcMain.handle`). Los códigos QR generados se guardan en `src/renderer/assets/qr/` como PNG.

## Inicialización de datos (seed)

Guía detallada de cada script, orden y credenciales de prueba: **`database/scripts/README.md`**.

```bash
npm run db:ping
npm run seed:init
```

Solo usuarios de acceso (p. ej. tras un reset):

```bash
npm run seed:users
```

Para vaciar colecciones de demostración y volver a sembrar:

```bash
npm run seed:reset
npm run seed:init
npm run seed:users
```

## Estructura del proyecto

- `src/main/`: proceso principal de Electron + IPC
- `src/modules/`: lógica de negocio (model/repository/service/controller)
- `src/renderer/`: HTML/CSS/JS de ventanas internas (UI)
- `database/scripts/`: inicialización de datos (Firestore)
- `tests/`: tests automatizados (Jest)
- `docs/`: manual de usuario, manual técnico, plan de pruebas

## Pruebas

```bash
npm test
```

Detalle y matriz de pruebas manuales: `docs/pruebas-sistema.md`.

## Documentación

- `docs/manual-usuario.md` — uso del sistema por rol.
- `docs/manual-tecnico.md` — arquitectura, IPC, Firestore, instalación.
- `docs/pruebas-sistema.md` — plan de pruebas (manual + Jest).

## Roles

- **admin**: usuarios y todo el sistema.
- **operaciones**: registro de envíos, clientes, trazabilidad, geolocalización y QR.
- **consulta**: solo lectura (IPC y UI acotan mutaciones).

## Flujo principal

Inicio de sesión → (opcional) clientes → registro de envío → seguimiento / estados → geolocalización referencial → historial y dashboard.

## Instalador Windows (electron-builder)

```bash
npm run dist
```

Genera instalador NSIS en `dist/` (v1.2.0) con acceso directo en escritorio.

**Producción / otra PC:** copie `.env.example` como `gls.env` en la carpeta de datos de la app (`%APPDATA%\…\gls.env`) o junto al instalador en `resources\gls.env`, con sus claves `FIREBASE_*`.

Documento de cierre académico: `docs/ENTREGA-ACADEMICA.md`.

## Usuarios de demostración

Tras `npm run seed:users` o según `database/scripts/README.md` y `03-seed-usuarios.js` (correos y contraseñas indicados allí).
