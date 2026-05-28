# Módulo Geolocalización + QR

## Objetivo

Registrar puntos de control geográficos, visualizar recorrido en mapa Leaflet, generar códigos QR con **deep link** hacia seguimiento y soportar demostración académica del flujo logístico.

## Arquitectura

```
Renderer (geolocalizacion-qr.js)
    ↕ IPC (glsApi.geolocalizacionQr)
Main → geolocalizacionQr.controller.js
    ├── ubicacion.service.js / ubicacion.model.js
    └── qr.service.js + qrDeepLink.js + qrGenerator.js
Firestore + PNG local en src/renderer/assets/qr/
```

## IPC utilizados

| Canal | Uso |
| --- | --- |
| `geo:buscar` | Envío, `ubicaciones_envios`, última ubicación, registro `qr_envios` |
| `geo:registrarUbicacion` | Nuevo punto (lat/lng, dirección, observación) |
| `geo:generarQr` | PNG + documento con `contenidoQr` deep link |

## Colecciones Firestore

| Colección | Campos relevantes |
| --- | --- |
| `ubicaciones_envios` | `codigoEnvio`, `direccion`, `latitud`, `longitud`, `observacion`, `fechaRegistro`, `registradoPor` |
| `qr_envios` | `codigoEnvio`, `contenidoQr`, `rutaLocalQr`, `fechaGeneracion` |

## Contenido del QR

No guarda solo el código. El PNG codifica:

`seguimiento-envio.html?codigo=ENV-AAAA-NNNN`

Al escanear, el operador abre la app en **Seguimiento** o **Geolocalización** con `?codigo=` (misma convención en consulta).

Utilidad: `src/utils/qrDeepLink.js` (`buildQrDeepLink`, `parseCodigoFromQrContent`).

## Flujo principal

1. Buscar envío por código o URL `geolocalizacion-qr.html?codigo=...`.
2. **Registrar ubicación**: modal con mapa (clic → coordenadas), “Usar ubicación actual”, guardar en Firestore.
3. **Mapa y QR**: recorrido (marcadores + polyline azul corporativo), popups con fecha/usuario/observación; QR grande con descargar, copiar código, regenerar, imprimir.
4. **Historial ubicaciones**: timeline cronológica + tabla.

## Integración con trazabilidad

Desde **Seguimiento → Actualizar estado**, si el estado es En tránsito o En reparto y se marca “Registrar ubicación”, se envía el mismo payload a `geo:registrarUbicacion` tras guardar el estado.

## Capturas sugeridas

1. Resumen del envío con badge de estado y última ubicación.
2. Modal registro con mapa y botón “Mi ubicación”.
3. Mapa con línea de recorrido y varios marcadores.
4. Modal QR con deep link visible y botones de acción.
5. Historial con timeline + tabla.
6. Escaneo simulado: pantalla seguimiento con banner “Vista rápida”.

## Validaciones

- Latitud ∈ [-90, 90], longitud ∈ [-180, 180].
- Dirección obligatoria (texto no vacío).
- Observación opcional en ubicación.
