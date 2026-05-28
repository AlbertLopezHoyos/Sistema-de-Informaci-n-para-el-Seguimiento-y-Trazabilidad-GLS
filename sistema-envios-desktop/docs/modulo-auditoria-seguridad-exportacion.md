# Auditoría, seguridad, exportación e instalador

## Colección Firestore: `logs_sistema`

| Campo | Tipo | Descripción |
| --- | --- | --- |
| `usuario` | string | Correo o identificador |
| `rol` | string | Rol en el momento del evento |
| `accion` | string | Código de acción (ver tabla) |
| `fecha` | string ISO | Marca de tiempo |
| `detalles` | map | Objeto JSON con contexto |

### Acciones registradas automáticamente

| Acción | Origen |
| --- | --- |
| `login` | Login exitoso |
| `logout` | Cierre de sesión |
| `login_fallido` | Credenciales incorrectas / usuario inactivo |
| `sesion_expirada` | Detección al consultar `auth:me` |
| `envio_creado` | Registro de envío |
| `estado_actualizado` | Trazabilidad (incl. `conImagen` si hay foto) |
| `cliente_creado` / `cliente_modificado` | Alta/upsert en clientes |
| `qr_generado` | Generación o regeneración de QR |
| `exportacion_archivo` | Guardado CSV/Excel desde diálogo nativo |

Consulta (solo **admin**): IPC `auditoria:listar`.

---

## Seguridad de sesión

- Variable opcional `.env`: `SESSION_TIMEOUT_MS` (por defecto **30 minutos**).
- Cada IPC autenticado renueva actividad (`session.touchSession`).
- `auth:me` devuelve `sessionExpired: true` si expiró.
- Renderer: `auth-guard.js` verifica cada 60 s y al volver a la ventana.
- IPC protegidos exigen `requireAuth()` (excepto login, registro inicial, policy, ping).

### Validación IPC

`src/main/ipc-security.js` valida:

- Formato `ENV-AAAA-NNNN` en canales con `codigoEnvio`
- Email/contraseña en login
- Límites en `reportes:consultar`

---

## Exportación CSV / Excel

| IPC | Uso |
| --- | --- |
| `export:buildEnvios` | Todos los envíos del historial (límite configurable) |
| `export:buildFromRows` | Filas ya filtradas (reportes, historial en pantalla) |
| `app:saveExportFile` | Diálogo guardar archivo (base64) |

Utilidad Node: `src/utils/exportTabular.js`  
Renderer: `src/renderer/js/export-tabular.js`

---

## Reportes

Pantalla: `reportes.html` + `reportes.js`  
IPC: `reportes:consultar`  
Filtros: estado, fechas, texto cliente. Gráficos Chart.js + tabla + export CSV/Excel/PDF.

---

## Instalador Windows

```bash
# Copiar ícono (una vez)
mkdir build 2>nul & copy src\renderer\assets\img\logo.png build\icon.png

npm run dist
```

Salida: carpeta `dist/` con instalador NSIS **GLS Envíos**.

Dependencia dev: `electron-builder`.

---

## Evidencia fotográfica de entrega

En **Seguimiento → Actualizar estado → Entregado**:

- Campo archivo imagen con **vista previa**.
- Se guarda `evidenciaImagenBase64` en `historial_envios` (máx. ~200 KB).
- Visible en timeline (`estado-envio-ui.js`).

---

## Dependencias nuevas

| Paquete | Uso |
| --- | --- |
| `xlsx` | Exportación Excel |
| `chart.js` | Dashboard y reportes |
| `electron-builder` | Instalador .exe |
| `pdf-parse` | Consulta PDF (ya existente) |
| `jsqr` | Lectura QR imagen (ya existente) |
