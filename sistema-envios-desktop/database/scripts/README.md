# Scripts de base de datos (Firestore)

Están pensados para **cargar datos de demostración** en el proyecto `sistema-envios-desktop`. La aplicación sigue siendo **Electron + Firebase (SDK web) + Firestore**; estos scripts usan el mismo `src/config/firebase.config.js` que la app.

## Requisitos previos

1. Proyecto Firebase con **Firestore** habilitado.
2. Archivo **`.env`** en la raíz de `sistema-envios-desktop/` (copiar de `.env.example` si existe) con al menos:

   - `FIREBASE_API_KEY`
   - `FIREBASE_AUTH_DOMAIN`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_APP_ID` (recomendado)

3. Desde la carpeta `sistema-envios-desktop/`:

   ```bash
   npm install
   ```

## Comprobar conexión a Firebase

```bash
npm run db:ping
```

Debe mostrar `Firebase OK` y el proyecto. Si falla, revise el `.env` y la red antes de sembrar datos.

## Carga completa de demostración (recomendado)

Ejecuta **en orden** lo siguiente (desde `sistema-envios-desktop/`):

```bash
npm run db:ping
npm run seed:init
```

| Paso | Script | Qué hace |
|------|--------|----------|
| 1 | `01-create-collections.js` | Escribe `meta/seed` (marca de carga). Las colecciones se crean al insertar documentos. |
| 2 | `02-seed-estados-envio.js` | Documentos en `estados_envio`: Registrado, En tránsito, En reparto, Entregado, Observado, Cancelado. |
| 3 | `03-seed-usuarios.js` | Usuarios en `usuarios_auth` (hash bcrypt) para login en la app. |
| 4 | `04-seed-clientes-operativos.js` | Catálogo `clientes` (empresas y persona natural). |
| 5 | `06-seed-envios-operativos.js` | Envíos de ejemplo `ENV-{año}-0001` … `0008`, `historial_envios`, `qr_envios`, PNG en `src/renderer/assets/qr/`, `ubicaciones_envios` donde aplica, y sincroniza `counters`. |

El orquestador es **`run-seed.js`** (comando `npm run seed:init`).

## Solo usuarios de acceso (tras un reset o si no puede iniciar sesión)

```bash
npm run seed:users
```

Lee opcionalmente del `.env`: `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD`, `OPERACIONES_SEED_EMAIL`, `OPERACIONES_SEED_PASSWORD`. Si no están definidas, usa los valores por defecto del script `ensure-usuarios-acceso.js`.

## Vaciar datos de demostración

```bash
npm run seed:reset
```

Borra documentos en: `envios`, `historial_envios`, `qr_envios`, `ubicaciones_envios`, `clientes`, `estados_envio`, `usuarios_auth`, `usuarios`, `counters`, `meta`. Luego puede volver a ejecutar `npm run seed:init` y `npm run seed:users`.

## Credenciales por defecto (solo entorno de prueba)

Tras `seed:init` (paso 03) o `seed:users`, suele quedar:

| Rol | Correo | Contraseña |
|-----|--------|------------|
| admin | `admin@gls.pe` | `admin1234` |
| operaciones | `operaciones@gls.pe` | `Operaciones2026` |

Cambie estas contraseñas en producción y use variables de entorno para el seed.

## Datos de envíos de ejemplo

El script `06-seed-envios-operativos.js` genera códigos del tipo **`ENV-2026-0001`** … **`ENV-2026-0008`** (el año lo toma del calendario al ejecutar). Incluye distintos estados y un envío **Entregado** con evidencia para probar el flujo en la app.

## Reglas de Firestore

Para que la escritura desde el SDK funcione en su proyecto, despliegue reglas acordes a su política (desarrollo vs producción). Hay referencia en `database/firestore.rules` y en `database/firestore-structure.md`.
