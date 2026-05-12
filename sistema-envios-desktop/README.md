# Sistema de Envíos (Desktop)

**Nombre del sistema:** “Sistema de Información para el Seguimiento y Trazabilidad de Envíos en el Área de Operaciones en la Empresa GRUPO LOGÍSTICO SALAZAR S.A.C.”

Este proyecto es una **aplicación de escritorio** (NO web) construida con:

- Electron + Node.js (main process)
- Firebase Firestore
- HTML/CSS/JS para ventanas internas (renderer)
- Leaflet + OpenStreetMap (mapa)
- `qrcode` (QR local en PNG)
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

## Ejecutar en modo escritorio (Electron)

```bash
npm start
```

Se abrirá la ventana principal con menú lateral:

- Dashboard
- Registro de envío
- Seguimiento / Trazabilidad
- Geolocalización + QR

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
