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

## Inicialización de datos (seed)

```bash
npm run seed:init
```

Para reiniciar colecciones (elimina datos y vuelve a iniciar):

```bash
npm run seed:reset
```

## Estructura del proyecto

- `src/main/`: proceso principal de Electron + IPC
- `src/modules/`: lógica de negocio (model/repository/service/controller)
- `src/renderer/`: HTML/CSS/JS de ventanas internas (UI)
- `database/scripts/`: inicialización de datos (Firestore)
- `tests/`: tests automatizados (Jest)

## Notas importantes

- No se usa Express ni servidor web.
- La comunicación se realiza por IPC (`preload` → `ipcRenderer.invoke` → `ipcMain.handle`).
- Los QR se guardan localmente en `src/renderer/assets/qr/`.

