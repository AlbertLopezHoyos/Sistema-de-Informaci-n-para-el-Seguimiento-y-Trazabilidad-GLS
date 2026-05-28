# Estructura Firestore (colecciones)

Este proyecto usa Firestore con las siguientes colecciones:

- `usuarios`
- `usuarios_auth` — credenciales y metadatos de acceso (perfil app: rol, activo, hash, etc.)
- `clientes` — catálogo de clientes (ID determinista `cli_{documento sanitizado}`)
- `envios`
- `estados_envio`
- `historial_envios`
- `ubicaciones_envios`
- `qr_envios`
- `counters` — consecutivo de códigos de envío por año (`ENV-YYYY`)
- `meta` — metadatos de seed (`meta/seed`)
- `logs_sistema` — auditoría (usuario, rol, accion, fecha, detalles). Ver `docs/modulo-auditoria-seguridad-exportacion.md`

## Módulo de registro de envíos (flujo al guardar)

Un solo **transaction** de Firestore hace, en orden atómico:

1. **`counters/ENV-YYYY`**: incrementa `current`, actualiza `year` y `updatedAt`.
2. **`envios/{codigoEnvio}`**: documento creado con `merge: false` (ID = código, p. ej. `ENV-2026-0001`).
3. **`historial_envios/{codigoEnvio}__{fechaRegistro}`**: primer registro con `estado: "Registrado"`.

Fuera de esa transacción (pero en el mismo flujo de aplicación):

- Generación del archivo PNG del QR en disco (Electron).
- **`qr_envios/{codigoEnvio}`**: `codigoEnvio`, `contenidoQr`, `rutaLocalQr`, `fechaGeneracion`.

Si el cliente del catálogo existe, el documento de `envios` incluye **`clienteAsociado`** (snapshot: `clienteId`, `documento`, `nombres`, `telefono`, `direccion`, `empresa`).

### Campos típicos en `envios` (registro)

- `codigoEnvio`, `remitente`, `destinatario`, `origen`, `destino`, `tipoCarga`, `descripcion`, `peso`, `dimensiones`, `observacion`
- `cotizacionEstimada` (opcional, si hubo datos de cotización)
- `clienteAsociado` (opcional)
- `estadoActual`: `"Registrado"`
- `fechaRegistro`: ISO
- Más adelante puede existir `evidenciaEntrega` si el estado pasa a **Entregado** con evidencia.

### Primer documento en `historial_envios`

- `codigoEnvio`, `estado`: `"Registrado"`, `fechaActualizacion` (misma que registro inicial)
- `observacion`: texto fijo de registro inicial
- `responsable`: área por defecto (config app)
- `evidenciaReferencia`, `evidenciaDetalle`: cadena vacía
- `registradoPor`: email o nombre del usuario en sesión (inyectado en IPC desde el proceso principal)

## Índices compuestos (opcional / rendimiento)

Las consultas del código **no dependen** de índices compuestos para `historial_envios`, `ubicaciones_envios` ni del listado de envíos activos (ordenación y filtros en memoria). Sigue siendo útil desplegar índices si en el futuro vuelves a queries con `orderBy` compuesto o quieres optimizar lecturas.

Definición de referencia en `database/firestore.indexes.json`:

| Colección            | Campos                                      | Alcance                        |
|---------------------|---------------------------------------------|--------------------------------|
| `historial_envios`  | `codigoEnvio` ASC, `fechaActualizacion` ASC | Opcional si se usa orderBy en servidor |
| `envios`            | `estadoActual` ASC, `fechaRegistro` DESC  | Opcional (lista activos ya sin `in`+orderBy) |
| `ubicaciones_envios`| `codigoEnvio` ASC, `fechaRegistro` DESC   | Opcional                       |

```bash
firebase deploy --only firestore:indexes
```

## Reglas de seguridad

- Archivo de ejemplo para desarrollo: `database/firestore.rules` (acceso amplio; **no** usar tal cual en producción).
- Referencia en `firebase.json` en la raíz de `sistema-envios-desktop`.

La app Electron usa el **SDK web de Firestore** con variables `.env` (API key, proyecto, etc.). El login de la aplicación es **propio** (`usuarios_auth` + bcrypt), no necesariamente **Firebase Authentication** en las peticiones a Firestore; por tanto las reglas deben acordarse con tu política (p. ej. reglas restrictivas + migración a Admin SDK solo en `main`, o vincular Firebase Auth al iniciar sesión).

```bash
firebase deploy --only firestore:rules
```

## Carga inicial operativa (seed)

Desde la raíz de `sistema-envios-desktop`, con `.env` configurado para Firebase:

```bash
npm run seed:init
```

Pasos (`database/scripts/run-seed.js`):

1. `01-create-collections` — ancla `meta/seed`
2. `02-seed-estados-envio` — catálogo de estados
3. `03-seed-usuarios` — cuentas de acceso (p. ej. operaciones@gls.pe)
4. `04-seed-clientes-operativos` — **clientes reales de ejemplo** (razón social, RUC, direcciones Perú)
5. `06-seed-envios-operativos` — **8 envíos** con trayectorias distintas (Registrado, En tránsito, En reparto, Entregado con evidencia, Observado, Cancelado), **historial** alineado, **ubicaciones** en un caso, **QR** en disco y **`qr_envios`**, y **`counters/ENV-AAAA`** al menos en 8 (o mayor si ya había consecutivos).

Para vaciar colecciones operativas y volver a sembrar:

```bash
npm run seed:reset
npm run seed:init
```

`seed:reset` también borra **`clientes`** y **`counters`** (además de envíos, historial, QR y ubicaciones).

- `historial_envios/{codigoEnvio}__{fechaISO}`
- `ubicaciones_envios/{codigoEnvio}__{fechaISO}`
- `qr_envios/{codigoEnvio}`
- `estados_envio/{estado}` (ej: `estados_envio/Registrado`)
- `counters/ENV-YYYY` (contador por año para consecutivo)
- `clientes/cli_{documento_sanitizado}`
