# Módulo Trazabilidad y Seguimiento

## Objetivo

Gestionar el ciclo operativo de un envío: consulta en tiempo real, actualización de estados, evidencia de entrega, línea de tiempo auditable y exportación PDF para informes académicos.

## Arquitectura

```
Renderer (seguimiento-envio.js)
    ↕ IPC (preload glsApi.trazabilidad / glsApi.envios)
Main (main.js handlers)
    ↕
Controller (trazabilidad.controller.js)
    ↕
Service (trazabilidad.service.js) + Model (trazabilidad.model.js)
    ↕
Repository (trazabilidad.repository.js)
    ↕
Firestore
```

Componentes UI compartidos: `estado-envio-ui.js` (badges, timeline vertical, KPI), `tracking.css`, `comprobante-envio-pdf.js` (`exportSeguimientoPdf`).

## IPC utilizados

| Canal | Uso |
| --- | --- |
| `trazabilidad:buscar` | Envío + `historial_envios` por código |
| `trazabilidad:listarEstados` | Catálogo `estados_envio` o fallback `app.config` |
| `trazabilidad:actualizarEstado` | Nuevo evento + actualización `estadoActual` |

Integración con geo: al marcar “Registrar ubicación” en el modal de actualización, se invoca `geo:registrarUbicacion` si el estado es **En tránsito** o **En reparto** (sugerido por defecto).

## Colecciones Firestore

| Colección | Rol |
| --- | --- |
| `envios` | Documento maestro (`estadoActual`, remitente, destino, `evidenciaEntrega`) |
| `historial_envios` | Subcolección o documentos por evento: estado, observación, usuario, evidencia, receptor |
| `estados_envio` | Catálogo de estados oficiales |

Estados oficiales: Registrado, En almacén, En tránsito, En reparto, Entregado, Observado, Cancelado.

## Flujo principal

1. **Lista activos**: suscripción en tiempo real (`envios.subscribeActivos`) + KPI (activos, entregados, observados, en flujo).
2. **Búsqueda por código** o URL `seguimiento-envio.html?codigo=ENV-AAAA-NNNN` → vista rápida (banner) + detalle.
3. **Actualizar estado**: selector visual (pills), observación obligatoria (≥ 3), evidencia si Entregado, ubicación opcional con mapa Leaflet.
4. **PDF**: botón Exportar PDF con datos, timeline, QR y última ubicación.

## Capturas sugeridas (informe)

1. Pantalla seguimiento con KPI y lista activos.
2. Modal “Actualizar estado” con pills y mapa de ubicación.
3. Línea de tiempo vertical con varios estados y ubicación asociada.
4. Formulario evidencia de entrega (receptor, DNI, referencia).
5. Vista rápida al abrir `?codigo=` desde QR.
6. PDF generado (vista previa del archivo).

## Validaciones (backend)

- Observación mínima 3 caracteres.
- Entregado: referencia evidencia ≥ 4, nombre receptor ≥ 2, DNI 8 u RUC 11 dígitos.
- Imagen evidencia opcional, tamaño máximo ~200 KB en base64.
- Estado debe estar en `estadosPermitidos` (`app.config.js`).
