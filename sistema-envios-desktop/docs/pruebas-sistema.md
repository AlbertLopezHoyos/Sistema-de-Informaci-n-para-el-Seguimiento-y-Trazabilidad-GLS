# Plan de pruebas del sistema

Incluye **pruebas automáticas** (`npm test`) y **pruebas manuales** en Electron con Firestore configurado.

## Pruebas automáticas (Jest)

Ejecutar desde `sistema-envios-desktop/`:

```bash
npm test
```

Archivos principales: `auth`, `clientes`, `registro-envio`, `trazabilidad`, `geolocalizacionQr`, `qrDeepLink`, `uploadValidation`, `backup`, `exportTabular`, `auditoria`, `consulta` (según existan en `tests/`).

Cobertura esperada: **47 tests** en verde tras `npm test` (18 suites).

### M-06b — Limpiar búsqueda (Consulta / Geo / Seguimiento)

| Campo | Detalle |
| --- | --- |
| **Objetivo** | Comportamiento unificado del botón **Limpiar**. |
| **Pasos** | 1. En cada pantalla con «Buscar envío», realizar una búsqueda que muestre resultado y «Otros registros». 2. Pulsar **Limpiar**. |
| **Resultado esperado** | Criterios vacíos; sin detalle/resultado; sección **Otros registros** oculta y lista vacía. 3. Nueva búsqueda → «Otros registros» visible de nuevo si hay coincidencias. |
| **Resultado obtenido** | |
| **Estado** | |

---

## Pruebas manuales — módulos Trazabilidad y Geo (M-07 a M-13)

Complete **Resultado obtenido** y **Estado** al ejecutar.

### M-07 — Trazabilidad por URL / QR

| Campo | Detalle |
| --- | --- |
| **Objetivo** | Verificar deep link y carga automática del envío. |
| **Pasos** | 1. Generar QR de un envío existente. 2. Abrir `seguimiento-envio.html?codigo=ENV-2026-0001` (o escanear y abrir equivalente). 3. Observar banner “Vista rápida” y detalle. |
| **Resultado esperado** | Búsqueda automática, banner con código/estado/ruta/último evento/última ubicación, panel de detalle cargado. |
| **Resultado obtenido** | |
| **Estado** | |

### M-08 — Actualizar estado con observación

| Campo | Detalle |
| --- | --- |
| **Objetivo** | Registrar cambio válido en historial. |
| **Pasos** | 1. Buscar envío activo. 2. Actualizar estado → elegir pill (ej. En tránsito). 3. Observación ≥ 3 caracteres. 4. Confirmar. |
| **Resultado esperado** | Nuevo registro en timeline y `estadoActual` actualizado en Firestore. |
| **Resultado obtenido** | |
| **Estado** | |

### M-09 — Observación insuficiente

| Campo | Detalle |
| --- | --- |
| **Objetivo** | Validar rechazo cliente/servidor. |
| **Pasos** | Intentar guardar con observación vacía o de 1–2 caracteres. |
| **Resultado esperado** | Mensaje claro; sin cambio en Firestore. |
| **Resultado obtenido** | |
| **Estado** | |

### M-10 — Entregado sin evidencia completa

| Campo | Detalle |
| --- | --- |
| **Objetivo** | Validar campos obligatorios de entrega. |
| **Pasos** | Estado Entregado sin referencia, sin receptor o DNI inválido. |
| **Resultado esperado** | Error sobre evidencia, nombre receptor o DNI/RUC. |
| **Resultado obtenido** | |
| **Estado** | |

### M-11 — Entregado con evidencia completa

| Campo | Detalle |
| --- | --- |
| **Objetivo** | Cierre correcto con receptor y referencia. |
| **Pasos** | Entregado + referencia ≥ 4 + nombre receptor + DNI 8 dígitos (opcional imagen). |
| **Resultado esperado** | Historial con receptor y evidencia; envío en estado Entregado. |
| **Resultado obtenido** | |
| **Estado** | |

### M-12 — Geo: registrar ubicación

| Campo | Detalle |
| --- | --- |
| **Objetivo** | Persistir punto de control. |
| **Pasos** | Geo → buscar envío → Registrar ubicación → clic en mapa o GPS → dirección → guardar. |
| **Resultado esperado** | Documento en `ubicaciones_envios`; aparece en mapa recorrido e historial. |
| **Resultado obtenido** | |
| **Estado** | |

### M-13 — Geo: coordenadas inválidas y QR

| Campo | Detalle |
| --- | --- |
| **Objetivo** | Validar rangos y generación QR con deep link. |
| **Pasos** | 1. Latitud 95 → error. 2. Envío sin QR → Generar QR. 3. Ver contenido `seguimiento-envio.html?codigo=...` y descargar PNG. |
| **Resultado esperado** | Error de latitud; PNG y registro `qr_envios` con deep link. |
| **Resultado obtenido** | |
| **Estado** | |

---

## Otras pruebas manuales (resumen)

| Código | Caso | Resultado esperado |
| --- | --- | --- |
| M-01 | Login correcto | Ingreso al dashboard |
| M-02 | Login incorrecto | Error, sin sesión |
| M-05 | Registro envío | Código ENV-AAAA-NNNN, historial, QR |
| M-14 | Historial filtros | Estado, fechas, texto (incl. remitente/destinatario) |
| M-15 | PDF | Comprobante o seguimiento exportado |
| M-16 | Rol consulta | Sin mutación en estados/ubicaciones |

**Estado sugerido:** aprobado | observado.
