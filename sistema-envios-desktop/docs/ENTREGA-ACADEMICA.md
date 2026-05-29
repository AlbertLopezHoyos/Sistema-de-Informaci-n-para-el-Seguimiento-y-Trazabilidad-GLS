# Entrega académica — GLS Envíos Desktop v1.2.0

**GRUPO LOGÍSTICO SALAZAR S.A.C.** · Sistema de Información para el Seguimiento y Trazabilidad de Envíos (área de Operaciones).

Aplicación de escritorio **Electron + Firestore + IPC + Firebase Storage**, lista para demostración, defensa oral e instalación Windows.

---

## Estado del sistema

| Indicador | Valor |
|-----------|--------|
| Versión | 1.2.0 |
| Tests Jest | `npm test` → **47 tests** (18 suites) |
| Consistencia IPC | `npm run verify` |
| Instalador | `npm run dist` → `dist/GLS-Envios-Setup-1.2.0.exe` |

---

## Checklist de cierre técnico

| Área | Estado |
|------|--------|
| Arquitectura (main / modules / renderer / IPC) | OK |
| Seguridad: `contextIsolation`, preload acotado, validación IPC | OK |
| Sesión con timeout + mensaje en login (`?expired=1`) | OK |
| Admin IPC (`inviteUser`, `setActivo`) exige sesión activa | OK |
| Envíos activos incluyen **En almacén** (seguimiento tiempo real) | OK |
| Búsqueda unificada (código / cliente / estado / QR / PDF) | OK |
| Botón **Limpiar** unificado en Consulta, Geo y Seguimiento | OK |
| QR alta resolución + comprobante imprimible / PDF | OK |
| Geolocalización con validación IPC de código y coordenadas | OK |
| Evidencias en Firebase Storage (MIME / tamaño) | OK |
| Respaldo JSON, reportes, auditoría (`logs_sistema`) | OK |
| `production-polish.css` en páginas autenticadas | OK |

---

## Checklist antes de la presentación (día de la defensa)

### Entorno

- [ ] Proyecto Firebase creado; Firestore y Storage habilitados.
- [ ] Reglas desplegadas: `database/firestore.rules`.
- [ ] Índices desplegados: `database/firestore.indexes.json`.
- [ ] Archivo `.env` (o `gls.env` en `%APPDATA%` tras instalar) con `FIREBASE_*`.
- [ ] `npm install` sin errores en la máquina de demo.
- [ ] `npm test` y `npm run verify` en verde.
- [ ] `npm start` abre la aplicación sin pantalla en blanco.

### Datos y usuarios

- [ ] `npm run seed:users` (o usuarios creados manualmente).
- [ ] Anotar credenciales de prueba (no subir al repositorio):
  - **Admin** — usuarios, respaldo, políticas.
  - **Operaciones** — registro, trazabilidad, geo, evidencias.
  - **Consulta** — solo lectura / consulta.
- [ ] Al menos 3–5 envíos de ejemplo con distintos estados (Registrado, En almacén, En tránsito, Entregado, Observado).

### Respaldo de la demo

- [ ] Video o capturas (3–5 min) por si falla la red.
- [ ] Instalador probado una vez en PC distinta: `npm run dist`.

### Documentación impresa / PDF del informe

- [ ] Manual de usuario (`docs/manual-usuario.md`).
- [ ] Manual técnico (`docs/manual-tecnico.md`).
- [ ] Plan de pruebas (`docs/pruebas-sistema.md`).
- [ ] Diagrama de casos de uso y modelo de datos (Firestore).

---

## Guion de demostración (15–20 minutos)

Tiempo orientativo. Ensayar al menos una vez con Firestore en línea.

### 1. Introducción (1 min)

Presentar el problema: falta de trazabilidad unificada en operaciones logísticas. Solución: escritorio GLS con registro, seguimiento, mapa/QR y consulta.

### 2. Inicio de sesión y roles (2 min)

1. Ejecutar `npm start` (o el `.exe` instalado).
2. Iniciar sesión como **operaciones**.
3. Mostrar menú lateral: módulos según rol.
4. (Opcional) Cerrar sesión; entrar como **consulta** y mostrar que no puede registrar envíos.
5. (Opcional) Mencionar sesión por inactividad: tras timeout, login muestra aviso de sesión expirada.

### 3. Dashboard y clientes (2 min)

1. **Dashboard** — KPIs o resumen operativo.
2. **Clientes** — catálogo; crear o mostrar cliente existente vinculado a envíos.

### 4. Registro de envío (4 min)

1. **Registro de envíos** — pestañas Cliente → Datos → Cotización → Observaciones.
2. Completar remitente/destinatario (búsqueda por documento en histórico si aplica).
3. **Registrar envío** → modal de confirmación.
4. Mostrar código `ENV-AAAA-NNNN`, QR generado, botones imprimir / PDF.
5. Enlace rápido a Seguimiento o Geo.

### 5. Seguimiento y trazabilidad (4 min)

1. Abrir **Seguimiento / Trazabilidad**.
2. Lista **Envíos activos** en tiempo real (incluye *En almacén*, *En tránsito*, etc.).
3. Buscar por código o usar lista **Otros registros** tras una búsqueda.
4. Seleccionar envío → timeline, mapa, actualizar estado (operaciones).
5. Subir evidencia si Storage está configurado.
6. Pulsar **Limpiar**: criterios vacíos, sin panel de resultado, **sin bloque Otros registros** (vuelve al buscar).
7. (Opcional) Abrir `seguimiento-envio.html?codigo=ENV-2026-XXXX` — vista rápida por deep link.

### 6. Geolocalización y QR (3 min)

1. **Geolocalización + QR** — buscar el mismo envío.
2. Mapa, historial de ubicaciones, registrar punto (operaciones).
3. Ver / descargar QR.
4. **Limpiar** — mismo comportamiento que en consulta y seguimiento.

### 7. Consulta pública interna (2 min)

1. **Consulta envío** — código manual, imagen QR o PDF de comprobante.
2. Detalle de estado e historial.
3. **Limpiar** — pantalla de búsqueda limpia.

### 8. Cierre operativo (2 min)

1. **Historial general** — filtros y listado.
2. **Reportes** — export CSV/Excel/PDF (si está en el informe).
3. Como **admin**: **Usuarios**, **Respaldo** JSON.
4. Mencionar auditoría en Firestore (`logs_sistema`).

### 9. Cierre oral (1 min)

Resumir: capas Electron–IPC–Firestore, trazabilidad, QR, roles, pruebas automatizadas (`npm test`).

---

## Comportamiento unificado: botón «Limpiar»

En **Consulta**, **Geolocalización + QR** y **Seguimiento / Trazabilidad**:

| Acción al pulsar Limpiar |
|--------------------------|
| Limpia alertas y criterios de búsqueda |
| Oculta resultado / detalle / mapa según pantalla |
| **Oculta** la sección «Otros registros» y vacía su lista |
| No recarga todos los envíos en la lista (evita ruido tras resetear) |

La sección «Otros registros» **vuelve a mostrarse** cuando el usuario realiza una nueva búsqueda con resultados.

Implementación: `GlsEnvioBusquedaRapida.limpiarSeccionOtrosRegistros()` en `envio-busqueda-rapida.js`.

---

## Correcciones recientes (revisión pre-entrega)

| Tema | Detalle |
|------|---------|
| Búsqueda | Campos código/cliente editables; grid de filtros corregido |
| Activos | Estado «En almacén» en suscripción tiempo real |
| Seguridad | `requireAuth` en IPC admin; validación geo al registrar ubicación |
| Registro | Evita doble envío al confirmar dos veces |
| Seguimiento | Layout responsive; auto-detalle solo con `?codigo=` en URL |

---

## Instalación en otra máquina

```bash
cd sistema-envios-desktop
npm install
npm run dist
```

Instalador: `dist/GLS-Envios-Setup-1.2.0.exe`

**Firebase:** copiar `.env.example` a:

- Desarrollo: `sistema-envios-desktop/.env`
- Instalado: `%APPDATA%\<nombre-app>\gls.env` o `resources\gls.env` con claves `FIREBASE_*`

```bash
npm run db:ping      # verificar conexión
npm run seed:users   # usuarios iniciales
npm start
```

---

## Qué reforzar en el informe (sin código obligatorio)

| Entregable | Por qué suma en la nota |
|------------|-------------------------|
| Matriz requisito ↔ pantalla ↔ test | Trazabilidad académica |
| Diagrama de arquitectura (capas IPC) | Demuestra diseño deliberado |
| Capturas por módulo | Facilita corrección del docente |
| Limitaciones conocidas | Honestidad (dependencia de red, índices Firestore) |
| Trabajo futuro | App móvil, notificaciones, regenerar QR si falla al crear |

---

## Documentación relacionada

| Documento | Contenido |
|-----------|-----------|
| `manual-usuario.md` | Uso por pantalla |
| `manual-tecnico.md` | Arquitectura, IPC, Firestore |
| `pruebas-sistema.md` | Pruebas manuales M-07… y automáticas |
| `modulo-trazabilidad.md` | Detalle trazabilidad |
| `../database/firestore-structure.md` | Colecciones y campos |

---

## Comandos de referencia rápida

```bash
npm start          # ejecutar en desarrollo
npm test           # 47 tests
npm run verify     # IPC y controllers
npm run dist       # instalador Windows
npm run seed:users # usuarios demo
```
